import OpenAI from "openai";

const TEMPLATE_EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_EMBED_TEXT_LENGTH = 8000;

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function extractClauseText(clauses: unknown): string {
  if (!Array.isArray(clauses)) return "";

  return clauses
    .map((clause) => {
      if (!clause || typeof clause !== "object") return "";

      const title = typeof (clause as { title?: unknown }).title === "string"
        ? (clause as { title: string }).title
        : "";
      const content = typeof (clause as { content?: unknown }).content === "string"
        ? (clause as { content: string }).content
        : "";

      return `${title} ${content}`.trim();
    })
    .filter(Boolean)
    .join("\n");
}

function extractTemplateContentText(content: unknown): string {
  if (!content || typeof content !== "object") return "";

  const data = content as {
    preamble?: unknown;
    recitals?: unknown;
    clauses?: unknown;
    signatureBlock?: unknown;
  };

  const preamble = typeof data.preamble === "string" ? data.preamble : "";
  const recitals = typeof data.recitals === "string" ? data.recitals : "";
  const signatureBlock = typeof data.signatureBlock === "string" ? data.signatureBlock : "";
  const clauses = extractClauseText(data.clauses);

  return normalizeWhitespace([preamble, recitals, clauses, signatureBlock].filter(Boolean).join("\n"));
}

export function buildTemplateSemanticText(template: {
  name: string;
  description?: string | null;
  type: string;
  jurisdiction: string;
  content?: unknown;
}): string {
  return normalizeWhitespace(
    [
      template.name,
      template.description || "",
      `Type: ${template.type}`,
      `Jurisdiction: ${template.jurisdiction}`,
      extractTemplateContentText(template.content),
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export function buildSystemTemplateSemanticText(template: {
  title: string;
  contract_type: string;
  jurisdiction: string;
  preamble?: string | null;
  recitals?: string | null;
  clauses?: unknown;
  signature_block?: string | null;
}): string {
  const contentText = normalizeWhitespace(
    [
      template.preamble || "",
      template.recitals || "",
      extractClauseText(template.clauses),
      template.signature_block || "",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return normalizeWhitespace(
    [
      template.title,
      `Type: ${template.contract_type}`,
      `Jurisdiction: ${template.jurisdiction}`,
      contentText,
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function createEmbedding(text: string): Promise<number[] | null> {
  const client = getOpenAI();
  if (!client) return null;

  const input = normalizeWhitespace(text).slice(0, MAX_EMBED_TEXT_LENGTH);
  if (!input) return null;

  try {
    const response = await client.embeddings.create({
      model: TEMPLATE_EMBEDDING_MODEL,
      input,
    });

    const vector = response.data?.[0]?.embedding;
    return Array.isArray(vector) ? vector : null;
  } catch (error) {
    console.error("Failed to create template embedding:", error);
    return null;
  }
}

export async function createEmbeddings(texts: string[]): Promise<number[][] | null> {
  const client = getOpenAI();
  if (!client) return null;

  const inputs = texts
    .map((text) => normalizeWhitespace(text).slice(0, MAX_EMBED_TEXT_LENGTH))
    .filter(Boolean);

  if (inputs.length === 0) return [];

  try {
    const response = await client.embeddings.create({
      model: TEMPLATE_EMBEDDING_MODEL,
      input: inputs,
    });

    const vectors = response.data?.map((item) => item.embedding).filter(Array.isArray) as number[][];
    return vectors.length === inputs.length ? vectors : null;
  } catch (error) {
    console.error("Failed to create template embeddings batch:", error);
    return null;
  }
}

export async function persistUserTemplateEmbedding(params: {
  supabase: any;
  templateId: string;
  semanticText: string;
  embedding: number[];
}): Promise<void> {
  const { supabase, templateId, semanticText, embedding } = params;

  const { error } = await supabase
    .from("templates")
    .update({
      semantic_text: semanticText,
      semantic_embedding: toPgVector(embedding),
    })
    .eq("id", templateId);

  if (error) {
    console.error("Failed to persist template semantic embedding:", error);
  }
}
