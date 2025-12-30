/**
 * Contract Generation Model Comparison Test
 *
 * Compares contract generation quality and speed across:
 * - GPT-5-mini with minimal reasoning
 * - GPT-5-mini with low reasoning
 * - GPT-4.1
 */

import OpenAI from "openai";
import californiaManifests from "../src/lib/contracts/manifests/california.json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Test metadata for Mutual NDA
const testMetadata = {
  jurisdiction: "us_california",
  disclosingParty: {
    name: "Acme Corporation",
    type: "company",
    address: "123 Tech Street, San Francisco, CA 94105",
    state: "Delaware",
    representativeName: "John Smith",
    representativeTitle: "CEO",
  },
  receivingParty: {
    name: "Beta Innovations Inc",
    type: "company",
    address: "456 Innovation Ave, Palo Alto, CA 94301",
    state: "California",
    representativeName: "Jane Doe",
    representativeTitle: "CTO",
  },
  purpose: "Exploring potential partnership for AI technology integration",
  duration: "2 years",
  confidentialityPeriod: "3 years",
};

const manifest = (californiaManifests as any).nda_mutual;

// Build the prompt
function buildPrompt() {
  const clauseGuidance = manifest ? `
## REQUIRED CLAUSES (must include all):
${manifest.requiredClauses.map((c: any) => `- **${c.title}** (${c.type}): ${c.keyProvisions.join(", ")}`).join("\n")}

## COMMON CLAUSES (include as appropriate):
${manifest.commonClauses.map((c: any) => `- **${c.title}** (${c.type}): ${c.keyProvisions.join(", ")}`).join("\n")}
` : "";

  return `Generate a Mutual Non-Disclosure Agreement (NDA) with the following details:

**Contract Type**: Mutual NDA
**Jurisdiction**: California, United States

**Disclosing Party**: ${testMetadata.disclosingParty.name}
- Type: ${testMetadata.disclosingParty.type}
- Address: ${testMetadata.disclosingParty.address}
- State of Incorporation: ${testMetadata.disclosingParty.state}
- Representative: ${testMetadata.disclosingParty.representativeName}, ${testMetadata.disclosingParty.representativeTitle}

**Receiving Party**: ${testMetadata.receivingParty.name}
- Type: ${testMetadata.receivingParty.type}
- Address: ${testMetadata.receivingParty.address}
- State of Incorporation: ${testMetadata.receivingParty.state}
- Representative: ${testMetadata.receivingParty.representativeName}, ${testMetadata.receivingParty.representativeTitle}

**Purpose**: ${testMetadata.purpose}
**Duration**: ${testMetadata.duration}
**Confidentiality Period**: ${testMetadata.confidentialityPeriod}

${clauseGuidance}

Return your response as a JSON object with this structure:
{
  "title": "Full contract title",
  "preamble": "Opening paragraph with parties and date",
  "recitals": "WHEREAS clauses explaining purpose",
  "clauses": [
    {
      "id": "clause_1",
      "title": "Clause Title",
      "content": "Full clause text with proper legal language",
      "type": "standard|negotiable|optional",
      "order": 1
    }
  ],
  "signatureBlock": "Complete signature block for all parties"
}`;
}

const developerPrompt = `You are an expert legal contract drafter specializing in California law. Generate professional, legally sound contracts.

Key California requirements:
- Non-compete clauses are generally unenforceable (Business and Professions Code § 16600)
- Must comply with California Consumer Privacy Act (CCPA) where applicable
- Governing law should specify California with venue in appropriate county

SIGNATURE BLOCK REQUIREMENTS:
- Create a professional signature block with CONSISTENT formatting for ALL parties
- Each party section must include: role header, signature line, printed name, title, company name, and date line`;

interface TestResult {
  model: string;
  config: string;
  timeMs: number;
  clauseCount: number;
  totalWords: number;
  avgClauseWords: number;
  hasAllSections: boolean;
  output?: any;
  error?: string;
}

async function testGpt5MiniResponses(effort: "minimal" | "low" | "medium" | "high"): Promise<TestResult> {
  const config = `GPT-5-mini (${effort} reasoning)`;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${config}`);
  console.log("=".repeat(60));

  const start = Date.now();

  try {
    const response = await (openai as any).responses.create({
      model: "gpt-5-mini",
      reasoning: { effort },
      input: [
        { role: "developer", content: developerPrompt },
        { role: "user", content: buildPrompt() },
      ],
    });

    const timeMs = Date.now() - start;
    const content = response.output_text || "";

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { model: "gpt-5-mini", config, timeMs, clauseCount: 0, totalWords: 0, avgClauseWords: 0, hasAllSections: false, error: "No JSON in response" };
    }

    const output = JSON.parse(jsonMatch[0]);
    const clauses = output.clauses || [];
    const totalWords = clauses.reduce((sum: number, c: any) => sum + (c.content?.split(/\s+/).length || 0), 0);

    return {
      model: "gpt-5-mini",
      config,
      timeMs,
      clauseCount: clauses.length,
      totalWords,
      avgClauseWords: clauses.length > 0 ? Math.round(totalWords / clauses.length) : 0,
      hasAllSections: !!(output.title && output.preamble && output.recitals && output.clauses && output.signatureBlock),
      output,
    };
  } catch (error: any) {
    return { model: "gpt-5-mini", config, timeMs: Date.now() - start, clauseCount: 0, totalWords: 0, avgClauseWords: 0, hasAllSections: false, error: error.message };
  }
}

async function testGpt41(): Promise<TestResult> {
  const config = "GPT-4.1";
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${config}`);
  console.log("=".repeat(60));

  const start = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: developerPrompt },
        { role: "user", content: buildPrompt() },
      ],
      temperature: 0.3,
    });

    const timeMs = Date.now() - start;
    const content = response.choices[0]?.message?.content || "";

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { model: "gpt-4.1", config, timeMs, clauseCount: 0, totalWords: 0, avgClauseWords: 0, hasAllSections: false, error: "No JSON in response" };
    }

    const output = JSON.parse(jsonMatch[0]);
    const clauses = output.clauses || [];
    const totalWords = clauses.reduce((sum: number, c: any) => sum + (c.content?.split(/\s+/).length || 0), 0);

    return {
      model: "gpt-4.1",
      config,
      timeMs,
      clauseCount: clauses.length,
      totalWords,
      avgClauseWords: clauses.length > 0 ? Math.round(totalWords / clauses.length) : 0,
      hasAllSections: !!(output.title && output.preamble && output.recitals && output.clauses && output.signatureBlock),
      output,
    };
  } catch (error: any) {
    return { model: "gpt-4.1", config, timeMs: Date.now() - start, clauseCount: 0, totalWords: 0, avgClauseWords: 0, hasAllSections: false, error: error.message };
  }
}

async function testGptResponses(model: string, effort: string = "low"): Promise<TestResult> {
  const config = effort ? `${model} (${effort})` : model;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${config}`);
  console.log("=".repeat(60));

  const start = Date.now();

  try {
    const response = await (openai as any).responses.create({
      model,
      reasoning: { effort },
      input: [
        { role: "developer", content: developerPrompt },
        { role: "user", content: buildPrompt() },
      ],
    });

    const timeMs = Date.now() - start;
    const content = response.output_text || "";

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { model, config, timeMs, clauseCount: 0, totalWords: 0, avgClauseWords: 0, hasAllSections: false, error: "No JSON in response" };
    }

    const output = JSON.parse(jsonMatch[0]);
    const clauses = output.clauses || [];
    const totalWords = clauses.reduce((sum: number, c: any) => sum + (c.content?.split(/\s+/).length || 0), 0);

    return {
      model,
      config,
      timeMs,
      clauseCount: clauses.length,
      totalWords,
      avgClauseWords: clauses.length > 0 ? Math.round(totalWords / clauses.length) : 0,
      hasAllSections: !!(output.title && output.preamble && output.recitals && output.clauses && output.signatureBlock),
      output,
    };
  } catch (error: any) {
    return { model, config, timeMs: Date.now() - start, clauseCount: 0, totalWords: 0, avgClauseWords: 0, hasAllSections: false, error: error.message };
  }
}

async function testGpt5(): Promise<TestResult> {
  return testGptResponses("gpt-5", "low");
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("CONTRACT GENERATION MODEL COMPARISON");
  console.log("=".repeat(60));
  console.log("\nTest: Mutual NDA - Acme Corp & Beta Innovations");
  console.log("Jurisdiction: California\n");

  const results: TestResult[] = [];

  // Test 1: GPT-5.2
  results.push(await testGptResponses("gpt-5.2", "low"));

  // Test 2: GPT-5.1
  results.push(await testGptResponses("gpt-5.1", "low"));

  // Test 3: GPT-5
  results.push(await testGpt5());

  // Test 4: GPT-5-mini medium
  results.push(await testGpt5MiniResponses("medium"));

  // Test 5: GPT-4.1
  results.push(await testGpt41());

  // Print results table
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS SUMMARY");
  console.log("=".repeat(80));
  console.log("\n| Model/Config                    | Time (s) | Clauses | Total Words | Avg Words/Clause | Complete |");
  console.log("|--------------------------------|----------|---------|-------------|------------------|----------|");

  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.config.padEnd(30)} | ERROR: ${r.error} |`);
    } else {
      console.log(`| ${r.config.padEnd(30)} | ${(r.timeMs / 1000).toFixed(1).padStart(8)} | ${String(r.clauseCount).padStart(7)} | ${String(r.totalWords).padStart(11)} | ${String(r.avgClauseWords).padStart(16)} | ${(r.hasAllSections ? "Yes" : "No").padStart(8)} |`);
    }
  }

  // Print clause titles for quality comparison
  console.log("\n" + "=".repeat(80));
  console.log("CLAUSE TITLES BY MODEL");
  console.log("=".repeat(80));

  for (const r of results) {
    if (r.output?.clauses) {
      console.log(`\n${r.config}:`);
      r.output.clauses.forEach((c: any, i: number) => {
        console.log(`  ${i + 1}. ${c.title}`);
      });
    }
  }

  // Print sample clause for quality comparison
  console.log("\n" + "=".repeat(80));
  console.log("SAMPLE CLAUSE: Definitions (first clause typically)");
  console.log("=".repeat(80));

  for (const r of results) {
    if (r.output?.clauses?.[0]) {
      const clause = r.output.clauses[0];
      console.log(`\n${r.config} - "${clause.title}":`);
      console.log("-".repeat(40));
      // Show first 500 chars
      const preview = clause.content?.substring(0, 500) || "";
      console.log(preview + (clause.content?.length > 500 ? "..." : ""));
    }
  }

  // Print signature blocks for comparison
  console.log("\n" + "=".repeat(80));
  console.log("SIGNATURE BLOCKS");
  console.log("=".repeat(80));

  for (const r of results) {
    if (r.output?.signatureBlock) {
      console.log(`\n${r.config}:`);
      console.log("-".repeat(40));
      console.log(r.output.signatureBlock);
    }
  }
}

main().catch(console.error);
