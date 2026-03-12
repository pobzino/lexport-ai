/**
 * Generate templates for specific jurisdictions using GPT-5.4
 *
 * Usage: bun run scripts/generate-jurisdiction-templates.ts --jurisdiction us_texas us_new_york
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

const MODEL = "gpt-5.4";

// ============================================================================
// Contract type specs
// ============================================================================

const CONTRACT_TYPES = [
  {
    type: "nda_mutual",
    title: "Mutual Non-Disclosure Agreement",
    clauses: [
      "Definitions",
      "Obligations of Receiving Party",
      "Term and Termination",
      "No License or Warranty",
      "Remedies",
      "Governing Law and Dispute Resolution",
      "Miscellaneous",
    ],
  },
  {
    type: "nda_one_way",
    title: "One-Way Non-Disclosure Agreement",
    clauses: [
      "Confidential Information",
      "Receiving Party Obligations",
      "Term",
      "Ownership",
      "Remedies",
      "General Provisions",
    ],
  },
  {
    type: "independent_contractor",
    title: "Independent Contractor Agreement",
    clauses: [
      "Services",
      "Term and Termination",
      "Compensation",
      "Independent Contractor Relationship",
      "Intellectual Property",
      "Confidentiality",
      "Representations and Warranties",
      "General Provisions",
    ],
  },
  {
    type: "consulting_agreement",
    title: "Consulting Agreement",
    clauses: [
      "Engagement and Services",
      "Term",
      "Compensation and Expenses",
      "Independent Contractor Status",
      "Confidentiality",
      "Intellectual Property",
      "Representations and Warranties",
      "Limitation of Liability",
      "General Provisions",
    ],
  },
  {
    type: "freelance_service",
    title: "Freelance Service Agreement",
    clauses: [
      "Scope of Work and Deliverables",
      "Payment Terms and Schedule",
      "Timeline and Milestones",
      "Revision Policy",
      "Intellectual Property Transfer",
      "Confidentiality",
      "Termination and Kill Fee",
      "Limitation of Liability",
      "General Provisions",
    ],
  },
];

// ============================================================================
// Jurisdiction context
// ============================================================================

const JURISDICTIONS: Record<string, { display: string; context: string }> = {
  us_california: {
    display: "California",
    context: `CALIFORNIA LAW — address these where relevant to the contract type:
1. AB5/ABC test: Reference Labor Code §2775+ for contractor classification. Classification depends on actual working relationship, not contract labels.
2. Labor Code §2870: In IP assignment clauses, add carve-out for inventions developed entirely on own time without company resources.
3. CCPA/CPRA: Brief data protection clause if personal information may be exchanged — 1-2 sentences max in NDAs, more detail in service agreements.
4. SB 331: Protected-disclosures carve-out for unlawful conduct.
5. Trade secrets: Confidentiality survives as long as info remains a trade secret; fixed period for non-trade-secret info.
6. Bus. & Prof. Code §16600: Do NOT include non-compete provisions.
7. DTSA whistleblower immunity notice (federal, required).
8. Keep it concise — don't over-explain California law to the reader. Just draft compliant provisions.`,
  },
  us_texas: {
    display: "Texas",
    context: `TEXAS LAW — address these where relevant to the contract type:
1. Non-competes: Enforceable if ancillary to an otherwise enforceable agreement, reasonable in scope/geography/duration. Courts may reform overly broad restrictions. Include only if appropriate for this contract type.
2. Texas Uniform Trade Secrets Act (TUTSA): Reference for trade secret protections.
3. At-will: Texas strongly presumes at-will employment/engagement. Termination provisions should reflect this.
4. Texas Business and Commerce Code governs commercial transactions.
5. No state income tax — contractor/consultant tax provisions differ from CA.
6. Texas does NOT have California-style AB5, §2870, or CCPA. Do NOT include California-specific provisions.
7. DTSA whistleblower immunity notice still applies (federal law).
8. Venue: Use Texas state/federal courts, not JAMS arbitration unless specified.`,
  },
  us_new_york: {
    display: "New York",
    context: `NEW YORK LAW — address these where relevant to the contract type:
1. Non-competes: Recent restrictions on non-compete agreements. Include only if appropriate and note enforceability limits.
2. Common-law test for independent contractor classification (not ABC test like CA).
3. NY General Obligations Law §5-1401 allows choice of NY law for contracts over $250k.
4. Strong consumer protection laws.
5. CPLR Article 63 for preliminary injunctions — stronger injunctive relief framework.
6. NY does NOT have California-style AB5, §2870, or CCPA. Do NOT include California-specific provisions.
7. NY SHIELD Act: Data security requirements for personal information of NY residents.
8. DTSA whistleblower immunity notice still applies (federal law).
9. Venue: New York County (Manhattan) state/federal courts is standard.
10. Freelance Isn't Free Act: Written contracts required for freelance engagements over $800, payment within 30 days.`,
  },
};

// ============================================================================
// Generation
// ============================================================================

async function generateTemplate(
  contractType: typeof CONTRACT_TYPES[number],
  jurisdictionKey: string,
  jurisdiction: typeof JURISDICTIONS[string]
) {
  const typeName = contractType.type.replace(/_/g, " ").toUpperCase();

  const systemPrompt = `You are a senior contract attorney drafting a ${contractType.title} template for ${jurisdiction.display}.

YOUR AUDIENCE: Startup founders, freelancers, and small business owners — NOT law firms. Write in plain English. A founder should understand what they're signing.

${jurisdiction.context}

DRAFTING RULES:
1. PLAIN ENGLISH — Avoid Latin phrases and unnecessary legalese. Use "if" not "in the event that". Use "must" not "shall" where natural.
2. RIGHT-SIZED — Each clause: 120-250 words. Major clauses (definitions, IP, confidentiality) up to 300 words. Don't pad.
3. JURISDICTION-SPECIFIC — Only include provisions relevant to ${jurisdiction.display}. Do NOT copy California-specific provisions (AB5, §2870, CCPA, SB 331) into a ${jurisdiction.display} template.
4. PLACEHOLDERS — Use {{placeholder}} syntax. Add brief inline guidance: "{{term_length}} (e.g., 2 years)".
5. ONLY WHAT'S NEEDED — If a provision doesn't apply to this contract type, don't include it. An NDA doesn't need invention assignment language. A consulting agreement doesn't need a kill fee.
6. TOTAL LENGTH — NDAs: ~1,500-2,000 words. Service/contractor agreements: ~2,500-3,500 words.
7. DTSA notice — Include the federal Defend Trade Secrets Act whistleblower immunity notice in the remedies or confidentiality clause (this is federal, applies in all states).

Return the COMPLETE template with full clause content. No abbreviations, no "[...]", no "same as above".`;

  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "high" },
    instructions: systemPrompt,
    input: `Generate a complete ${contractType.title} for ${jurisdiction.display} with these clauses: ${contractType.clauses.join(", ")}`,
    text: {
      format: {
        type: "json_schema",
        name: "template",
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
                  key: { type: "string" as const },
                  label: { type: "string" as const },
                  field_type: { type: "string" as const, enum: ["text", "date", "number", "email", "address"] },
                  is_required: { type: "boolean" as const },
                },
                required: ["key", "label", "field_type", "is_required"] as const,
                additionalProperties: false,
              },
            },
          },
          required: ["preamble", "recitals", "clauses", "signature_block", "placeholders"] as const,
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

// ============================================================================
// Quick score
// ============================================================================

async function quickScore(template: {
  title: string;
  contract_type: string;
  jurisdiction: string;
  clauses: Array<{ title: string; content: string }>;
  preamble: string;
}) {
  const clausesText = template.clauses.map((c, i) => `${c.title}: ${c.content.slice(0, 200)}...`).join("\n");

  const response = await openai.responses.create({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: `Score this ${template.contract_type} template 0-100. Quick check: legal accuracy, clause depth, placeholder usage, jurisdiction compliance, readability. Verdict: publish (85+), revise (50-84), reject (<50).`,
    input: `${template.title} (${template.jurisdiction})\nPreamble: ${template.preamble.slice(0, 200)}\nClauses: ${clausesText}`,
    text: {
      format: {
        type: "json_schema",
        name: "score",
        schema: {
          type: "object" as const,
          properties: {
            score: { type: "number" as const },
            verdict: { type: "string" as const, enum: ["publish", "revise", "reject"] },
          },
          required: ["score", "verdict"] as const,
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
  const argJurisdictions = process.argv.filter(a => a.startsWith("us_") || a === "uk");
  const targetJurisdictions = argJurisdictions.length > 0
    ? argJurisdictions
    : ["us_texas", "us_new_york"];

  console.log(`\n📝 Generating templates for ${targetJurisdictions.join(", ")} (model: ${MODEL})\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const jKey of targetJurisdictions) {
    const jurisdiction = JURISDICTIONS[jKey];
    if (!jurisdiction) {
      console.error(`Unknown jurisdiction: ${jKey}`);
      continue;
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${jurisdiction.display}`);
    console.log(`${"═".repeat(60)}\n`);

    for (const contractType of CONTRACT_TYPES) {
      const label = `${contractType.type} / ${jKey}`;
      const title = `${contractType.title} (${jurisdiction.display})`;

      // Check if exists
      const { data: existing } = await supabase
        .from("contract_templates")
        .select("id")
        .eq("contract_type", contractType.type)
        .eq("jurisdiction", jKey)
        .single();

      if (existing) {
        console.log(`  ⏭️  ${label} — already exists`);
        skipped++;
        continue;
      }

      process.stdout.write(`  🔧 ${label}...`);

      try {
        const result = await generateTemplate(contractType, jKey, jurisdiction);

        const totalWords = result.clauses.reduce(
          (sum: number, c: { content: string }) => sum + countWords(c.content),
          0
        );
        const avgWords = Math.round(totalWords / result.clauses.length);

        // Convert placeholders array to map
        const placeholdersMap: Record<string, { label: string; type: string; required: boolean }> = {};
        for (const p of result.placeholders) {
          placeholdersMap[p.key] = { label: p.label, type: p.field_type, required: p.is_required };
        }

        // Insert
        const { error: insertError } = await supabase.from("contract_templates").insert({
          contract_type: contractType.type,
          jurisdiction: jKey,
          title,
          preamble: result.preamble,
          recitals: result.recitals,
          clauses: result.clauses,
          signature_block: result.signature_block,
          placeholders: placeholdersMap,
          is_active: true,
          version: 1,
          metadata: {
            generated_by: MODEL,
            generated_at: new Date().toISOString(),
            clause_count: result.clauses.length,
            total_words: totalWords,
          },
        });

        if (insertError) {
          console.log(` ❌ DB: ${insertError.message}`);
          errors++;
          continue;
        }

        // Quick score
        const score = await quickScore({
          title,
          contract_type: contractType.type,
          jurisdiction: jKey,
          clauses: result.clauses,
          preamble: result.preamble,
        });

        const icon = score.verdict === "publish" ? "✅" : score.verdict === "revise" ? "🔶" : "❌";
        console.log(` ${icon} ${score.score}/100 | ${result.clauses.length} clauses, ${totalWords} words (avg ${avgWords})`);

        // Print clause breakdown
        for (const clause of result.clauses) {
          const words = countWords(clause.content);
          const bar = words >= 120 ? "✅" : words >= 80 ? "🟡" : "🔴";
          console.log(`     ${bar} ${clause.title}: ${words} words`);
        }

        created++;
      } catch (err) {
        console.log(` ❌ ${err instanceof Error ? err.message : "Unknown"}`);
        errors++;
      }
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`Done: ${created} created, ${skipped} skipped, ${errors} errors`);
  console.log(`${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
