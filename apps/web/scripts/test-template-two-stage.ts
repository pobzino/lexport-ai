/**
 * Two-stage template generation:
 * 1. GPT-5.2 generates initial template (schema-compliant, granular)
 * 2. Opus 4.5 enhances for legal depth
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

WHAT TO ENHANCE:
- Add legal nuances and edge cases within existing clauses
- Strengthen protective language
- Add California-specific law references (CUTSA, CCPA, B&P Code § 16600)
- Include provisions that may have been missed (breach notification, whistleblower immunity)
- Improve precision of legal terminology
- Add subsection numbering if not present (1.1, 1.2, etc.)

OUTPUT: Return the enhanced template as valid JSON matching the exact same schema.`;

async function enhanceWithOpus(template: any): Promise<any> {
  const userPrompt = `Enhance this California Mutual NDA template for legal depth. Keep the exact same structure and all placeholders.

CURRENT TEMPLATE:
\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\`

Return the enhanced template as JSON. Do not change the structure, only deepen the legal content within each clause.`;

  // Use streaming to handle long responses
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
  console.log(" done");

  const finalMessage = await stream.finalMessage();
  console.log("Opus response stop_reason:", finalMessage.stop_reason);

  if (!fullText) {
    throw new Error("No text response from Opus");
  }

  // Parse JSON from response
  let jsonStr = fullText;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("JSON parse error. Response length:", fullText.length);
    console.error("First 500 chars:", fullText.substring(0, 500));
    console.error("Last 500 chars:", fullText.substring(fullText.length - 500));

    // Try to fix common JSON issues
    let fixedJson = jsonStr.trim();

    // Check if truncated (missing closing braces)
    const openBraces = (fixedJson.match(/\{/g) || []).length;
    const closeBraces = (fixedJson.match(/\}/g) || []).length;
    const openBrackets = (fixedJson.match(/\[/g) || []).length;
    const closeBrackets = (fixedJson.match(/\]/g) || []).length;

    console.log(`Braces: { ${openBraces} vs } ${closeBraces}`);
    console.log(`Brackets: [ ${openBrackets} vs ] ${closeBrackets}`);

    // Add missing closing characters
    while (closeBrackets < openBrackets) {
      fixedJson += "]";
    }
    while (closeBraces < openBraces) {
      fixedJson += "}";
    }

    // Remove trailing comma before closing brace/bracket
    fixedJson = fixedJson.replace(/,(\s*[\}\]])/g, "$1");

    try {
      return JSON.parse(fixedJson);
    } catch (e2) {
      console.error("Still failed after fix attempt");
      throw e;
    }
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function getTemplateStats(template: any) {
  const allContent = [
    template.preamble || "",
    template.recitals || "",
    ...template.clauses.map((c: any) => c.content || ""),
    template.signatureBlock || "",
  ].join(" ");

  const placeholders = allContent.match(/\{\{[^}]+\}\}/g) || [];
  const wordCount = countWords(allContent);

  return {
    clauseCount: template.clauses.length,
    wordCount,
    uniquePlaceholders: [...new Set(placeholders)].length,
    placeholderList: [...new Set(placeholders)],
  };
}

async function main() {
  console.log("=" .repeat(80));
  console.log("TWO-STAGE TEMPLATE GENERATION TEST");
  console.log("=" .repeat(80));

  // Stage 1: GPT-5.2
  console.log("\n📝 STAGE 1: Generating with GPT-5.2...\n");
  const stage1Start = Date.now();

  const initialTemplate = await generateTemplate({
    contractType: "nda_mutual",
    jurisdiction: "us_california",
    includeOptionalClauses: true,
  });

  const stage1Time = Date.now() - stage1Start;
  const stage1Stats = getTemplateStats(initialTemplate);

  console.log(`✅ GPT-5.2 completed in ${stage1Time}ms`);
  console.log(`   - Clauses: ${stage1Stats.clauseCount}`);
  console.log(`   - Words: ${stage1Stats.wordCount}`);
  console.log(`   - Placeholders: ${stage1Stats.uniquePlaceholders}`);

  // Stage 2: Opus 4.5 enhancement
  console.log("\n🔍 STAGE 2: Enhancing with Opus 4.5...\n");
  const stage2Start = Date.now();

  const enhancedTemplate = await enhanceWithOpus(initialTemplate);

  const stage2Time = Date.now() - stage2Start;
  const stage2Stats = getTemplateStats(enhancedTemplate);

  console.log(`✅ Opus 4.5 completed in ${stage2Time}ms`);
  console.log(`   - Clauses: ${stage2Stats.clauseCount}`);
  console.log(`   - Words: ${stage2Stats.wordCount}`);
  console.log(`   - Placeholders: ${stage2Stats.uniquePlaceholders}`);

  // Comparison
  console.log("\n" + "=" .repeat(80));
  console.log("COMPARISON");
  console.log("=" .repeat(80));

  const wordIncrease = ((stage2Stats.wordCount - stage1Stats.wordCount) / stage1Stats.wordCount * 100).toFixed(1);

  console.log(`
| Metric              | GPT-5.2      | After Opus   | Change       |
|---------------------|--------------|--------------|--------------|
| Clauses             | ${stage1Stats.clauseCount.toString().padEnd(12)} | ${stage2Stats.clauseCount.toString().padEnd(12)} | ${stage1Stats.clauseCount === stage2Stats.clauseCount ? "✅ Same" : "❌ Changed"} |
| Word Count          | ${stage1Stats.wordCount.toString().padEnd(12)} | ${stage2Stats.wordCount.toString().padEnd(12)} | +${wordIncrease}% |
| Placeholders        | ${stage1Stats.uniquePlaceholders.toString().padEnd(12)} | ${stage2Stats.uniquePlaceholders.toString().padEnd(12)} | ${stage1Stats.uniquePlaceholders === stage2Stats.uniquePlaceholders ? "✅ Same" : "⚠️ Changed"} |
| Generation Time     | ${(stage1Time / 1000).toFixed(1)}s${" ".repeat(9)} | ${(stage2Time / 1000).toFixed(1)}s${" ".repeat(9)} | Total: ${((stage1Time + stage2Time) / 1000).toFixed(1)}s |
`);

  // Show a sample clause comparison
  console.log("=" .repeat(80));
  console.log("SAMPLE CLAUSE COMPARISON: Definitions");
  console.log("=" .repeat(80));

  const initialDef = initialTemplate.clauses.find((c: any) =>
    c.id?.includes("definition") || c.title?.toLowerCase().includes("definition")
  );
  const enhancedDef = enhancedTemplate.clauses.find((c: any) =>
    c.id?.includes("definition") || c.title?.toLowerCase().includes("definition")
  );

  if (initialDef && enhancedDef) {
    console.log("\n--- GPT-5.2 (Original) ---");
    console.log(`Words: ${countWords(initialDef.content)}`);
    console.log(initialDef.content.substring(0, 1500) + "...\n");

    console.log("--- After Opus 4.5 Enhancement ---");
    console.log(`Words: ${countWords(enhancedDef.content)}`);
    console.log(enhancedDef.content.substring(0, 1500) + "...\n");
  }

  // Show another clause
  console.log("=" .repeat(80));
  console.log("SAMPLE CLAUSE COMPARISON: Confidentiality Obligations");
  console.log("=" .repeat(80));

  const initialConf = initialTemplate.clauses.find((c: any) =>
    c.id?.includes("confidentiality") || c.title?.toLowerCase().includes("confidentiality")
  );
  const enhancedConf = enhancedTemplate.clauses.find((c: any) =>
    c.id?.includes("confidentiality") || c.title?.toLowerCase().includes("confidentiality")
  );

  if (initialConf && enhancedConf) {
    console.log("\n--- GPT-5.2 (Original) ---");
    console.log(`Words: ${countWords(initialConf.content)}`);
    console.log(initialConf.content.substring(0, 1500) + "...\n");

    console.log("--- After Opus 4.5 Enhancement ---");
    console.log(`Words: ${countWords(enhancedConf.content)}`);
    console.log(enhancedConf.content.substring(0, 1500) + "...\n");
  }

  // Cost estimate
  console.log("=" .repeat(80));
  console.log("COST ESTIMATE");
  console.log("=" .repeat(80));

  // GPT-5.2: ~$0.08 per template
  // Opus enhancement: input ~3K tokens ($0.045) + output ~10K tokens ($0.75) = ~$0.80
  console.log(`
GPT-5.2 generation:     ~$0.08
Opus 4.5 enhancement:   ~$0.80
──────────────────────────────
Total per template:     ~$0.88

(Still one-time cost, reused for all contracts of this type)
`);
}

main().catch(console.error);
