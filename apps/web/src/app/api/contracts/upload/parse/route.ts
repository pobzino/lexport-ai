import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseContractText } from "@/lib/upload/parse-contract";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 }
      );
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: "Text too short to parse" },
        { status: 400 }
      );
    }

    // Parse the contract text into structured format
    const result = await parseContractText(text);

    return NextResponse.json({
      success: true,
      content: result.content,
      suggestedTitle: result.suggestedTitle,
      suggestedType: result.suggestedType,
      suggestedJurisdiction: result.suggestedJurisdiction,
      confidence: result.confidence,
      clauseCount: result.content.clauses.length,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse contract text" },
      { status: 500 }
    );
  }
}
