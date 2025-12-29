/**
 * Enhance jurisdiction templates using Claude Opus 4.5
 * Matches the quality level of the original California templates
 */

import { config } from "dotenv";
config({ path: ".env" });

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  id: number;
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

const enhancementSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    preamble: { type: "string" },
    recitals: { type: "string" },
    clauses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          type: { type: "string", enum: ["standard", "negotiable", "optional"] },
          order: { type: "number" },
        },
        required: ["id", "title", "content", "type", "order"],
      },
    },
    signature_block: { type: "string" },
    placeholders: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          token: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          type: { type: "string" },
          required: { type: "boolean" },
          autofillKey: { type: "string" },
        },
        required: ["id", "token", "label", "description", "category", "type", "required"],
      },
    },
  },
  required: ["preamble", "recitals", "clauses", "signature_block", "placeholders"],
};

async function getCaliforniaTemplate(contractType: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("contract_type", contractType)
    .eq("jurisdiction", "us_california")
    .single();

  if (error) {
    console.error(`Error fetching California template for ${contractType}:`, error);
    return null;
  }

  return data as Template;
}

async function getTemplatesToEnhance(): Promise<Template[]> {
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .in("jurisdiction", ["uk", "us_texas", "us_new_york"])
    .order("jurisdiction")
    .order("contract_type");

  if (error) {
    console.error("Error fetching templates:", error);
    return [];
  }

  return data as Template[];
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
): Promise<Partial<Template> | null> {
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

Output valid JSON matching the schema. Preserve all existing placeholder tokens and add new ones as needed.`;

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

Now enhance the template to match California's quality. Output the complete enhanced template as JSON.
Include all fields: preamble, recitals, clauses, signature_block, placeholders.`;

  console.log(`  Calling Opus 4.5 API...`);
  const startTime = Date.now();

  try {
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
    console.log(`  API call completed in ${elapsed}ms`);

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      console.error("  No text response from API");
      return null;
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

    console.log(`  Enhanced: ${enhanced.clauses?.length || 0} clauses, ~${wordCount} words`);

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
  } catch (error) {
    console.error(`  API error:`, error);
    return null;
  }
}

async function updateTemplate(id: number, updates: Partial<Template>): Promise<boolean> {
  const { error } = await supabase
    .from("contract_templates")
    .update({
      preamble: updates.preamble,
      recitals: updates.recitals,
      clauses: updates.clauses,
      signature_block: updates.signature_block,
      placeholders: updates.placeholders,
      metadata: updates.metadata,
    })
    .eq("id", id);

  if (error) {
    console.error(`Error updating template ${id}:`, error);
    return false;
  }

  return true;
}

async function main() {
  console.log("=".repeat(80));
  console.log("TEMPLATE ENHANCEMENT WITH CLAUDE OPUS 4.5");
  console.log("=".repeat(80));
  console.log("");

  // Get all templates to enhance
  const templates = await getTemplatesToEnhance();
  console.log(`Found ${templates.length} templates to enhance\n`);

  // Cache California templates
  const californiaTemplates: Record<string, Template> = {};

  let successCount = 0;
  let failCount = 0;

  for (const template of templates) {
    console.log("-".repeat(80));
    console.log(`Processing: ${template.title}`);
    console.log(`  Jurisdiction: ${template.jurisdiction}`);
    console.log(`  Contract type: ${template.contract_type}`);
    console.log(`  Current: ${template.clauses?.length || 0} clauses, ${template.metadata?.word_count || "?"} words`);

    // Get California reference template
    if (!californiaTemplates[template.contract_type]) {
      const caTemplate = await getCaliforniaTemplate(template.contract_type);
      if (caTemplate) {
        californiaTemplates[template.contract_type] = caTemplate;
      }
    }

    const californiaRef = californiaTemplates[template.contract_type];
    if (!californiaRef) {
      console.log(`  Skipping - no California reference template found`);
      failCount++;
      continue;
    }

    console.log(`  Reference: ${californiaRef.clauses?.length || 0} clauses, ${californiaRef.metadata?.word_count || "?"} words`);

    // Enhance the template
    const enhanced = await enhanceTemplate(template, californiaRef);
    if (!enhanced) {
      console.log(`  Enhancement failed`);
      failCount++;
      continue;
    }

    // Update in database
    const success = await updateTemplate(template.id, enhanced);
    if (success) {
      console.log(`  ✓ Updated successfully`);
      successCount++;
    } else {
      console.log(`  ✗ Update failed`);
      failCount++;
    }

    // Rate limiting - wait between API calls
    console.log(`  Waiting 2 seconds before next request...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(80));
  console.log("ENHANCEMENT COMPLETE");
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log("=".repeat(80));
}

main().catch(console.error);
