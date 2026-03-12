import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  reviewTemplate,
  quickReviewTemplate,
} from "@/lib/templates/template-reviewer";

/**
 * POST /api/templates/[id]/review
 *
 * Review a template for quality using GPT-5.4.
 * Requires authentication (Pro+ tier for full review, any tier for quick review).
 *
 * Query params:
 * - mode=quick: Fast pass/fail check (low reasoning effort)
 * - mode=full (default): Comprehensive quality review (medium reasoning effort)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user subscription for tier check
    const { data: userData } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const mode =
      request.nextUrl.searchParams.get("mode") === "quick" ? "quick" : "full";

    // Full review requires Pro+ subscription
    if (mode === "full" && (!userData?.subscription_tier || userData.subscription_tier === "free")) {
      return NextResponse.json(
        { error: "Full template review requires a Pro or Business subscription" },
        { status: 403 }
      );
    }

    // Determine if this is a system template or user template
    const isSystemTemplate = templateId.startsWith("system_");
    let templateData;

    if (isSystemTemplate) {
      const realId = templateId.replace("system_", "");
      const { data, error } = await supabase
        .from("contract_templates")
        .select("id, title, contract_type, jurisdiction, preamble, recitals, clauses, signature_block, placeholders")
        .eq("id", realId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      templateData = {
        id: templateId,
        name: data.title || "Untitled Template",
        type: data.contract_type,
        jurisdiction: data.jurisdiction,
        content: {
          preamble: data.preamble as string | undefined,
          recitals: data.recitals as string | undefined,
          clauses: (data.clauses as Array<{ id?: string; title: string; content: string; type?: string }>) || [],
          signatureBlock: data.signature_block as string | undefined,
        },
        placeholders: data.placeholders as Record<string, unknown> | undefined,
      };
    } else {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, type, jurisdiction, content")
        .eq("id", templateId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      // Verify ownership or public template
      const { data: ownerCheck } = await supabase
        .from("templates")
        .select("created_by_id, is_public")
        .eq("id", templateId)
        .single();

      if (ownerCheck && !ownerCheck.is_public && ownerCheck.created_by_id !== user.id) {
        return NextResponse.json(
          { error: "You don't have access to this template" },
          { status: 403 }
        );
      }

      const content = data.content as {
        preamble?: string;
        recitals?: string;
        clauses?: Array<{ id?: string; title: string; content: string; type?: string }>;
        signatureBlock?: string;
      } | null;

      templateData = {
        id: data.id,
        name: data.name,
        type: data.type,
        jurisdiction: data.jurisdiction,
        content: {
          preamble: content?.preamble,
          recitals: content?.recitals,
          clauses: content?.clauses || [],
          signatureBlock: content?.signatureBlock,
        },
      };
    }

    // Run review
    if (mode === "quick") {
      const result = await quickReviewTemplate(templateData);
      return NextResponse.json({ mode: "quick", ...result });
    }

    const result = await reviewTemplate(templateData);

    // Store review result in audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      event_type: "template_reviewed" as unknown as string,
      metadata: {
        template_id: templateId,
        quality_score: result.qualityScore,
        verdict: result.verdict,
        model: "gpt-5.4",
      },
    });

    return NextResponse.json({ mode: "full", ...result });
  } catch (error) {
    console.error("Template review error:", error);
    return NextResponse.json(
      { error: "Failed to review template" },
      { status: 500 }
    );
  }
}
