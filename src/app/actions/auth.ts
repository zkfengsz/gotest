"use server";

import { isEmailAllowed, normalizeEmail } from "@/lib/email-access";
import { verifyAccessToken } from "@/lib/cloudbase/server";
import { ensureProfileForUser } from "@/lib/local-db";
import { clearSession, setSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function validateEmailAccess(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return { error: "请输入有效邮箱地址" };

  if (!(await isEmailAllowed(normalized))) {
    return { error: "该邮箱不在允许注册/登录的范围内，请联系管理员" };
  }

  return { success: true, email: normalized };
}

export async function completeEmailLogin(params: {
  accessToken: string;
  uid: string;
  email: string;
}) {
  const normalized = normalizeEmail(params.email);
  if (!normalized) return { error: "邮箱格式无效" };

  if (!(await isEmailAllowed(normalized))) {
    return { error: "该邮箱不在允许范围内" };
  }

  const valid = await verifyAccessToken(
    params.accessToken,
    params.uid,
    normalized
  );
  if (!valid) return { error: "登录验证失败，请重新获取验证码" };

  const profile = await ensureProfileForUser(params.uid, normalized);
  await setSession({
    userId: profile.id,
    role: profile.role,
    accessToken: params.accessToken,
  });

  return { success: true, role: profile.role };
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}
