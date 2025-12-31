import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch real stats from database
    const [contractsResult, analyzedResult, signaturesResult] = await Promise.all([
      supabase.from("contracts").select("id", { count: "exact", head: true }),
      supabase.from("contract_risk_analysis").select("contract_id", { count: "exact", head: true }),
      supabase.from("signature_requests").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      contracts: contractsResult.count || 0,
      analyzed: analyzedResult.count || 0,
      signatures: signaturesResult.count || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ contracts: 0, analyzed: 0, signatures: 0 });
  }
}
