/**
 * Batch enhance all jurisdiction templates using Claude Opus 4.5
 * Outputs SQL UPDATE statements that can be run via Supabase MCP
 */

import { config } from "dotenv";
config({ path: ".env" });

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();

// Use anon key for reading only - we'll output SQL for updates
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Clause {
  id: string;
  title: string;
  content: string;
  type: "standard" | "negotiable" | "optional";
  order: number;
}

interface Template {
  id: string;
  contract_type: string;
  jurisdiction: string;
  title: string;
  preamble: string;
  recitals: string;
  clauses: Clause[];
  signature_block: string;
  placeholders: any[];
  metadata: Record<string, unknown>;
}

function getJurisdictionContext(jurisdiction: string): string {
  const contexts: Record<string, string> = {
    uk: `JURISDICTION: United Kingdom (England and Wales)

KEY LEGAL REQUIREMENTS:
- Comply with UK GDPR and Data Protection Act 2018
- Reference Trade Secrets (Enforcement, etc.) Regulations 2018
- IR35/off-payroll working rules for contractor agreements
- Contracts (Rights of Third Parties) Act 1999 considerations
- Electronic Communications Act 2000 for e-signatures
- Bribery Act 2010 compliance
- Modern Slavery Act 2015 where applicable
- Use British spelling (organisation, authorised, favour, etc.)
- Courts of England and Wales jurisdiction
- No concept of "LLC" - use Ltd, LLP, or PLC as appropriate`,

    us_texas: `JURISDICTION: Texas, USA

KEY LEGAL REQUIREMENTS:
- Texas Uniform Trade Secrets Act (Texas Civil Practice and Remedies Code Chapter 134A)
- Texas Business and Commerce Code § 15.50 for non-competes (enforceable if reasonable)
- Texas has NO state income tax - do not reference state income tax
- Texas Uniform Electronic Transactions Act (BCC Chapter 322)
- Defend Trade Secrets Act (federal) - include whistleblower notice
- Texas Labor Code for worker classification
- Venue in specific Texas county required
- Texas courts jurisdiction`,

    us_new_york: `JURISDICTION: New York, USA

KEY LEGAL REQUIREMENTS:
- New York Labor Law for worker classification
- Freelance Isn't Free Act (NYC Admin Code § 20-927 / NY Labor Law Article 44)
  * Written contract required for $800+ work
  * Payment within 30 days of completion
  * Double damages for late payment
  * Anti-retaliation provisions
  * 6-year record retention requirement
- New York Electronic Signatures and Records Act (ESRA)
- Non-compete provisions are DISFAVORED and strictly scrutinized in NY
- Defend Trade Secrets Act (federal) - include whistleblower notice
- NY common law trade secret protection (no UTSA in NY)
- Martin Act considerations for securities
- New York State and City income tax references where applicable
- Venue in specific NY county required`,
  };

  return contexts[jurisdiction] || "";
}

async function enhanceTemplate(
  template: Template,
  californiaTemplate: Template
): Promise<any> {
  const jurisdictionContext = getJurisdictionContext(template.jurisdiction);

  const systemPrompt = `You are an expert legal drafter. Your task is to ENHANCE an existing contract template to match the quality, depth, and comprehensiveness of a reference California template.

${jurisdictionContext}

ENHANCEMENT REQUIREMENTS:
1. Match the WORD COUNT and DETAIL LEVEL of the California reference template
2. Add jurisdiction-specific provisions that are MISSING
3. Expand clauses to include more sub-sections (1.1, 1.2, 2.1, 2.2, etc.)
4. Add OPTIONAL clauses where appropriate (non-solicitation, compliance, etc.)
5. Include detailed definitions section
6. Add privacy/data protection provisions appropriate for this jurisdiction
7. Ensure all placeholder tokens use the {{placeholder_name}} format
8. Maintain proper legal terminology for this jurisdiction
9. Keep the same clause IDs where possible, add new IDs for new clauses

CRITICAL: The enhanced template MUST be significantly more detailed than the input.
Target word count: ${californiaTemplate.metadata?.word_count || 3000}+ words
Target clause count: ${californiaTemplate.clauses?.length || 10}+ clauses

Output ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "preamble": "...",
  "recitals": "...",
  "clauses": [...],
  "signature_block": "...",
  "placeholders": [...]
}`;

  const userPrompt = `ENHANCE this ${template.title} to match the quality of the California reference.

CURRENT TEMPLATE (needs enhancement):
Title: ${template.title}
Jurisdiction: ${template.jurisdiction}
Current word count: ${template.metadata?.word_count || "unknown"}
Current clause count: ${template.clauses?.length || 0}

PREAMBLE:
${template.preamble}

RECITALS:
${template.recitals}

CLAUSES:
${JSON.stringify(template.clauses, null, 2)}

SIGNATURE BLOCK:
${template.signature_block}

PLACEHOLDERS:
${JSON.stringify(template.placeholders, null, 2)}

---

CALIFORNIA REFERENCE TEMPLATE (target quality level):
Title: ${californiaTemplate.title}
Word count: ${californiaTemplate.metadata?.word_count}
Clause count: ${californiaTemplate.clauses?.length}

CLAUSES STRUCTURE:
${JSON.stringify(californiaTemplate.clauses.map(c => ({ id: c.id, title: c.title, type: c.type, contentLength: c.content.length })), null, 2)}

SAMPLE CALIFORNIA CLAUSE (for reference on detail level):
${JSON.stringify(californiaTemplate.clauses[0], null, 2)}

---

Now enhance the template to match California's quality. Output ONLY the complete enhanced template as JSON.`;

  console.error(`  Calling Opus 4.5 API...`);
  const startTime = Date.now();

  let response;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      response = await anthropic.messages.create({
        model: "claude-opus-4-5-20251101",
        max_tokens: 8000, // Reduced to fit within rate limits
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      });
      break;
    } catch (err: any) {
      if (err.status === 429) {
        const retryAfter = parseInt(err.headers?.get?.("retry-after") || "120");
        console.error(`  Rate limited. Waiting ${retryAfter}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, (retryAfter + 10) * 1000));
        attempts++;
      } else {
        throw err;
      }
    }
  }

  if (!response) {
    throw new Error("Failed after max retry attempts");
  }

  const elapsed = Date.now() - startTime;
  console.error(`  API call completed in ${Math.round(elapsed / 1000)}s`);

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from API");
  }

  let jsonStr = textContent.text.trim();

  // Try to extract JSON from various formats
  // First try: JSON in markdown code block
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Second try: Find JSON object directly
  if (!jsonStr.startsWith("{")) {
    const jsonStart = jsonStr.indexOf("{");
    const jsonEnd = jsonStr.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }
  }

  let enhanced;
  try {
    enhanced = JSON.parse(jsonStr);
  } catch (e) {
    console.error(`  JSON parse error, attempting cleanup...`);
    // Try to fix common issues
    jsonStr = jsonStr
      .replace(/[\x00-\x1F\x7F]/g, " ") // Remove control characters
      .replace(/\\'/g, "'") // Fix escaped single quotes
      .replace(/\n\s*\n/g, "\\n"); // Fix line breaks
    enhanced = JSON.parse(jsonStr);
  }

  const allContent = [
    enhanced.preamble || "",
    enhanced.recitals || "",
    ...(enhanced.clauses || []).map((c: Clause) => c.content),
    enhanced.signature_block || "",
  ].join(" ");
  const wordCount = allContent.split(/\s+/).filter(Boolean).length;

  console.error(`  Enhanced: ${enhanced.clauses?.length || 0} clauses, ~${wordCount} words`);

  return {
    preamble: enhanced.preamble,
    recitals: enhanced.recitals,
    clauses: enhanced.clauses,
    signature_block: enhanced.signature_block,
    placeholders: enhanced.placeholders,
    metadata: {
      ...template.metadata,
      generator_version: "gpt-5.2",
      opus_enhanced: true,
      opus_model: "claude-opus-4-5-20251101",
      enhanced_at: new Date().toISOString(),
      word_count: wordCount,
      clause_count: enhanced.clauses?.length || 0,
      placeholder_count: enhanced.placeholders?.length || 0,
    },
  };
}

function escapeForSQL(str: string): string {
  return str.replace(/'/g, "''");
}

async function main() {
  const targetJurisdictions = process.argv[2]?.split(",") || ["uk", "us_texas", "us_new_york"];
  const targetTypes = process.argv[3]?.split(",") || null;

  console.error("=".repeat(80));
  console.error("BATCH TEMPLATE ENHANCEMENT WITH CLAUDE OPUS 4.5");
  console.error("=".repeat(80));
  console.error(`Jurisdictions: ${targetJurisdictions.join(", ")}`);
  console.error(`Contract types: ${targetTypes ? targetTypes.join(", ") : "all"}`);
  console.error("");

  // Get templates to enhance
  let query = supabase
    .from("contract_templates")
    .select("*")
    .in("jurisdiction", targetJurisdictions);

  if (targetTypes) {
    query = query.in("contract_type", targetTypes);
  }

  const { data: templates, error } = await query.order("jurisdiction").order("contract_type");

  if (error) {
    console.error("Error fetching templates:", error);
    process.exit(1);
  }

  console.error(`Found ${templates?.length || 0} templates to enhance\n`);

  // Get California templates as references
  const { data: caTemplates } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("jurisdiction", "us_california");

  const californiaTemplates: Record<string, Template> = {};
  for (const t of caTemplates || []) {
    californiaTemplates[t.contract_type] = t as Template;
  }

  const results: { id: string; title: string; enhanced: any }[] = [];

  for (const template of templates || []) {
    console.error("-".repeat(80));
    console.error(`Processing: ${template.title}`);
    console.error(`  ID: ${template.id}`);
    console.error(`  Type: ${template.contract_type}`);
    console.error(`  Jurisdiction: ${template.jurisdiction}`);
    console.error(`  Current: ${template.clauses?.length || 0} clauses, ${template.metadata?.word_count || "?"} words`);

    const californiaRef = californiaTemplates[template.contract_type];
    if (!californiaRef) {
      console.error(`  SKIPPED - no California reference template found`);
      continue;
    }

    console.error(`  Reference: ${californiaRef.clauses?.length || 0} clauses, ${californiaRef.metadata?.word_count || "?"} words`);

    let retries = 3;
    while (retries > 0) {
      try {
        const enhanced = await enhanceTemplate(template as Template, californiaRef);
        results.push({ id: template.id, title: template.title, enhanced });
        console.error(`  ✓ Enhanced successfully`);
        break;
      } catch (err: any) {
        retries--;
        if (retries > 0) {
          console.error(`  ✗ Enhancement failed, retrying (${retries} left):`, err.message || err);
          await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s before retry
        } else {
          console.error(`  ✗ Enhancement failed after all retries:`, err.message || err);
        }
      }
    }

    // Rate limiting - wait 60s between templates to stay within rate limits
    console.error(`  Waiting 60 seconds before next template...`);
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }

  console.error("\n" + "=".repeat(80));
  console.error("GENERATING SQL UPDATE STATEMENTS");
  console.error("=".repeat(80));

  // Output SQL statements to stdout
  for (const result of results) {
    console.log(`-- Update: ${result.title}`);
    console.log(`UPDATE contract_templates SET`);
    console.log(`  preamble = '${escapeForSQL(result.enhanced.preamble)}',`);
    console.log(`  recitals = '${escapeForSQL(result.enhanced.recitals)}',`);
    console.log(`  clauses = '${escapeForSQL(JSON.stringify(result.enhanced.clauses))}'::jsonb,`);
    console.log(`  signature_block = '${escapeForSQL(result.enhanced.signature_block)}',`);
    console.log(`  placeholders = '${escapeForSQL(JSON.stringify(result.enhanced.placeholders))}'::jsonb,`);
    console.log(`  metadata = '${escapeForSQL(JSON.stringify(result.enhanced.metadata))}'::jsonb`);
    console.log(`WHERE id = '${result.id}';`);
    console.log("");
  }

  console.error(`\nGenerated ${results.length} UPDATE statements`);
}

main().catch(console.error);
