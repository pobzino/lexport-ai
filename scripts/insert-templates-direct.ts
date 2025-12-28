/**
 * Insert templates using Supabase admin client
 * Run with: bun run scripts/insert-templates-direct.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const TEMPLATES_DIR = path.join(process.cwd(), "generated-templates");

// Use service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not set");
  console.log("Please add SUPABASE_SERVICE_ROLE_KEY to your .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("\n📥 Inserting templates into database (admin mode)...\n");

  // Clear existing templates
  const { error: deleteError } = await supabase
    .from("contract_templates")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

  if (deleteError) {
    console.error("Error clearing templates:", deleteError.message);
  } else {
    console.log("✓ Cleared existing templates\n");
  }

  // Read all JSON files
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} template files\n`);

  let successCount = 0;
  for (const file of files) {
    const filepath = path.join(TEMPLATES_DIR, file);
    const content = JSON.parse(fs.readFileSync(filepath, "utf-8"));

    const { error } = await supabase.from("contract_templates").insert({
      contract_type: content.contract_type,
      jurisdiction: content.jurisdiction,
      version: content.version,
      title: content.title,
      preamble: content.preamble,
      recitals: content.recitals,
      clauses: content.clauses,
      signature_block: content.signature_block,
      placeholders: content.placeholders,
      is_active: content.is_active,
      metadata: content.metadata,
    });

    if (error) {
      console.error(`❌ Failed: ${content.title} - ${error.message}`);
    } else {
      console.log(`✅ Inserted: ${content.title}`);
      successCount++;
    }
  }

  console.log(`\n✨ Done! Inserted ${successCount}/${files.length} templates\n`);
}

main().catch(console.error);
