"use server";

import { verifyCredentials } from "@/lib/auth";
import { hashPassword } from "@/lib/local-db";
import { clearSession, setSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function signInWithPassword(username: string, password: string) {
  const normalized = username.trim();
  if (!normalized || !password) return { error: "请输入用户名和密码" };

  const profile = await verifyCredentials(normalized, hashPassword(password));
  if (!profile) return { error: "用户名或密码错误" };

  await setSession({ userId: profile.id, role: profile.role });
  return { success: true };
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
