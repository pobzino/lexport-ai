/**
 * Generate all contract templates using two-stage approach
 *
 * Run with: bun run scripts/generate-all-templates.ts
 *
 * This outputs templates to JSON files for manual database insertion
 */

import * as fs from "fs";
import * as path from "path";
import {
  generateTemplate,
  validateGeneratedTemplate,
  type GeneratedTemplate,
} from "../src/lib/contracts/template-generator";
import {
  CONTRACT_TYPES,
  JURISDICTION_NAMES,
  type ContractType,
  type Jurisdiction,
} from "../src/lib/contracts/schemas";

// Contract types to generate
const CONTRACT_TYPE_LIST: ContractType[] = [
  "nda_mutual",
  "nda_one_way",
  "independent_contractor",
  "consulting_agreement",
  "safe_note",
  "freelance_service",
];

// Primary jurisdiction for initial generation
const PRIMARY_JURISDICTION: Jurisdiction = "us_california";

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), "generated-templates");

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function getTemplateWordCount(template: GeneratedTemplate): number {
  const allContent = [
    template.preamble,
    template.recitals,
    ...template.clauses.map((c) => c.content),
    template.signatureBlock,
  ].join(" ");
  return countWords(allContent);
}

async function generateAndSaveTemplate(
  contractType: ContractType,
  jurisdiction: Jurisdiction
): Promise<{ success: boolean; error?: string; wordCount?: number }> {
  const contractDef = CONTRACT_TYPES[contractType];
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📝 Generating: ${contractDef.name}`);
  console.log(`📍 Jurisdiction: ${jurisdictionName}`);
  console.log(`${"=".repeat(60)}`);

  const startTime = Date.now();

  try {
    // Generate template with GPT-5.2 only (Opus enhancement disabled for now)
    const template = await generateTemplate({
      contractType,
      jurisdiction,
      includeOptionalClauses: true,
      enhanceWithOpus: true, // Re-enabled for debugging
      onProgress: (stage, status) => {
        if (status === "started") {
          console.log(`  → Stage ${stage === "gpt5" ? "1 (GPT-5.2)" : "2 (Opus 4.5)"}: Started...`);
        } else {
          console.log(`  ✓ Stage ${stage === "gpt5" ? "1 (GPT-5.2)" : "2 (Opus 4.5)"}: Completed`);
        }
      },
    });

    const generationTime = Date.now() - startTime;

    // Validate the template
    const validation = validateGeneratedTemplate(template);
    if (!validation.valid) {
      console.error(`  ❌ Validation failed:`, validation.errors);
      return { success: false, error: `Validation failed: ${validation.errors.join(", ")}` };
    }

    if (validation.warnings.length > 0) {
      console.log(`  ⚠️ Warnings:`, validation.warnings);
    }

    // Get stats
    const wordCount = getTemplateWordCount(template);

    console.log(`\n  📊 Stats:`);
    console.log(`     - Clauses: ${template.clauses.length}`);
    console.log(`     - Placeholders: ${template.placeholders.length}`);
    console.log(`     - Words: ${wordCount}`);
    console.log(`     - Time: ${(generationTime / 1000).toFixed(1)}s`);

    // Create output record
    const record = {
      contract_type: contractType,
      jurisdiction,
      version: 1,
      title: template.title,
      preamble: template.preamble,
      recitals: template.recitals,
      clauses: template.clauses,
      signature_block: template.signatureBlock,
      placeholders: template.placeholders,
      is_active: true,
      metadata: {
        generator_version: "2.0-two-stage",
        gpt_model: "gpt-5.2",
        opus_enhanced: true,
        generated_at: new Date().toISOString(),
        word_count: wordCount,
        clause_count: template.clauses.length,
        placeholder_count: template.placeholders.length,
      },
    };

    // Save to file
    const filename = `${contractType}_${jurisdiction}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(record, null, 2));
    console.log(`  💾 Saved to: ${filename}`);

    return { success: true, wordCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`  ❌ Generation failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function main() {
  console.log("\n" + "🚀".repeat(30));
  console.log("\n  CONTRACT TEMPLATE GENERATION");
  console.log("  Two-Stage: GPT-5.2 + Opus 4.5\n");
  console.log("🚀".repeat(30) + "\n");

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results: Array<{
    contractType: ContractType;
    jurisdiction: Jurisdiction;
    success: boolean;
    error?: string;
    wordCount?: number;
  }> = [];

  const totalStart = Date.now();

  for (const contractType of CONTRACT_TYPE_LIST) {
    // Skip SAFE note for non-US jurisdictions
    const jurisdictions: Jurisdiction[] =
      contractType === "safe_note"
        ? ["us_california"] // SAFE notes are US-only
        : [PRIMARY_JURISDICTION];

    for (const jurisdiction of jurisdictions) {
      const result = await generateAndSaveTemplate(contractType, jurisdiction);
      results.push({
        contractType,
        jurisdiction,
        ...result,
      });
    }
  }

  const totalTime = Date.now() - totalStart;

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 GENERATION SUMMARY");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalWords = successful.reduce((sum, r) => sum + (r.wordCount || 0), 0);

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  for (const r of successful) {
    const name = CONTRACT_TYPES[r.contractType].name;
    console.log(`   - ${name} (${r.wordCount} words)`);
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    for (const r of failed) {
      const name = CONTRACT_TYPES[r.contractType].name;
      console.log(`   - ${name}: ${r.error}`);
    }
  }

  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`📝 Total words generated: ${totalWords.toLocaleString()}`);
  console.log(`⏱️ Total time: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
  console.log(`💰 Estimated cost: ~$${(results.length * 0.88).toFixed(2)}`);
}

main().catch(console.error);
