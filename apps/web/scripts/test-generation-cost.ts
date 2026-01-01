/**
 * Test script to measure actual AI generation costs
 *
 * Run with: npx tsx scripts/test-generation-cost.ts
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Model pricing (per 1M tokens) - Updated Jan 2025
const PRICING = {
    "gpt-5.1": { input: 10, output: 30 },
    "gpt-5.2": { input: 10, output: 30 },
    "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

interface UsageStats {
    model: string;
    inputTokens: number;
    outputTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    duration: number;
}

async function testContractGeneration(): Promise<UsageStats> {
    console.log("\n🔄 Testing Contract Generation with gpt-5.1...\n");

    const startTime = Date.now();

    // Simulate the actual generation prompt
    const systemPrompt = `You are an expert legal contract drafter specializing in California law. You generate professional, legally sound contracts that are:

1. **Jurisdiction-Specific**: All clauses comply with California laws and regulations.
2. **Clear and Professional**: Use standard legal language that is precise yet understandable.
3. **Comprehensive**: Include all necessary clauses for enforceability.
4. **Well-Structured**: Organize clauses logically with proper numbering.

Output as JSON with: title, preamble, recitals, clauses[], signatureBlock`;

    const userPrompt = `Generate a complete Independent Contractor Agreement for California.

CONTRACT DETAILS:
- Client: John Smith, CEO of Acme Corp
- Contractor: Jane Doe, Freelance Developer
- Effective Date: January 1, 2026
- Services: Web development and consulting
- Payment: $5,000 monthly
- Payment Terms: Net 30 days
- Termination Notice: 30 days
- Include IP Assignment clause
- Include Confidentiality clause

Return only valid JSON.`;

    try {
        const response = await (openai as any).responses.create({
            model: "gpt-5.1",
            reasoning: { effort: "low" },
            input: [
                { role: "developer", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const duration = Date.now() - startTime;

        // Extract usage from response
        const usage = response.usage || { input_tokens: 0, output_tokens: 0 };
        const inputTokens = usage.input_tokens || 0;
        const outputTokens = usage.output_tokens || 0;

        const pricing = PRICING["gpt-5.1"];
        const inputCost = (inputTokens / 1_000_000) * pricing.input;
        const outputCost = (outputTokens / 1_000_000) * pricing.output;

        console.log(`✅ Generation complete in ${duration}ms`);
        console.log(`📝 Output preview: ${response.output_text?.slice(0, 200)}...`);

        return {
            model: "gpt-5.1",
            inputTokens,
            outputTokens,
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
            duration,
        };
    } catch (error) {
        console.error("❌ Generation failed:", error);
        throw error;
    }
}

async function testChatExplanation(): Promise<UsageStats> {
    console.log("\n🔄 Testing Chat/Explanation with gpt-4.1-mini...\n");

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        max_completion_tokens: 1000,
        messages: [
            {
                role: "system",
                content:
                    "You are a legal assistant explaining contract clauses in plain English.",
            },
            {
                role: "user",
                content: `Explain this clause in simple terms:
        
1. CONFIDENTIAL INFORMATION
The Contractor agrees to hold in confidence all Confidential Information of the Company. "Confidential Information" means any information disclosed by the Company that is marked as confidential or would reasonably be understood to be confidential given the nature of the information and circumstances of disclosure.`,
            },
        ],
    });

    const duration = Date.now() - startTime;
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    const pricing = PRICING["gpt-4.1-mini"];
    const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;

    console.log(`✅ Explanation complete in ${duration}ms`);
    console.log(`📝 Response: ${response.choices[0]?.message?.content?.slice(0, 200)}...`);

    return {
        model: "gpt-4.1-mini",
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
        duration,
    };
}

function printCostSummary(stats: UsageStats[]) {
    console.log("\n" + "=".repeat(60));
    console.log("📊 COST SUMMARY");
    console.log("=".repeat(60));

    let totalCost = 0;

    for (const stat of stats) {
        console.log(`\n${stat.model}:`);
        console.log(`  Input:  ${stat.inputTokens.toLocaleString()} tokens → $${stat.inputCost.toFixed(4)}`);
        console.log(`  Output: ${stat.outputTokens.toLocaleString()} tokens → $${stat.outputCost.toFixed(4)}`);
        console.log(`  Total:  $${stat.totalCost.toFixed(4)} (${stat.duration}ms)`);
        totalCost += stat.totalCost;
    }

    console.log("\n" + "-".repeat(60));
    console.log(`💰 TOTAL COST PER CONTRACT: $${totalCost.toFixed(4)}`);
    console.log("-".repeat(60));

    // Margin analysis
    const subscriptionPrice = 19.99;
    const contractsPerMonth = [10, 25, 50, 100];

    console.log("\n📈 MARGIN ANALYSIS (Pro @ $19.99/month):\n");
    for (const count of contractsPerMonth) {
        const aiCost = totalCost * count;
        const margin = subscriptionPrice - aiCost;
        const marginPct = ((margin / subscriptionPrice) * 100).toFixed(1);
        console.log(
            `  ${count} contracts/month: AI cost $${aiCost.toFixed(2)} → Margin $${margin.toFixed(2)} (${marginPct}%)`
        );
    }
}

async function main() {
    console.log("🚀 AI Generation Cost Test\n");
    console.log("Testing actual token usage and costs...\n");

    if (!process.env.OPENAI_API_KEY) {
        console.error("❌ OPENAI_API_KEY not set");
        process.exit(1);
    }

    const stats: UsageStats[] = [];

    try {
        // Test contract generation
        stats.push(await testContractGeneration());

        // Test chat explanation
        stats.push(await testChatExplanation());

        // Print summary
        printCostSummary(stats);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

main();
