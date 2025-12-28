/**
 * Test if enhanced prompt inappropriately adds clauses to other contract types
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// NDA contract - should NOT have Kill Fee, Moral Rights, Portfolio Use
const NDA_DETAILS = `
Contract Type: Mutual Non-Disclosure Agreement (NDA)
Party A: TechStartup Inc., represented by Sarah Johnson, CEO
Party B: Acme Consulting LLC, represented by John Smith, Managing Partner
Purpose: Exploring potential business partnership and sharing proprietary technology information
Effective Date: 2025-01-15
Duration: 2 years
Jurisdiction: California, USA
`.trim();

// The problematic enhanced prompt with hardcoded clauses
const ENHANCED_PROMPT = `You are a legal contract generator for California law.

REQUIRED STRUCTURE:
1. Use numbered subsections throughout (e.g., 1.1, 1.2, 7.1, 7.2)
2. Start with a DEFINITIONS section defining key terms
3. Include these specific provisions:
   - Kill Fee: 10% of unpaid amount (max $850) if client terminates for convenience after work begins
   - Moral Rights: Freelancer waives moral rights to maximum extent permitted by law
   - Portfolio Use: Freelancer may display deliverables in portfolio after client's public launch
   - Trademark Disclaimer: Client is responsible for trademark clearance
   - Preliminary Works: Unused concepts remain Freelancer's property
   - Indemnification Remedies: If infringement claim arises, Freelancer may (i) procure rights, (ii) replace/modify, or (iii) refund

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{ "id": "string", "title": "string", "content": "string", "type": "standard", "order": number }],
  "signatureBlock": "string"
}`;

// Simple prompt without hardcoded clauses
const SIMPLE_PROMPT = `You are a legal contract generator for California law.

FORMATTING REQUIREMENTS:
1. Use numbered subsections (1.1, 1.2, etc.)
2. Include a Definitions section for key terms
3. Include only clauses appropriate for the specific contract type
4. Use professional signature block with "By:" line

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{ "id": "string", "title": "string", "content": "string", "type": "standard", "order": number }],
  "signatureBlock": "string"
}`;

async function testPrompt(promptType: "enhanced" | "simple") {
  const developerMessage = promptType === "enhanced" ? ENHANCED_PROMPT : SIMPLE_PROMPT;

  console.log(`\nTesting ${promptType} prompt for NDA...`);

  const response = await (openai as any).responses.create({
    model: "gpt-5-mini",
    reasoning: { effort: "low" },
    input: [
      { role: "developer", content: developerMessage },
      { role: "user", content: `Generate a ${NDA_DETAILS}\n\nReturn only valid JSON.` },
    ],
  });

  const content = response.output_text || "";

  // Check for inappropriate clauses
  const hasKillFee = content.toLowerCase().includes("kill fee");
  const hasMoralRights = content.toLowerCase().includes("moral rights");
  const hasPortfolioUse = content.toLowerCase().includes("portfolio");
  const hasFreelancer = content.toLowerCase().includes("freelancer");

  console.log(`\n${promptType.toUpperCase()} PROMPT RESULTS:`);
  console.log(`  Has Kill Fee: ${hasKillFee ? "❌ YES (inappropriate)" : "✅ No"}`);
  console.log(`  Has Moral Rights: ${hasMoralRights ? "❌ YES (inappropriate)" : "✅ No"}`);
  console.log(`  Has Portfolio Use: ${hasPortfolioUse ? "❌ YES (inappropriate)" : "✅ No"}`);
  console.log(`  Mentions Freelancer: ${hasFreelancer ? "❌ YES (wrong party type)" : "✅ No"}`);

  // Extract clause titles
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const contract = JSON.parse(jsonMatch[0]);
      console.log(`\n  Clauses generated:`);
      for (const clause of contract.clauses) {
        console.log(`    - ${clause.title}`);
      }
    }
  } catch (e) {
    console.log("  Could not parse clauses");
  }
}

async function main() {
  console.log("=" .repeat(60));
  console.log("Testing: Do hardcoded clauses leak into wrong contract types?");
  console.log("=" .repeat(60));

  await testPrompt("enhanced");
  await testPrompt("simple");
}

main().catch(console.error);
