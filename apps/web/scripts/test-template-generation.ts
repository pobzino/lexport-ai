/**
 * Test script for template generation with GPT-5.2
 *
 * Run with: bun run scripts/test-template-generation.ts
 */

import { generateTemplate, validateGeneratedTemplate } from "../src/lib/contracts/template-generator";

async function testTemplateGeneration() {
  console.log("🚀 Testing template generation with GPT-5.2...\n");

  const startTime = Date.now();

  try {
    console.log("Generating Mutual NDA for California...");

    const template = await generateTemplate({
      contractType: "nda_mutual",
      jurisdiction: "us_california",
      includeOptionalClauses: true,
    });

    const generationTime = Date.now() - startTime;
    console.log(`\n✅ Template generated in ${generationTime}ms\n`);

    // Validate
    const validation = validateGeneratedTemplate(template);
    console.log("Validation:", validation.valid ? "✅ PASSED" : "❌ FAILED");
    if (validation.errors.length > 0) {
      console.log("Errors:", validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.log("Warnings:", validation.warnings);
    }

    // Show template structure
    console.log("\n📄 Template Structure:");
    console.log("─".repeat(50));
    console.log(`Title: ${template.title}`);
    console.log(`Clauses: ${template.clauses.length}`);
    template.clauses.forEach((clause, i) => {
      console.log(`  ${i + 1}. ${clause.title} (${clause.type})`);
    });

    // Show preamble preview
    console.log("\n📝 Preamble Preview:");
    console.log("─".repeat(50));
    console.log(template.preamble.substring(0, 500) + "...");

    // Show first clause content
    console.log("\n📝 First Clause Preview:");
    console.log("─".repeat(50));
    console.log(template.clauses[0]?.content.substring(0, 800) + "...");

    // Check for placeholders
    const allContent = [template.preamble, template.recitals, ...template.clauses.map(c => c.content), template.signatureBlock].join(" ");
    const placeholders = allContent.match(/\{\{[^}]+\}\}/g) || [];
    console.log("\n🔖 Placeholders found:", [...new Set(placeholders)].length);
    console.log([...new Set(placeholders)].join(", "));

  } catch (error) {
    console.error("❌ Template generation failed:", error);
    process.exit(1);
  }
}

testTemplateGeneration();
