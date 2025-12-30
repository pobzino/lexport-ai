
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Try to load env from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config(); // Default
}

if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not found. Please ensure it is set in apps/web/.env.local");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const sampleContract = `
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (the "Agreement") is entered into as of December 30, 2025 (the "Effective Date"), by and between TechCorp Inc., a Delaware corporation ("Party A"), and Innovation LLC, a California limited liability company ("Party B").

1. Definition of Confidential Information.
"Confidential Information" means any non-public information disclosed by one party to the other party, whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.

2. Obligations.
Each party agrees to: (a) hold the other party's Confidential Information in strict confidence; (b) not disclose such Confidential Information to any third party without specific prior written consent; and (c) use such Confidential Information only for the purpose of evaluating a potential business relationship.

3. Term.
This Agreement shall remain in effect for a period of three (3) years from the Effective Date.

4. Governing Law.
This Agreement shall be governed by the laws of the State of New York, without regard to its conflict of laws principles.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

TechCorp Inc.
By: ____________________
Name: John Doe
Title: CEO

Innovation LLC
By: ____________________
Name: Jane Smith
Title: CTO
`;

const prompt = `Analyze this contract text and structure it into components.

Contract Text:
---
${sampleContract}
---

Parse this contract and output a JSON object with the following structure:
{
  "suggestedTitle": "A descriptive title for this contract",
  "contractType": "One of: nda_mutual, nda_oneway, contractor_agreement, consulting_agreement, service_agreement, employment_offer, other",
  "jurisdiction": "Detected jurisdiction code",
  "preamble": "The opening paragraph identifying the parties and date",
  "recitals": "The WHEREAS clauses or background section",
  "clauses": [
    {
      "title": "Clause title",
      "content": "The full text of the clause"
    }
  ],
  "signatureBlock": "The signature section"
}

Rules:
1. Extract the preamble
2. Extract any recitals
3. Split the main body into logical clauses
4. Output valid JSON only
`;

async function testModel(modelName: string) {
    console.log(`\n----------------------------------------`);
    console.log(`Testing model: ${modelName}...`);
    const start = Date.now();

    try {
        const response = await openai.chat.completions.create({
            model: modelName,
            messages: [
                {
                    role: "system",
                    content: `You are a legal document parser. Your job is to analyze contract text and structure it into a clean, organized format. You must output valid JSON only.`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            response_format: { type: "json_object" },
        });

        const duration = Date.now() - start;
        const content = response.choices[0]?.message?.content;
        const usage = response.usage;

        console.log(`✅ Success`);
        console.log(`Time: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
        console.log(`Tokens: Input ${usage?.prompt_tokens}, Output ${usage?.completion_tokens}, Total ${usage?.total_tokens}`);

        if (content) {
            try {
                const parsed = JSON.parse(content);
                console.log("Structure Check:");
                console.log(`- Clauses: ${parsed.clauses?.length || 0}`);
                console.log(`- Title: "${parsed.suggestedTitle}"`);
                console.log(`- Type: ${parsed.contractType}`);
                // console.log("First Clause Title:", parsed.clauses?.[0]?.title);
            } catch (e) {
                console.error("❌ Invalid JSON output");
            }
        }

    } catch (error: any) {
        console.error(`❌ Failed: ${error.message}`);
        if (error.status === 404) {
            console.error("  (Model not found or no access)");
        }
    }
}

async function runComparison() {
    console.log("Starting Model Comparison...");
    // Test gpt-4.1-mini
    await testModel("gpt-4.1-mini");

    // Test gpt-4.1
    await testModel("gpt-4.1");
}

runComparison();
