import type {
  ExamRecord,
  LearningProgress,
  Profile,
  Question,
  UserRole,
} from "@/types/database";
import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sampleQuestionsData from "../../data/sample-questions.json";
import { getRedis } from "@/lib/redis";

interface LocalUserRecord extends Profile {
  username: string;
  password_hash: string;
}

interface LocalDb {
  users: LocalUserRecord[];
  questions: Question[];
  learning_progress: LearningProgress[];
  exam_records: ExamRecord[];
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

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function getBootstrapCredentials() {
  return {
    username: (process.env.LOCAL_ADMIN_USERNAME ?? "admin").trim(),
    password: process.env.LOCAL_ADMIN_PASSWORD ?? "admin123456",
  };
}

function createDefaultAdmin(): LocalUserRecord {
  const { username, password } = getBootstrapCredentials();
  const ts = now();
  return {
    id: randomUUID(),
    username,
    password_hash: hashPassword(password),
    email: username,
    full_name: "System Admin",
    role: "admin",
    current_stage: 1,
    max_passed_stage: 0,
    certificate_issued_at: null,
    created_at: ts,
    updated_at: ts,
  };
}

function ensureBootstrapAdmin(db: LocalDb): { db: LocalDb; changed: boolean } {
  const { username, password } = getBootstrapCredentials();
  const passwordHash = hashPassword(password);
  let changed = false;

  const existing = db.users.find((u) => u.username === username);
  if (existing) {
    if (existing.password_hash !== passwordHash) {
      existing.password_hash = passwordHash;
      changed = true;
    }
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    if (changed) existing.updated_at = now();
    return { db, changed };
  }

  db.users.push(createDefaultAdmin());
  return { db, changed: true };
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
  return {
    users: [createDefaultAdmin()],
    questions: await loadSampleQuestions(),
    learning_progress: [],
    exam_records: [],
  };
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
    if (existing) return existing;

    const seed = await createDefaultDb();
    const acquired = await redis.set(REDIS_DB_KEY, seed, { nx: true });
    if (acquired) return seed;

    const raced = await readDbFromRedis();
    if (raced) return raced;

    throw new Error("数据库加载失败，请稍后重试");
  }

  if (localMemoryDb) return localMemoryDb;

  const dbPath = getDbPath();
  try {
    const raw = await readFile(dbPath, "utf8");
    localMemoryDb = JSON.parse(raw) as LocalDb;
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
  const db = await loadFreshDb();
  const { db: synced, changed } = ensureBootstrapAdmin(db);
  if (changed) {
    await persistDb(synced);
  }
  return synced;
}

export async function writeDb(db: LocalDb): Promise<void> {
  await persistDb(db);
}

export async function mutateDb(
  mutator: (db: LocalDb) => void | Promise<void>
): Promise<LocalDb> {
  const db = await loadFreshDb();
  await mutator(db);
  const { db: synced } = ensureBootstrapAdmin(db);
  await persistDb(synced);
  return synced;
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

export async function findUserByUsername(username: string) {
  const db = await readDb();
  return db.users.find((u) => u.username === username.trim());
}

export async function listProfiles() {
  const db = await readDb();
  return db.users.map(toProfile);
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

export async function upsertUser(params: {
  id?: string;
  username: string;
  password?: string;
  full_name?: string | null;
  role?: UserRole;
}) {
  const username = params.username.trim();
  if (!username) return { error: "用户名不能为空" };

  try {
    await mutateDb((db) => {
      const ts = now();

      if (params.id) {
        const user = db.users.find((u) => u.id === params.id);
        if (!user) throw new Error("用户不存在");
        user.username = username;
        user.email = username;
        user.full_name = params.full_name ?? user.full_name;
        user.role = params.role ?? user.role;
        if (params.password) user.password_hash = hashPassword(params.password);
        user.updated_at = ts;
        return;
      }

      if (!params.password) throw new Error("新建用户必须提供密码");
      if (db.users.some((u) => u.username === username)) {
        throw new Error("用户名已存在");
      }

      db.users.push({
        id: randomUUID(),
        username,
        password_hash: hashPassword(params.password!),
        email: username,
        full_name: params.full_name ?? username,
        role: params.role ?? "user",
        current_stage: 1,
        max_passed_stage: 0,
        certificate_issued_at: null,
        created_at: ts,
        updated_at: ts,
      });
    });
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "保存失败" };
  }
}
