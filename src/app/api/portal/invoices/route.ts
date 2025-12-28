import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";

export async function GET(request: NextRequest) {
  try {
    // Get portal session (client email from magic link)
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Get contracts where this email is a signer
    const { data: signatureRequests, error: sigError } = await supabase
      .from("signature_requests")
      .select("contract_id")
      .eq("signer_email", session.email);

    if (sigError) {
      console.error("Error fetching signature requests:", sigError);
      return NextResponse.json(
        { error: "Failed to fetch data" },
        { status: 500 }
      );
    }

    if (!signatureRequests || signatureRequests.length === 0) {
      return NextResponse.json({ invoices: [], payments: [] });
    }

    const contractIds = signatureRequests.map((sr) => sr.contract_id);

    // Fetch invoices for these contracts where recipient email matches
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .in("contract_id", contractIds)
      .eq("recipient_email", session.email)
      .order("created_at", { ascending: false });

    if (invError) {
      console.error("Error fetching invoices:", invError);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    // Fetch payments for these contracts where payer email matches
    const { data: payments, error: payError } = await supabase
      .from("payments")
      .select("*")
      .in("contract_id", contractIds)
      .eq("payer_email", session.email)
      .order("created_at", { ascending: false });

    if (payError) {
      console.error("Error fetching payments:", payError);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    // Get contract titles for context
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, title")
      .in("id", contractIds);

    const contractMap = new Map(
      (contracts || []).map((c) => [c.id, c.title])
    );

    // Add contract title to invoices and payments
    const invoicesWithTitles = (invoices || []).map((inv) => ({
      ...inv,
      contract_title: contractMap.get(inv.contract_id) || "Contract",
    }));

    const paymentsWithTitles = (payments || []).map((pay) => ({
      ...pay,
      contract_title: contractMap.get(pay.contract_id) || "Contract",
    }));

    return NextResponse.json({
      invoices: invoicesWithTitles,
      payments: paymentsWithTitles,
    });
  } catch (error) {
    console.error("Error in portal invoices API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
