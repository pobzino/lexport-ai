/**
 * Test template generation with Claude Opus 4.5
 * Compare quality with GPT-5.2
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const templateSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    title: { type: "string" },
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
    signatureBlock: { type: "string" },
  },
  required: ["title", "preamble", "recitals", "clauses", "signatureBlock"],
};

const systemPrompt = `You are an expert legal drafter specializing in California, USA commercial law. You are creating a REUSABLE CONTRACT TEMPLATE that will be filled in with specific party details later.

JURISDICTION REQUIREMENTS FOR CALIFORNIA, USA:
- Comply with California Civil Code
- AB5 compliance for contractor agreements (ABC test)
- Non-compete clauses are generally unenforceable in California
- Include CCPA considerations where applicable
- Reference California trade secret law (CUTSA)

TEMPLATE REQUIREMENTS:
1. Use placeholder tokens (like {{party_a_name}}) instead of actual names
2. Create professional, legally binding language
3. Include all required clauses for this contract type
4. Ensure compliance with California, USA law
5. Use clear section numbering and structure
6. Make the template comprehensive yet readable

AVAILABLE PLACEHOLDERS:
- {{party_a_name}}, {{party_a_company}}, {{party_a_title}}, {{party_a_address}}, {{party_a_email}}
- {{party_b_name}}, {{party_b_company}}, {{party_b_title}}, {{party_b_address}}, {{party_b_email}}
- {{effective_date}}, {{end_date}}, {{signature_date}}
- {{purpose}}, {{term_length}}, {{notice_period}}, {{confidentiality_period}}
- {{governing_jurisdiction}}

CRITICAL: Use these placeholder tokens for ALL variable information. Do NOT use actual names, dates, or amounts.`;

const userPrompt = `Generate a professional Mutual Non-Disclosure Agreement template for California, USA.

CONTRACT TYPE: Mutual Non-Disclosure Agreement (NDA)
DESCRIPTION: A bilateral agreement where both parties agree to protect each other's confidential information
JURISDICTION: California, USA

REQUIRED CLAUSES (must include all):
- Definitions: Define key terms including Confidential Information
- Confidentiality Obligations: Core duties of the receiving party
- Exclusions: Standard carve-outs from confidential treatment
- Term: Duration and survival provisions
- Return of Materials: Obligations upon termination
- Remedies: Breach consequences and equitable relief
- Governing Law: Choice of law and venue

OPTIONAL CLAUSES (include these as well):
- Non-Solicitation: Employee/customer protection
- Non-Compete: Restrictions on competitive activities (note CA limitations)

Generate the complete template now. Output valid JSON matching the schema.
Ensure all placeholder tokens are properly formatted as {{placeholder_name}}.`;

async function main() {
  console.log("Generating Mutual NDA with Claude Opus 4.5...\n");
  const startTime = Date.now();

  const response = await client.messages.create({
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

  const generationTime = Date.now() - startTime;
  console.log(`Generated in ${generationTime}ms\n`);

  // Extract text content
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response");
  }

  console.log("Raw response length:", textContent.text.length);
  console.log("First 500 chars:", textContent.text.substring(0, 500));

  // Parse JSON from response (may be wrapped in markdown code block)
  let jsonStr = textContent.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    console.log("\nFound JSON in code block");
    jsonStr = jsonMatch[1];
  } else {
    console.log("\nNo code block found, trying raw parse");
  }

  let template;
  try {
    template = JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("JSON parse failed:", e);
    console.log("\nRaw JSON string:", jsonStr.substring(0, 1000));
    throw e;
  }

  // Debug: show structure
  console.log("\n\nTOP-LEVEL KEYS:", Object.keys(template));
  console.log("Clauses key type:", typeof template.clauses);
  if (template.sections) console.log("Sections key type:", typeof template.sections);

  // Map to expected format (Opus may use different field names)
  const normalizedTemplate = {
    title: template.title || template.template_name || "Untitled",
    preamble: template.preamble || template.introduction || "",
    recitals: template.recitals || template.whereas_clauses || template.background || "",
    clauses: template.clauses || template.sections || template.articles || [],
    signatureBlock: template.signatureBlock || template.signature_block || template.signatures || "",
  };

  // Output full template
  console.log("=".repeat(80));
  console.log("TITLE:", normalizedTemplate.title);
  console.log("=".repeat(80));

  console.log("\n## PREAMBLE\n");
  console.log(normalizedTemplate.preamble);

  console.log("\n## RECITALS\n");
  console.log(normalizedTemplate.recitals);

  console.log("\n## CLAUSES\n");

  // Handle different clause structures
  const clauses = Array.isArray(normalizedTemplate.clauses) ? normalizedTemplate.clauses : [];
  for (const clause of clauses) {
    console.log("-".repeat(80));
    const clauseType = clause.type || clause.clause_type || "standard";
    const clauseTitle = clause.title || clause.heading || clause.name || "Untitled";
    const clauseContent = clause.content || clause.text || clause.body || JSON.stringify(clause, null, 2);
    console.log(`[${String(clauseType).toUpperCase()}] ${clauseTitle}`);
    console.log("-".repeat(80));
    console.log(clauseContent);
    console.log("");
  }

  console.log("## SIGNATURE BLOCK\n");
  console.log(typeof normalizedTemplate.signatureBlock === 'string'
    ? normalizedTemplate.signatureBlock
    : JSON.stringify(normalizedTemplate.signatureBlock, null, 2));

  // Stats
  const allContent = [
    normalizedTemplate.preamble,
    normalizedTemplate.recitals,
    ...clauses.map((c: any) => c.content || c.text || c.body || ""),
    typeof normalizedTemplate.signatureBlock === 'string' ? normalizedTemplate.signatureBlock : "",
  ].join(" ");
  const placeholders = allContent.match(/\{\{[^}]+\}\}/g) || [];
  console.log("\n" + "=".repeat(80));
  console.log("STATS:");
  console.log(`- Clauses: ${clauses.length}`);
  console.log(`- Unique placeholders: ${[...new Set(placeholders)].length}`);
  console.log(`- Generation time: ${generationTime}ms`);

  // Show raw structure for comparison
  console.log("\n" + "=".repeat(80));
  console.log("RAW STRUCTURE (for debugging):");
  console.log("Top-level keys:", Object.keys(template));
}

main().catch(console.error);
