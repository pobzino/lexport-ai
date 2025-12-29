import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Recipient {
  name: string;
  email: string;
  company?: string;
}

// POST /api/contracts/bulk-send - Send a contract to multiple recipients
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contractId, recipients, emailSubject, emailMessage } = body as {
      contractId: string;
      recipients: Recipient[];
      emailSubject?: string;
      emailMessage?: string;
    };

    if (!contractId || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: "Contract ID and at least one recipient are required" },
        { status: 400 }
      );
    }

    // Verify the contract exists and belongs to the user
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Create a bulk send batch
    const { data: batch, error: batchError } = await supabase
      .from("bulk_send_batches")
      .insert({
        user_id: user.id,
        source_contract_id: contractId,
        total_recipients: recipients.length,
        email_subject: emailSubject || `Signature Request: ${contract.title}`,
        email_message: emailMessage || null,
        status: "processing",
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error("Error creating batch:", batchError);
      return NextResponse.json({ error: "Failed to create bulk send batch" }, { status: 500 });
    }

    // Process each recipient
    let sentCount = 0;
    let failedCount = 0;
    const results: { email: string; success: boolean; contractId?: string; error?: string }[] = [];

    for (const recipient of recipients) {
      try {
        // Create a copy of the contract for this recipient
        const contractCopy = {
          user_id: user.id,
          title: `${contract.title} - ${recipient.name}`,
          type: contract.type,
          status: "pending_signature",
          content: {
            ...contract.content,
            // Update the receiving party details
            receivingParty: {
              name: recipient.name,
              email: recipient.email,
              company: recipient.company || null,
            },
          },
          metadata: {
            ...contract.metadata,
            bulkSendBatchId: batch.id,
            originalContractId: contractId,
          },
          jurisdiction: contract.jurisdiction,
        };

        const { data: newContract, error: copyError } = await supabase
          .from("contracts")
          .insert(contractCopy)
          .select()
          .single();

        if (copyError || !newContract) {
          throw new Error("Failed to create contract copy");
        }

        // Create signature request
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiration

        const { error: sigError } = await supabase
          .from("signature_requests")
          .insert({
            contract_id: newContract.id,
            signer_name: recipient.name,
            signer_email: recipient.email,
            status: "pending",
            expires_at: expiresAt.toISOString(),
          });

        if (sigError) {
          throw new Error("Failed to create signature request");
        }

        // Record recipient in bulk send batch
        await supabase
          .from("bulk_send_recipients")
          .insert({
            batch_id: batch.id,
            contract_id: newContract.id,
            recipient_name: recipient.name,
            recipient_email: recipient.email,
            recipient_company: recipient.company || null,
            status: "sent",
          });

        // Update or create contact
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id, usage_count")
          .eq("user_id", user.id)
          .eq("email", recipient.email.toLowerCase())
          .single();

        if (existingContact) {
          await supabase
            .from("contacts")
            .update({
              usage_count: existingContact.usage_count + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq("id", existingContact.id);
        } else {
          await supabase
            .from("contacts")
            .insert({
              user_id: user.id,
              name: recipient.name,
              email: recipient.email.toLowerCase(),
              company: recipient.company || null,
              usage_count: 1,
              last_used_at: new Date().toISOString(),
            });
        }

        // TODO: Send actual email notification here
        // For now, we just create the records

        sentCount++;
        results.push({
          email: recipient.email,
          success: true,
          contractId: newContract.id,
        });
      } catch (error) {
        console.error(`Error processing recipient ${recipient.email}:`, error);
        failedCount++;

        // Record failed recipient
        await supabase
          .from("bulk_send_recipients")
          .insert({
            batch_id: batch.id,
            recipient_name: recipient.name,
            recipient_email: recipient.email,
            recipient_company: recipient.company || null,
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          });

        results.push({
          email: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update batch status
    await supabase
      .from("bulk_send_batches")
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
        status: failedCount === recipients.length ? "failed" : "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batch.id);

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      sent: sentCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error("Error in POST /api/contracts/bulk-send:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/contracts/bulk-send - Get bulk send batches
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");

    const { data: batches, error } = await supabase
      .from("bulk_send_batches")
      .select(`
        *,
        source_contract:contracts!bulk_send_batches_source_contract_id_fkey(id, title, type)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching batches:", error);
      return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
    }

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("Error in GET /api/contracts/bulk-send:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
