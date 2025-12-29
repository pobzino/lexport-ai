/**
 * Generate SQL INSERT statements for templates
 * Run with: bun run scripts/generate-insert-sql.ts
 */

import * as fs from "fs";
import * as path from "path";

const TEMPLATES_DIR = path.join(process.cwd(), "generated-templates");

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith(".json"));

console.log("-- Contract Templates Insert SQL");
console.log("-- Generated: " + new Date().toISOString());
console.log("");

for (const file of files) {
  const filepath = path.join(TEMPLATES_DIR, file);
  const content = JSON.parse(fs.readFileSync(filepath, "utf-8"));

  const sql = `INSERT INTO contract_templates (
  contract_type,
  jurisdiction,
  version,
  title,
  preamble,
  recitals,
  clauses,
  signature_block,
  placeholders,
  is_active,
  metadata
) VALUES (
  '${escapeSQL(content.contract_type)}',
  '${escapeSQL(content.jurisdiction)}',
  ${content.version},
  '${escapeSQL(content.title)}',
  '${escapeSQL(content.preamble)}',
  '${escapeSQL(content.recitals)}',
  '${escapeSQL(JSON.stringify(content.clauses))}'::jsonb,
  '${escapeSQL(content.signature_block)}',
  '${escapeSQL(JSON.stringify(content.placeholders))}'::jsonb,
  ${content.is_active},
  '${escapeSQL(JSON.stringify(content.metadata))}'::jsonb
);`;

  console.log(`-- ${content.title}`);
  console.log(sql);
  console.log("");
}
