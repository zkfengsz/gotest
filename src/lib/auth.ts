import { findUserByUsername, listProfiles, toProfile } from "@/lib/local-db";
import { getSession } from "@/lib/session";
import type { Profile } from "@/types/database";
import { redirect } from "next/navigation";

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  const users = await listProfiles();
  return users.find((u) => u.id === session.userId) ?? null;
}

export async function getProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session) return null;
  const users = await listProfiles();
  return users.find((u) => u.id === session.userId) ?? null;
}

export async function verifyCredentials(username: string, passwordHash: string) {
  const user = await findUserByUsername(username.trim());
  if (!user) return null;
  if (user.password_hash !== passwordHash) return null;
  return toProfile(user);
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}
