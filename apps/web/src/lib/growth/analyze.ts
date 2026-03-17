import OpenAI from "openai";
import type {
  AnalysisResult,
  CompetitorMention,
  GrowthLLMProvider,
} from "@/types/growth";

// Prompt templates — {keyword} is replaced at runtime
const PROMPT_TEMPLATES = [
  "What are the best tools for {keyword}? Give me a ranked list with brief descriptions.",
  "Recommend the top 5 software tools for {keyword}. Include their key features.",
  "I need a tool for {keyword}. What are my best options? Rank them.",
  "What software should I use for {keyword}? List the top options.",
];

function pickPrompt(keyword: string): string {
  const template =
    PROMPT_TEMPLATES[Math.floor(Math.random() * PROMPT_TEMPLATES.length)];
  return template.replace("{keyword}", keyword);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect if a brand is mentioned in an LLM response.
 * Returns mention status, rank position, and citation status.
 */
export function detectBrandMention(
  response: string,
  brandName: string,
  aliases: string[]
): { mentioned: boolean; rank: number | null; cited: boolean } {
  const lowerResponse = response.toLowerCase();
  const searchTerms = [
    brandName.toLowerCase(),
    ...aliases.map((a) => a.toLowerCase()),
  ];

  const mentioned = searchTerms.some((term) => lowerResponse.includes(term));

  let rank: number | null = null;
  if (mentioned) {
    for (const term of searchTerms) {
      // Match patterns like "1. BrandName", "1) BrandName", "**1. BrandName**"
      const rankMatch = response.match(
        new RegExp(
          `(?:^|\\n)\\s*(?:\\*\\*)?\\s*(\\d+)[.)\\s]+[^\\n]*${escapeRegex(term)}`,
          "im"
        )
      );
      if (rankMatch) {
        rank = parseInt(rankMatch[1], 10);
        break;
      }
    }
  }

  // Check for URL or domain citations
  const cited = searchTerms.some(
    (term) =>
      lowerResponse.includes(`${term}.com`) ||
      lowerResponse.includes(`${term}.ai`) ||
      lowerResponse.includes(`${term}.io`)
  );

  return { mentioned, rank, cited };
}

// Lazy-initialized clients — all use OpenAI SDK
let openaiClient: OpenAI | null = null;
let perplexityClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function getPerplexity(): OpenAI | null {
  if (!process.env.PERPLEXITY_API_KEY) return null;
  if (!perplexityClient) {
    perplexityClient = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: "https://api.perplexity.ai",
    });
  }
  return perplexityClient;
}

async function queryOpenAI(
  prompt: string,
  model: string = "gpt-4o"
): Promise<{
  text: string;
  model: string;
  tokens: number | null;
}> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
    temperature: 0.7,
  });
  return {
    text: response.choices[0]?.message?.content || "",
    model,
    tokens: response.usage?.completion_tokens ?? null,
  };
}

async function queryPerplexity(prompt: string): Promise<{
  text: string;
  model: string;
  tokens: number | null;
} | null> {
  const client = getPerplexity();
  if (!client) return null;
  const response = await client.chat.completions.create({
    model: "sonar",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
  });
  return {
    text: response.choices[0]?.message?.content || "",
    model: "sonar",
    tokens: response.usage?.completion_tokens ?? null,
  };
}

interface AnalyzeKeywordParams {
  keyword: string;
  brandName: string;
  brandAliases: string[];
  competitors: Array<{ name: string; aliases: string[] }>;
  providers?: GrowthLLMProvider[];
}

/**
 * Run visibility analysis for a single keyword across providers.
 * Uses OpenAI GPT-4o by default. Also queries GPT-4o-mini for a second
 * data point (logged as "openai" provider with different model).
 * Perplexity is used if PERPLEXITY_API_KEY is set.
 */
export async function analyzeKeyword({
  keyword,
  brandName,
  brandAliases,
  competitors,
  providers = ["openai"],
}: AnalyzeKeywordParams): Promise<AnalysisResult[]> {
  const prompt = pickPrompt(keyword);
  const results: AnalysisResult[] = [];

  // Build provider query functions
  const queries: Array<{
    provider: GrowthLLMProvider;
    model: string;
    fn: () => Promise<{ text: string; model: string; tokens: number | null } | null>;
  }> = [];

  if (providers.includes("openai")) {
    // Query both GPT-5.4 and GPT-5-mini for two data points
    queries.push({
      provider: "openai",
      model: "gpt-5.4",
      fn: () => queryOpenAI(prompt, "gpt-5.4"),
    });
    queries.push({
      provider: "openai",
      model: "gpt-5-mini",
      fn: () => queryOpenAI(prompt, "gpt-5-mini"),
    });
  }
  if (providers.includes("perplexity")) {
    queries.push({
      provider: "perplexity",
      model: "sonar",
      fn: () => queryPerplexity(prompt),
    });
  }

  // Run all queries in parallel
  const settled = await Promise.allSettled(queries.map((q) => q.fn()));

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const query = queries[i];

    if (result.status === "rejected" || !result.value) {
      console.error(
        `[growth] ${query.provider}/${query.model} query failed for "${keyword}":`,
        result.status === "rejected" ? result.reason : "null response"
      );
      continue;
    }

    const { text, model, tokens } = result.value;
    const brandResult = detectBrandMention(text, brandName, brandAliases);

    // Check competitor mentions
    const competitorMentions: Record<string, CompetitorMention> = {};
    for (const comp of competitors) {
      const compResult = detectBrandMention(text, comp.name, comp.aliases);
      competitorMentions[comp.name] = {
        mentioned: compResult.mentioned,
        rank: compResult.rank,
        cited: compResult.cited,
      };
    }

    results.push({
      provider: query.provider,
      model,
      mentioned: brandResult.mentioned,
      rankPosition: brandResult.rank,
      citedAsSource: brandResult.cited,
      competitorMentions,
      rawResponse: text,
      promptUsed: prompt,
      responseTokens: tokens,
    });
  }

  return results;
}
