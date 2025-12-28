/**
 * Generate Clause Manifests from GPT-5.2
 *
 * Generates 5 contracts per type with GPT-5.2 to identify:
 * - Required clauses (appear in all 5)
 * - Common clauses (appear in 3-4)
 * - Optional clauses (appear in 1-2)
 */

import OpenAI from "openai";
import * as fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GENERATIONS_PER_TYPE = 5;

interface ContractTypeConfig {
  type: string;
  name: string;
  description: string;
  sampleDetails: string;
}

const CONTRACT_TYPES: ContractTypeConfig[] = [
  {
    type: "nda_mutual",
    name: "Mutual NDA",
    description: "Two-way confidentiality agreement",
    sampleDetails: `
Party A: TechStartup Inc., represented by Sarah Johnson, CEO
Party B: Acme Ventures LLC, represented by John Smith, Managing Partner
Purpose: Exploring potential business partnership and sharing proprietary technology
Duration: 2 years
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "nda_oneway",
    name: "One-Way NDA",
    description: "Disclosing party shares confidential info with receiving party",
    sampleDetails: `
Disclosing Party: TechStartup Inc., represented by Sarah Johnson, CEO
Receiving Party: Jane Doe, Consultant
Purpose: Evaluating potential consulting engagement
Duration: 3 years
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "contractor_agreement",
    name: "Independent Contractor Agreement",
    description: "Hire contractors with IP assignment and clear deliverables",
    sampleDetails: `
Company: TechStartup Inc., represented by Sarah Johnson, CEO
Contractor: Alex Chen, Software Developer
Services: Full-stack development for mobile app
Rate: $150/hour, estimated 200 hours
Start Date: 2025-02-01
End Date: 2025-05-31
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "consulting_agreement",
    name: "Consulting Agreement",
    description: "Professional consulting services",
    sampleDetails: `
Client: TechStartup Inc., represented by Sarah Johnson, CEO
Consultant: Strategic Insights LLC, represented by Mark Williams
Services: Go-to-market strategy and competitive analysis
Fee: $25,000 fixed fee
Duration: 3 months
Deliverables: Market analysis report, GTM playbook, competitor matrix
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "safe_note",
    name: "SAFE Note",
    description: "Simple Agreement for Future Equity (YC standard)",
    sampleDetails: `
Company: TechStartup Inc., a Delaware corporation
Investor: Angel Investor Jane Smith
Investment Amount: $100,000
Valuation Cap: $5,000,000
Discount: 20%
Pro Rata Rights: Yes
MFN: Yes
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "service_agreement",
    name: "Freelance Service Agreement",
    description: "General services contract for freelancers",
    sampleDetails: `
Client: TechStartup Inc., represented by Sarah Johnson, Marketing Director
Freelancer: Chen Creative Studio, represented by Alex Chen, Senior Designer
Project: Brand Refresh 2025 - complete visual identity redesign
Total Amount: $8,500
Deposit: $2,550
Payment Schedule: milestone-based
Revision Rounds: 3
Deadline: 2025-03-15
Deliverables:
  - Logo concepts (3 options) - $2,000
  - Selected logo refinement - $1,500
  - Brand guidelines document - $2,500
  - Asset package delivery - $2,500
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "ip_assignment",
    name: "IP Assignment Agreement",
    description: "Transfer intellectual property rights",
    sampleDetails: `
Assignor: Alex Chen (individual developer)
Assignee: TechStartup Inc.
IP Description: Mobile application source code, UI designs, and related documentation for "TaskFlow" productivity app
Consideration: $50,000
Effective Date: 2025-01-15
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "advisor_agreement",
    name: "Advisor Agreement",
    description: "Engage startup advisors with equity compensation",
    sampleDetails: `
Company: TechStartup Inc., a Delaware corporation
Advisor: Dr. Emily Rodriguez, Industry Expert
Services: Strategic guidance on product development and industry connections
Time Commitment: 5 hours per month
Compensation: 0.25% equity, 4-year vesting, 1-year cliff
Term: 2 years
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "employment_offer",
    name: "Employment Offer Letter",
    description: "Formal job offer with terms",
    sampleDetails: `
Employer: TechStartup Inc.
Employee: Michael Johnson
Position: Senior Software Engineer
Department: Engineering
Start Date: 2025-02-15
Salary: $180,000 annually
Equity: 0.1% stock options, 4-year vesting, 1-year cliff
Benefits: Health, dental, vision, 401k matching
PTO: Unlimited
Location: San Francisco, CA (hybrid - 3 days in office)
At-Will Employment: Yes
Jurisdiction: California, USA
    `.trim(),
  },
  {
    type: "sow",
    name: "Statement of Work",
    description: "Detailed project scope and deliverables",
    sampleDetails: `
Client: TechStartup Inc., represented by Sarah Johnson, Project Manager
Vendor: DevShop Agency, represented by Chris Lee, Account Director
Project: E-commerce Platform Development
Total Budget: $150,000
Timeline: 6 months (Feb 2025 - Jul 2025)
Payment: 30% upfront, 40% at midpoint, 30% on completion
Phases:
  - Discovery & Planning (4 weeks) - $20,000
  - Design & Prototyping (6 weeks) - $35,000
  - Development Sprint 1 (8 weeks) - $45,000
  - Development Sprint 2 (6 weeks) - $35,000
  - Testing & Launch (4 weeks) - $15,000
Change Order Process: Written approval required
Jurisdiction: California, USA
    `.trim(),
  },
];

const DEVELOPER_MESSAGE = `You are an expert legal contract drafter specializing in California law.

Generate a professional, legally enforceable contract with:
1. Numbered subsections (1.1, 1.2, etc.)
2. A Definitions section for key terms
3. All clauses appropriate for this contract type
4. Professional formatting

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{
    "id": "string",
    "title": "string",
    "content": "string",
    "type": "standard|negotiable|optional",
    "order": number,
    "keyProvisions": ["list of key elements in this clause"]
  }],
  "signatureBlock": "string"
}`;

interface ClauseInfo {
  title: string;
  type: string;
  keyProvisions: string[];
  count: number;
}

interface ManifestResult {
  contractType: string;
  contractName: string;
  jurisdiction: string;
  generationCount: number;
  clauses: ClauseInfo[];
  structuralElements: {
    hasNumberedSections: boolean;
    hasDefinitions: boolean;
    avgClauseCount: number;
  };
  sampleTitles: string[][];
}

async function generateContract(config: ContractTypeConfig, attempt: number): Promise<any> {
  console.log(`  Generation ${attempt + 1}/${GENERATIONS_PER_TYPE}...`);

  try {
    const response = await (openai as any).responses.create({
      model: "gpt-5.2",
      reasoning: { effort: "medium" },
      input: [
        { role: "developer", content: DEVELOPER_MESSAGE },
        {
          role: "user",
          content: `Generate a ${config.name} contract for California:\n\n${config.sampleDetails}\n\nInclude keyProvisions array for each clause listing its essential elements. Return only valid JSON.`
        },
      ],
    });

    const content = response.output_text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error: any) {
    console.log(`    Error: ${error.message}`);
  }
  return null;
}

function normalizeClauseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function aggregateClauses(contracts: any[]): ClauseInfo[] {
  const clauseMap = new Map<string, ClauseInfo>();

  for (const contract of contracts) {
    if (!contract?.clauses) continue;

    for (const clause of contract.clauses) {
      const normalizedTitle = normalizeClauseTitle(clause.title);

      if (clauseMap.has(normalizedTitle)) {
        const existing = clauseMap.get(normalizedTitle)!;
        existing.count++;
        // Merge key provisions
        if (clause.keyProvisions) {
          for (const provision of clause.keyProvisions) {
            if (!existing.keyProvisions.includes(provision)) {
              existing.keyProvisions.push(provision);
            }
          }
        }
      } else {
        clauseMap.set(normalizedTitle, {
          title: clause.title,
          type: clause.type || "standard",
          keyProvisions: clause.keyProvisions || [],
          count: 1,
        });
      }
    }
  }

  // Sort by frequency (most common first)
  return Array.from(clauseMap.values()).sort((a, b) => b.count - a.count);
}

async function processContractType(config: ContractTypeConfig): Promise<ManifestResult> {
  console.log(`\nProcessing: ${config.name}`);
  console.log("-".repeat(40));

  const contracts: any[] = [];

  for (let i = 0; i < GENERATIONS_PER_TYPE; i++) {
    const contract = await generateContract(config, i);
    if (contract) {
      contracts.push(contract);
    }
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const clauses = aggregateClauses(contracts);
  const avgClauseCount = contracts.reduce((sum, c) => sum + (c.clauses?.length || 0), 0) / contracts.length;

  // Check structural elements
  const hasNumberedSections = contracts.some(c =>
    c.clauses?.some((clause: any) => clause.content?.includes("1.1") || clause.content?.includes("1.2"))
  );
  const hasDefinitions = contracts.some(c =>
    c.clauses?.some((clause: any) => clause.title?.toLowerCase().includes("definition"))
  );

  // Collect all clause titles per generation for comparison
  const sampleTitles = contracts.map(c => c.clauses?.map((cl: any) => cl.title) || []);

  console.log(`  Generated ${contracts.length} contracts`);
  console.log(`  Found ${clauses.length} unique clause types`);
  console.log(`  Avg clauses per contract: ${avgClauseCount.toFixed(1)}`);

  return {
    contractType: config.type,
    contractName: config.name,
    jurisdiction: "california",
    generationCount: contracts.length,
    clauses,
    structuralElements: {
      hasNumberedSections,
      hasDefinitions,
      avgClauseCount,
    },
    sampleTitles,
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("GENERATING CLAUSE MANIFESTS FROM GPT-5.2");
  console.log(`${CONTRACT_TYPES.length} contract types × ${GENERATIONS_PER_TYPE} generations each`);
  console.log("=".repeat(60));

  const results: ManifestResult[] = [];

  for (const config of CONTRACT_TYPES) {
    const result = await processContractType(config);
    results.push(result);

    // Save intermediate results
    fs.writeFileSync(
      "scripts/outputs/clause-manifests-progress.json",
      JSON.stringify(results, null, 2)
    );
  }

  // Generate final manifests
  console.log("\n" + "=".repeat(60));
  console.log("GENERATING FINAL MANIFESTS");
  console.log("=".repeat(60));

  const manifests: Record<string, any> = {};

  for (const result of results) {
    const requiredClauses = result.clauses.filter(c => c.count >= 4); // 4-5 out of 5
    const commonClauses = result.clauses.filter(c => c.count >= 2 && c.count < 4); // 2-3 out of 5
    const optionalClauses = result.clauses.filter(c => c.count === 1); // 1 out of 5

    manifests[result.contractType] = {
      contractType: result.contractType,
      contractName: result.contractName,
      jurisdiction: result.jurisdiction,
      requiredClauses: requiredClauses.map(c => ({
        title: c.title,
        type: c.type,
        keyProvisions: c.keyProvisions,
      })),
      commonClauses: commonClauses.map(c => ({
        title: c.title,
        type: c.type,
        keyProvisions: c.keyProvisions,
      })),
      optionalClauses: optionalClauses.map(c => ({
        title: c.title,
        type: c.type,
        keyProvisions: c.keyProvisions,
      })),
      structuralRequirements: {
        numberedSubsections: result.structuralElements.hasNumberedSections,
        definitionsSection: result.structuralElements.hasDefinitions,
        expectedClauseCount: Math.round(result.structuralElements.avgClauseCount),
      },
    };

    console.log(`\n${result.contractName}:`);
    console.log(`  Required (${requiredClauses.length}): ${requiredClauses.map(c => c.title).join(", ")}`);
    console.log(`  Common (${commonClauses.length}): ${commonClauses.map(c => c.title).join(", ")}`);
    console.log(`  Optional (${optionalClauses.length}): ${optionalClauses.map(c => c.title).join(", ")}`);
  }

  // Save manifests
  fs.writeFileSync(
    "scripts/outputs/clause-manifests.json",
    JSON.stringify(manifests, null, 2)
  );

  // Save detailed results
  fs.writeFileSync(
    "scripts/outputs/clause-manifests-detailed.json",
    JSON.stringify(results, null, 2)
  );

  console.log("\n" + "=".repeat(60));
  console.log("COMPLETE");
  console.log("=".repeat(60));
  console.log("Saved to:");
  console.log("  - scripts/outputs/clause-manifests.json (final manifests)");
  console.log("  - scripts/outputs/clause-manifests-detailed.json (raw data)");

  // Cost estimate
  const totalGenerations = CONTRACT_TYPES.length * GENERATIONS_PER_TYPE;
  const estimatedCost = totalGenerations * 0.072;
  console.log(`\nEstimated cost: ${totalGenerations} generations × $0.072 = $${estimatedCost.toFixed(2)}`);
}

main().catch(console.error);
