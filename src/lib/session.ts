import type { UserRole } from "@/types/database";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "dnb_local_session";

export interface SessionPayload {
  userId: string;
  role: UserRole;
  accessToken?: string;
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSession(payload: SessionPayload) {
  const store = await cookies();
  const raw = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  store.set(SESSION_COOKIE, raw, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
