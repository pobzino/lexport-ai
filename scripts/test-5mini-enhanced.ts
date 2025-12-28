/**
 * Test GPT-5-mini with enhanced structural prompts
 *
 * Adds explicit instructions for:
 * - Numbered subsections (1.1, 1.2, etc.)
 * - Definitions section
 * - Kill fee clause
 * - Moral rights waiver
 * - Portfolio use provisions
 * - Trademark disclaimer
 * - Indemnification remedies
 */

import OpenAI from "openai";
import * as fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Enhanced developer message with explicit structural requirements
const ENHANCED_DEVELOPER_MESSAGE = `You are a legal contract generator for California law.

REQUIRED STRUCTURE:
1. Use numbered subsections throughout (e.g., 1.1, 1.2, 7.1, 7.2)
2. Start with a DEFINITIONS section defining: Services, Deliverables, Final Deliverables, Client Materials, Freelancer Tools, Work Product
3. Include these specific provisions:
   - Kill Fee: 10% of unpaid amount (max $850) if client terminates for convenience after work begins
   - Moral Rights: Freelancer waives moral rights to maximum extent permitted by law
   - Portfolio Use: Freelancer may display deliverables in portfolio after client's public launch, unless client objects for confidential reasons
   - Trademark Disclaimer: Client is responsible for trademark clearance; Freelancer provides no legal advice
   - Preliminary Works: Unused concepts remain Freelancer's property
   - Indemnification Remedies: If infringement claim arises, Freelancer may (i) procure rights, (ii) replace/modify, or (iii) refund
   - Assignment: Neither party may assign without consent, except for merger/acquisition
   - Subcontracting: Freelancer may use qualified subcontractors

4. Signature block format:
   CLIENT:
   [Company Name]

   By: _______________________________
   Printed Name: [Name]
   Title: [Title]
   Company: [Company]
   Date: _____________________________

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{ "id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number }],
  "signatureBlock": "string"
}`;

const ENHANCED_USER_MESSAGE = `Generate a Freelance Service Agreement for:

${CONTRACT_DETAILS}

Follow the structure requirements exactly. Return only valid JSON.`;

interface ContractOutput {
  title: string;
  preamble: string;
  recitals: string;
  clauses: Array<{ id: string; title: string; content: string; type: string; order: number }>;
  signatureBlock: string;
}

interface TestResult {
  model: string;
  effort: string;
  prompt: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalCost: number;
  clauseCount: number;
  wordCount: number;
  hasDefinitions: boolean;
  hasNumberedSections: boolean;
  hasKillFee: boolean;
  hasMoralRights: boolean;
  contract: ContractOutput | null;
}

async function testModel(effort: "low" | "medium", promptType: "simple" | "enhanced"): Promise<TestResult> {
  const developerMessage = promptType === "enhanced"
    ? ENHANCED_DEVELOPER_MESSAGE
    : `You are a legal contract generator for California law. Generate professional, legally enforceable contracts.

Output the contract as JSON with this structure:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{ "id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number }],
  "signatureBlock": "string with CLIENT and FREELANCER sections"
}`;

  const userMessage = promptType === "enhanced"
    ? ENHANCED_USER_MESSAGE
    : `Generate a Freelance Service Agreement for:\n\n${CONTRACT_DETAILS}\n\nReturn only valid JSON.`;

  console.log(`\nTesting GPT-5-mini (effort: ${effort}, prompt: ${promptType})...`);
  const startTime = Date.now();

  try {
    const response = await (openai as any).responses.create({
      model: "gpt-5-mini",
      reasoning: { effort },
      input: [
        { role: "developer", content: developerMessage },
        { role: "user", content: userMessage },
      ],
    });

    const latencyMs = Date.now() - startTime;
    const content = response.output_text || "";

    // Extract JSON
    let contract: ContractOutput | null = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        contract = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse JSON");
    }

    const fullText = contract
      ? `${contract.preamble} ${contract.recitals} ${contract.clauses.map(c => c.content).join(" ")} ${contract.signatureBlock}`
      : content;

    const wordCount = fullText.split(/\s+/).length;
    const clauseCount = contract?.clauses?.length || 0;

    // Check for structural elements
    const hasDefinitions = contract?.clauses?.some(c =>
      c.title.toLowerCase().includes("definition") || c.content.includes("1.1") && c.content.includes("means")
    ) || false;

    const hasNumberedSections = fullText.includes("1.1") && fullText.includes("1.2");
    const hasKillFee = fullText.toLowerCase().includes("kill fee") || fullText.includes("10%") && fullText.toLowerCase().includes("terminat");
    const hasMoralRights = fullText.toLowerCase().includes("moral rights");

    // Calculate cost
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const reasoningTokens = response.usage?.output_tokens_details?.reasoning_tokens || 0;
    const totalOutputBilled = outputTokens + reasoningTokens;
    const totalCost = (inputTokens * 0.25 / 1_000_000) + (totalOutputBilled * 2 / 1_000_000);

    return {
      model: "gpt-5-mini",
      effort,
      prompt: promptType,
      latencyMs,
      inputTokens,
      outputTokens,
      reasoningTokens,
      totalCost,
      clauseCount,
      wordCount,
      hasDefinitions,
      hasNumberedSections,
      hasKillFee,
      hasMoralRights,
      contract,
    };
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    return {
      model: "gpt-5-mini",
      effort,
      prompt: promptType,
      latencyMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalCost: 0,
      clauseCount: 0,
      wordCount: 0,
      hasDefinitions: false,
      hasNumberedSections: false,
      hasKillFee: false,
      hasMoralRights: false,
      contract: null,
    };
  }
}

function saveContract(result: TestResult) {
  if (!result.contract) return;

  const filename = `scripts/outputs/gpt-5-mini-${result.effort}-${result.prompt}-contract.md`;

  let markdown = `# Contract Generated by GPT-5 Mini (effort: ${result.effort}, prompt: ${result.prompt})

**Model ID:** \`gpt-5-mini\`
**API:** responses
**Reasoning Effort:** ${result.effort}
**Prompt Type:** ${result.prompt}
**Reasoning Tokens:** ${result.reasoningTokens}
**Cost:** $${result.totalCost.toFixed(4)}

### Structural Analysis
- Has Definitions Section: ${result.hasDefinitions ? "✅" : "❌"}
- Has Numbered Subsections: ${result.hasNumberedSections ? "✅" : "❌"}
- Has Kill Fee: ${result.hasKillFee ? "✅" : "❌"}
- Has Moral Rights Waiver: ${result.hasMoralRights ? "✅" : "❌"}

---

## ${result.contract.title}

### Preamble

${result.contract.preamble}

### Recitals

${result.contract.recitals}

---

## Clauses (${result.clauseCount} total)

`;

  for (const clause of result.contract.clauses.sort((a, b) => a.order - b.order)) {
    markdown += `### ${clause.title}

*Type: ${clause.type}*

${clause.content}

`;
  }

  markdown += `---

## Signature Block

\`\`\`
${result.contract.signatureBlock}
\`\`\`
`;

  fs.writeFileSync(filename, markdown);
  console.log(`  Saved to ${filename}`);
}

async function main() {
  console.log("=" .repeat(60));
  console.log("GPT-5-mini Enhanced Prompt Test");
  console.log("=" .repeat(60));

  const results: TestResult[] = [];

  // Test all combinations
  const tests = [
    { effort: "low" as const, prompt: "simple" as const },
    { effort: "low" as const, prompt: "enhanced" as const },
    { effort: "medium" as const, prompt: "simple" as const },
    { effort: "medium" as const, prompt: "enhanced" as const },
  ];

  for (const test of tests) {
    const result = await testModel(test.effort, test.prompt);
    results.push(result);
    saveContract(result);

    console.log(`  Latency: ${(result.latencyMs / 1000).toFixed(1)}s`);
    console.log(`  Clauses: ${result.clauseCount}`);
    console.log(`  Words: ${result.wordCount}`);
    console.log(`  Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`  Definitions: ${result.hasDefinitions ? "✅" : "❌"}`);
    console.log(`  Numbered: ${result.hasNumberedSections ? "✅" : "❌"}`);
    console.log(`  Kill Fee: ${result.hasKillFee ? "✅" : "❌"}`);
    console.log(`  Moral Rights: ${result.hasMoralRights ? "✅" : "❌"}`);
  }

  // Summary table
  console.log("\n" + "=" .repeat(60));
  console.log("COMPARISON SUMMARY");
  console.log("=" .repeat(60));
  console.log("\n| Effort | Prompt | Clauses | Cost | Definitions | Numbered | Kill Fee | Moral Rights |");
  console.log("|--------|--------|---------|------|-------------|----------|----------|--------------|");

  for (const r of results) {
    console.log(`| ${r.effort.padEnd(6)} | ${r.prompt.padEnd(8)} | ${String(r.clauseCount).padEnd(7)} | $${r.totalCost.toFixed(3)} | ${r.hasDefinitions ? "✅" : "❌"}           | ${r.hasNumberedSections ? "✅" : "❌"}        | ${r.hasKillFee ? "✅" : "❌"}        | ${r.hasMoralRights ? "✅" : "❌"}            |`);
  }

  // Save results
  fs.writeFileSync(
    "scripts/outputs/enhanced-prompt-results.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\nResults saved to scripts/outputs/enhanced-prompt-results.json");
}

main().catch(console.error);
