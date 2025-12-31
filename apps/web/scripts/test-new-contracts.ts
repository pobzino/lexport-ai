/**
 * Test script for new contract types: LOI, Co-Founder, Sales Contract
 */

import { generateContract } from "../src/lib/contracts/generator";
import type { LOIMetadata, CofounderMetadata, SalesContractMetadata } from "../src/lib/contracts/schemas";

async function testLetterOfIntent() {
  console.log("\n=== Testing Letter of Intent ===\n");

  const metadata: LOIMetadata = {
    contractType: "letter_of_intent",
    proposingParty: {
      name: "Acme Corp",
      email: "ceo@acme.com",
      role: "proposing_party",
      company: "Acme Corporation",
      title: "CEO",
    },
    receivingParty: {
      name: "Beta Inc",
      email: "cfo@beta.com",
      role: "receiving_party",
      company: "Beta Inc",
      title: "CFO",
    },
    transactionType: "acquisition",
    transactionDescription: "Proposed acquisition of Beta Inc's software division including all intellectual property, customer contracts, and key personnel",
    proposedTerms: {
      purchasePrice: 5000000,
      keyConditions: ["Due diligence completion", "Board approval", "Regulatory clearance"],
    },
    exclusivityPeriod: 60,
    dueDiligencePeriod: 45,
    effectiveDate: "2025-01-15",
    expirationDate: "2025-03-15",
    isBindingTerms: ["confidentiality", "exclusivity"],
    jurisdiction: "us_california",
  };

  try {
    const result = await generateContract("letter_of_intent", metadata);
    console.log("Title:", result.title);
    console.log("Clauses:", result.clauses.length);
    result.clauses.forEach((c: { title: string; content: string }, i: number) => {
      console.log(`  ${i + 1}. ${c.title} (${c.content.split(" ").length} words)`);
    });
    console.log("\n✅ Letter of Intent generation successful!\n");
  } catch (error) {
    console.error("❌ LOI generation failed:", error);
  }
}

async function testCofounderAgreement() {
  console.log("\n=== Testing Co-Founder Agreement ===\n");

  const metadata: CofounderMetadata = {
    contractType: "cofounder_agreement",
    companyName: "TechStartup Inc",
    companyType: "corporation",
    cofounders: [
      {
        party: {
          name: "Alice Smith",
          email: "alice@techstartup.com",
          role: "cofounder",
          title: "CEO",
        },
        equityPercentage: 50,
        vestingSchedule: {
          totalMonths: 48,
          cliffMonths: 12,
          accelerationOnChange: true,
        },
        role: "CEO",
        responsibilities: "Overall company strategy, fundraising, and business development",
        initialContribution: {
          cash: 50000,
          ipDescription: "Initial product concept and business plan",
        },
      },
      {
        party: {
          name: "Bob Johnson",
          email: "bob@techstartup.com",
          role: "cofounder",
          title: "CTO",
        },
        equityPercentage: 50,
        vestingSchedule: {
          totalMonths: 48,
          cliffMonths: 12,
          accelerationOnChange: true,
        },
        role: "CTO",
        responsibilities: "Technical architecture, engineering team leadership, and product development",
        initialContribution: {
          cash: 50000,
          ipDescription: "Core software prototype and technical documentation",
        },
      },
    ],
    decisionMaking: {
      majorDecisionThreshold: 66,
      deadlockResolution: "mediation",
    },
    salaryProvisions: {
      initialSalaries: false,
      salaryDetails: "Salaries to be determined once Series A funding is secured",
    },
    ipAssignment: true,
    nonCompetePeriod: 24,
    exitProvisions: {
      rightOfFirstRefusal: true,
      dragAlong: true,
      tagAlong: true,
    },
    effectiveDate: "2025-01-15",
    jurisdiction: "us_california",
  };

  try {
    const result = await generateContract("cofounder_agreement", metadata);
    console.log("Title:", result.title);
    console.log("Clauses:", result.clauses.length);
    result.clauses.forEach((c: { title: string; content: string }, i: number) => {
      console.log(`  ${i + 1}. ${c.title} (${c.content.split(" ").length} words)`);
    });
    console.log("\n✅ Co-Founder Agreement generation successful!\n");
  } catch (error) {
    console.error("❌ Co-Founder generation failed:", error);
  }
}

async function testSalesContract() {
  console.log("\n=== Testing Sales Contract ===\n");

  const metadata: SalesContractMetadata = {
    contractType: "sales_contract",
    seller: {
      name: "Equipment Suppliers LLC",
      email: "sales@equipment.com",
      role: "seller",
      company: "Equipment Suppliers LLC",
      address: "123 Industrial Blvd, San Jose, CA 95110",
    },
    buyer: {
      name: "Manufacturing Corp",
      email: "purchasing@manufacturing.com",
      role: "buyer",
      company: "Manufacturing Corp",
      address: "456 Factory Lane, Oakland, CA 94607",
    },
    productDescription: "Industrial manufacturing equipment including CNC machines and assembly line components",
    products: [
      {
        name: "CNC Milling Machine Model X500",
        description: "5-axis CNC milling machine with automated tool changer",
        quantity: 2,
        unitPrice: 75000,
        specifications: "Working area: 500x400x300mm, Spindle: 15,000 RPM",
      },
      {
        name: "Conveyor Belt System CB-200",
        description: "Modular conveyor belt system for assembly line",
        quantity: 5,
        unitPrice: 12000,
        specifications: "Length: 10m, Width: 60cm, Load capacity: 500kg/m",
      },
    ],
    totalAmount: 210000,
    currency: "usd",
    paymentTerms: {
      method: "installments",
      depositPercentage: 30,
      installmentSchedule: "30% deposit, 40% on delivery, 30% net 30 after installation",
    },
    deliveryTerms: {
      method: "delivery",
      location: "456 Factory Lane, Oakland, CA 94607",
      estimatedDate: "2025-03-01",
      shippingTerms: "fob_destination",
      riskOfLoss: "on_delivery",
    },
    warranty: {
      included: true,
      periodMonths: 24,
      scope: "Parts and labor for manufacturing defects. Excludes wear items and damage from misuse.",
    },
    returnPolicy: {
      allowed: false,
    },
    effectiveDate: "2025-01-15",
    jurisdiction: "us_california",
  };

  try {
    const result = await generateContract("sales_contract", metadata);
    console.log("Title:", result.title);
    console.log("Clauses:", result.clauses.length);
    result.clauses.forEach((c: { title: string; content: string }, i: number) => {
      console.log(`  ${i + 1}. ${c.title} (${c.content.split(" ").length} words)`);
    });
    console.log("\n✅ Sales Contract generation successful!\n");
  } catch (error) {
    console.error("❌ Sales Contract generation failed:", error);
  }
}

async function main() {
  console.log("Testing new contract types...\n");
  console.log("Note: This requires OPENAI_API_KEY environment variable.\n");

  await testLetterOfIntent();
  await testCofounderAgreement();
  await testSalesContract();

  console.log("=== All tests complete ===");
}

main().catch(console.error);
