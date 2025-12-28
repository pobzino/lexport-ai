/**
 * Experiment: AI-Driven Clause Acknowledgment Detection
 *
 * Tests how GPT identifies clauses that need explicit acknowledgment
 * across different contract types.
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AcknowledgmentRequirement {
  clauseTitle: string;
  clauseNumber: number;
  requiresAcknowledgment: boolean;
  acknowledgmentType: "initials" | "checkbox" | "signature";
  parties: string[];
  reason: string;
  riskLevel: "high" | "medium" | "low";
}

interface ExperimentResult {
  contractType: string;
  parties: string[];
  clauses: AcknowledgmentRequirement[];
  summary: {
    totalClauses: number;
    requiresAcknowledgment: number;
    highRisk: number;
    mediumRisk: number;
  };
}

const CONTRACT_CONFIGS = [
  {
    type: "NDA (Mutual)",
    jurisdiction: "California",
    parties: ["Disclosing Party", "Receiving Party"],
    context: "Two tech companies exploring a potential partnership need to share proprietary information.",
  },
  {
    type: "Independent Contractor Agreement",
    jurisdiction: "California",
    parties: ["Company", "Contractor"],
    context: "A startup hiring a senior software developer as an independent contractor for 6 months.",
  },
  {
    type: "SAFE Note",
    jurisdiction: "Delaware",
    parties: ["Company", "Investor"],
    context: "Early-stage startup raising $500,000 from an angel investor with a $5M valuation cap.",
  },
];

const EXPERIMENT_PROMPT = `You are a legal document analyst. Given a contract type and context, generate the contract clauses and analyze each one for acknowledgment requirements.

For each clause, determine:
1. Does this clause require explicit acknowledgment (initials/checkbox) beyond the final signature?
2. What type of acknowledgment? (initials = legally significant, checkbox = simple confirmation)
3. Which parties need to acknowledge?
4. Why does/doesn't this clause need acknowledgment?
5. Risk level if not explicitly acknowledged (high/medium/low)

IMPORTANT: Be selective. Not every clause needs acknowledgment. Focus on:
- Clauses where a party waives rights
- Clauses with financial implications
- Non-compete or restrictive covenants
- IP assignment or transfer
- Limitation of liability
- Indemnification
- Arbitration/dispute resolution
- Confidentiality obligations with penalties
- Terms that are often disputed or "I didn't know that was in there"

Return your analysis as JSON in this exact format:
{
  "contractType": "string",
  "parties": ["party1", "party2"],
  "clauses": [
    {
      "clauseNumber": 1,
      "clauseTitle": "string",
      "clauseSummary": "brief 1-2 sentence summary of what this clause does",
      "requiresAcknowledgment": true/false,
      "acknowledgmentType": "initials" | "checkbox" | "none",
      "parties": ["which parties must acknowledge"],
      "reason": "why this does/doesn't need acknowledgment",
      "riskLevel": "high" | "medium" | "low"
    }
  ]
}`;

async function analyzeContract(config: typeof CONTRACT_CONFIGS[0]): Promise<ExperimentResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Analyzing: ${config.type}`);
  console.log(`Jurisdiction: ${config.jurisdiction}`);
  console.log(`Parties: ${config.parties.join(", ")}`);
  console.log(`${"=".repeat(60)}`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EXPERIMENT_PROMPT },
      {
        role: "user",
        content: `Contract Type: ${config.type}
Jurisdiction: ${config.jurisdiction}
Parties: ${config.parties.join(", ")}
Context: ${config.context}

Generate the standard clauses for this contract and analyze each for acknowledgment requirements.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("No response from OpenAI");

  const result = JSON.parse(content);

  // Calculate summary stats
  const clauses = result.clauses || [];
  const requiresAck = clauses.filter((c: any) => c.requiresAcknowledgment);

  return {
    contractType: config.type,
    parties: config.parties,
    clauses: clauses,
    summary: {
      totalClauses: clauses.length,
      requiresAcknowledgment: requiresAck.length,
      highRisk: clauses.filter((c: any) => c.riskLevel === "high").length,
      mediumRisk: clauses.filter((c: any) => c.riskLevel === "medium").length,
    },
  };
}

function printResults(result: ExperimentResult) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`CONTRACT: ${result.contractType}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`Total Clauses: ${result.summary.totalClauses}`);
  console.log(`Requires Acknowledgment: ${result.summary.requiresAcknowledgment}`);
  console.log(`High Risk: ${result.summary.highRisk} | Medium Risk: ${result.summary.mediumRisk}`);
  console.log(`${"─".repeat(60)}`);

  // Print clauses requiring acknowledgment
  console.log("\nCLAUSES REQUIRING ACKNOWLEDGMENT:");
  const ackClauses = result.clauses.filter((c) => c.requiresAcknowledgment);

  if (ackClauses.length === 0) {
    console.log("  (none identified)");
  } else {
    ackClauses.forEach((clause: any) => {
      console.log(`\n  ${clause.clauseNumber}. ${clause.clauseTitle}`);
      console.log(`     Summary: ${clause.clauseSummary || "N/A"}`);
      console.log(`     Type: ${clause.acknowledgmentType} | Risk: ${clause.riskLevel}`);
      console.log(`     Parties: ${clause.parties?.join(", ") || "All"}`);
      console.log(`     Reason: ${clause.reason}`);
    });
  }

  // Print clauses NOT requiring acknowledgment (for comparison)
  console.log("\n\nCLAUSES NOT REQUIRING ACKNOWLEDGMENT:");
  const nonAckClauses = result.clauses.filter((c) => !c.requiresAcknowledgment);
  nonAckClauses.forEach((clause: any) => {
    console.log(`  ${clause.clauseNumber}. ${clause.clauseTitle} (${clause.riskLevel} risk)`);
  });
}

function printCrossContractAnalysis(results: ExperimentResult[]) {
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("CROSS-CONTRACT ANALYSIS");
  console.log(`${"=".repeat(60)}`);

  // Collect all clause types that need acknowledgment
  const ackPatterns: Map<string, { count: number; contracts: string[]; types: string[] }> = new Map();

  results.forEach((result) => {
    result.clauses
      .filter((c) => c.requiresAcknowledgment)
      .forEach((clause) => {
        const title = clause.clauseTitle.toLowerCase();
        const existing = ackPatterns.get(title) || { count: 0, contracts: [], types: [] };
        existing.count++;
        existing.contracts.push(result.contractType);
        if (!existing.types.includes(clause.acknowledgmentType)) {
          existing.types.push(clause.acknowledgmentType);
        }
        ackPatterns.set(title, existing);
      });
  });

  console.log("\nPATTERNS IDENTIFIED:");
  console.log("(Clauses flagged for acknowledgment across contracts)\n");

  // Sort by frequency
  const sorted = [...ackPatterns.entries()].sort((a, b) => b[1].count - a[1].count);

  sorted.forEach(([title, data]) => {
    const frequency = data.count === results.length ? "ALL" : `${data.count}/${results.length}`;
    console.log(`  [${frequency}] ${title}`);
    console.log(`        Contracts: ${data.contracts.join(", ")}`);
    console.log(`        Type: ${data.types.join(" or ")}`);
  });

  // Summary table
  console.log("\n\nSUMMARY TABLE:");
  console.log("─".repeat(80));
  console.log(
    "Contract Type".padEnd(35) +
    "Clauses".padEnd(10) +
    "Need Ack".padEnd(10) +
    "High Risk".padEnd(12) +
    "% Flagged"
  );
  console.log("─".repeat(80));

  results.forEach((r) => {
    const pct = ((r.summary.requiresAcknowledgment / r.summary.totalClauses) * 100).toFixed(0);
    console.log(
      r.contractType.padEnd(35) +
      r.summary.totalClauses.toString().padEnd(10) +
      r.summary.requiresAcknowledgment.toString().padEnd(10) +
      r.summary.highRisk.toString().padEnd(12) +
      `${pct}%`
    );
  });
  console.log("─".repeat(80));

  // Recommendations
  console.log("\n\nRECOMMENDATIONS FOR STANDARDIZATION:");
  console.log("─".repeat(60));

  const universalAck = sorted.filter(([_, data]) => data.count >= 2);
  console.log("\n1. ALWAYS require acknowledgment for:");
  universalAck.forEach(([title, data]) => {
    console.log(`   - ${title} (${data.types[0]})`);
  });

  console.log("\n2. Suggested manifest configuration:");
  console.log(`
   acknowledgmentRules: {
     // Universal - apply to all contracts
     universal: [
       { pattern: /confidential|nda|non-disclosure/i, type: "initials" },
       { pattern: /indemnif/i, type: "initials" },
       { pattern: /non-?compete|restrictive covenant/i, type: "initials" },
       { pattern: /intellectual property|ip assignment|work.+for.+hire/i, type: "initials" },
       { pattern: /limitation.+liability|liability.+cap/i, type: "checkbox" },
       { pattern: /arbitration|dispute resolution/i, type: "checkbox" },
     ],
     // Contract-specific overrides
     byContractType: {
       "SAFE": [{ pattern: /valuation cap|discount/i, type: "initials" }],
       "Employment": [{ pattern: /termination|severance/i, type: "initials" }],
     }
   }
  `);
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  AI ACKNOWLEDGMENT DETECTION EXPERIMENT                    ║");
  console.log("║  Testing which clauses AI flags for explicit acknowledgment║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const results: ExperimentResult[] = [];

  for (const config of CONTRACT_CONFIGS) {
    try {
      const result = await analyzeContract(config);
      results.push(result);
      printResults(result);
    } catch (error) {
      console.error(`Error analyzing ${config.type}:`, error);
    }
  }

  // Cross-contract analysis
  if (results.length > 0) {
    printCrossContractAnalysis(results);
  }

  console.log("\n\nExperiment complete!");
}

main().catch(console.error);
