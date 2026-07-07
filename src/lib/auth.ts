import { findUserById } from "@/lib/local-db";
import { getSession } from "@/lib/session";
import type { Profile } from "@/types/database";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  return getProfile();
}

export async function getProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user) return null;
  if (user.is_disabled) return null;

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_disabled: user.is_disabled ?? false,
    current_stage: user.current_stage,
    max_passed_stage: user.max_passed_stage,
    certificate_issued_at: user.certificate_issued_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function redirectIfStaleSession() {
  const session = await getSession();
  if (!session) return;
  const profile = await getProfile();
  if (!profile) redirect("/api/auth/clear-session");
}

export async function requireAuth(): Promise<Profile> {
  await redirectIfStaleSession();
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}
