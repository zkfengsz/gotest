import { readDb } from "@/lib/local-db";

export function normalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function parseEnvList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const envWhitelist = parseEnvList(process.env.DNB_EMAIL_WHITELIST);
  if (envWhitelist.includes(normalized)) return true;

  const db = await readDb();
  if (
    db.email_allowlist.some(
      (entry) => entry.email.toLowerCase() === normalized
    )
  ) {
    return true;
  }

  const domain = normalized.split("@")[1];
  const allowedDomains = parseEnvList(process.env.DNB_EMAIL_DOMAINS);
  return allowedDomains.includes(domain);
}
