import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Send welcome email on first login (best effort, never blocks auth flow)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from("users")
            .select("welcome_email_sent")
            .eq("id", user.id)
            .single();

          if (userData && !userData.welcome_email_sent) {
            const name =
              user.user_metadata?.name ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "there";

            await sendWelcomeEmail({ to: user.email!, userName: name });

            // Mark welcome email as sent (best effort — column may not exist)
            await supabase
              .from("users")
              .update({ welcome_email_sent: true } as Record<string, unknown>)
              .eq("id", user.id);
          }
        }
      } catch (e) {
        console.error("Welcome email (non-blocking):", e);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
