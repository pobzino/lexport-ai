/**
 * Apply enhanced template SQL updates to Supabase
 */
import { config } from "dotenv";
config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UpdateData {
  id: string;
  preamble: string;
  recitals: string;
  clauses: any[];
  signature_block: string;
  placeholders: any[];
  metadata: Record<string, unknown>;
}

function parseUpdateStatement(sql: string): UpdateData | null {
  try {
    // Extract ID
    const idMatch = sql.match(/WHERE id = '([^']+)'/);
    if (!idMatch) return null;
    const id = idMatch[1];

    // Find positions of each field
    const preambleStart = sql.indexOf("preamble = '") + 12;
    const recitalsMarker = sql.indexOf("',\n  recitals = '");
    const clausesMarker = sql.indexOf("',\n  clauses = '");
    const sigMarker = sql.indexOf("',\n  signature_block = '");
    const placeholdersMarker = sql.indexOf("',\n  placeholders = '");
    const metadataMarker = sql.indexOf("'::jsonb,\n  metadata = '");

    // Extract preamble
    const preamble = sql.substring(preambleStart, recitalsMarker).replace(/''/g, "'");

    // Extract recitals
    const recitalsStart = recitalsMarker + 17;
    const recitals = sql.substring(recitalsStart, clausesMarker).replace(/''/g, "'");

    // Extract clauses JSON - find the complete array
    const clausesStart = clausesMarker + 16;
    const clausesEnd = sql.indexOf("]'::jsonb,\n  signature_block", clausesStart) + 1;
    const clausesJson = sql.substring(clausesStart, clausesEnd).replace(/''/g, "'");
    const clauses = JSON.parse(clausesJson);

    // Extract signature_block
    const sigStart = sigMarker + 24;
    const sigEnd = sql.indexOf("',\n  placeholders = '", sigStart);
    const signature_block = sql.substring(sigStart, sigEnd).replace(/''/g, "'");

    // Extract placeholders JSON
    const placeholdersStart = placeholdersMarker + 21;
    const placeholdersEnd = sql.indexOf("]'::jsonb,\n  metadata", placeholdersStart) + 1;
    const placeholdersJson = sql.substring(placeholdersStart, placeholdersEnd).replace(/''/g, "'");
    const placeholders = JSON.parse(placeholdersJson);

    // Extract metadata JSON
    const metadataStart = metadataMarker + 24;
    const metadataEnd = sql.indexOf("}'::jsonb\nWHERE", metadataStart) + 1;
    const metadataJson = sql.substring(metadataStart, metadataEnd).replace(/''/g, "'");
    const metadata = JSON.parse(metadataJson);

    return { id, preamble, recitals, clauses, signature_block, placeholders, metadata };
  } catch (e: any) {
    console.error("Parse error:", e.message);
    console.error("SQL snippet:", sql.substring(0, 200));
    return null;
  }
}

async function main() {
  const sqlFile = process.argv[2] || "/tmp/enhanced_templates_final.sql";
  console.log(`Reading SQL from: ${sqlFile}`);

  const sql = readFileSync(sqlFile, "utf-8");

  // Split by UPDATE statements
  const statements = sql.split(/(?=UPDATE contract_templates SET)/g)
    .filter(s => s.trim().startsWith("UPDATE"));

  console.log(`Found ${statements.length} UPDATE statements\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    const data = parseUpdateStatement(stmt);
    if (!data) {
      console.log(`[${i + 1}/${statements.length}] Failed to parse`);
      failed++;
      continue;
    }

    console.log(`[${i + 1}/${statements.length}] Updating ${data.id.slice(0, 8)}... (${data.metadata.jurisdiction || 'unknown'} - ${data.clauses.length} clauses)`);

    const { error } = await supabase
      .from("contract_templates")
      .update({
        preamble: data.preamble,
        recitals: data.recitals,
        clauses: data.clauses,
        signature_block: data.signature_block,
        placeholders: data.placeholders,
        metadata: data.metadata,
      })
      .eq("id", data.id);

    if (error) {
      console.log(`  ✗ Error: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ Updated successfully`);
      success++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${success} succeeded, ${failed} failed`);
}

main().catch(console.error);
