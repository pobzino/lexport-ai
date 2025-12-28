/**
 * Optimized Model Comparison Script
 *
 * Tests models using the CORRECT APIs and best practices:
 * - Reasoning models (GPT-5.x): Responses API with reasoning.effort
 * - GPT models (GPT-4.1): Chat Completions API with detailed prompts
 *
 * Based on OpenAI's Reasoning Best Practices documentation.
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Test contract details - same as before for fair comparison
const CONTRACT_DETAILS = `
Client: Sarah Johnson, Marketing Director of TechStartup Inc.
Freelancer: Alex Chen, Senior Designer of Chen Creative Studio
Project: Brand Refresh 2025
Description: Complete visual identity redesign including logo, color palette, typography, and brand guidelines document
Total Amount: $8,500
Deposit: $2,550
Payment Schedule: milestone
Revision Rounds: 3
Effective Date: 2025-01-15
Deadline: 2025-03-15
Deliverables:
  - Logo concepts (3 options) - due Jan 30, 2025 - $2,000
  - Selected logo refinement - due Feb 15, 2025 - $1,500
  - Brand guidelines document - due Mar 1, 2025 - $2,500
  - Asset package delivery - due Mar 15, 2025 - $2,500
Jurisdiction: California, USA
`.trim();

// ============================================================================
// REASONING MODELS: Use Responses API with simple prompts
// ============================================================================

interface ReasoningModelConfig {
  id: string;
  name: string;
  effort: "low" | "medium" | "high";
}

const REASONING_MODELS: ReasoningModelConfig[] = [
  { id: "gpt-5.1-mini", name: "GPT-5.1 Mini (effort: medium)", effort: "medium" },
  { id: "gpt-5.1-mini", name: "GPT-5.1 Mini (effort: low)", effort: "low" },
  { id: "gpt-5-mini", name: "GPT-5 Mini (effort: medium)", effort: "medium" },
  { id: "gpt-5-mini", name: "GPT-5 Mini (effort: low)", effort: "low" },
];

// Simple, direct prompt for reasoning models (they figure out the details)
const REASONING_DEVELOPER_MESSAGE = `You are a legal contract generator for California law. Generate professional, legally enforceable contracts.

Formatting re-enabled

Output the contract as JSON with this structure:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{ "id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number }],
  "signatureBlock": "string with CLIENT and FREELANCER sections, each having signature line, printed name, title, company, date"
}`;

const REASONING_USER_MESSAGE = `Generate a Freelance Service Agreement for:

${CONTRACT_DETAILS}

Return only valid JSON.`;

// ============================================================================
// GPT MODELS: Use Chat Completions API with detailed prompts
// ============================================================================

interface GPTModelConfig {
  id: string;
  name: string;
}

const GPT_MODELS: GPTModelConfig[] = [
  { id: "gpt-4.1", name: "GPT-4.1" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
  { id: "gpt-4o", name: "GPT-4o (current)" },
];

// Detailed prompt for GPT models (they need explicit instructions)
const GPT_SYSTEM_MESSAGE = `You are an expert legal contract drafter specializing in California, USA law. You generate professional, legally sound contracts that are:

1. **Jurisdiction-Specific**: All clauses comply with California laws and regulations.
2. **Clear and Professional**: Use standard legal language that is precise yet understandable.
3. **Comprehensive**: Include all necessary clauses for enforceability.
4. **Well-Structured**: Organize clauses logically with proper numbering.

Key California requirements:
- California law requires specific disclosures in certain agreements
- Non-compete clauses are generally unenforceable (Business and Professions Code § 16600)
- Independent contractor classification must meet ABC test requirements (AB5)
- Governing law should specify California with venue in appropriate county

When generating contracts:
- Use formal legal language appropriate for California
- Include all mandatory clauses for the contract type
- Add proper definitions for key terms
- Include appropriate governing law and dispute resolution clauses
- Format with proper section numbering (1., 1.1, 1.2, etc.)

SIGNATURE BLOCK REQUIREMENTS:
- Create a professional signature block with CONSISTENT formatting for ALL parties
- Each party section must include: role header (e.g., "CLIENT:"), signature line, printed name, title, company name, and date line
- Use clear visual separation between each party's signature section

Return the contract as valid JSON with this structure:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{ "id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number }],
  "signatureBlock": "string"
}`;

const GPT_USER_MESSAGE = `Generate a complete Freelance Service Agreement with the following details:

${CONTRACT_DETAILS}

Generate the complete contract as valid JSON. Include:
1. A professional title
2. A preamble identifying the parties
3. Recitals/whereas clauses
4. All required clauses with proper legal language (project scope, deliverables, timeline, payment terms, revisions, IP assignment, confidentiality, cancellation, liability, governing law, general provisions)
5. A signature block for both CLIENT and FREELANCER with consistent formatting

Return only valid JSON, no markdown.`;

// ============================================================================
// Result Types
// ============================================================================

interface ContractOutput {
  title: string;
  preamble: string;
  recitals: string;
  clauses: Array<{ id: string; title: string; content: string; type: string; order: number }>;
  signatureBlock: string;
}

interface TestResult {
  model: string;
  modelName: string;
  api: "responses" | "chat_completions";
  reasoningEffort?: "low" | "medium" | "high";
  success: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  clauseCount: number;
  wordCount: number;
  signatureQuality: {
    hasClientSection: boolean;
    hasFreelancerSection: boolean;
    hasTitles: boolean;
    isConsistent: boolean;
  };
  contract?: ContractOutput;
  error?: string;
}

// ============================================================================
// Test Functions
// ============================================================================

async function testReasoningModel(config: ReasoningModelConfig): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Use Responses API for reasoning models
    const response = await (openai as any).responses.create({
      model: config.id,
      reasoning: { effort: config.effort },
      input: [
        { role: "developer", content: REASONING_DEVELOPER_MESSAGE },
        { role: "user", content: REASONING_USER_MESSAGE },
      ],
    });

    const latencyMs = Date.now() - startTime;

    // Extract text from response
    const outputText = response.output_text ||
      response.output?.find((o: any) => o.type === "message")?.content?.[0]?.text || "";

    // Parse JSON from response
    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createErrorResult(config, "responses", latencyMs, "No JSON found in response");
    }

    const contract = JSON.parse(jsonMatch[0]) as ContractOutput;
    const signatureQuality = analyzeSignatureBlock(contract.signatureBlock);
    const wordCount = countWords(contract);

    return {
      model: config.id,
      modelName: config.name,
      api: "responses",
      reasoningEffort: config.effort,
      success: true,
      latencyMs,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      clauseCount: contract.clauses?.length || 0,
      wordCount,
      signatureQuality,
      contract,
    };
  } catch (error) {
    return createErrorResult(
      config,
      "responses",
      Date.now() - startTime,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

async function testGPTModel(config: GPTModelConfig): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Use Chat Completions API for GPT models
    const response = await openai.chat.completions.create({
      model: config.id,
      max_tokens: 6000,
      messages: [
        { role: "system", content: GPT_SYSTEM_MESSAGE },
        { role: "user", content: GPT_USER_MESSAGE },
      ],
    });

    const latencyMs = Date.now() - startTime;
    const outputText = response.choices[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createGPTErrorResult(config, latencyMs, "No JSON found in response");
    }

    const contract = JSON.parse(jsonMatch[0]) as ContractOutput;
    const signatureQuality = analyzeSignatureBlock(contract.signatureBlock);
    const wordCount = countWords(contract);

    return {
      model: config.id,
      modelName: config.name,
      api: "chat_completions",
      success: true,
      latencyMs,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      reasoningTokens: 0,
      totalTokens: response.usage?.total_tokens || 0,
      clauseCount: contract.clauses?.length || 0,
      wordCount,
      signatureQuality,
      contract,
    };
  } catch (error) {
    return createGPTErrorResult(
      config,
      Date.now() - startTime,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

function createErrorResult(
  config: ReasoningModelConfig,
  api: "responses",
  latencyMs: number,
  error: string
): TestResult {
  return {
    model: config.id,
    modelName: config.name,
    api,
    reasoningEffort: config.effort,
    success: false,
    latencyMs,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    clauseCount: 0,
    wordCount: 0,
    signatureQuality: { hasClientSection: false, hasFreelancerSection: false, hasTitles: false, isConsistent: false },
    error,
  };
}

function createGPTErrorResult(config: GPTModelConfig, latencyMs: number, error: string): TestResult {
  return {
    model: config.id,
    modelName: config.name,
    api: "chat_completions",
    success: false,
    latencyMs,
    inputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    clauseCount: 0,
    wordCount: 0,
    signatureQuality: { hasClientSection: false, hasFreelancerSection: false, hasTitles: false, isConsistent: false },
    error,
  };
}

function analyzeSignatureBlock(signatureBlock: string): TestResult["signatureQuality"] {
  const lower = (signatureBlock || "").toLowerCase();
  return {
    hasClientSection: lower.includes("client"),
    hasFreelancerSection: lower.includes("freelancer") || lower.includes("contractor"),
    hasTitles: lower.includes("title:") || lower.includes("title :"),
    isConsistent: lower.includes("client") && (lower.includes("freelancer") || lower.includes("contractor")),
  };
}

function countWords(contract: ContractOutput): number {
  const allText = [
    contract.title,
    contract.preamble,
    contract.recitals,
    ...(contract.clauses || []).map((c) => c.content),
    contract.signatureBlock,
  ].join(" ");
  return allText.split(/\s+/).filter(Boolean).length;
}

function formatContractAsMarkdown(result: TestResult): string {
  if (!result.contract) return "";
  const c = result.contract;

  let md = `# Contract Generated by ${result.modelName}\n\n`;
  md += `**Model ID:** \`${result.model}\`\n`;
  md += `**API:** ${result.api}\n`;
  if (result.reasoningEffort) md += `**Reasoning Effort:** ${result.reasoningEffort}\n`;
  md += `**Reasoning Tokens:** ${result.reasoningTokens}\n\n`;
  md += `---\n\n`;

  md += `## ${c.title}\n\n`;
  md += `### Preamble\n\n${c.preamble}\n\n`;
  md += `### Recitals\n\n${c.recitals}\n\n`;
  md += `---\n\n`;

  md += `## Clauses (${c.clauses?.length || 0} total)\n\n`;
  for (const clause of (c.clauses || []).sort((a, b) => a.order - b.order)) {
    md += `### ${clause.title}\n\n`;
    md += `*Type: ${clause.type}*\n\n`;
    md += `${clause.content}\n\n`;
  }

  md += `---\n\n`;
  md += `## Signature Block\n\n`;
  md += `\`\`\`\n${c.signatureBlock}\n\`\`\`\n`;

  return md;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("🔬 OPTIMIZED Model Comparison\n");
  console.log("Using correct APIs and best practices:\n");
  console.log("  • Reasoning models → Responses API + reasoning.effort");
  console.log("  • GPT models → Chat Completions API + detailed prompts\n");
  console.log("=".repeat(80));

  const results: TestResult[] = [];

  // Test Reasoning Models with Responses API
  console.log("\n📊 REASONING MODELS (Responses API)\n");

  for (const config of REASONING_MODELS) {
    console.log(`   Testing ${config.name}...`);
    const result = await testReasoningModel(config);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ ${(result.latencyMs / 1000).toFixed(1)}s | ${result.clauseCount} clauses | ${result.reasoningTokens} reasoning tokens`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // Test GPT Models with Chat Completions API
  console.log("\n📊 GPT MODELS (Chat Completions API)\n");

  for (const config of GPT_MODELS) {
    console.log(`   Testing ${config.name}...`);
    const result = await testGPTModel(config);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ ${(result.latencyMs / 1000).toFixed(1)}s | ${result.clauseCount} clauses | ${result.totalTokens} tokens`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // Summary Table
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 COMPARISON SUMMARY\n");

  console.log("┌────────────────────────────────┬─────────┬─────────┬─────────┬──────────┬──────────┬─────────────────┐");
  console.log("│ Model                          │ Latency │ Clauses │ Words   │ Tokens   │ Reason   │ Signature       │");
  console.log("├────────────────────────────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────────────┤");

  for (const r of results) {
    if (r.success) {
      const sig = r.signatureQuality.isConsistent ? "✓ consistent" : "✗ inconsistent";
      const latency = `${(r.latencyMs / 1000).toFixed(1)}s`.padStart(7);
      const clauses = String(r.clauseCount).padStart(7);
      const words = String(r.wordCount).padStart(7);
      const tokens = String(r.totalTokens).padStart(8);
      const reasoning = String(r.reasoningTokens).padStart(8);

      console.log(`│ ${r.modelName.padEnd(30)} │ ${latency} │ ${clauses} │ ${words} │ ${tokens} │ ${reasoning} │ ${sig.padEnd(15)} │`);
    } else {
      console.log(`│ ${r.modelName.padEnd(30)} │ FAILED  │    -    │    -    │     -    │     -    │ ${(r.error || "").slice(0, 15).padEnd(15)} │`);
    }
  }

  console.log("└────────────────────────────────┴─────────┴─────────┴─────────┴──────────┴──────────┴─────────────────┘");

  // Analysis
  console.log("\n📋 ANALYSIS\n");

  const successful = results.filter((r) => r.success);
  const reasoning = successful.filter((r) => r.api === "responses");
  const gpt = successful.filter((r) => r.api === "chat_completions");

  if (reasoning.length > 0 && gpt.length > 0) {
    const avgReasoningLatency = reasoning.reduce((a, b) => a + b.latencyMs, 0) / reasoning.length;
    const avgGPTLatency = gpt.reduce((a, b) => a + b.latencyMs, 0) / gpt.length;
    const avgReasoningClauses = reasoning.reduce((a, b) => a + b.clauseCount, 0) / reasoning.length;
    const avgGPTClauses = gpt.reduce((a, b) => a + b.clauseCount, 0) / gpt.length;

    console.log(`   Reasoning models avg: ${(avgReasoningLatency / 1000).toFixed(1)}s, ${avgReasoningClauses.toFixed(1)} clauses`);
    console.log(`   GPT models avg: ${(avgGPTLatency / 1000).toFixed(1)}s, ${avgGPTClauses.toFixed(1)} clauses`);
    console.log(`   Speed difference: GPT is ${(avgReasoningLatency / avgGPTLatency).toFixed(1)}x faster`);
  }

  // Recommendations
  console.log("\n📋 RECOMMENDATIONS\n");

  const bestReasoning = reasoning.sort((a, b) => {
    const scoreA = a.clauseCount + (a.signatureQuality.isConsistent ? 5 : 0) - a.latencyMs / 10000;
    const scoreB = b.clauseCount + (b.signatureQuality.isConsistent ? 5 : 0) - b.latencyMs / 10000;
    return scoreB - scoreA;
  })[0];

  const bestGPT = gpt.sort((a, b) => {
    const scoreA = a.clauseCount + (a.signatureQuality.isConsistent ? 5 : 0) - a.latencyMs / 10000;
    const scoreB = b.clauseCount + (b.signatureQuality.isConsistent ? 5 : 0) - b.latencyMs / 10000;
    return scoreB - scoreA;
  })[0];

  const fastest = successful.sort((a, b) => a.latencyMs - b.latencyMs)[0];

  if (bestReasoning) console.log(`   🧠 Best Reasoning: ${bestReasoning.modelName}`);
  if (bestGPT) console.log(`   ⚡ Best GPT: ${bestGPT.modelName}`);
  if (fastest) console.log(`   🏃 Fastest: ${fastest.modelName} (${(fastest.latencyMs / 1000).toFixed(1)}s)`);

  console.log("\n   For CONTRACT GENERATION (well-defined task):");
  console.log("   → Use GPT models (faster, cheaper, sufficient quality)");
  console.log("\n   For CONTRACT REVIEW (complex analysis):");
  console.log("   → Use Reasoning models (better at finding issues)");

  // Save results
  const outputDir = "/Users/pobor/Downloads/lexport-ai/scripts/outputs";
  await Bun.write(`${outputDir}/optimized-comparison-results.json`, JSON.stringify(results, null, 2));

  console.log("\n📄 Saving contract outputs...\n");

  for (const r of results) {
    if (r.success && r.contract) {
      const filename = `${outputDir}/${r.model.replace(/\./g, "-")}-${r.reasoningEffort || "gpt"}-contract.md`;
      await Bun.write(filename, formatContractAsMarkdown(r));
      console.log(`   ✅ ${filename}`);
    }
  }

  console.log(`\n📁 Results saved to: ${outputDir}/optimized-comparison-results.json`);
}

main().catch(console.error);
