import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  INTAKE_MODEL,
  INTAKE_SYSTEM_PROMPT,
  normalizeIntakeResponse,
} from "@/lib/contracts/intake-prompt";

// Simple in-memory rate limit: 5 analyses per IP per hour
const ipTimestamps = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipTimestamps.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  ipTimestamps.set(ip, recent);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  return false;
}

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const { description } = await request.json();

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a description of at least 10 characters" },
        { status: 400 }
      );
    }

    const response = await getOpenAI().chat.completions.create({
      model: INTAKE_MODEL,
      messages: [
        { role: "system", content: INTAKE_SYSTEM_PROMPT },
        { role: "user", content: description.trim() },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const analysis = JSON.parse(content);
    const normalized = normalizeIntakeResponse(analysis);

    return NextResponse.json({
      success: true,
      hasRecommendation: normalized.hasRecommendation,
      analysis: normalized.analysis,
      matchingTemplate: null,
    });
  } catch (error) {
    console.error("[intake/preview] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze your request. Please try again." },
      { status: 500 }
    );
  }
}
