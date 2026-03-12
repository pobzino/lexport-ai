/**
 * Remove DTSA whistleblower immunity notices from all templates.
 *
 * Usage: bun run scripts/strip-dtsa.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

const isDryRun = process.argv.includes("--dry-run");
const MODEL = "gpt-5.4";

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function stripDTSA(template: {
  id: string;
  title: string;
  clauses: Array<{ title: string; content: string; type: string }>;
}) {
  const clausesText = template.clauses
    .map((c, i) => `CLAUSE ${i + 1}: ${c.title}\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: `Remove ALL references to the Defend Trade Secrets Act (DTSA) whistleblower immunity notice from this template. This includes:
- Any paragraph mentioning "an individual will not be held criminally or civilly liable under federal or state trade secret law"
- Any paragraph about disclosing trade secrets to government officials or attorneys
- Any mention of "Defend Trade Secrets Act" or "DTSA"
- Any mention of filing complaints under seal related to trade secret retaliation

Keep everything else exactly the same. Do NOT add anything new. Do NOT rephrase other content. Just surgically remove DTSA language.

Return ALL clauses with their complete content (minus the DTSA parts).`,
    input: clausesText,
    text: {
      format: {
        type: "json_schema",
        name: "stripped",
        schema: {
          type: "object" as const,
          properties: {
            clauses: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  title: { type: "string" as const },
                  content: { type: "string" as const },
                  type: { type: "string" as const, enum: ["standard", "optional", "jurisdiction_specific"] },
                },
                required: ["title", "content", "type"] as const,
                additionalProperties: false,
              },
            },
          },
          required: ["clauses"] as const,
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

async function main() {
  console.log(`\n🗑️  Stripping DTSA from all templates (dry-run: ${isDryRun})\n`);

  const { data: templates, error } = await supabase
    .from("contract_templates")
    .select("id, title, contract_type, jurisdiction, clauses")
    .eq("is_active", true)
    .order("contract_type")
    .order("jurisdiction");

  if (error || !templates?.length) {
    console.error("No templates:", error?.message);
    return;
  }

  console.log(`Found ${templates.length} templates\n`);

  for (const template of templates) {
    const clauses = template.clauses as Array<{ title: string; content: string; type: string }>;
    const hasDTSA = clauses.some(c =>
      c.content.toLowerCase().includes("defend trade secrets act") ||
      c.content.toLowerCase().includes("dtsa") ||
      c.content.toLowerCase().includes("will not be held criminally or civilly liable")
    );

    if (!hasDTSA) {
      console.log(`  ⏭️  ${template.contract_type}/${template.jurisdiction} — no DTSA found`);
      continue;
    }

    const oldWords = clauses.reduce((s, c) => s + countWords(c.content), 0);
    process.stdout.write(`  ✂️  ${template.contract_type}/${template.jurisdiction}...`);

    try {
      const result = await stripDTSA({ ...template, clauses });
      const newWords = result.clauses.reduce(
        (s: number, c: { content: string }) => s + countWords(c.content), 0
      );

      console.log(` ${oldWords - newWords} words removed (${oldWords} → ${newWords})`);

      if (!isDryRun) {
        const { error: updateError } = await supabase
          .from("contract_templates")
          .update({
            clauses: result.clauses,
            updated_at: new Date().toISOString(),
          })
          .eq("id", template.id);

        if (updateError) {
          console.log(`    ❌ ${updateError.message}`);
        } else {
          console.log(`    ✅ Saved`);
        }
      }
    } catch (err) {
      console.log(` ❌ ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  console.log(`\nDone.\n`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
