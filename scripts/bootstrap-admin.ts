/**
 * Bootstrap first admin after CloudBase OTP login.
 *
 * Usage:
 *   DNB_BOOTSTRAP_ADMIN_EMAIL=you@dnb.com npx tsx scripts/bootstrap-admin.ts
 *   DNB_BOOTSTRAP_ADMIN_UID=cloudbase-uid npx tsx scripts/bootstrap-admin.ts
 *
 * Requires UPSTASH_REDIS_* or local data/local-db.json for persistence.
 */

import { promoteUserToAdmin, readDb } from "../src/lib/local-db";

async function main() {
  const email = process.env.DNB_BOOTSTRAP_ADMIN_EMAIL?.trim();
  const uid = process.env.DNB_BOOTSTRAP_ADMIN_UID?.trim();

  if (!email && !uid) {
    console.error(
      "Set DNB_BOOTSTRAP_ADMIN_EMAIL or DNB_BOOTSTRAP_ADMIN_UID before running."
    );
    process.exit(1);
  }

  const result = await promoteUserToAdmin({ email, uid });
  if (result.error) {
    console.error("Failed:", result.error);
    console.error(
      "Tip: user must complete at least one OTP login so a profile exists in Redis."
    );
    process.exit(1);
  }

  const db = await readDb();
  const user = db.users.find(
    (u) =>
      (uid && u.id === uid) ||
      (email && u.email.toLowerCase() === email.toLowerCase())
  );

  console.log("Admin promoted successfully:");
  console.log(JSON.stringify(user, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
