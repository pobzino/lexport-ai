/**
 * Direct API Test for Contract Generation Models
 *
 * Tests the actual webapp generator with different model configurations.
 * Saves outputs for quality comparison.
 */

import { writeFileSync, mkdirSync } from "fs";

// Test data - same as webapp form
const testRequest = {
  contractType: "nda_mutual",
  metadata: {
    jurisdiction: "us_california",
    disclosingParty: {
      name: "Acme Corporation",
      type: "company",
      email: "john@acme.com",
      representativeName: "John Smith",
      representativeTitle: "CEO",
    },
    receivingParty: {
      name: "Beta Inc",
      type: "company",
      email: "jane@beta.com",
      representativeName: "Jane Doe",
      representativeTitle: "CTO",
    },
    purpose: "Exploring potential AI technology partnership",
    duration: "2",
    confidentialityPeriod: "3",
  },
};

interface TestResult {
  model: string;
  effort: string;
  timeMs: number;
  clauseCount: number;
  totalWords: number;
  avgWordsPerClause: number;
  clauseTitles: string[];
  preamblePreview: string;
  signatureBlock: string;
  error?: string;
}

async function testModel(model: string, effort: string): Promise<TestResult> {
  console.log(`\nTesting ${model} (${effort})...`);

  const start = Date.now();

  try {
    // Import and modify the generator dynamically
    const generatorPath = "../src/lib/contracts/generator.ts";

    // We need to modify the generator constants and re-import
    // Instead, let's call the API directly
    const response = await fetch("http://localhost:3000/api/contracts/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": process.env.AUTH_COOKIE || "",
      },
      body: JSON.stringify(testRequest),
    });

    const timeMs = Date.now() - start;

    if (!response.ok) {
      const error = await response.text();
      return {
        model,
        effort,
        timeMs,
        clauseCount: 0,
        totalWords: 0,
        avgWordsPerClause: 0,
        clauseTitles: [],
        preamblePreview: "",
        signatureBlock: "",
        error: `HTTP ${response.status}: ${error}`,
      };
    }

    const data = await response.json();
    const contract = data.contract;

    const clauses = contract.clauses || [];
    const totalWords = clauses.reduce((sum: number, c: any) =>
      sum + (c.content?.split(/\s+/).length || 0), 0);

    return {
      model,
      effort,
      timeMs,
      clauseCount: clauses.length,
      totalWords,
      avgWordsPerClause: clauses.length > 0 ? Math.round(totalWords / clauses.length) : 0,
      clauseTitles: clauses.map((c: any) => c.title),
      preamblePreview: (contract.preamble || "").substring(0, 300),
      signatureBlock: contract.signatureBlock || "",
    };
  } catch (error: any) {
    return {
      model,
      effort,
      timeMs: Date.now() - start,
      clauseCount: 0,
      totalWords: 0,
      avgWordsPerClause: 0,
      clauseTitles: [],
      preamblePreview: "",
      signatureBlock: "",
      error: error.message,
    };
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("WEBAPP CONTRACT GENERATION - MODEL COMPARISON");
  console.log("=".repeat(70));
  console.log("\nThis test requires:");
  console.log("1. Dev server running (bun run dev)");
  console.log("2. Being logged in (set AUTH_COOKIE env var)");
  console.log("3. Manually changing generator.ts model config between runs\n");

  console.log("Test data:");
  console.log("- Contract: Mutual NDA");
  console.log("- Party A: Acme Corporation (John Smith, CEO)");
  console.log("- Party B: Beta Inc (Jane Doe, CTO)");
  console.log("- Jurisdiction: California, USA\n");

  // For this test, we'll run the current model config
  // User needs to change generator.ts between runs

  const result = await testModel("current-config", "see-generator.ts");

  console.log("\n" + "=".repeat(70));
  console.log("RESULTS");
  console.log("=".repeat(70));

  if (result.error) {
    console.log(`\nERROR: ${result.error}`);
    console.log("\nMake sure you're logged in and dev server is running.");
    return;
  }

  console.log(`\nTime: ${(result.timeMs / 1000).toFixed(1)}s`);
  console.log(`Clauses: ${result.clauseCount}`);
  console.log(`Total Words: ${result.totalWords}`);
  console.log(`Avg Words/Clause: ${result.avgWordsPerClause}`);

  console.log("\nClause Titles:");
  result.clauseTitles.forEach((title, i) => {
    console.log(`  ${i + 1}. ${title}`);
  });

  console.log("\nPreamble Preview:");
  console.log(result.preamblePreview + "...");

  console.log("\nSignature Block:");
  console.log(result.signatureBlock);
}

main().catch(console.error);
