/**
 * Chat Model Comparison Test
 *
 * Tests AI chat quality for contract-related questions across:
 * - Claude Sonnet 4 (Anthropic)
 * - GPT-4.1-mini (OpenAI)
 * - GPT-5-mini with low reasoning (OpenAI)
 *
 * Run: bun run scripts/chat-model-comparison.ts
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Model configurations
const MODELS = {
  "sonnet-4": { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  "gpt-4.1-mini": { provider: "openai", model: "gpt-4.1-mini" },
  "gpt-5-mini": { provider: "openai", model: "gpt-5-mini", reasoning: "low" },
};

// System prompt for contract chat
const SYSTEM_PROMPT = `You are a helpful legal assistant for a contract management platform. You help users understand their contracts, explain clauses in plain English, and suggest modifications.

Current contract context: This is a Mutual NDA between TechStart Inc. and InnovateCo LLC, governed by California law. The confidentiality period is 3 years and includes a non-solicitation clause.

Be concise, accurate, and helpful. When explaining legal terms, use plain English. When suggesting changes, explain the implications.`;

// Test scenarios - realistic user questions
const TEST_SCENARIOS = [
  {
    id: "explain_clause",
    name: "Explain a Clause",
    question: "What does the indemnification clause mean? Can you explain it in simple terms?",
  },
  {
    id: "modification_request",
    name: "Modification Request",
    question: "The other party wants to reduce the confidentiality period from 3 years to 1 year. Should I agree to this?",
  },
  {
    id: "legal_risk",
    name: "Legal Risk Question",
    question: "What happens if they accidentally share our confidential information with a third party?",
  },
  {
    id: "negotiation_advice",
    name: "Negotiation Advice",
    question: "They want to add a non-compete clause. I'm in California - is this enforceable?",
  },
  {
    id: "quick_question",
    name: "Quick Factual Question",
    question: "When does this NDA expire?",
  },
];

// Generate response with OpenAI
async function generateWithOpenAI(
  question: string,
  model: string,
  reasoning?: string
): Promise<{ response: string; timing: number; tokens: number }> {
  const start = Date.now();

  try {
    if (reasoning) {
      // Use responses API for reasoning models
      const response = await (openai as any).responses.create({
        model,
        reasoning: { effort: reasoning },
        input: [
          { role: "developer", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
      });

      return {
        response: response.output_text || "",
        timing: Date.now() - start,
        tokens: response.usage?.total_tokens || 0,
      };
    } else {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        max_tokens: 1000,
      });

      return {
        response: response.choices[0]?.message?.content || "",
        timing: Date.now() - start,
        tokens: response.usage?.total_tokens || 0,
      };
    }
  } catch (error) {
    console.error(`OpenAI error:`, error);
    return { response: "ERROR: " + String(error), timing: Date.now() - start, tokens: 0 };
  }
}

// Generate response with Anthropic
async function generateWithAnthropic(
  question: string,
  model: string
): Promise<{ response: string; timing: number; tokens: number }> {
  const start = Date.now();

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: question }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    return { response: text, timing: Date.now() - start, tokens };
  } catch (error) {
    console.error(`Anthropic error:`, error);
    return { response: "ERROR: " + String(error), timing: Date.now() - start, tokens: 0 };
  }
}

// Evaluate response quality
function evaluateResponse(response: string, scenarioId: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 100;

  // Check for errors
  if (response.startsWith("ERROR:")) {
    return { score: 0, notes: ["Generation failed"] };
  }

  // Length check
  if (response.length < 50) {
    notes.push("Too short");
    score -= 20;
  }
  if (response.length > 2000) {
    notes.push("Too verbose");
    score -= 10;
  }

  // Scenario-specific checks
  switch (scenarioId) {
    case "explain_clause":
      if (!response.toLowerCase().includes("means") && !response.toLowerCase().includes("essentially")) {
        notes.push("Doesn't explain in plain terms");
        score -= 10;
      }
      break;

    case "modification_request":
      if (!response.toLowerCase().includes("risk") && !response.toLowerCase().includes("consider")) {
        notes.push("Doesn't discuss risks/considerations");
        score -= 15;
      }
      if (!response.toLowerCase().includes("year")) {
        notes.push("Doesn't address the specific time change");
        score -= 10;
      }
      break;

    case "legal_risk":
      if (!response.toLowerCase().includes("breach") && !response.toLowerCase().includes("violation")) {
        notes.push("Doesn't mention breach/violation");
        score -= 15;
      }
      if (!response.toLowerCase().includes("damages") && !response.toLowerCase().includes("remedy") && !response.toLowerCase().includes("liable")) {
        notes.push("Doesn't discuss consequences");
        score -= 10;
      }
      break;

    case "negotiation_advice":
      if (!response.toLowerCase().includes("california")) {
        notes.push("Doesn't mention California specifically");
        score -= 10;
      }
      if (!response.toLowerCase().includes("unenforceable") && !response.toLowerCase().includes("not enforceable") && !response.toLowerCase().includes("void")) {
        notes.push("Doesn't clarify CA non-compete law");
        score -= 20;
      }
      break;

    case "quick_question":
      if (!response.toLowerCase().includes("3") && !response.toLowerCase().includes("three")) {
        notes.push("Doesn't mention the 3-year period");
        score -= 20;
      }
      if (response.length > 500) {
        notes.push("Over-explained simple question");
        score -= 10;
      }
      break;
  }

  // Check for helpful tone
  if (response.toLowerCase().includes("i cannot") || response.toLowerCase().includes("i'm not able")) {
    notes.push("Unhelpful refusal");
    score -= 20;
  }

  return { score: Math.max(0, score), notes };
}

// Main test runner
async function runComparison() {
  console.log("=".repeat(80));
  console.log("CHAT MODEL COMPARISON TEST");
  console.log("=".repeat(80));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results: Record<string, Record<string, any>> = {};

  // Initialize results
  for (const modelKey of Object.keys(MODELS)) {
    results[modelKey] = { scenarios: {}, summary: { totalTime: 0, totalTokens: 0, avgScore: 0 } };
  }

  // Test each scenario
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Scenario: ${scenario.name}`);
    console.log(`Question: "${scenario.question}"`);
    console.log("=".repeat(60));

    for (const [modelKey, config] of Object.entries(MODELS)) {
      console.log(`\n  Testing ${modelKey}...`);

      let result: { response: string; timing: number; tokens: number };

      if (config.provider === "anthropic") {
        result = await generateWithAnthropic(scenario.question, config.model);
      } else {
        result = await generateWithOpenAI(scenario.question, config.model, (config as any).reasoning);
      }

      const evaluation = evaluateResponse(result.response, scenario.id);

      results[modelKey].scenarios[scenario.id] = {
        name: scenario.name,
        response: result.response,
        timing: result.timing,
        tokens: result.tokens,
        evaluation,
      };

      results[modelKey].summary.totalTime += result.timing;
      results[modelKey].summary.totalTokens += result.tokens;

      console.log(`    Time: ${(result.timing / 1000).toFixed(2)}s | Tokens: ${result.tokens} | Score: ${evaluation.score}`);
      if (evaluation.notes.length > 0) {
        console.log(`    Issues: ${evaluation.notes.join(", ")}`);
      }

      // Show truncated response
      const truncated = result.response.substring(0, 150).replace(/\n/g, " ");
      console.log(`    Response: "${truncated}..."`);
    }
  }

  // Calculate averages
  for (const modelKey of Object.keys(MODELS)) {
    const scores = Object.values(results[modelKey].scenarios).map((s: any) => s.evaluation.score);
    results[modelKey].summary.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Print summary
  console.log("\n\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  console.log("\n| Model | Avg Score | Total Time | Total Tokens |");
  console.log("|-------|-----------|------------|--------------|");

  for (const [modelKey, data] of Object.entries(results)) {
    const s = data.summary;
    console.log(
      `| ${modelKey.padEnd(13)} | ${s.avgScore.toFixed(1).padStart(9)} | ${(s.totalTime / 1000).toFixed(1).padStart(9)}s | ${s.totalTokens.toString().padStart(12)} |`
    );
  }

  // Per-scenario scores
  console.log("\n\nPER-SCENARIO SCORES:");
  console.log("-".repeat(80));

  const header = "| Scenario".padEnd(30) + Object.keys(MODELS).map(m => m.padStart(15)).join("") + " |";
  console.log(header);
  console.log("|" + "-".repeat(29) + Object.keys(MODELS).map(() => "-".repeat(15)).join("") + "-|");

  for (const scenario of TEST_SCENARIOS) {
    let row = `| ${scenario.name.padEnd(28)}`;
    for (const modelKey of Object.keys(MODELS)) {
      const score = results[modelKey].scenarios[scenario.id]?.evaluation.score || 0;
      row += score.toString().padStart(14) + " ";
    }
    row += "|";
    console.log(row);
  }

  // Determine winner
  const modelScores = Object.entries(results).map(([model, data]) => ({
    model,
    avgScore: data.summary.avgScore,
    avgTime: data.summary.totalTime / TEST_SCENARIOS.length,
  }));
  modelScores.sort((a, b) => b.avgScore - a.avgScore);

  console.log("\n" + "=".repeat(80));
  console.log(`WINNER: ${modelScores[0].model.toUpperCase()} (Score: ${modelScores[0].avgScore.toFixed(1)}, Avg Time: ${(modelScores[0].avgTime / 1000).toFixed(2)}s)`);
  console.log("=".repeat(80));

  // Save full results
  const fs = await import("fs");
  fs.writeFileSync(
    "/Users/pobor/Downloads/lexport-ai/scripts/chat-comparison-results.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\nFull results saved to: scripts/chat-comparison-results.json");

  return results;
}

runComparison().catch(console.error);
