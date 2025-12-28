/**
 * Risk Analysis Model Comparison Test
 *
 * Tests AI risk analysis quality across:
 * - GPT-4.1
 * - GPT-4.1-mini
 * - GPT-5
 * - GPT-5.2
 * - GPT-5-mini
 *
 * Run: bun run scripts/risk-model-comparison.ts
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Models to test
const MODELS = ["gpt-4.1", "gpt-4.1-mini", "gpt-5", "gpt-5.2", "gpt-5-mini"];

// Test contract with KNOWN issues to detect
const TEST_CONTRACT = {
  title: "Independent Contractor Agreement",
  type: "independent_contractor",
  jurisdiction: "us_california",
  content: {
    preamble: `This Independent Contractor Agreement ("Agreement") is entered into as of January 15, 2025 ("Effective Date") by and between:

TechStart Inc., a Delaware corporation ("Company")
and
John Smith ("Contractor")`,

    recitals: `WHEREAS, Company desires to engage Contractor to perform certain services; and
WHEREAS, Contractor desires to perform such services under the terms set forth herein.`,

    clauses: [
      {
        id: "services",
        title: "1. SERVICES",
        content: `Contractor shall provide software development services as directed by Company. Contractor shall work exclusively for Company during the term of this Agreement and shall not provide services to any competitors.`,
        type: "standard",
      },
      {
        id: "compensation",
        title: "2. COMPENSATION",
        content: `Company shall pay Contractor $150 per hour for services rendered. Payment shall be made within 90 days of invoice submission. Late payments shall not accrue interest.`,
        type: "negotiable",
      },
      {
        id: "ip_assignment",
        title: "3. INTELLECTUAL PROPERTY",
        content: `All work product, inventions, ideas, and developments created by Contractor, whether or not related to the services or created during working hours, shall be the sole property of Company. Contractor hereby assigns all rights, including moral rights, to Company in perpetuity.`,
        type: "standard",
      },
      {
        id: "non_compete",
        title: "4. NON-COMPETE",
        content: `For a period of 3 years following termination, Contractor shall not work for any company in the technology industry within the United States. Violation of this clause shall result in liquidated damages of $500,000.`,
        type: "negotiable",
      },
      {
        id: "termination",
        title: "5. TERMINATION",
        content: `Company may terminate this Agreement at any time without notice and for any reason. Contractor must provide 60 days written notice before termination. Upon termination by Company, Contractor shall not be entitled to any unpaid compensation for work already performed.`,
        type: "standard",
      },
      {
        id: "indemnification",
        title: "6. INDEMNIFICATION",
        content: `Contractor shall indemnify, defend, and hold harmless Company and its officers, directors, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including attorneys' fees) arising out of or related to Contractor's services, regardless of fault or negligence by Company.`,
        type: "standard",
      },
      {
        id: "liability",
        title: "7. LIABILITY",
        content: `Company shall not be liable to Contractor for any damages whatsoever, including direct, indirect, incidental, consequential, or punitive damages. There is no limitation on Contractor's liability to Company.`,
        type: "standard",
      },
      {
        id: "governing_law",
        title: "8. GOVERNING LAW",
        content: `This Agreement shall be governed by the laws of the State of California. Any disputes shall be resolved through binding arbitration in San Francisco, with the arbitrator's fees paid entirely by Contractor.`,
        type: "standard",
      },
    ],
    signatureBlock: `IN WITNESS WHEREOF, the parties have executed this Agreement.

COMPANY:
Signature: ____________________
Name: _____
Title: CEO
Date: ____________________

CONTRACTOR:
Signature: ____________________
Name: John Smith
Date: ____________________`,
  },
};

// Known issues in the test contract (for scoring)
const KNOWN_ISSUES = [
  { id: "non_compete_unenforceable", severity: "critical", clause: "non_compete", description: "Non-compete unenforceable in California" },
  { id: "exclusivity_misclassification", severity: "warning", clause: "services", description: "Exclusivity clause suggests employee misclassification" },
  { id: "ip_too_broad", severity: "warning", clause: "ip_assignment", description: "IP assignment too broad - includes unrelated inventions" },
  { id: "ip_moral_rights", severity: "info", clause: "ip_assignment", description: "Moral rights may not be assignable in some contexts" },
  { id: "payment_too_long", severity: "warning", clause: "compensation", description: "90-day payment terms unreasonably long" },
  { id: "no_late_interest", severity: "info", clause: "compensation", description: "No interest on late payments" },
  { id: "termination_asymmetric", severity: "warning", clause: "termination", description: "Asymmetric termination rights" },
  { id: "no_pay_on_termination", severity: "critical", clause: "termination", description: "Forfeiture of unpaid compensation is problematic" },
  { id: "indemnification_unlimited", severity: "warning", clause: "indemnification", description: "Unlimited indemnification regardless of fault" },
  { id: "liability_one_sided", severity: "critical", clause: "liability", description: "Completely one-sided liability limitation" },
  { id: "arbitration_costs", severity: "warning", clause: "governing_law", description: "Contractor pays all arbitration fees" },
  { id: "liquidated_damages", severity: "warning", clause: "non_compete", description: "$500k liquidated damages may be unenforceable penalty" },
];

// OpenAI function schema for risk analysis
const analyzeContractFunction: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "analyze_contract_risks",
    description: "Analyze a contract for risks",
    parameters: {
      type: "object",
      properties: {
        overall_risk_level: { type: "string", enum: ["low", "medium", "high"] },
        overall_summary: { type: "string" },
        clause_risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              clauseId: { type: "string" },
              clauseTitle: { type: "string" },
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              category: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              problematicText: { type: "string" },
              suggestion: { type: "string" },
            },
            required: ["clauseId", "severity", "title", "description"],
          },
        },
        missing_protections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              title: { type: "string" },
              description: { type: "string" },
              suggestion: { type: "string" },
            },
            required: ["severity", "title", "description"],
          },
        },
        jurisdiction_alerts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              jurisdiction: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              legalReference: { type: "string" },
              affectedClauseId: { type: "string" },
            },
            required: ["severity", "title", "description"],
          },
        },
      },
      required: ["overall_risk_level", "overall_summary", "clause_risks", "missing_protections", "jurisdiction_alerts"],
    },
  },
};

const SYSTEM_PROMPT = `You are an expert legal contract analyst specializing in CALIFORNIA law, reviewing an INDEPENDENT CONTRACTOR agreement.

CALIFORNIA-SPECIFIC LEGAL RULES:
- Non-compete clauses are UNENFORCEABLE (Business & Professions Code Section 16600)
- Independent contractor classification must meet ABC test (AB5/Dynamex)
- Employee invention assignment has carve-outs (Labor Code Section 2870)
- At-will employment cannot be waived by implication

Analyze for:
1. Jurisdiction issues (especially CA non-compete law)
2. One-sided or unfair terms
3. Missing protections
4. Misclassification risks
5. Unusual terms
6. Liability exposure

SEVERITY LEVELS:
- critical: Legally unenforceable or creates major liability
- warning: One-sided terms that should be negotiated
- info: Minor observations or suggestions`;

async function analyzeWithModel(model: string): Promise<{
  response: any;
  timing: number;
  tokens: number;
  error?: string;
}> {
  const start = Date.now();

  const clausesSummary = TEST_CONTRACT.content.clauses
    .map((c) => `CLAUSE (ID: ${c.id}): ${c.title}\n${c.content}`)
    .join("\n\n---\n\n");

  const userPrompt = `Analyze this Independent Contractor Agreement governed by California law:

TITLE: ${TEST_CONTRACT.title}

PREAMBLE:
${TEST_CONTRACT.content.preamble}

CLAUSES:
${clausesSummary}

SIGNATURE BLOCK:
${TEST_CONTRACT.content.signatureBlock}

Identify all risks using the analyze_contract_risks function.`;

  try {
    // GPT-5 models use max_completion_tokens, older models use max_tokens
    const isGpt5 = model.startsWith("gpt-5");
    const tokenParam = isGpt5 ? { max_completion_tokens: 4000 } : { max_tokens: 4000 };

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [analyzeContractFunction],
      tool_choice: { type: "function", function: { name: "analyze_contract_risks" } },
      ...tokenParam,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0] as
      | { type: "function"; function: { name: string; arguments: string } }
      | undefined;
    if (!toolCall || toolCall.type !== "function" || toolCall.function.name !== "analyze_contract_risks") {
      return { response: null, timing: Date.now() - start, tokens: 0, error: "No function call" };
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    const tokens = response.usage?.total_tokens || 0;

    return { response: analysis, timing: Date.now() - start, tokens };
  } catch (error: any) {
    return { response: null, timing: Date.now() - start, tokens: 0, error: error.message };
  }
}

function scoreAnalysis(analysis: any): { score: number; found: string[]; missed: string[]; extras: number } {
  if (!analysis) return { score: 0, found: [], missed: KNOWN_ISSUES.map((i) => i.id), extras: 0 };

  const allFindings = [
    ...(analysis.clause_risks || []),
    ...(analysis.missing_protections || []),
    ...(analysis.jurisdiction_alerts || []),
  ];

  const found: string[] = [];
  const missed: string[] = [];

  // Check which known issues were found
  for (const issue of KNOWN_ISSUES) {
    const wasFound = allFindings.some((f: any) => {
      const text = `${f.title || ""} ${f.description || ""} ${f.clauseId || ""} ${f.affectedClauseId || ""}`.toLowerCase();
      const keywords = issue.description.toLowerCase().split(" ").filter((w) => w.length > 4);
      const matchCount = keywords.filter((k) => text.includes(k)).length;
      const clauseMatch = f.clauseId === issue.clause || f.affectedClauseId === issue.clause;
      return matchCount >= 2 || (clauseMatch && matchCount >= 1);
    });

    if (wasFound) {
      found.push(issue.id);
    } else {
      missed.push(issue.id);
    }
  }

  // Calculate score: points for found issues, weighted by severity
  let score = 0;
  for (const issueId of found) {
    const issue = KNOWN_ISSUES.find((i) => i.id === issueId)!;
    score += issue.severity === "critical" ? 15 : issue.severity === "warning" ? 10 : 5;
  }

  // Count extras (findings that don't match known issues)
  const extras = Math.max(0, allFindings.length - found.length - 3); // Allow 3 extras without penalty

  return { score, found, missed, extras };
}

async function runComparison() {
  console.log("=".repeat(80));
  console.log("RISK ANALYSIS MODEL COMPARISON");
  console.log("=".repeat(80));
  console.log(`Testing with: ${TEST_CONTRACT.title} (California)`);
  console.log(`Known issues to detect: ${KNOWN_ISSUES.length}`);
  console.log(`Max possible score: ${KNOWN_ISSUES.reduce((sum, i) => sum + (i.severity === "critical" ? 15 : i.severity === "warning" ? 10 : 5), 0)}`);
  console.log();

  const results: Record<string, any> = {};

  for (const model of MODELS) {
    console.log(`\nTesting ${model}...`);

    const { response, timing, tokens, error } = await analyzeWithModel(model);

    if (error) {
      console.log(`  ERROR: ${error}`);
      results[model] = { error, timing, tokens: 0, score: 0 };
      continue;
    }

    const { score, found, missed, extras } = scoreAnalysis(response);
    const totalFindings = (response.clause_risks?.length || 0) + (response.missing_protections?.length || 0) + (response.jurisdiction_alerts?.length || 0);

    results[model] = {
      timing,
      tokens,
      score,
      found: found.length,
      missed: missed.length,
      extras,
      totalFindings,
      riskLevel: response.overall_risk_level,
      critical: response.clause_risks?.filter((r: any) => r.severity === "critical").length || 0,
      warning: response.clause_risks?.filter((r: any) => r.severity === "warning").length || 0,
      info: response.clause_risks?.filter((r: any) => r.severity === "info").length || 0,
      response,
    };

    console.log(`  Time: ${(timing / 1000).toFixed(2)}s | Tokens: ${tokens}`);
    console.log(`  Score: ${score} | Found: ${found.length}/${KNOWN_ISSUES.length} | Risk Level: ${response.overall_risk_level}`);
    console.log(`  Findings: ${totalFindings} (C:${results[model].critical} W:${results[model].warning} I:${results[model].info})`);

    if (missed.length > 0 && missed.length <= 5) {
      console.log(`  Missed: ${missed.join(", ")}`);
    }
  }

  // Summary table
  console.log("\n\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));

  console.log("\n| Model          | Score | Found | Time    | Tokens | Risk Level |");
  console.log("|----------------|-------|-------|---------|--------|------------|");

  const sortedModels = Object.entries(results)
    .filter(([, r]) => !r.error)
    .sort((a, b) => b[1].score - a[1].score);

  for (const [model, r] of sortedModels) {
    console.log(
      `| ${model.padEnd(14)} | ${String(r.score).padStart(5)} | ${r.found}/${KNOWN_ISSUES.length}   | ${(r.timing / 1000).toFixed(1).padStart(6)}s | ${String(r.tokens).padStart(6)} | ${r.riskLevel.padEnd(10)} |`
    );
  }

  // Show errors
  const errors = Object.entries(results).filter(([, r]) => r.error);
  if (errors.length > 0) {
    console.log("\nERRORS:");
    for (const [model, r] of errors) {
      console.log(`  ${model}: ${r.error}`);
    }
  }

  // Winner
  if (sortedModels.length > 0) {
    const [winner, winnerData] = sortedModels[0];
    console.log("\n" + "=".repeat(80));
    console.log(`WINNER: ${winner.toUpperCase()} (Score: ${winnerData.score}, Time: ${(winnerData.timing / 1000).toFixed(2)}s)`);
    console.log("=".repeat(80));
  }

  // Save results
  const fs = await import("fs");
  fs.writeFileSync(
    "/Users/pobor/Downloads/lexport-ai/scripts/risk-comparison-results.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\nFull results saved to: scripts/risk-comparison-results.json");
}

runComparison().catch(console.error);
