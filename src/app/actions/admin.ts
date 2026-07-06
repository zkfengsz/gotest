"use server";

import { requireAdmin } from "@/lib/auth";
import { randomUUID } from "crypto";
import {
  mutateDb,
  readDb,
  upsertUser,
  updateUserRole as updateRoleInDb,
} from "@/lib/local-db";
import {
  parseQuestionsJson,
  parseQuestionsMarkdown,
  type ImportQuestion,
} from "@/lib/questions-import";
import type { Question } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function getAllUsers() {
  await requireAdmin();
  const db = await readDb();
  const profiles = db.users
    .map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      current_stage: u.current_stage,
      max_passed_stage: u.max_passed_stage,
      certificate_issued_at: u.certificate_issued_at,
      created_at: u.created_at,
      updated_at: u.updated_at,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    profiles,
    progress: db.learning_progress,
    exams: db.exam_records
      .filter((e) => e.status === "completed")
      .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
  };
}

export async function getQuestions(stageId?: number) {
  await requireAdmin();
  const db = await readDb();
  const result = stageId
    ? db.questions.filter((q) => q.stage_id === stageId)
    : db.questions;
  return result.sort((a, b) => a.order_index - b.order_index) as Question[];
}

export async function upsertQuestion(
  question: Partial<Question> & {
    stage_id: number;
    type: Question["type"];
    content: string;
    options: Question["options"];
    correct_answer: Question["correct_answer"];
  }
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();
  const ts = new Date().toISOString();

  const payload: Question = {
    id: question.id ?? randomUUID(),
    stage_id: question.stage_id,
    type: question.type,
    content: question.content,
    options: question.options,
    correct_answer: question.correct_answer,
    explanation: question.explanation ?? null,
    order_index: question.order_index ?? 0,
    is_active: question.is_active ?? true,
    created_at: ts,
    updated_at: ts,
  };

  await mutateDb((db) => {
    const idx = db.questions.findIndex((q) => q.id === payload.id);
    if (idx >= 0) {
      db.questions[idx] = {
        ...db.questions[idx],
        ...payload,
        updated_at: ts,
      };
    } else {
      db.questions.push(payload);
    }
  });

  revalidatePath("/admin/questions");
  return { success: true };
}

export async function deleteQuestion(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();
  await mutateDb((db) => {
    db.questions = db.questions.filter((q) => q.id !== id);
  });
  revalidatePath("/admin/questions");
  return { success: true };
}

export async function importQuestions(
  content: string,
  format: "json" | "markdown"
): Promise<{ success?: boolean; error?: string; count?: number }> {
  await requireAdmin();

  let items: ImportQuestion[];
  try {
    items = format === "json" ? parseQuestionsJson(content) : parseQuestionsMarkdown(content);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "解析失败" };
  }

  const ts = new Date().toISOString();
  const rows = items.map((q, i) => ({
    id: randomUUID(),
    stage_id: q.stage_id,
    type: q.type,
    content: q.content,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? null,
    order_index: q.order_index ?? i,
    is_active: true,
    created_at: ts,
    updated_at: ts,
  }));

  await mutateDb((db) => {
    db.questions.push(...rows);
  });

  revalidatePath("/admin/questions");
  return { success: true, count: rows.length };
}

export async function updateUserRole(
  userId: string,
  role: "admin" | "user"
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();
  const ok = await updateRoleInDb(userId, role);
  if (!ok) return { error: "用户不存在" };
  revalidatePath("/admin/users");
  return { success: true };
}

export async function createUserAccount(
  username: string,
  password: string,
  fullName: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();
  const result = await upsertUser({
    username,
    password,
    full_name: fullName || username,
    role: "user",
  });
  if ("error" in result) return result;
  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAdmin();
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { error: "用户不存在" };
  if (!newPassword || newPassword.length < 6) {
    return { error: "新密码至少 6 位" };
  }
  const result = await upsertUser({
    id: userId,
    username: user.username,
    password: newPassword,
    full_name: user.full_name,
    role: user.role,
  });
  if ("error" in result) return result;
  revalidatePath("/admin/users");
  return { success: true };
}
