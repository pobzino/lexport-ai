/**
 * Enhance a single template using Claude Opus 4.5
 * Usage: bun run scripts/enhance-single-template.ts < template.json > enhanced.json
 */

import { config } from "dotenv";
config({ path: ".env" });

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface Clause {
  id: string;
  title: string;
  content: string;
  type: "standard" | "negotiable" | "optional";
  order: number;
}

interface Placeholder {
  id: string;
  token: string;
  label: string;
  description: string;
  category: string;
  type: string;
  required: boolean;
  autofillKey?: string;
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
  placeholders: Placeholder[];
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
): Promise<Partial<Template>> {
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

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
    system: systemPrompt,
  });

  const elapsed = Date.now() - startTime;
  console.error(`  API call completed in ${elapsed}ms`);

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from API");
  }

  // Extract JSON from response
  let jsonStr = textContent.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const enhanced = JSON.parse(jsonStr.trim());

  // Calculate new word count
  const allContent = [
    enhanced.preamble || "",
    enhanced.recitals || "",
    ...(enhanced.clauses || []).map((c: Clause) => c.content),
    enhanced.signature_block || "",
  ].join(" ");
  const wordCount = allContent.split(/\s+/).filter(Boolean).length;

  console.error(`  Enhanced: ${enhanced.clauses?.length || 0} clauses, ~${wordCount} words`);

  return {
    id: template.id,
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

async function main() {
  // Read template and california reference from stdin
  let inputData = "";
  for await (const chunk of Bun.stdin.stream()) {
    inputData += new TextDecoder().decode(chunk);
  }

  const input = JSON.parse(inputData);
  const { template, californiaTemplate } = input;

  if (!template || !californiaTemplate) {
    console.error("Error: Input must contain 'template' and 'californiaTemplate'");
    process.exit(1);
  }

  console.error(`Processing: ${template.title}`);
  console.error(`  Jurisdiction: ${template.jurisdiction}`);
  console.error(`  Current: ${template.clauses?.length || 0} clauses, ${template.metadata?.word_count || "?"} words`);
  console.error(`  Reference: ${californiaTemplate.clauses?.length || 0} clauses, ${californiaTemplate.metadata?.word_count || "?"} words`);

  const enhanced = await enhanceTemplate(template, californiaTemplate);

  // Output enhanced template as JSON
  console.log(JSON.stringify(enhanced, null, 2));
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
