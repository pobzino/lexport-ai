import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch payments for the current user with stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch payments with contract titles
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(
        `
        id,
        contract_id,
        amount,
        currency,
        status,
        payment_type,
        payment_method,
        payer_name,
        payer_email,
        created_at,
        contracts (title)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    // Transform payments to include contract title
    const formattedPayments = (payments || []).map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contracts = p.contracts as any;
      return {
        ...p,
        contract_title: contracts?.title || null,
        contracts: undefined,
      };
    });

    // Calculate stats
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const succeededPayments = formattedPayments.filter(
      (p) => p.status === "succeeded"
    );
    const pendingPayments = formattedPayments.filter(
      (p) => p.status === "pending" || p.status === "processing"
    );

    const totalCollected = succeededPayments.reduce((sum, p) => sum + p.amount, 0);

    const thisMonthPayments = succeededPayments.filter(
      (p) => new Date(p.created_at) >= thisMonthStart
    );
    const thisMonthCollected = thisMonthPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      payments: formattedPayments,
      stats: {
        totalCollected,
        thisMonthCollected,
        pendingPayments: pendingPayments.length,
        pendingAmount,
      },
    });
  } catch (error) {
    console.error("Error in payments API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
