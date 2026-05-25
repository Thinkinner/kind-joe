/**
 * Verify auth `user` table has columns required by the app.
 * Usage: npm run db:verify-auth-schema
 */
import "dotenv/config";
import { Pool } from "pg";

const REQUIRED_COLUMNS = [
  "account_type",
  "staff_role",
  "staff_roles",
  "admin_page_access",
  "force_password_change",
  "two_factor_enabled",
  "username",
  "alias_full_name",
] as const;

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user'
      `,
    );
    const present = new Set(rows.map((r) => r.column_name));
    const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));

    console.log(
      JSON.stringify(
        {
          ok: missing.length === 0,
          missing,
          present: [...present].sort(),
          hint:
            missing.length > 0
              ? "Run: npm run db:migrate"
              : "Auth user schema looks good.",
        },
        null,
        2,
      ),
    );

    if (missing.length > 0) process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[verify-auth-schema] failed", error);
  process.exit(1);
});
