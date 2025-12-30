/**
 * Full Model Comparison using actual webapp prompts
 *
 * Tests: GPT-5-mini (low), GPT-5, GPT-5.1, GPT-5.2
 * Uses the exact same prompts as the webapp generator
 */

import OpenAI from "openai";
import californiaManifests from "../src/lib/contracts/manifests/california.json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Manifest for NDA
const manifest = (californiaManifests as any).nda_mutual;

// Build the exact developer prompt used by the webapp
function buildDeveloperPrompt(): string {
  const requiredList = manifest.requiredClauses
    .slice(0, 6)
    .map((c: any) => {
      const provisions = c.keyProvisions?.slice(0, 2).join(", ") || "";
      return `- ${c.title}${provisions ? ` (include: ${provisions})` : ""}`;
    })
    .join("\n");

  const commonList = manifest.commonClauses
    .slice(0, 6)
    .map((c: any) => `- ${c.title}`)
    .join("\n");

  return `You are a legal contract generator for California, United States law.

FORMATTING REQUIREMENTS:
1. Use numbered subsections throughout (1.1, 1.2, 2.1, etc.)
2. Include a Definitions section for key terms
3. Use professional signature block with "By:" line format
4. All clauses must be appropriate for the specific contract type
5. For optional fields not provided, use placeholder format: _____ (5 underscores) that users can fill in later

SIGNATURE BLOCK FOR MULTIPLE SIGNERS:
When there are multiple signers for the same party (e.g., multiple investors, multiple founders, co-clients):
- Create a separate signature section for EACH individual signer
- Group signers by their role/party type with a header
- Each signer must have their own: Signature line, Printed Name, Title (if provided), Date
- Example for 2 founders: "COMPANY (Founders):" followed by two separate signature blocks

REQUIRED CLAUSES (must include):
${requiredList}

RECOMMENDED CLAUSES (include if relevant):
${commonList}

You may add other appropriate clauses as needed.

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{"id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number}],
  "signatureBlock": "string"
}`;
}

// Build the exact user prompt used by the webapp
function buildUserPrompt(): string {
  return `Generate a Mutual Non-Disclosure Agreement for California, United States.

CONTRACT DETAILS:
- Disclosing Party: Acme Corporation, CEO
- Receiving Party: Beta Inc, CTO
- Effective Date: 2025-01-15
- Purpose: Exploring potential AI technology partnership
- Confidentiality Period: 3 years

Return only valid JSON.`;
}

interface TestResult {
  model: string;
  effort: string;
  timeMs: number;
  clauseCount: number;
  totalWords: number;
  avgWords: number;
  clauseTitles: string[];
  clauses: any[];
  preamble: string;
  recitals: string;
  signatureBlock: string;
  error?: string;
}

async function testModel(model: string, effort: string): Promise<TestResult> {
  console.log(`\nTesting: ${model} (${effort})...`);

  const developerPrompt = buildDeveloperPrompt();
  const userPrompt = buildUserPrompt();

  const start = Date.now();

  try {
    const response = await (openai as any).responses.create({
      model,
      reasoning: { effort },
      input: [
        { role: "developer", content: developerPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const timeMs = Date.now() - start;
    console.log(`  Completed in ${(timeMs / 1000).toFixed(1)}s`);

    const content = response.output_text || "";

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createErrorResult(model, effort, timeMs, "No JSON in response");
    }

    const output = JSON.parse(jsonMatch[0]);
    const clauses = output.clauses || [];
    const totalWords = clauses.reduce((sum: number, c: any) =>
      sum + (c.content?.split(/\s+/).length || 0), 0);

    return {
      model,
      effort,
      timeMs,
      clauseCount: clauses.length,
      totalWords,
      avgWords: clauses.length > 0 ? Math.round(totalWords / clauses.length) : 0,
      clauseTitles: clauses.map((c: any) => c.title),
      clauses,
      preamble: output.preamble || "",
      recitals: output.recitals || "",
      signatureBlock: output.signatureBlock || "",
    };
  } catch (error: any) {
    console.log(`  ERROR: ${error.message}`);
    return createErrorResult(model, effort, Date.now() - start, error.message);
  }
}

function createErrorResult(model: string, effort: string, timeMs: number, error: string): TestResult {
  return {
    model,
    effort,
    timeMs,
    clauseCount: 0,
    totalWords: 0,
    avgWords: 0,
    clauseTitles: [],
    clauses: [],
    preamble: "",
    recitals: "",
    signatureBlock: "",
    error,
  };
}

async function main() {
  console.log("=".repeat(70));
  console.log("FULL MODEL COMPARISON - WEBAPP PROMPTS");
  console.log("=".repeat(70));
  console.log("\nTest: Mutual NDA");
  console.log("- Party A: Acme Corporation (CEO)");
  console.log("- Party B: Beta Inc (CTO)");
  console.log("- Jurisdiction: California, USA");

  const models = [
    { model: "gpt-5-mini", effort: "low" },
    { model: "gpt-5", effort: "low" },
    { model: "gpt-5.1", effort: "low" },
    { model: "gpt-5.2", effort: "low" },
  ];

  const results: TestResult[] = [];

  for (const { model, effort } of models) {
    results.push(await testModel(model, effort));
  }

  // Print summary table
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS SUMMARY");
  console.log("=".repeat(80));
  console.log("\n| Model           | Time (s) | Clauses | Total Words | Avg Words |");
  console.log("|-----------------|----------|---------|-------------|-----------|");

  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.model.padEnd(15)} | ERROR: ${r.error.substring(0, 40)} |`);
    } else {
      console.log(`| ${r.model.padEnd(15)} | ${(r.timeMs / 1000).toFixed(1).padStart(8)} | ${String(r.clauseCount).padStart(7)} | ${String(r.totalWords).padStart(11)} | ${String(r.avgWords).padStart(9)} |`);
    }
  }

  // Print clause titles
  console.log("\n" + "=".repeat(80));
  console.log("CLAUSE TITLES BY MODEL");
  console.log("=".repeat(80));

  for (const r of results) {
    if (!r.error && r.clauseTitles.length > 0) {
      console.log(`\n${r.model}:`);
      r.clauseTitles.forEach((title, i) => {
        console.log(`  ${i + 1}. ${title}`);
      });
    }
  }

  // Print sample preamble
  console.log("\n" + "=".repeat(80));
  console.log("PREAMBLE COMPARISON");
  console.log("=".repeat(80));

  for (const r of results) {
    if (!r.error && r.preamble) {
      console.log(`\n${r.model}:`);
      console.log("-".repeat(40));
      console.log(r.preamble.substring(0, 400) + (r.preamble.length > 400 ? "..." : ""));
    }
  }

  // Print signature blocks
  console.log("\n" + "=".repeat(80));
  console.log("SIGNATURE BLOCKS");
  console.log("=".repeat(80));

  for (const r of results) {
    if (!r.error && r.signatureBlock) {
      console.log(`\n${r.model}:`);
      console.log("-".repeat(40));
      console.log(r.signatureBlock);
    }
  }

  // Show full Definitions clause content
  console.log("\n" + "=".repeat(80));
  console.log("FULL DEFINITIONS CLAUSE CONTENT");
  console.log("=".repeat(80));

  for (const r of results) {
    if (!r.error && r.clauses.length > 0) {
      const defClause = r.clauses.find((c: any) => c.title?.toLowerCase().includes("definition"));
      if (defClause) {
        console.log(`\n${"=".repeat(40)}`);
        console.log(`${r.model.toUpperCase()} - "${defClause.title}"`);
        console.log(`${"=".repeat(40)}`);
        console.log(defClause.content);
        console.log(`\n[${defClause.content?.split(/\s+/).length || 0} words]`);
      }
    }
  }

  // Show Confidentiality Obligations clause
  console.log("\n" + "=".repeat(80));
  console.log("FULL CONFIDENTIALITY OBLIGATIONS CLAUSE");
  console.log("=".repeat(80));

  for (const r of results) {
    if (!r.error && r.clauses.length > 0) {
      const confClause = r.clauses.find((c: any) =>
        c.title?.toLowerCase().includes("confidentiality") &&
        c.title?.toLowerCase().includes("obligation"));
      if (confClause) {
        console.log(`\n${"=".repeat(40)}`);
        console.log(`${r.model.toUpperCase()} - "${confClause.title}"`);
        console.log(`${"=".repeat(40)}`);
        console.log(confClause.content);
        console.log(`\n[${confClause.content?.split(/\s+/).length || 0} words]`);
      }
    }
  }

  // Show Recitals
  console.log("\n" + "=".repeat(80));
  console.log("RECITALS (WHEREAS CLAUSES)");
  console.log("=".repeat(80));

  for (const r of results) {
    if (!r.error && r.recitals) {
      console.log(`\n${r.model}:`);
      console.log("-".repeat(40));
      console.log(r.recitals);
    }
  }

  // Quality ranking
  console.log("\n" + "=".repeat(80));
  console.log("QUALITY RANKING (by Avg Words/Clause)");
  console.log("=".repeat(80));

  const ranked = results
    .filter(r => !r.error)
    .sort((a, b) => b.avgWords - a.avgWords);

  ranked.forEach((r, i) => {
    console.log(`${i + 1}. ${r.model}: ${r.avgWords} words/clause, ${r.clauseCount} clauses, ${(r.timeMs / 1000).toFixed(1)}s`);
  });
}

main().catch(console.error);
