import { NextRequest, NextResponse } from "next/server";
import { getResendClient } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSubject } from "@/lib/email-threading";

interface ReceivedEmailEventData {
  email_id: string;
  created_at: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  message_id: string;
  attachments: Array<{
    id: string;
    filename: string;
    content_type: string;
    content_disposition: string;
    content_id: string;
  }>;
}

interface WebhookEvent {
  type: string;
  created_at: string;
  data: ReceivedEmailEventData;
}

// Recognized receiving addresses — route emails sent to these
const RECEIVING_ADDRESSES = [
  "hello@lexportai.com",
];

// Map receiving addresses to inbox owner account email
const INBOX_OWNER_EMAIL = "akpobor2000@gmail.com";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  try {
    // Read raw body — must not parse JSON first, breaks signature verification
    const payload = await request.text();

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing webhook verification headers" },
        { status: 400 }
      );
    }

    // Verify webhook signature using Resend SDK
    const resend = getResendClient();
    let event: WebhookEvent;

    try {
      event = resend.webhooks.verify({
        payload,
        headers: {
          id: svixId,
          timestamp: svixTimestamp,
          signature: svixSignature,
        },
        webhookSecret,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Resend webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    switch (event.type) {
      case "email.received": {
        const data = event.data;

        // Normalize `to` addresses for comparison
        const toAddresses = (data.to || []).map((addr: string) => {
          // Extract email from "Name <email>" format
          const match = addr.match(/<(.+?)>/);
          return (match ? match[1] : addr).toLowerCase().trim();
        });

        // Check if this email was sent to a recognized receiving address
        const matchedAddress = toAddresses.find((addr: string) =>
          RECEIVING_ADDRESSES.includes(addr)
        );

        if (!matchedAddress) {
          // Email to an unrecognized address — log and acknowledge
          console.log(
            `Received email to unrecognized address: ${toAddresses.join(", ")} (from: ${data.from})`
          );
          return NextResponse.json({ received: true });
        }

        // Route to inbox owner — all hello@lexportai.com emails go to the site owner
        let userId: string | null = null;

        const { data: owner } = await supabase
          .from("users")
          .select("id")
          .eq("email", INBOX_OWNER_EMAIL)
          .limit(1)
          .single();

        if (owner) {
          userId = owner.id;
        } else {
          console.error(`Inbox owner not found: ${INBOX_OWNER_EMAIL}`);
        }

        // Store the received email
        const { data: receivedEmail, error: insertError } = await supabase
          .from("received_emails")
          .insert({
            resend_email_id: data.email_id,
            user_id: userId,
            from_address: data.from,
            to_addresses: data.to,
            cc: data.cc || [],
            bcc: data.bcc || [],
            subject: data.subject || "(no subject)",
            message_id: data.message_id,
            thread_id: normalizeSubject(data.subject || ""),
            has_attachments: data.attachments && data.attachments.length > 0,
            attachment_count: data.attachments?.length || 0,
            status: "received",
          })
          .select("id")
          .single();

        if (insertError) {
          // Duplicate email (unique constraint on resend_email_id)
          if (insertError.code === "23505") {
            console.log(`Duplicate email received: ${data.email_id}`);
            return NextResponse.json({ received: true });
          }
          console.error("Error storing received email:", insertError);
          return NextResponse.json(
            { error: "Failed to store email" },
            { status: 500 }
          );
        }

        console.log(
          `Received email ${data.email_id} at ${matchedAddress} from ${data.from} (subject: ${data.subject})`
        );

        // Create in-app notification for the associated user
        if (userId && receivedEmail) {
          const senderDisplay = data.from.includes("<")
            ? data.from.split("<")[0].trim()
            : data.from;

          await supabase.from("notifications").insert({
            user_id: userId,
            type: "email_received",
            title: "New email received",
            message: `From ${senderDisplay}: ${data.subject || "(no subject)"}`,
            data: {
              received_email_id: receivedEmail.id,
              resend_email_id: data.email_id,
              from: data.from,
              to: matchedAddress,
              attachment_count: data.attachments?.length || 0,
            },
          });
        }

        break;
      }

      case "email.bounced": {
        console.log(
          `Email bounced: ${JSON.stringify(event.data)}`
        );
        break;
      }

      case "email.complained": {
        console.log(
          `Email complaint: ${JSON.stringify(event.data)}`
        );
        break;
      }

      case "email.delivered": {
        // Successful delivery — can be used for delivery tracking
        break;
      }

      default:
        console.log(`Unhandled Resend event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Resend webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
