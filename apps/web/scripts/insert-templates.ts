/**
 * Insert generated templates into Supabase database
 *
 * Run with: bun run scripts/insert-templates.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const TEMPLATES_DIR = path.join(process.cwd(), "generated-templates");

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("\n📥 Inserting templates into database...\n");

  // Read all JSON files
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith(".json"));

  console.log(`Found ${files.length} template files\n`);

  for (const file of files) {
    const filepath = path.join(TEMPLATES_DIR, file);
    const content = JSON.parse(fs.readFileSync(filepath, "utf-8"));

    // Check if template already exists
    const { data: existing } = await supabase
      .from("contract_templates")
      .select("id")
      .eq("contract_type", content.contract_type)
      .eq("jurisdiction", content.jurisdiction)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("contract_templates")
        .update({
          version: content.version,
          title: content.title,
          preamble: content.preamble,
          recitals: content.recitals,
          clauses: content.clauses,
          signature_block: content.signature_block,
          placeholders: content.placeholders,
          is_active: content.is_active,
          metadata: content.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error(`❌ Failed to update ${file}:`, error.message);
      } else {
        console.log(`🔄 Updated: ${content.title}`);
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("contract_templates")
        .insert({
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
        console.error(`❌ Failed to insert ${file}:`, error.message);
      } else {
        console.log(`✅ Inserted: ${content.title}`);
      }
    }
  }

  console.log("\n✨ Done!\n");
}

main().catch(console.error);
