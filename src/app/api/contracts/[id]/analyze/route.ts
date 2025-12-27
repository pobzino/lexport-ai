import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeContractRisks, generateContentHash } from "@/lib/contracts/risk-analyzer";
import { z } from "zod";
import type {
  RiskAnalysisResult,
  ContractRiskAnalysisRecord,
} from "@/types/risk-analysis";

// Request schema
const AnalyzeRequestSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContractContent = any; // Database content is loosely typed

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json().catch(() => ({}));
    const parseResult = AnalyzeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { forceRefresh } = parseResult.data;

    // Fetch contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const content = contract.content as ContractContent;

    // Generate content hash for cache lookup
    const contentHash = generateContentHash(content);

    // Check cache unless forceRefresh
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("contract_risk_analysis")
        .select("*")
        .eq("contract_id", id)
        .eq("content_hash", contentHash)
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        const cachedRecord = cached as ContractRiskAnalysisRecord;
        const analysis: RiskAnalysisResult = {
          id: cachedRecord.id,
          contractId: cachedRecord.contract_id,
          contentHash: cachedRecord.content_hash,
          overallRiskLevel: cachedRecord.overall_risk_level,
          overallSummary: cachedRecord.overall_summary,
          clauseRisks: cachedRecord.clause_risks,
          missingProtections: cachedRecord.missing_protections,
          jurisdictionAlerts: cachedRecord.jurisdiction_alerts,
          analyzedAt: cachedRecord.analyzed_at,
          stats: {
            total:
              cachedRecord.clause_risks.length +
              cachedRecord.missing_protections.length +
              cachedRecord.jurisdiction_alerts.length,
            critical: [
              ...cachedRecord.clause_risks,
              ...cachedRecord.missing_protections,
              ...cachedRecord.jurisdiction_alerts,
            ].filter((i) => i.severity === "critical").length,
            warning: [
              ...cachedRecord.clause_risks,
              ...cachedRecord.missing_protections,
              ...cachedRecord.jurisdiction_alerts,
            ].filter((i) => i.severity === "warning").length,
            info: [
              ...cachedRecord.clause_risks,
              ...cachedRecord.missing_protections,
              ...cachedRecord.jurisdiction_alerts,
            ].filter((i) => i.severity === "info").length,
          },
        };

        return NextResponse.json({
          analysis,
          fromCache: true,
        });
      }
    }

    // Perform AI analysis
    const analysisResult = await analyzeContractRisks({
      id: contract.id,
      title: contract.title,
      type: contract.type,
      jurisdiction: contract.jurisdiction,
      content,
    });

    // Store in database (upsert based on contract_id + content_hash)
    const { data: stored, error: storeError } = await supabase
      .from("contract_risk_analysis")
      .upsert(
        {
          contract_id: id,
          content_hash: contentHash,
          jurisdiction: contract.jurisdiction,
          contract_type: contract.type,
          overall_risk_level: analysisResult.overallRiskLevel,
          overall_summary: analysisResult.overallSummary,
          clause_risks: analysisResult.clauseRisks,
          missing_protections: analysisResult.missingProtections,
          jurisdiction_alerts: analysisResult.jurisdictionAlerts,
          analyzed_at: new Date().toISOString(),
        },
        {
          onConflict: "contract_id,content_hash",
        }
      )
      .select()
      .single();

    if (storeError) {
      console.error("Failed to store risk analysis:", storeError);
      // Continue anyway - analysis was successful
    }

    const analysis: RiskAnalysisResult = {
      id: stored?.id || crypto.randomUUID(),
      contractId: id,
      contentHash,
      overallRiskLevel: analysisResult.overallRiskLevel,
      overallSummary: analysisResult.overallSummary,
      clauseRisks: analysisResult.clauseRisks,
      missingProtections: analysisResult.missingProtections,
      jurisdictionAlerts: analysisResult.jurisdictionAlerts,
      analyzedAt: stored?.analyzed_at || new Date().toISOString(),
      stats: analysisResult.stats,
    };

    return NextResponse.json({
      analysis,
      fromCache: false,
    });
  } catch (error) {
    console.error("Risk analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze contract" },
      { status: 500 }
    );
  }
}
