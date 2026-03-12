/**
 * Revise contract_templates using GPT-5.4
 *
 * Fetches each active template, sends it to GPT-5.4 with review feedback,
 * and updates the template in-place with the improved version.
 *
 * Usage: bun run scripts/revise-templates.ts [--dry-run] [--type nda_mutual]
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

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const typeFilter = args.includes("--type") ? args[args.indexOf("--type") + 1] : null;

const MODEL = "gpt-5.4";

// ============================================================================
// Jurisdiction-specific revision context
// ============================================================================

const JURISDICTION_REVISION_CONTEXT: Record<string, string> = {
  us_california: `CALIFORNIA-SPECIFIC REQUIREMENTS — you MUST address these:
1. AB5/ABC test: Reference Labor Code §2775+ (NOT §2750.3 which is outdated). In contractor agreements, note that classification depends on actual working relationship, not contract labels. Include ABC test elements only where a qualifying exemption applies.
2. Labor Code §2870: In IP assignment clauses, add a carve-out noting that assignment does not apply to inventions developed entirely on the individual's own time without use of the hiring party's equipment, supplies, facilities, or trade secret information, where the invention does not relate to the company's business or R&D.
3. CCPA/CPRA: Add a brief data protection clause if personal information may be exchanged — permitted use, reasonable security, breach notice, return/deletion.
4. SB 331 (Silenced No More Act): Add a protected-disclosures carve-out stating nothing restricts disclosures about unlawful conduct, harassment, discrimination, or legally protected reporting.
5. Trade secrets: Confidentiality for trade secrets survives for as long as information remains a trade secret; use a fixed period only for non-trade-secret confidential information.
6. Bus. & Prof. Code §16600: Do NOT include non-compete provisions. Non-solicitation of employees is also risky in California — omit or flag as optional.
7. DTSA: Include federal Defend Trade Secrets Act whistleblower immunity notice where trade secrets are protected.`,
};

// ============================================================================
// Revision prompt
// ============================================================================

async function reviseTemplate(template: {
  id: string;
  title: string;
  contract_type: string;
  jurisdiction: string;
  preamble: string | null;
  recitals: string | null;
  clauses: Array<{ title: string; content: string; type: string }>;
  signature_block: string | null;
  placeholders: Record<string, unknown>;
}) {
  const clausesText = template.clauses
    .map((c, i) => `CLAUSE ${i + 1}: ${c.title}\nType: ${c.type}\nContent:\n${c.content}`)
    .join("\n\n---\n\n");

  const jurisdictionContext = JURISDICTION_REVISION_CONTEXT[template.jurisdiction] || "";
  const typeName = template.contract_type.replace(/_/g, " ").toUpperCase();

  const systemPrompt = `You are a senior contract attorney revising a ${typeName} template for ${template.jurisdiction.replace("us_", "").replace("_", " ")}.

YOUR AUDIENCE: Startup founders, freelancers, and small business owners — NOT law firms. These are non-lawyers who need enforceable protection without legal jargon overload.

REVISION PRINCIPLES:
1. CLEAR LANGUAGE — Use plain English where possible. Avoid Latin phrases and unnecessary legalese. A founder should understand what they're signing.
2. RIGHT-SIZED CLAUSES — Each clause should be 120-250 words. Long enough to be enforceable and cover key scenarios, short enough to actually read. Major clauses (definitions, IP, confidentiality) can go up to 300 words. Minor clauses (notices, counterparts) can be shorter.
3. FIX LEGAL ISSUES — Update outdated citations, add missing jurisdiction-specific protections, fix gaps that could make the contract unenforceable. But don't add every possible provision — only what a startup/freelancer actually needs.
4. PRACTICAL PLACEHOLDERS — Use {{placeholder}} syntax. Add brief inline guidance in parentheses where helpful, e.g., "{{term_length}} (e.g., 2 years)".
5. TOTAL TEMPLATE LENGTH — Target 5-8 pages for NDAs, 8-12 pages for service/contractor agreements. If the original is too short, expand substantive clauses. Do NOT pad with boilerplate.
6. KEEP STRUCTURE — Maintain the same clause titles/order. You may split a clause into sub-clauses or add 1-2 new clauses if truly needed, but don't restructure the whole agreement.

${jurisdictionContext}

CRITICAL: Return the COMPLETE revised template. Every clause must have full content — do not abbreviate or use "..." or "[same as before]". The output replaces the original entirely.`;

  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "high" },
    instructions: systemPrompt,
    input: `Revise this ${typeName} template:\n\nTITLE: ${template.title}\n\nPREAMBLE:\n${template.preamble || "(empty)"}\n\nRECITALS:\n${template.recitals || "(empty)"}\n\nCLAUSES:\n${clausesText}\n\nSIGNATURE BLOCK:\n${template.signature_block || "(empty)"}\n\nPLACEHOLDERS: ${JSON.stringify(template.placeholders)}`,
    text: {
      format: {
        type: "json_schema",
        name: "revised_template",
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
            placeholders: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  key: { type: "string" as const, description: "Placeholder key, e.g. party_a_name" },
                  label: { type: "string" as const },
                  field_type: { type: "string" as const, enum: ["text", "date", "number", "email", "address"] },
                  is_required: { type: "boolean" as const },
                },
                required: ["key", "label", "field_type", "is_required"] as const,
                additionalProperties: false,
              },
            },
            revision_notes: {
              type: "string" as const,
              description: "Brief summary of what was changed and why",
            },
          },
          required: ["preamble", "recitals", "clauses", "signature_block", "placeholders", "revision_notes"] as const,
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

// ============================================================================
// Quick re-review (to score the revised version)
// ============================================================================

async function scoreTemplate(template: {
  title: string;
  contract_type: string;
  jurisdiction: string;
  preamble: string;
  recitals: string;
  clauses: Array<{ title: string; content: string; type: string }>;
  signature_block: string;
}) {
  const clausesText = template.clauses
    .map((c, i) => `CLAUSE ${i + 1}: ${c.title}\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: `Score this ${template.contract_type.replace(/_/g, " ")} template 0-100. Consider: legal accuracy, clause depth, placeholder usage, jurisdiction compliance, readability for non-lawyers. Verdict: "publish" (85+), "revise" (50-84), "reject" (<50).`,
    input: `${template.title}\n\nPREAMBLE:\n${template.preamble}\n\nCLAUSES:\n${clausesText}`,
    text: {
      format: {
        type: "json_schema",
        name: "score",
        schema: {
          type: "object" as const,
          properties: {
            score: { type: "number" as const },
            verdict: { type: "string" as const, enum: ["publish", "revise", "reject"] },
            summary: { type: "string" as const },
          },
          required: ["score", "verdict", "summary"] as const,
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

// ============================================================================
// Main
// ============================================================================

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function main() {
  console.log(`\n✏️  Template Revision (model: ${MODEL}, dry-run: ${isDryRun})\n`);

  let query = supabase
    .from("contract_templates")
    .select("id, title, contract_type, jurisdiction, preamble, recitals, clauses, signature_block, placeholders")
    .eq("is_active", true)
    .order("contract_type");

  if (typeFilter) query = query.eq("contract_type", typeFilter);

  const { data: templates, error } = await query;

  if (error || !templates?.length) {
    console.error("No templates found:", error?.message);
    process.exit(1);
  }

  console.log(`Found ${templates.length} template(s) to revise\n`);

  for (const template of templates) {
    const label = `${template.contract_type} / ${template.jurisdiction}`;
    const oldClauses = template.clauses as Array<{ title: string; content: string; type: string }>;
    const oldWordCount = oldClauses.reduce((sum, c) => sum + countWords(c.content), 0);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📄 ${label}`);
    console.log(`   Original: ${oldClauses.length} clauses, ${oldWordCount} total words (avg ${Math.round(oldWordCount / oldClauses.length)}/clause)`);

    process.stdout.write(`   Revising with ${MODEL} (high reasoning)...`);

    try {
      const revised = await reviseTemplate({
        ...template,
        clauses: oldClauses,
        placeholders: (template.placeholders as Record<string, unknown>) || {},
      });

      const newWordCount = revised.clauses.reduce(
        (sum: number, c: { content: string }) => sum + countWords(c.content),
        0
      );
      const avgWords = Math.round(newWordCount / revised.clauses.length);

      console.log(` done`);
      console.log(`   Revised:  ${revised.clauses.length} clauses, ${newWordCount} total words (avg ${avgWords}/clause)`);
      console.log(`   Change:   ${newWordCount - oldWordCount > 0 ? "+" : ""}${newWordCount - oldWordCount} words`);
      console.log(`   Notes:    ${revised.revision_notes}`);

      // Print clause breakdown
      for (const clause of revised.clauses) {
        const words = countWords(clause.content);
        const bar = words >= 120 ? "✅" : words >= 80 ? "🟡" : "🔴";
        console.log(`     ${bar} ${clause.title}: ${words} words`);
      }

      if (!isDryRun) {
        // Convert placeholders array back to map
        const placeholdersMap: Record<string, { label: string; type: string; required: boolean }> = {};
        for (const p of revised.placeholders) {
          placeholdersMap[p.key] = { label: p.label, type: p.field_type, required: p.is_required };
        }

        // Update in database
        const { error: updateError } = await supabase
          .from("contract_templates")
          .update({
            preamble: revised.preamble,
            recitals: revised.recitals,
            clauses: revised.clauses,
            signature_block: revised.signature_block,
            placeholders: placeholdersMap,
            metadata: {
              revised_by: MODEL,
              revised_at: new Date().toISOString(),
              revision_notes: revised.revision_notes,
              pre_revision_word_count: oldWordCount,
              post_revision_word_count: newWordCount,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", template.id);

        if (updateError) {
          console.log(`   ❌ DB update failed: ${updateError.message}`);
          continue;
        }
        console.log(`   ✅ Saved to database`);

        // Quick re-score
        process.stdout.write(`   Re-scoring...`);
        const score = await scoreTemplate({
          title: template.title,
          contract_type: template.contract_type,
          jurisdiction: template.jurisdiction,
          preamble: revised.preamble,
          recitals: revised.recitals,
          clauses: revised.clauses,
          signature_block: revised.signature_block,
        });

        const icon = score.verdict === "publish" ? "✅" : score.verdict === "revise" ? "🔶" : "❌";
        console.log(` ${icon} ${score.score}/100 — ${score.verdict}`);
        console.log(`   ${score.summary}`);
      } else {
        console.log(`   (dry-run — not saved)`);
      }
    } catch (err) {
      console.log(` ❌ Error: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    console.log();
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Revision complete.`);
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
