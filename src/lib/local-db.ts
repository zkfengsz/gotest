import type {
  EmailAllowlistEntry,
  ExamRecord,
  LearningProgress,
  Profile,
  Question,
  UserRole,
} from "@/types/database";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sampleQuestionsData from "../../data/sample-questions.json";
import { getRedis } from "@/lib/redis";

interface LocalUserRecord extends Profile {
  /** @deprecated legacy password auth */
  username?: string;
  /** @deprecated legacy password auth */
  password_hash?: string;
}

interface LocalDb {
  users: LocalUserRecord[];
  questions: Question[];
  learning_progress: LearningProgress[];
  exam_records: ExamRecord[];
  email_allowlist: EmailAllowlistEntry[];
}

const SAMPLE_QUESTIONS_PATH = path.join(
  process.cwd(),
  "data",
  "sample-questions.json"
);
const REDIS_DB_KEY = "app:local-db";

/** In-memory cache only for local dev without Redis */
let localMemoryDb: LocalDb | null = null;

function now() {
  return new Date().toISOString();
}

function getDbPath(): string {
  const serverless = Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL
  );
  if (serverless) {
    return path.join("/tmp", "gotest", "local-db.json");
  }
  return path.join(process.cwd(), "data", "local-db.json");
}

function usesRedis(): boolean {
  return getRedis() !== null;
}

function ensureDbShape(db: LocalDb): LocalDb {
  if (!Array.isArray(db.email_allowlist)) {
    db.email_allowlist = [];
  }
  return db;
}

async function loadSampleQuestions(): Promise<Question[]> {
  let items: Array<
    Omit<Question, "id" | "created_at" | "updated_at" | "is_active">
  > = [];

  try {
    const raw = await readFile(SAMPLE_QUESTIONS_PATH, "utf8");
    items = JSON.parse(raw) as typeof items;
  } catch {
    items = sampleQuestionsData as typeof items;
  }

  const ts = now();
  return items.map((q, idx) => ({
    id: randomUUID(),
    stage_id: q.stage_id,
    type: q.type,
    content: q.content,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? null,
    order_index: q.order_index ?? idx,
    is_active: true,
    created_at: ts,
    updated_at: ts,
  }));
}

async function createDefaultDb(): Promise<LocalDb> {
  return ensureDbShape({
    users: [],
    questions: await loadSampleQuestions(),
    learning_progress: [],
    exam_records: [],
    email_allowlist: [],
  });
}

async function readDbFromRedis(): Promise<LocalDb | null> {
  const redis = getRedis();
  if (!redis) return null;
  const data = await redis.get<LocalDb>(REDIS_DB_KEY);
  return data ?? null;
}

async function writeDbToRedis(db: LocalDb): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(REDIS_DB_KEY, db);
}

async function loadFreshDb(): Promise<LocalDb> {
  const redis = getRedis();

  if (redis) {
    const existing = await readDbFromRedis();
    if (existing) return ensureDbShape(existing);

    const seed = await createDefaultDb();
    const acquired = await redis.set(REDIS_DB_KEY, seed, { nx: true });
    if (acquired) return seed;

    const raced = await readDbFromRedis();
    if (raced) return ensureDbShape(raced);

    throw new Error("数据库加载失败，请稍后重试");
  }

  if (localMemoryDb) return ensureDbShape(localMemoryDb);

  const dbPath = getDbPath();
  try {
    const raw = await readFile(dbPath, "utf8");
    localMemoryDb = ensureDbShape(JSON.parse(raw) as LocalDb);
    return localMemoryDb;
  } catch {
    localMemoryDb = await createDefaultDb();
    await persistDbLocal(localMemoryDb);
    return localMemoryDb;
  }
}

async function persistDbLocal(db: LocalDb): Promise<void> {
  const dbPath = getDbPath();
  try {
    await mkdir(path.dirname(dbPath), { recursive: true });
    await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore on read-only filesystem
  }
}

async function persistDb(db: LocalDb): Promise<void> {
  if (usesRedis()) {
    await writeDbToRedis(db);
    return;
  }

  localMemoryDb = db;
  await persistDbLocal(db);
}

export async function readDb(): Promise<LocalDb> {
  return ensureDbShape(await loadFreshDb());
}

export async function writeDb(db: LocalDb): Promise<void> {
  await persistDb(ensureDbShape(db));
}

export async function mutateDb(
  mutator: (db: LocalDb) => void | Promise<void>
): Promise<LocalDb> {
  const db = ensureDbShape(await loadFreshDb());
  await mutator(db);
  await persistDb(db);
  return db;
}

export function toProfile(user: LocalUserRecord): Profile {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    current_stage: user.current_stage,
    max_passed_stage: user.max_passed_stage,
    certificate_issued_at: user.certificate_issued_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function findUserById(userId: string) {
  const db = await readDb();
  return db.users.find((u) => u.id === userId);
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const db = await readDb();
  return db.users.find((u) => u.email.toLowerCase() === normalized);
}

export async function listProfiles() {
  const db = await readDb();
  return db.users.map(toProfile);
}

function resolveBootstrapAdmin(email: string, uid: string): boolean {
  const bootstrapEmail = (process.env.DNB_BOOTSTRAP_ADMIN_EMAIL ?? "")
    .trim()
    .toLowerCase();
  const bootstrapUid = (process.env.DNB_BOOTSTRAP_ADMIN_UID ?? "").trim();

  return (
    (bootstrapEmail.length > 0 && email === bootstrapEmail) ||
    (bootstrapUid.length > 0 && uid === bootstrapUid)
  );
}

export async function ensureProfileForUser(
  uid: string,
  email: string
): Promise<Profile> {
  const normalizedEmail = email.trim().toLowerCase();
  let profile: Profile | null = null;

  await mutateDb((db) => {
    const ts = now();
    let user = db.users.find((u) => u.id === uid);

    if (!user) {
      user = {
        id: uid,
        email: normalizedEmail,
        full_name: normalizedEmail.split("@")[0],
        role: resolveBootstrapAdmin(normalizedEmail, uid) ? "admin" : "user",
        current_stage: 1,
        max_passed_stage: 0,
        certificate_issued_at: null,
        created_at: ts,
        updated_at: ts,
      };
      db.users.push(user);
    } else {
      user.email = normalizedEmail;
      user.updated_at = ts;
    }

    profile = toProfile(user);
  });

  return profile!;
}

export async function updateUserRole(userId: string, role: UserRole) {
  let found = false;
  await mutateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return;
    found = true;
    user.role = role;
    user.updated_at = now();
  });
  return found;
}

export async function listEmailAllowlist(): Promise<EmailAllowlistEntry[]> {
  const db = await readDb();
  return [...db.email_allowlist].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export async function addEmailAllowlistEntry(params: {
  email: string;
  note?: string | null;
  createdBy: string;
}): Promise<{ success?: boolean; error?: string }> {
  const email = params.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "请输入有效邮箱" };
  }

  try {
    await mutateDb((db) => {
      if (db.email_allowlist.some((entry) => entry.email === email)) {
        throw new Error("该邮箱已在白名单中");
      }

      db.email_allowlist.push({
        email,
        note: params.note?.trim() || null,
        created_at: now(),
        created_by: params.createdBy,
      });
    });
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "添加失败" };
  }
}

export async function removeEmailAllowlistEntry(
  email: string
): Promise<{ success?: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase();
  let found = false;

  await mutateDb((db) => {
    const before = db.email_allowlist.length;
    db.email_allowlist = db.email_allowlist.filter(
      (entry) => entry.email !== normalized
    );
    found = db.email_allowlist.length < before;
  });

  if (!found) return { error: "白名单条目不存在" };
  return { success: true };
}

export async function promoteUserToAdmin(
  identifier: { email?: string; uid?: string }
): Promise<{ success?: boolean; error?: string }> {
  const email = identifier.email?.trim().toLowerCase();
  const uid = identifier.uid?.trim();

  if (!email && !uid) {
    return { error: "请提供 email 或 uid" };
  }

  let found = false;
  await mutateDb((db) => {
    const user = db.users.find(
      (u) =>
        (uid && u.id === uid) ||
        (email && u.email.toLowerCase() === email)
    );
    if (!user) return;
    found = true;
    user.role = "admin";
    user.updated_at = now();
  });

  if (!found) return { error: "用户不存在，请先完成一次邮箱登录" };
  return { success: true };
}
