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

const SAMPLE_QUESTIONS_PATH = path.join(process.cwd(), "data", "sample-questions.json");

function isServerless(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL
  );
}

function getDbPath(): string {
  if (isServerless()) {
    return path.join("/tmp", "gotest", "local-db.json");
  }
  return path.join(process.cwd(), "data", "local-db.json");
}

let memoryDb: LocalDb | null = null;

function now() {
  return new Date().toISOString();
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function createDefaultAdmin(): LocalUserRecord {
  const username = process.env.LOCAL_ADMIN_USERNAME ?? "admin";
  const password = process.env.LOCAL_ADMIN_PASSWORD ?? "admin123456";
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

export async function readDb(): Promise<LocalDb> {
  if (memoryDb) return memoryDb;

  const dbPath = getDbPath();
  try {
    const raw = await readFile(dbPath, "utf8");
    memoryDb = JSON.parse(raw) as LocalDb;
    return memoryDb;
  } catch {
    const seed = await createDefaultDb();
    memoryDb = seed;
    await writeDb(seed);
    return seed;
  }
}

export async function writeDb(db: LocalDb): Promise<void> {
  memoryDb = db;
  const dbPath = getDbPath();
  try {
    await mkdir(path.dirname(dbPath), { recursive: true });
    await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // Netlify/Lambda: only /tmp is writable; keep in-memory for this instance.
  }
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
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.role = role;
  user.updated_at = now();
  await writeDb(db);
  return true;
}

export async function upsertUser(params: {
  id?: string;
  username: string;
  password?: string;
  full_name?: string | null;
  role?: UserRole;
}) {
  const db = await readDb();
  const ts = now();
  const username = params.username.trim();
  if (!username) return { error: "用户名不能为空" };

  if (params.id) {
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return { error: "用户不存在" };
    user.username = username;
    user.email = username;
    user.full_name = params.full_name ?? user.full_name;
    user.role = params.role ?? user.role;
    if (params.password) user.password_hash = hashPassword(params.password);
    user.updated_at = ts;
  } else {
    if (!params.password) return { error: "新建用户必须提供密码" };
    if (db.users.some((u) => u.username === username)) {
      return { error: "用户名已存在" };
    }
    db.users.push({
      id: randomUUID(),
      username,
      password_hash: hashPassword(params.password),
      email: username,
      full_name: params.full_name ?? username,
      role: params.role ?? "user",
      current_stage: 1,
      max_passed_stage: 0,
      certificate_issued_at: null,
      created_at: ts,
      updated_at: ts,
    });
  }

  await writeDb(db);
  return { success: true };
}
