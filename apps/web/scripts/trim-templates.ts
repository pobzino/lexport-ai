/**
 * Trim "lawyer insurance" bloat from California templates.
 *
 * Removes provisions that don't apply to the specific contract type:
 * - Invention assignment (§2870) notes in NDAs
 * - AB5/worker classification notes in NDAs
 * - Overly detailed CCPA in simple NDAs
 * - Duplicate heading artifacts ("CLAUSE 1: Clause 1")
 *
 * Usage: bun run scripts/trim-templates.ts [--dry-run]
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

async function trimTemplate(template: {
  id: string;
  title: string;
  contract_type: string;
  jurisdiction: string;
  preamble: string;
  recitals: string;
  clauses: Array<{ title: string; content: string; type: string }>;
  signature_block: string;
}) {
  const contractType = template.contract_type;
  const isNDA = contractType.startsWith("nda_");

  const clausesText = template.clauses
    .map((c, i) => `CLAUSE ${i + 1}: ${c.title}\nType: ${c.type}\n${c.content}`)
    .join("\n\n---\n\n");

  const trimRules = [];

  if (isNDA) {
    trimRules.push(
      "REMOVE any subsections about Labor Code §2870 / invention assignment — this is an NDA, not an IP assignment agreement. A brief note that this NDA doesn't assign IP is fine, but delete the multi-sentence explanation of §2870.",
      "REMOVE any subsections about AB5 / Labor Code §2775 / worker classification — this is an NDA, not an employment or contractor agreement. Delete entirely.",
      "SIMPLIFY CCPA/CPRA language — keep it to 1-2 sentences max. NDAs aren't data processing agreements. Something like 'If Confidential Information includes personal information, the Receiving Party will apply reasonable security measures and notify the Disclosing Party of any security incident.' is enough.",
      "REMOVE any subsections about non-compete / §16600 — simply don't include non-compete language rather than explaining why it's omitted.",
    );
  }

  trimRules.push(
    "FIX duplicate clause headings like 'CLAUSE 1: Clause 1' — use clean titles like '1. Definitions' or just 'Definitions'.",
    "DEFINE 'Purpose' in the preamble or recitals if it's referenced in clauses but never formally defined. Use the {{purpose}} placeholder.",
    "KEEP the DTSA whistleblower immunity notice — it's federal law and required. But it can be in a single paragraph, not multiple.",
    "DO NOT add new content. Only trim, simplify, and fix formatting. The goal is SHORTER, not longer.",
  );

  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "medium" },
    instructions: `You are editing a ${template.contract_type.replace(/_/g, " ")} template to remove bloat and fix formatting issues. Return the complete revised template.

TRIM RULES:
${trimRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

IMPORTANT: Return ALL clauses with full content. Do not abbreviate or use "[...]". The output replaces the original.`,
    input: `TEMPLATE: ${template.title}\n\nPREAMBLE:\n${template.preamble}\n\nRECITALS:\n${template.recitals}\n\nCLAUSES:\n${clausesText}\n\nSIGNATURE BLOCK:\n${template.signature_block}`,
    text: {
      format: {
        type: "json_schema",
        name: "trimmed_template",
        schema: {
          type: "object" as const,
          properties: {
            preamble: { type: "string" as const },
            recitals: { type: "string" as const },
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
            signature_block: { type: "string" as const },
            changes_made: { type: "string" as const, description: "Brief list of what was trimmed/fixed" },
          },
          required: ["preamble", "recitals", "clauses", "signature_block", "changes_made"] as const,
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

async function main() {
  console.log(`\n✂️  Template Trim Pass (model: ${MODEL}, dry-run: ${isDryRun})\n`);

  // Only trim California templates (TX/NY were generated clean)
  const { data: templates, error } = await supabase
    .from("contract_templates")
    .select("id, title, contract_type, jurisdiction, preamble, recitals, clauses, signature_block")
    .eq("jurisdiction", "us_california")
    .eq("is_active", true)
    .order("contract_type");

  if (error || !templates?.length) {
    console.error("No templates found:", error?.message);
    return;
  }

  console.log(`Found ${templates.length} California template(s) to trim\n`);

  for (const template of templates) {
    const clauses = template.clauses as Array<{ title: string; content: string; type: string }>;
    const oldWords = clauses.reduce((s, c) => s + countWords(c.content), 0);

    process.stdout.write(`  ${template.contract_type}...`);

    try {
      const trimmed = await trimTemplate({ ...template, clauses });

      const newWords = trimmed.clauses.reduce(
        (s: number, c: { content: string }) => s + countWords(c.content),
        0
      );
      const diff = newWords - oldWords;

      console.log(` ${diff < 0 ? diff : "+" + diff} words (${oldWords} → ${newWords})`);
      console.log(`    Changes: ${trimmed.changes_made}`);

      for (const clause of trimmed.clauses) {
        const w = countWords(clause.content);
        console.log(`    ${w >= 100 ? "✅" : w >= 60 ? "🟡" : "🔴"} ${clause.title}: ${w} words`);
      }

      if (!isDryRun) {
        const { error: updateError } = await supabase
          .from("contract_templates")
          .update({
            preamble: trimmed.preamble,
            recitals: trimmed.recitals,
            clauses: trimmed.clauses,
            signature_block: trimmed.signature_block,
            updated_at: new Date().toISOString(),
          })
          .eq("id", template.id);

        if (updateError) {
          console.log(`    ❌ DB: ${updateError.message}`);
        } else {
          console.log(`    ✅ Saved`);
        }
      }
    } catch (err) {
      console.log(` ❌ ${err instanceof Error ? err.message : "Unknown"}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
