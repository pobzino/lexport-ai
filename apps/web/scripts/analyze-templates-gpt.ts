import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function analyzeTemplates() {
  console.log("Fetching templates from database...\n");

  const { data: templates, error } = await supabase
    .from("contract_templates")
    .select("jurisdiction, title, version, preamble, clauses, metadata")
    .eq("contract_type", "freelance_service")
    .eq("is_active", true)
    .order("jurisdiction");

  if (error) {
    console.error("Error fetching templates:", error);
    process.exit(1);
  }

  console.log(`Found ${templates.length} templates. Sending to GPT-4o for analysis...\n`);

  const templateSummaries = templates.map((t) => ({
    jurisdiction: t.jurisdiction,
    title: t.title,
    version: t.version,
    clause_count: t.clauses?.length || 0,
    word_count: t.metadata?.word_count || "unknown",
    preamble_preview: t.preamble?.substring(0, 500) + "...",
    clause_titles: t.clauses?.map((c: any) => c.title) || [],
    key_clauses: t.clauses?.slice(0, 5).map((c: any) => ({
      title: c.title,
      content_preview: c.content?.substring(0, 300) + "..."
    })) || []
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a legal document review expert specializing in freelance and independent contractor agreements.
Analyze the provided contract templates and provide a comprehensive quality assessment.

For each jurisdiction, evaluate:
1. Legal Completeness - Are essential clauses present?
2. Jurisdiction-Specific Accuracy - Are statutory references correct?
3. Practical Usability - Is the language clear and placeholders comprehensive?
4. Risk Coverage - Does it protect both parties adequately?
5. Specific Improvements Needed

Be critical and thorough. This is a legal product where accuracy is paramount.`
      },
      {
        role: "user",
        content: `Analyze these ${templates.length} Freelance Service Agreement templates:\n\n${JSON.stringify(templateSummaries, null, 2)}`
      }
    ],
    max_tokens: 4096,
    temperature: 0.3,
  });

  console.log("=".repeat(80));
  console.log("GPT-4o TEMPLATE ANALYSIS");
  console.log("=".repeat(80));
  console.log("\n" + response.choices[0].message.content);
  console.log("\n" + "=".repeat(80));
  console.log(`Tokens used: ${response.usage?.total_tokens || "unknown"}`);
  console.log(`Model: ${response.model}`);
}

analyzeTemplates().catch(console.error);
