/**
 * Show full enhanced template for quality review
 */

import { generateTemplate } from "../src/lib/contracts/template-generator";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const enhancementSystemPrompt = `You are an expert legal reviewer specializing in California commercial law. You are enhancing a contract template that was already generated.

YOUR TASK: Improve the legal depth and completeness of each clause WITHOUT changing the structure.

CRITICAL RULES:
1. Keep the EXACT same JSON structure - do not add or remove top-level fields
2. Keep the EXACT same number of clauses in the same order
3. Keep ALL placeholder tokens exactly as they are ({{placeholder_name}} format)
4. Do NOT consolidate clauses - maintain the granular structure
5. Do NOT change clause IDs or types
6. Do NOT add new placeholders - only use the ones already present

WHAT TO ENHANCE:
- Add legal nuances and edge cases within existing clauses
- Strengthen protective language
- Add California-specific law references (CUTSA, CCPA, B&P Code § 16600)
- Include provisions that may have been missed (breach notification, whistleblower immunity)
- Improve precision of legal terminology
- Add subsection numbering if not present (1.1, 1.2, etc.)

OUTPUT: Return the enhanced template as valid JSON matching the exact same schema.`;

async function main() {
  console.log("Generating and enhancing template...\n");

  // Stage 1
  const template = await generateTemplate({
    contractType: "nda_mutual",
    jurisdiction: "us_california",
    includeOptionalClauses: true,
  });
  console.log("GPT-5.2 done. Enhancing with Opus...\n");

  // Stage 2
  const userPrompt = `Enhance this California Mutual NDA template for legal depth. Keep the exact same structure and all placeholders.

CURRENT TEMPLATE:
\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\`

Return the enhanced template as JSON. Do not change the structure, only deepen the legal content within each clause.`;

  let fullText = "";
  const stream = await anthropic.messages.stream({
    model: "claude-opus-4-5-20251101",
    max_tokens: 20000,
    system: enhancementSystemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
      process.stdout.write(".");
    }
  }
  console.log(" done\n");

  // Parse
  let jsonStr = fullText;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];

  const enhanced = JSON.parse(jsonStr.trim());

  // Output full template
  console.log("=".repeat(80));
  console.log("ENHANCED TEMPLATE: " + enhanced.title);
  console.log("=".repeat(80));

  console.log("\n## PREAMBLE\n");
  console.log(enhanced.preamble);

  console.log("\n## RECITALS\n");
  console.log(enhanced.recitals);

  console.log("\n## CLAUSES\n");
  for (const clause of enhanced.clauses) {
    console.log("-".repeat(80));
    console.log(`[${clause.type?.toUpperCase() || "STANDARD"}] ${clause.title}`);
    console.log("-".repeat(80));
    console.log(clause.content);
    console.log("");
  }

  console.log("## SIGNATURE BLOCK\n");
  console.log(enhanced.signatureBlock);

  // Check for CA law references
  const allContent = [
    enhanced.preamble,
    enhanced.recitals,
    ...enhanced.clauses.map((c: any) => c.content),
    enhanced.signatureBlock,
  ].join(" ");

  console.log("\n" + "=".repeat(80));
  console.log("QUALITY INDICATORS");
  console.log("=".repeat(80));

  const caLawRefs = [
    { name: "CUTSA (Civil Code § 3426)", pattern: /3426|CUTSA|Uniform Trade Secret/i },
    { name: "B&P Code § 16600", pattern: /16600|Business and Professions/i },
    { name: "CCPA", pattern: /CCPA|California Consumer Privacy/i },
    { name: "Defend Trade Secrets Act", pattern: /DTSA|Defend Trade Secrets|18 U\.?S\.?C/i },
    { name: "Whistleblower immunity", pattern: /whistleblower|1833/i },
    { name: "Jury waiver", pattern: /jury.*waiv|waiv.*jury/i },
    { name: "Equitable relief", pattern: /equitable relief|injunctive relief|irreparable harm/i },
    { name: "Attorney fees", pattern: /attorney.*fees|attorneys'.*fees/i },
  ];

  console.log("\nCalifornia Law References:");
  for (const ref of caLawRefs) {
    const found = ref.pattern.test(allContent);
    console.log(`  ${found ? "✅" : "❌"} ${ref.name}`);
  }

  const placeholders = allContent.match(/\{\{[^}]+\}\}/g) || [];
  console.log(`\nPlaceholders: ${[...new Set(placeholders)].length} unique`);
  console.log([...new Set(placeholders)].join(", "));
}

main().catch(console.error);
