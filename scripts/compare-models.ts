/**
 * Model Comparison Script
 *
 * Compares contract generation quality across different OpenAI models:
 * - gpt-5.2 (latest flagship)
 * - gpt-5.1
 * - gpt-5-mini
 * - gpt-5-nano (smallest/fastest)
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODELS = [
  { id: "gpt-5.2", name: "GPT-5.2 (Latest)", tier: "flagship" },
  { id: "gpt-5.1", name: "GPT-5.1", tier: "standard" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", tier: "small" },
  { id: "gpt-4.1", name: "GPT-4.1", tier: "4.x" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", tier: "4.x-mini" },
];

// Test contract metadata for a Freelance Service Agreement
const TEST_METADATA = {
  contractType: "freelance_service",
  jurisdiction: "us_california",
  client: {
    name: "Sarah Johnson",
    title: "Marketing Director",
    company: "TechStartup Inc.",
    email: "sarah@techstartup.com",
  },
  freelancer: {
    name: "Alex Chen",
    title: "Senior Designer",
    company: "Chen Creative Studio",
    email: "alex@chencreative.com",
  },
  projectName: "Brand Refresh 2025",
  projectDescription: "Complete visual identity redesign including logo, color palette, typography, and brand guidelines document",
  totalAmount: 8500,
  depositAmount: 2550,
  paymentSchedule: "milestone",
  revisionRounds: 3,
  effectiveDate: "2025-01-15",
  deadline: "2025-03-15",
  deliverables: [
    { description: "Logo concepts (3 options)", dueDate: "2025-01-30", amount: 2000 },
    { description: "Selected logo refinement", dueDate: "2025-02-15", amount: 1500 },
    { description: "Brand guidelines document", dueDate: "2025-03-01", amount: 2500 },
    { description: "Asset package delivery", dueDate: "2025-03-15", amount: 2500 },
  ],
};

const GENERATION_FUNCTION: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_contract",
    description: "Generate a complete contract with structured clauses",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Contract title" },
        preamble: { type: "string", description: "Opening paragraph" },
        recitals: { type: "string", description: "Background/whereas clauses" },
        clauses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
              type: { type: "string", enum: ["standard", "negotiable", "optional"] },
              order: { type: "number" },
            },
            required: ["id", "title", "content", "type", "order"],
          },
        },
        signatureBlock: {
          type: "string",
          description: `Professional signature block with consistent formatting for all parties. Each party must include:
1. Role header (e.g., "CLIENT:", "FREELANCER:")
2. Signature line: "Signature: ____________________"
3. Printed name: "Printed Name: [Full Name]"
4. Title: "Title: [Job Title]"
5. Company: "[Company Name]"
6. Date line: "Date: ____________________"`,
        },
      },
      required: ["title", "preamble", "recitals", "clauses", "signatureBlock"],
    },
  },
};

const SYSTEM_PROMPT = `You are an expert legal contract drafter specializing in California, USA law. Generate professional, legally sound contracts that are:
1. Jurisdiction-Specific: All clauses comply with California laws
2. Clear and Professional: Use standard legal language
3. Comprehensive: Include all necessary clauses
4. Well-Structured: Organize clauses logically

SIGNATURE BLOCK REQUIREMENTS:
- Create a professional signature block with CONSISTENT formatting for ALL parties
- Each party section must include: role header, signature line, printed name, title, company name, and date line
- Use clear visual separation between each party's signature section

Always use the generate_contract function.`;

interface ContractOutput {
  title: string;
  preamble: string;
  recitals: string;
  clauses: Array<{ id: string; title: string; content: string; type: string; order: number }>;
  signatureBlock: string;
}

interface ModelResult {
  model: string;
  modelName: string;
  tier: string;
  success: boolean;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number };
  clauseCount: number;
  signatureBlockQuality: {
    hasClientSection: boolean;
    hasFreelancerSection: boolean;
    hasTitleLines: boolean;
    hasCompanyLines: boolean;
    hasDateLines: boolean;
    isConsistent: boolean;
  };
  wordCount: number;
  error?: string;
  contract?: ContractOutput;
}

async function testModel(modelId: string, modelName: string, tier: string): Promise<ModelResult> {
  const startTime = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: modelId,
      max_completion_tokens: 6000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a complete Freelance Service Agreement with these details:

**Contract Type**: Freelance Service Agreement
**Jurisdiction**: California, USA

**Contract Details**:
- Client: ${TEST_METADATA.client.name}, ${TEST_METADATA.client.title} of ${TEST_METADATA.client.company}
- Freelancer: ${TEST_METADATA.freelancer.name}, ${TEST_METADATA.freelancer.title} of ${TEST_METADATA.freelancer.company}
- Project: ${TEST_METADATA.projectName}
- Description: ${TEST_METADATA.projectDescription}
- Total Amount: $${TEST_METADATA.totalAmount}
- Deposit: $${TEST_METADATA.depositAmount}
- Payment Schedule: ${TEST_METADATA.paymentSchedule}
- Revision Rounds: ${TEST_METADATA.revisionRounds}
- Effective Date: ${TEST_METADATA.effectiveDate}
- Deadline: ${TEST_METADATA.deadline}
- Deliverables:
${TEST_METADATA.deliverables.map(d => `  - ${d.description} (due: ${d.dueDate}) - $${d.amount}`).join("\n")}

Generate the complete contract using the generate_contract function.`,
        },
      ],
      tools: [GENERATION_FUNCTION],
      tool_choice: { type: "function", function: { name: "generate_contract" } },
    });

    const latencyMs = Date.now() - startTime;
    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return {
        model: modelId,
        modelName,
        tier,
        success: false,
        latencyMs,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        clauseCount: 0,
        signatureBlockQuality: {
          hasClientSection: false,
          hasFreelancerSection: false,
          hasTitleLines: false,
          hasCompanyLines: false,
          hasDateLines: false,
          isConsistent: false,
        },
        wordCount: 0,
        error: "No tool call in response",
      };
    }

    const contract = JSON.parse((toolCall as { function: { arguments: string } }).function.arguments) as {
      title: string;
      preamble: string;
      recitals: string;
      clauses: Array<{ id: string; title: string; content: string; type: string; order: number }>;
      signatureBlock: string;
    };

    // Analyze signature block quality
    const sigBlock = contract.signatureBlock.toLowerCase();
    const signatureBlockQuality = {
      hasClientSection: sigBlock.includes("client"),
      hasFreelancerSection: sigBlock.includes("freelancer") || sigBlock.includes("contractor"),
      hasTitleLines: sigBlock.includes("title:") || sigBlock.includes("title :"),
      hasCompanyLines: sigBlock.includes("company:") || sigBlock.includes(TEST_METADATA.client.company.toLowerCase()),
      hasDateLines: sigBlock.includes("date:") || sigBlock.includes("date :"),
      isConsistent: false,
    };

    // Check consistency - both parties should have similar formatting
    const clientMatches = (sigBlock.match(/client/gi) || []).length;
    const freelancerMatches = (sigBlock.match(/freelancer|contractor/gi) || []).length;
    signatureBlockQuality.isConsistent = clientMatches > 0 && freelancerMatches > 0;

    // Count total words
    const allContent = [
      contract.title,
      contract.preamble,
      contract.recitals,
      ...contract.clauses.map(c => c.content),
      contract.signatureBlock,
    ].join(" ");
    const wordCount = allContent.split(/\s+/).length;

    return {
      model: modelId,
      modelName,
      tier,
      success: true,
      latencyMs,
      tokenUsage: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      clauseCount: contract.clauses.length,
      signatureBlockQuality,
      wordCount,
      contract,
    };
  } catch (error) {
    return {
      model: modelId,
      modelName,
      tier,
      success: false,
      latencyMs: Date.now() - startTime,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      clauseCount: 0,
      signatureBlockQuality: {
        hasClientSection: false,
        hasFreelancerSection: false,
        hasTitleLines: false,
        hasCompanyLines: false,
        hasDateLines: false,
        isConsistent: false,
      },
      wordCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  console.log("🔬 Contract Generation Model Comparison\n");
  console.log("Testing with: Freelance Service Agreement (Brand Refresh Project)\n");
  console.log("=".repeat(80));

  const results: ModelResult[] = [];

  for (const model of MODELS) {
    console.log(`\n📊 Testing ${model.name} (${model.id})...`);
    const result = await testModel(model.id, model.name, model.tier);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ Success in ${(result.latencyMs / 1000).toFixed(2)}s`);
      console.log(`   📝 Clauses: ${result.clauseCount} | Words: ${result.wordCount}`);
      console.log(`   🔤 Tokens: ${result.tokenUsage.total} (${result.tokenUsage.prompt} prompt + ${result.tokenUsage.completion} completion)`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // Summary table
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 COMPARISON SUMMARY\n");

  console.log("┌─────────────────┬─────────┬─────────┬─────────┬──────────┬─────────────────────────────────┐");
  console.log("│ Model           │ Latency │ Clauses │ Words   │ Tokens   │ Signature Block Quality         │");
  console.log("├─────────────────┼─────────┼─────────┼─────────┼──────────┼─────────────────────────────────┤");

  for (const r of results) {
    if (r.success) {
      const sigQuality = [
        r.signatureBlockQuality.hasClientSection ? "✓client" : "✗client",
        r.signatureBlockQuality.hasFreelancerSection ? "✓freelancer" : "✗freelancer",
        r.signatureBlockQuality.hasTitleLines ? "✓titles" : "✗titles",
        r.signatureBlockQuality.isConsistent ? "✓consistent" : "✗consistent",
      ].join(" ");

      console.log(`│ ${r.modelName.padEnd(15)} │ ${(r.latencyMs / 1000).toFixed(1).padStart(5)}s │ ${String(r.clauseCount).padStart(7)} │ ${String(r.wordCount).padStart(7)} │ ${String(r.tokenUsage.total).padStart(8)} │ ${sigQuality.padEnd(31)} │`);
    } else {
      console.log(`│ ${r.modelName.padEnd(15)} │ FAILED  │    -    │    -    │     -    │ ${(r.error || "Unknown error").slice(0, 31).padEnd(31)} │`);
    }
  }

  console.log("└─────────────────┴─────────┴─────────┴─────────┴──────────┴─────────────────────────────────┘");

  // Recommendations
  console.log("\n📋 RECOMMENDATIONS:\n");

  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    // Find best for quality (most clauses + best sig block)
    const bestQuality = successfulResults.reduce((a, b) => {
      const aScore = a.clauseCount + (a.signatureBlockQuality.isConsistent ? 5 : 0) + (a.signatureBlockQuality.hasTitleLines ? 2 : 0);
      const bScore = b.clauseCount + (b.signatureBlockQuality.isConsistent ? 5 : 0) + (b.signatureBlockQuality.hasTitleLines ? 2 : 0);
      return aScore > bScore ? a : b;
    });

    // Find best for speed
    const fastest = successfulResults.reduce((a, b) => a.latencyMs < b.latencyMs ? a : b);

    // Find best value (quality per token)
    const bestValue = successfulResults.reduce((a, b) => {
      const aValue = a.clauseCount / (a.tokenUsage.total || 1);
      const bValue = b.clauseCount / (b.tokenUsage.total || 1);
      return aValue > bValue ? a : b;
    });

    console.log(`   🏆 Best Quality: ${bestQuality.modelName} (${bestQuality.clauseCount} clauses, consistent formatting)`);
    console.log(`   ⚡ Fastest: ${fastest.modelName} (${(fastest.latencyMs / 1000).toFixed(2)}s)`);
    console.log(`   💰 Best Value: ${bestValue.modelName} (${(bestValue.clauseCount / (bestValue.tokenUsage.total / 1000)).toFixed(2)} clauses per 1K tokens)`);

    console.log("\n   Suggested model for Lexport:");
    if (bestQuality.model === "gpt-5.2") {
      console.log(`   → Use ${bestQuality.modelName} for production (best quality)`);
      console.log(`   → Consider ${fastest.modelName} for draft previews (faster)`);
    } else {
      console.log(`   → ${bestQuality.modelName} provides best quality/cost balance`);
    }
  }

  // Save detailed results
  const outputPath = "/Users/pobor/Downloads/lexport-ai/scripts/model-comparison-results.json";
  await Bun.write(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Detailed results saved to: ${outputPath}`);

  // Save individual contract outputs as markdown files
  console.log("\n📄 Saving individual contract outputs...\n");
  for (const r of results) {
    if (r.success && r.contract) {
      const filename = `/Users/pobor/Downloads/lexport-ai/scripts/outputs/${r.model.replace(/\./g, "-")}-contract.md`;
      const markdown = formatContractAsMarkdown(r.model, r.modelName, r.contract);
      await Bun.write(filename, markdown);
      console.log(`   ✅ ${filename}`);
    }
  }
}

function formatContractAsMarkdown(modelId: string, modelName: string, contract: ContractOutput): string {
  let md = `# Contract Generated by ${modelName}\n\n`;
  md += `**Model ID:** \`${modelId}\`\n\n`;
  md += `---\n\n`;

  md += `## ${contract.title}\n\n`;
  md += `### Preamble\n\n${contract.preamble}\n\n`;
  md += `### Recitals\n\n${contract.recitals}\n\n`;
  md += `---\n\n`;

  md += `## Clauses (${contract.clauses.length} total)\n\n`;
  for (const clause of contract.clauses.sort((a, b) => a.order - b.order)) {
    md += `### ${clause.title}\n\n`;
    md += `*Type: ${clause.type}*\n\n`;
    md += `${clause.content}\n\n`;
  }

  md += `---\n\n`;
  md += `## Signature Block\n\n`;
  md += `\`\`\`\n${contract.signatureBlock}\n\`\`\`\n`;

  return md;
}

main().catch(console.error);
