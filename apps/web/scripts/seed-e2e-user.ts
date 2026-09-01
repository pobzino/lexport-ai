/**
 * Seed a deterministic E2E test user via the Supabase service role.
 *
 *   bun run scripts/seed-e2e-user.ts
 *
 * Reads E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD (+ Supabase URL + service role key)
 * from the environment (load .env.e2e first). Idempotent: updates the password
 * if the user already exists.
 *
 * SAFETY: refuses to run against the production Supabase unless E2E_SEED_FORCE=1.
 * Prefer pointing NEXT_PUBLIC_SUPABASE_URL at a throwaway test project so test
 * users never land in prod auth.
 */
import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_LOGIN_EMAIL;
const password = process.env.E2E_LOGIN_PASSWORD;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!url || !serviceKey) fail("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
if (!email || !password) fail("Missing E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD (load .env.e2e)");

// Guard: don't seed test users into the prod project by accident.
const looksProd = /(vpbzfcnlnhdjxlaxkldb|rcyarqbyrzvlehughoyz)/.test(url);
if (looksProd && process.env.E2E_SEED_FORCE !== "1") {
  fail(
    "Refusing to seed into the PRODUCTION Supabase. Point NEXT_PUBLIC_SUPABASE_URL " +
      "at a test project, or set E2E_SEED_FORCE=1 to override."
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  let existing: User | null = null;
  const perPage = 100;
  for (let page = 1; page <= 100; page += 1) {
    const { data: list, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) fail(`listUsers failed: ${error.message}`);
    existing = list.users.find((user) => user.email === email) || null;
    if (existing || list.users.length < perPage) break;
  }

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) fail(`updateUserById failed: ${error.message}`);
    console.log(`✓ Updated existing E2E user: ${email} (${existing.id})`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) fail(`createUser failed: ${error.message}`);
    console.log(`✓ Created E2E user: ${email} (${data.user?.id})`);
  }
  console.log("  → global-setup can now log in and run the authenticated suite.");
}

main().catch((e) => fail(e?.message ?? String(e)));
