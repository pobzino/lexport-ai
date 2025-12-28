/**
 * Test GPT-5-mini with manifest-based dynamic prompts
 *
 * For each contract type:
 * 1. Load its manifest
 * 2. Build dynamic prompt with required/common clauses
 * 3. Generate with GPT-5-mini
 * 4. Verify required clauses are present
 */

import OpenAI from "openai";
import * as fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load manifests
const manifests = JSON.parse(
  fs.readFileSync("scripts/outputs/clause-manifests.json", "utf-8")
);

interface ContractConfig {
  type: string;
  name: string;
  sampleDetails: string;
}

const CONTRACT_CONFIGS: ContractConfig[] = [
  {
    type: "nda_mutual",
    name: "Mutual NDA",
    sampleDetails: `
Party A: TechStartup Inc., represented by Sarah Johnson, CEO
Party B: Acme Ventures LLC, represented by John Smith, Managing Partner
Purpose: Exploring potential business partnership
Duration: 2 years
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "nda_oneway",
    name: "One-Way NDA",
    sampleDetails: `
Disclosing Party: TechStartup Inc., represented by Sarah Johnson, CEO
Receiving Party: Jane Doe, Consultant
Purpose: Evaluating potential consulting engagement
Duration: 3 years
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "contractor_agreement",
    name: "Independent Contractor Agreement",
    sampleDetails: `
Company: TechStartup Inc., represented by Sarah Johnson, CEO
Contractor: Alex Chen, Software Developer
Services: Full-stack development for mobile app
Rate: $150/hour
Start Date: 2025-02-01
End Date: 2025-05-31
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "consulting_agreement",
    name: "Consulting Agreement",
    sampleDetails: `
Client: TechStartup Inc., represented by Sarah Johnson, CEO
Consultant: Strategic Insights LLC, represented by Mark Williams
Services: Go-to-market strategy
Fee: $25,000 fixed
Duration: 3 months
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "safe_note",
    name: "SAFE Note",
    sampleDetails: `
Company: TechStartup Inc., a Delaware corporation
Investor: Angel Investor Jane Smith
Investment Amount: $100,000
Valuation Cap: $5,000,000
Discount: 20%
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "service_agreement",
    name: "Freelance Service Agreement",
    sampleDetails: `
Client: TechStartup Inc., represented by Sarah Johnson
Freelancer: Chen Creative Studio, represented by Alex Chen
Project: Brand Refresh 2025
Total Amount: $8,500
Deposit: $2,550
Deadline: 2025-03-15
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "ip_assignment",
    name: "IP Assignment Agreement",
    sampleDetails: `
Assignor: Alex Chen (individual developer)
Assignee: TechStartup Inc.
IP: Mobile app source code and designs
Consideration: $50,000
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "advisor_agreement",
    name: "Advisor Agreement",
    sampleDetails: `
Company: TechStartup Inc.
Advisor: Dr. Emily Rodriguez
Services: Strategic guidance on product development
Compensation: 0.25% equity, 4-year vesting
Term: 2 years
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "employment_offer",
    name: "Employment Offer Letter",
    sampleDetails: `
Employer: TechStartup Inc.
Employee: Michael Johnson
Position: Senior Software Engineer
Salary: $180,000 annually
Equity: 0.1% stock options
Start Date: 2025-02-15
Location: San Francisco, CA (hybrid)
Jurisdiction: California, USA`.trim(),
  },
  {
    type: "sow",
    name: "Statement of Work",
    sampleDetails: `
Client: TechStartup Inc.
Vendor: DevShop Agency
Project: E-commerce Platform Development
Budget: $150,000
Timeline: 6 months
Jurisdiction: California, USA`.trim(),
  },
];

function buildDynamicPrompt(manifest: any, details: string): string {
  const requiredList = manifest.requiredClauses
    .map((c: any) => {
      const provisions = c.keyProvisions?.slice(0, 3).join(", ") || "";
      return `- ${c.title}${provisions ? ` (include: ${provisions})` : ""}`;
    })
    .join("\n");

  const commonList = manifest.commonClauses
    .slice(0, 8) // Limit to top 8 common clauses
    .map((c: any) => `- ${c.title}`)
    .join("\n");

  return `Generate a ${manifest.contractName} for California.

REQUIRED CLAUSES (must include):
${requiredList}

RECOMMENDED CLAUSES (include if relevant):
${commonList}

You may add other appropriate clauses as needed.

CONTRACT DETAILS:
${details}

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{"id": "string", "title": "string", "content": "string", "type": "standard", "order": number}],
  "signatureBlock": "string"
}`;
}

interface TestResult {
  type: string;
  name: string;
  success: boolean;
  clauseCount: number;
  requiredFound: number;
  requiredTotal: number;
  requiredMissing: string[];
  commonFound: number;
  extraClauses: string[];
  latencyMs: number;
  cost: number;
}

async function testContractType(config: ContractConfig): Promise<TestResult> {
  const manifest = manifests[config.type];
  if (!manifest) {
    console.log(`  ❌ No manifest found for ${config.type}`);
    return {
      type: config.type,
      name: config.name,
      success: false,
      clauseCount: 0,
      requiredFound: 0,
      requiredTotal: 0,
      requiredMissing: [],
      commonFound: 0,
      extraClauses: [],
      latencyMs: 0,
      cost: 0,
    };
  }

  const prompt = buildDynamicPrompt(manifest, config.sampleDetails);

  console.log(`\nTesting: ${config.name}`);
  const startTime = Date.now();

  try {
    const response = await (openai as any).responses.create({
      model: "gpt-5-mini",
      reasoning: { effort: "low" },
      input: [
        { role: "developer", content: "You are a legal contract generator. Use numbered subsections (1.1, 1.2). Output valid JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const latencyMs = Date.now() - startTime;
    const content = response.output_text || "";

    // Parse contract
    let contract: any = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        contract = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log(`  ❌ Failed to parse JSON`);
    }

    if (!contract?.clauses) {
      return {
        type: config.type,
        name: config.name,
        success: false,
        clauseCount: 0,
        requiredFound: 0,
        requiredTotal: manifest.requiredClauses.length,
        requiredMissing: manifest.requiredClauses.map((c: any) => c.title),
        commonFound: 0,
        extraClauses: [],
        latencyMs,
        cost: 0,
      };
    }

    // Check for required clauses
    const generatedTitles = contract.clauses.map((c: any) =>
      c.title.toLowerCase().replace(/[^a-z\s]/g, "")
    );

    const requiredMissing: string[] = [];
    let requiredFound = 0;

    for (const req of manifest.requiredClauses) {
      const reqNorm = req.title.toLowerCase().replace(/[^a-z\s]/g, "");
      const found = generatedTitles.some((t: string) =>
        t.includes(reqNorm) || reqNorm.includes(t) ||
        t.split(" ").some((word: string) => reqNorm.includes(word) && word.length > 4)
      );
      if (found) {
        requiredFound++;
      } else {
        requiredMissing.push(req.title);
      }
    }

    // Check for common clauses
    let commonFound = 0;
    for (const common of manifest.commonClauses.slice(0, 8)) {
      const commonNorm = common.title.toLowerCase().replace(/[^a-z\s]/g, "");
      const found = generatedTitles.some((t: string) =>
        t.includes(commonNorm) || commonNorm.includes(t) ||
        t.split(" ").some((word: string) => commonNorm.includes(word) && word.length > 4)
      );
      if (found) commonFound++;
    }

    // Calculate cost
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const reasoningTokens = response.usage?.output_tokens_details?.reasoning_tokens || 0;
    const cost = (inputTokens * 0.25 / 1_000_000) + ((outputTokens + reasoningTokens) * 2 / 1_000_000);

    // Get clause titles for review
    const clauseTitles = contract.clauses.map((c: any) => c.title);

    console.log(`  ✅ Generated ${contract.clauses.length} clauses in ${(latencyMs/1000).toFixed(1)}s`);
    console.log(`  Required: ${requiredFound}/${manifest.requiredClauses.length}`);
    if (requiredMissing.length > 0) {
      console.log(`  Missing: ${requiredMissing.join(", ")}`);
    }
    console.log(`  Cost: $${cost.toFixed(4)}`);

    // Save contract
    const filename = `scripts/outputs/manifest-test-${config.type}.md`;
    let md = `# ${config.name} (Manifest-Based Generation)\n\n`;
    md += `**Required clauses found:** ${requiredFound}/${manifest.requiredClauses.length}\n`;
    md += `**Missing:** ${requiredMissing.join(", ") || "None"}\n`;
    md += `**Total clauses:** ${contract.clauses.length}\n`;
    md += `**Cost:** $${cost.toFixed(4)}\n\n`;
    md += `## Clauses Generated\n\n`;
    for (const clause of contract.clauses) {
      md += `### ${clause.title}\n\n${clause.content}\n\n`;
    }
    md += `## Signature Block\n\n\`\`\`\n${contract.signatureBlock}\n\`\`\`\n`;
    fs.writeFileSync(filename, md);

    return {
      type: config.type,
      name: config.name,
      success: true,
      clauseCount: contract.clauses.length,
      requiredFound,
      requiredTotal: manifest.requiredClauses.length,
      requiredMissing,
      commonFound,
      extraClauses: clauseTitles,
      latencyMs,
      cost,
    };
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
    return {
      type: config.type,
      name: config.name,
      success: false,
      clauseCount: 0,
      requiredFound: 0,
      requiredTotal: manifest.requiredClauses.length,
      requiredMissing: [],
      commonFound: 0,
      extraClauses: [],
      latencyMs: Date.now() - startTime,
      cost: 0,
    };
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("TESTING MANIFEST-BASED PROMPTS WITH GPT-5-MINI");
  console.log("=".repeat(60));

  const results: TestResult[] = [];

  for (const config of CONTRACT_CONFIGS) {
    const result = await testContractType(config);
    results.push(result);
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  console.log("\n| Contract Type | Clauses | Required | Cost |");
  console.log("|---------------|---------|----------|------|");

  let totalCost = 0;
  let totalRequired = 0;
  let totalFound = 0;

  for (const r of results) {
    const status = r.requiredFound === r.requiredTotal ? "✅" : "⚠️";
    console.log(`| ${r.name.padEnd(25)} | ${String(r.clauseCount).padEnd(7)} | ${status} ${r.requiredFound}/${r.requiredTotal} | $${r.cost.toFixed(3)} |`);
    totalCost += r.cost;
    totalRequired += r.requiredTotal;
    totalFound += r.requiredFound;
  }

  console.log(`\n**Total cost for 10 contracts:** $${totalCost.toFixed(3)}`);
  console.log(`**Average cost per contract:** $${(totalCost / results.length).toFixed(4)}`);
  console.log(`**Required clause coverage:** ${totalFound}/${totalRequired} (${((totalFound/totalRequired)*100).toFixed(1)}%)`);

  // Save results
  fs.writeFileSync(
    "scripts/outputs/manifest-test-results.json",
    JSON.stringify(results, null, 2)
  );
}

main().catch(console.error);
