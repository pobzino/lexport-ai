/**
 * Review all active contract templates using GPT-5.4
 *
 * Usage: bun run scripts/review-templates.ts [--quick] [--type nda_mutual] [--jurisdiction us_california]
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Load env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars. Run with: bun run scripts/review-templates.ts");
  process.exit(1);
}
if (!OPENAI_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// Parse args
const args = process.argv.slice(2);
const isQuick = args.includes("--quick");
const typeFilter = args.includes("--type") ? args[args.indexOf("--type") + 1] : null;
const jurisdictionFilter = args.includes("--jurisdiction") ? args[args.indexOf("--jurisdiction") + 1] : null;

const REVIEW_MODEL = "gpt-5.4";

// ============================================================================
// Jurisdiction context
// ============================================================================

const JURISDICTION_CONTEXT: Record<string, string> = {
  us_california: "California: Non-competes unenforceable (§16600), AB5 ABC test, CCPA, SB 331, Labor Code §2870",
  us_texas: "Texas: Non-competes enforceable if reasonable, TUTSA, at-will employment, broad indemnification",
  us_new_york: "New York: Recent non-compete restrictions, common-law contractor test, CPLR Article 63",
  uk: "UK: GDPR, IR35, Consumer Rights Act 2015, Unfair Contract Terms Act 1977, Employment Rights Act",
};

// ============================================================================
// Review functions
// ============================================================================

interface TemplateRow {
  id: string;
  title: string;
  contract_type: string;
  jurisdiction: string;
  preamble: string | null;
  recitals: string | null;
  clauses: unknown;
  signature_block: string | null;
}

async function fullReview(template: TemplateRow) {
  const clauses = (template.clauses as Array<{ title: string; content: string; type?: string }>) || [];
  const clausesText = clauses
    .map((c, i) => `CLAUSE ${i + 1}: ${c.title}\nContent:\n${c.content}\n---`)
    .join("\n\n");

  const jurisdictionContext = JURISDICTION_CONTEXT[template.jurisdiction] || "";
  const typeName = template.contract_type.replace(/_/g, " ").toUpperCase();

  const response = await openai.responses.create({
    model: REVIEW_MODEL,
    reasoning: { effort: "medium" },
    instructions: `You are a senior legal quality reviewer. Review this ${typeName} template for ${template.jurisdiction}. ${jurisdictionContext}

Evaluate: legal accuracy, clause completeness (are clauses substantive, 150+ words each?), placeholder usage ({{party_a_name}} etc — flag hardcoded names/dates), jurisdiction compliance, professional language.

Score 0-100. Verdict: "publish" (85+), "revise" (50-84), "reject" (<50).`,
    input: `TEMPLATE: ${template.title}\n\nPREAMBLE:\n${template.preamble || "(empty)"}\n\nRECITALS:\n${template.recitals || "(empty)"}\n\nCLAUSES:\n${clausesText || "(none)"}\n\nSIGNATURE BLOCK:\n${template.signature_block || "(empty)"}`,
    text: {
      format: {
        type: "json_schema",
        name: "template_review",
        schema: {
          type: "object" as const,
          properties: {
            qualityScore: { type: "number" as const },
            verdict: { type: "string" as const, enum: ["publish", "revise", "reject"] },
            summary: { type: "string" as const },
            clauseCount: { type: "number" as const },
            avgClauseWords: { type: "number" as const },
            issues: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  severity: { type: "string" as const, enum: ["critical", "warning", "info"] },
                  category: { type: "string" as const },
                  description: { type: "string" as const },
                },
                required: ["severity", "category", "description"],
                additionalProperties: false,
              },
            },
            recommendations: {
              type: "array" as const,
              items: { type: "string" as const },
            },
          },
          required: ["qualityScore", "verdict", "summary", "clauseCount", "avgClauseWords", "issues", "recommendations"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text);
}

async function quickReview(template: TemplateRow) {
  const clauses = (template.clauses as Array<{ title: string }>) || [];

  const response = await openai.responses.create({
    model: REVIEW_MODEL,
    reasoning: { effort: "low" },
    instructions: "Quick pass/fail quality gate for a legal template. Check for: missing required clauses, hardcoded names/dates, legal errors, empty sections. Return pass/fail and blockers.",
    input: `${template.contract_type} for ${template.jurisdiction}. ${clauses.length} clauses: ${clauses.map(c => c.title).join(", ")}. Preamble: ${(template.preamble || "").slice(0, 300)}`,
    text: {
      format: {
        type: "json_schema",
        name: "quick_review",
        schema: {
          type: "object" as const,
          properties: {
            pass: { type: "boolean" as const },
            score: { type: "number" as const },
            blockers: { type: "array" as const, items: { type: "string" as const } },
          },
          required: ["pass", "score", "blockers"],
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

async function main() {
  console.log(`\n🔍 Template Review (${isQuick ? "quick" : "full"} mode, model: ${REVIEW_MODEL})\n`);

  // Fetch templates
  let query = supabase
    .from("contract_templates")
    .select("id, title, contract_type, jurisdiction, preamble, recitals, clauses, signature_block")
    .eq("is_active", true)
    .order("contract_type")
    .order("jurisdiction");

  if (typeFilter) query = query.eq("contract_type", typeFilter);
  if (jurisdictionFilter) query = query.eq("jurisdiction", jurisdictionFilter);

  const { data: templates, error } = await query;

  if (error) {
    console.error("Failed to fetch templates:", error.message);
    process.exit(1);
  }

  if (!templates || templates.length === 0) {
    console.log("No templates found matching filters.");

    // Check if ANY templates exist
    const { count } = await supabase
      .from("contract_templates")
      .select("id", { count: "exact", head: true });

    console.log(`Total templates in DB: ${count ?? 0}`);

    // Also check user templates
    const { count: userCount } = await supabase
      .from("templates")
      .select("id", { count: "exact", head: true });

    console.log(`Total user templates in DB: ${userCount ?? 0}`);
    return;
  }

  console.log(`Found ${templates.length} template(s) to review\n`);

  const results: Array<{
    id: string;
    title: string;
    type: string;
    jurisdiction: string;
    score: number;
    verdict: string;
    issues?: number;
  }> = [];

  for (const template of templates) {
    const label = `${template.contract_type} / ${template.jurisdiction}`;
    process.stdout.write(`  Reviewing ${label}...`);

    try {
      if (isQuick) {
        const result = await quickReview(template);
        const icon = result.pass ? "✅" : "❌";
        console.log(` ${icon} Score: ${result.score}`);
        if (result.blockers.length > 0) {
          result.blockers.forEach((b: string) => console.log(`     ⚠️  ${b}`));
        }
        results.push({
          id: template.id,
          title: template.title,
          type: template.contract_type,
          jurisdiction: template.jurisdiction,
          score: result.score,
          verdict: result.pass ? "pass" : "fail",
        });
      } else {
        const result = await fullReview(template);
        const icon = result.verdict === "publish" ? "✅" : result.verdict === "revise" ? "🔶" : "❌";
        console.log(` ${icon} Score: ${result.qualityScore}/100 — ${result.verdict}`);
        console.log(`     ${result.summary}`);
        console.log(`     Clauses: ${result.clauseCount}, Avg words/clause: ${result.avgClauseWords}`);

        if (result.issues.length > 0) {
          const critical = result.issues.filter((i: { severity: string }) => i.severity === "critical").length;
          const warning = result.issues.filter((i: { severity: string }) => i.severity === "warning").length;
          const info = result.issues.filter((i: { severity: string }) => i.severity === "info").length;
          console.log(`     Issues: ${critical} critical, ${warning} warning, ${info} info`);

          for (const issue of result.issues) {
            const sev = issue.severity === "critical" ? "🔴" : issue.severity === "warning" ? "🟡" : "🔵";
            console.log(`     ${sev} [${issue.category}] ${issue.description}`);
          }
        }

        if (result.recommendations.length > 0) {
          console.log(`     Recommendations:`);
          result.recommendations.forEach((r: string) => console.log(`       → ${r}`));
        }

        results.push({
          id: template.id,
          title: template.title,
          type: template.contract_type,
          jurisdiction: template.jurisdiction,
          score: result.qualityScore,
          verdict: result.verdict,
          issues: result.issues.length,
        });
      }
    } catch (err) {
      console.log(` ❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      results.push({
        id: template.id,
        title: template.title,
        type: template.contract_type,
        jurisdiction: template.jurisdiction,
        score: 0,
        verdict: "error",
      });
    }

    console.log();
  }

  // Summary table
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  const publish = results.filter(r => r.verdict === "publish" || r.verdict === "pass").length;
  const revise = results.filter(r => r.verdict === "revise").length;
  const reject = results.filter(r => r.verdict === "reject" || r.verdict === "fail").length;
  const errors = results.filter(r => r.verdict === "error").length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  console.log(`  Total: ${results.length} | ✅ Publish: ${publish} | 🔶 Revise: ${revise} | ❌ Reject: ${reject} | ⚠️ Errors: ${errors}`);
  console.log(`  Average Score: ${avgScore}/100\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
