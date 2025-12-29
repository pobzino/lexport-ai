/**
 * AI Model Comparison Test for Contract Generation
 *
 * Tests contract generation quality across:
 * - GPT-5.2 (OpenAI)
 * - Claude Opus 4.5 (Anthropic)
 * - Gemini 3 Pro (Google)
 *
 * Run: bun run scripts/model-comparison.ts
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

// Initialize clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Model configurations
const MODELS = {
  "gpt-5.2": { provider: "openai", model: "gpt-5.2" },
  "opus-4.5": { provider: "anthropic", model: "claude-opus-4-5-20251101" },
  "gemini-3-pro": { provider: "google", model: "gemini-3-pro-preview" },
};

// Contract types with test data
const CONTRACT_TESTS = {
  nda_mutual: {
    name: "Mutual NDA",
    metadata: {
      jurisdiction: "us_california",
      disclosingParty: { name: "Alice Johnson", title: "CEO", company: "TechStart Inc." },
      receivingParty: { name: "Bob Smith", title: "CTO", company: "InnovateCo LLC" },
      effectiveDate: "2025-01-15",
      purpose: "Exploring potential partnership for AI-powered analytics platform development",
      confidentialityPeriod: 3,
      includeNonSolicit: true,
      includeNonCompete: false,
    },
  },
  nda_one_way: {
    name: "One-Way NDA",
    metadata: {
      jurisdiction: "us_california",
      disclosingParty: { name: "Sarah Chen", title: "Founder", company: "Stealth Startup Inc." },
      receivingParty: { name: "Michael Brown", title: "Investment Associate", company: "Venture Capital Partners" },
      effectiveDate: "2025-01-15",
      purpose: "Evaluating potential seed investment opportunity",
      confidentialityPeriod: 2,
      includeNonSolicit: false,
      includeNonCompete: false,
    },
  },
  independent_contractor: {
    name: "Independent Contractor Agreement",
    metadata: {
      jurisdiction: "us_california",
      client: { name: "David Lee", title: "Product Manager", company: "AppDev Corp" },
      contractor: { name: "Emma Wilson", title: "Senior Developer" },
      effectiveDate: "2025-02-01",
      endDate: "2025-07-31",
      servicesDescription: "Full-stack development for mobile application including React Native frontend and Node.js backend with AWS integration",
      paymentAmount: 12000,
      paymentFrequency: "monthly",
      paymentTerms: 30,
      terminationNoticeDays: 14,
      includeIPAssignment: true,
      includeConfidentiality: true,
    },
  },
  consulting_agreement: {
    name: "Consulting Agreement",
    metadata: {
      jurisdiction: "us_california",
      client: { name: "Rachel Green", title: "VP of Strategy", company: "Growth Enterprises" },
      consultant: { name: "James Martinez", title: "Strategy Consultant", company: "JM Consulting" },
      effectiveDate: "2025-01-20",
      endDate: "2025-06-20",
      consultingScope: "Market expansion strategy development for Southeast Asian markets, including competitive analysis, partner identification, and go-to-market planning",
      retainerAmount: 5000,
      hourlyRate: 250,
      maxHours: 40,
      paymentTerms: 15,
      deliverables: ["Market Analysis Report", "Partner Recommendation Deck", "90-Day Implementation Plan"],
      includeNonCompete: true,
      nonCompetePeriod: 12,
    },
  },
  safe_note: {
    name: "SAFE Note",
    metadata: {
      jurisdiction: "us_california",
      company: { name: "TechVenture Inc.", title: "CEO" },
      investor: { name: "Angel Investor Group LLC", title: "Managing Partner" },
      investmentAmount: 250000,
      safeType: "valuation_cap_and_discount",
      valuationCap: 5000000,
      discountRate: 20,
      proRataRights: true,
      effectiveDate: "2025-01-25",
    },
  },
  freelance_service: {
    name: "Freelance Service Agreement",
    metadata: {
      jurisdiction: "us_california",
      client: { name: "Creative Agency Co.", title: "Creative Director" },
      freelancer: { name: "Jordan Taylor", title: "UX/UI Designer" },
      projectName: "E-commerce Platform Redesign",
      projectDescription: "Complete UX/UI redesign of existing e-commerce platform including user research, wireframes, high-fidelity mockups, and design system documentation",
      totalAmount: 15000,
      depositAmount: 5000,
      paymentSchedule: "milestone",
      revisionRounds: 3,
      effectiveDate: "2025-02-01",
      deadline: "2025-04-30",
      deliverables: [
        { description: "User Research Report", dueDate: "2025-02-15", amount: 2000 },
        { description: "Wireframes & User Flows", dueDate: "2025-03-01", amount: 3000 },
        { description: "High-Fidelity Mockups", dueDate: "2025-03-31", amount: 5000 },
        { description: "Design System Documentation", dueDate: "2025-04-30", amount: 5000 },
      ],
    },
  },
};

// System prompt for contract generation
function getSystemPrompt(jurisdiction: string): string {
  return `You are an expert legal contract drafter specializing in ${jurisdiction === "us_california" ? "California" : jurisdiction} law.

Generate professional, legally binding contracts that are:
1. Jurisdiction-specific and compliant with local laws
2. Clear, precise, and using standard legal language
3. Comprehensive with all necessary clauses
4. Well-structured with proper numbering

For California specifically:
- Non-compete clauses are generally unenforceable (Business and Professions Code § 16600)
- Independent contractor classification must meet ABC test (AB5)
- Include appropriate governing law and venue provisions

Output JSON format:
{
  "title": "string",
  "preamble": "string - Opening paragraph identifying parties and effective date",
  "recitals": "string - Background/whereas clauses",
  "clauses": [{"id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number}],
  "signatureBlock": "string - Professional signature block for all parties"
}`;
}

// Build user prompt for specific contract
function buildUserPrompt(contractType: string, metadata: Record<string, any>): string {
  const metadataStr = JSON.stringify(metadata, null, 2);
  return `Generate a complete ${contractType.replace(/_/g, " ")} contract with the following details:

${metadataStr}

Return only valid JSON with title, preamble, recitals, clauses array, and signatureBlock.`;
}

// Generate contract with OpenAI
async function generateWithOpenAI(
  contractType: string,
  metadata: Record<string, any>,
  model: string
): Promise<{ result: any; timing: number; tokens: number }> {
  const start = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: getSystemPrompt(metadata.jurisdiction) },
        { role: "user", content: buildUserPrompt(contractType, metadata) },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8000,
    });

    const timing = Date.now() - start;
    const content = response.choices[0]?.message?.content || "{}";
    const tokens = response.usage?.total_tokens || 0;

    return {
      result: JSON.parse(content),
      timing,
      tokens,
    };
  } catch (error) {
    console.error(`OpenAI error for ${contractType}:`, error);
    return { result: null, timing: Date.now() - start, tokens: 0 };
  }
}

// Generate contract with Anthropic
async function generateWithAnthropic(
  contractType: string,
  metadata: Record<string, any>,
  model: string
): Promise<{ result: any; timing: number; tokens: number }> {
  const start = Date.now();

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      system: getSystemPrompt(metadata.jurisdiction),
      messages: [
        { role: "user", content: buildUserPrompt(contractType, metadata) },
      ],
    });

    const timing = Date.now() - start;
    const content = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return { result, timing, tokens };
  } catch (error) {
    console.error(`Anthropic error for ${contractType}:`, error);
    return { result: null, timing: Date.now() - start, tokens: 0 };
  }
}

// Generate contract with Google Gemini
async function generateWithGemini(
  contractType: string,
  metadata: Record<string, any>,
  model: string
): Promise<{ result: any; timing: number; tokens: number }> {
  const start = Date.now();

  try {
    const genModel = gemini.getGenerativeModel({ model });
    const prompt = `${getSystemPrompt(metadata.jurisdiction)}\n\n${buildUserPrompt(contractType, metadata)}`;

    const result = await genModel.generateContent(prompt);
    const timing = Date.now() - start;
    const response = result.response;
    const content = response.text();
    const tokens = response.usageMetadata?.totalTokenCount || 0;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return { result: parsed, timing, tokens };
  } catch (error) {
    console.error(`Gemini error for ${contractType}:`, error);
    return { result: null, timing: Date.now() - start, tokens: 0 };
  }
}

// Evaluate contract quality
function evaluateContract(contract: any, contractType: string): Record<string, any> {
  if (!contract) {
    return { valid: false, score: 0, issues: ["Generation failed"] };
  }

  const issues: string[] = [];
  let score = 100;

  // Check required fields
  if (!contract.title) { issues.push("Missing title"); score -= 10; }
  if (!contract.preamble) { issues.push("Missing preamble"); score -= 10; }
  if (!contract.recitals) { issues.push("Missing recitals"); score -= 10; }
  if (!contract.signatureBlock) { issues.push("Missing signature block"); score -= 10; }

  // Check clauses
  if (!contract.clauses || !Array.isArray(contract.clauses)) {
    issues.push("Missing or invalid clauses");
    score -= 30;
  } else {
    const clauseCount = contract.clauses.length;
    if (clauseCount < 5) { issues.push(`Only ${clauseCount} clauses (expected 5+)`); score -= 15; }
    if (clauseCount < 3) { score -= 15; }

    // Check for essential clauses by type
    const clauseTitles = contract.clauses.map((c: any) => c.title?.toLowerCase() || "");

    const essentialClauses: Record<string, string[]> = {
      nda_mutual: ["confidential", "term", "remedies", "governing law"],
      nda_one_way: ["confidential", "term", "return", "governing law"],
      independent_contractor: ["services", "compensation", "independent contractor", "termination"],
      consulting_agreement: ["scope", "compensation", "deliverables", "termination"],
      safe_note: ["investment", "conversion", "termination", "governing law"],
      freelance_service: ["services", "payment", "deliverables", "intellectual property"],
    };

    const required = essentialClauses[contractType] || [];
    for (const essential of required) {
      if (!clauseTitles.some((t: string) => t.includes(essential))) {
        issues.push(`Missing essential clause: ${essential}`);
        score -= 5;
      }
    }
  }

  // Check content length/quality
  const totalContent = JSON.stringify(contract).length;
  if (totalContent < 2000) { issues.push("Contract seems too short"); score -= 10; }
  if (totalContent < 1000) { score -= 10; }

  return {
    valid: score > 50,
    score: Math.max(0, score),
    clauseCount: contract.clauses?.length || 0,
    contentLength: totalContent,
    issues,
  };
}

// Main test runner
async function runComparison() {
  console.log("=" .repeat(80));
  console.log("AI MODEL COMPARISON FOR CONTRACT GENERATION");
  console.log("=" .repeat(80));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results: Record<string, Record<string, any>> = {};

  // Test each model
  for (const [modelKey, modelConfig] of Object.entries(MODELS)) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${modelKey.toUpperCase()}`);
    console.log(`${"=".repeat(60)}`);

    results[modelKey] = {
      contracts: {},
      summary: { totalTime: 0, totalTokens: 0, avgScore: 0, successCount: 0 },
    };

    // Test each contract type
    for (const [contractType, testData] of Object.entries(CONTRACT_TESTS)) {
      console.log(`\n  Generating: ${testData.name}...`);

      let response: { result: any; timing: number; tokens: number };

      switch (modelConfig.provider) {
        case "openai":
          response = await generateWithOpenAI(contractType, testData.metadata, modelConfig.model);
          break;
        case "anthropic":
          response = await generateWithAnthropic(contractType, testData.metadata, modelConfig.model);
          break;
        case "google":
          response = await generateWithGemini(contractType, testData.metadata, modelConfig.model);
          break;
        default:
          response = { result: null, timing: 0, tokens: 0 };
      }

      const evaluation = evaluateContract(response.result, contractType);

      results[modelKey].contracts[contractType] = {
        name: testData.name,
        timing: response.timing,
        tokens: response.tokens,
        evaluation,
        contract: response.result,
      };

      results[modelKey].summary.totalTime += response.timing;
      results[modelKey].summary.totalTokens += response.tokens;
      if (evaluation.valid) results[modelKey].summary.successCount++;

      console.log(`    Time: ${(response.timing / 1000).toFixed(2)}s`);
      console.log(`    Tokens: ${response.tokens}`);
      console.log(`    Score: ${evaluation.score}/100`);
      console.log(`    Clauses: ${evaluation.clauseCount}`);
      if (evaluation.issues.length > 0) {
        console.log(`    Issues: ${evaluation.issues.slice(0, 3).join(", ")}`);
      }
    }

    // Calculate average score
    const scores = Object.values(results[modelKey].contracts).map((c: any) => c.evaluation.score);
    results[modelKey].summary.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Print comparison summary
  console.log("\n\n" + "=".repeat(80));
  console.log("COMPARISON SUMMARY");
  console.log("=".repeat(80));

  console.log("\n| Model | Avg Score | Success Rate | Total Time | Total Tokens |");
  console.log("|-------|-----------|--------------|------------|--------------|");

  for (const [modelKey, data] of Object.entries(results)) {
    const s = data.summary;
    const successRate = ((s.successCount / 6) * 100).toFixed(0);
    console.log(
      `| ${modelKey.padEnd(13)} | ${s.avgScore.toFixed(1).padStart(9)} | ${(successRate + "%").padStart(12)} | ${(s.totalTime / 1000).toFixed(1).padStart(9)}s | ${s.totalTokens.toString().padStart(12)} |`
    );
  }

  // Detailed per-contract comparison
  console.log("\n\nPER-CONTRACT SCORES:");
  console.log("-".repeat(80));

  const contractTypes = Object.keys(CONTRACT_TESTS);
  console.log("\n| Contract Type".padEnd(30) + Object.keys(MODELS).map(m => m.padStart(15)).join("") + " |");
  console.log("|" + "-".repeat(29) + Object.keys(MODELS).map(() => "-".repeat(15)).join("") + "-|");

  for (const contractType of contractTypes) {
    const name = CONTRACT_TESTS[contractType as keyof typeof CONTRACT_TESTS].name;
    let row = `| ${name.padEnd(28)}`;
    for (const modelKey of Object.keys(MODELS)) {
      const score = results[modelKey].contracts[contractType]?.evaluation.score || 0;
      row += score.toString().padStart(14) + " ";
    }
    row += "|";
    console.log(row);
  }

  // Save detailed results to file
  const outputPath = "/Users/pobor/Downloads/lexport-ai/scripts/model-comparison-results.json";
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);

  // Determine winner
  const modelScores = Object.entries(results).map(([model, data]) => ({
    model,
    avgScore: data.summary.avgScore,
  }));
  modelScores.sort((a, b) => b.avgScore - a.avgScore);

  console.log("\n" + "=".repeat(80));
  console.log(`WINNER: ${modelScores[0].model.toUpperCase()} (Avg Score: ${modelScores[0].avgScore.toFixed(1)})`);
  console.log("=".repeat(80));

  return results;
}

// Run the comparison
runComparison().catch(console.error);
