import type { Config, Context } from "@netlify/functions";

// Scheduled function (GEN-5): reconcile completed-but-unpolled contract
// generation jobs every 2 minutes, so a user closing the tab mid-generation no
// longer loses the generated contract. Delegates to the idempotent reconcile
// endpoint, which is fail-closed on CRON_SECRET.
export default async (_req: Request, _context: Context) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!appUrl) {
    console.error("APP_URL not configured");
    return new Response("APP_URL not configured", { status: 500 });
  }

  try {
    const response = await fetch(`${appUrl}/api/contracts/generate/reconcile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const result = await response.json().catch(() => ({}));
    console.log("Contract generation reconcile result:", result);

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to reconcile contract generation jobs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reconcile contract generation jobs" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

// Run every 2 minutes.
export const config: Config = {
  schedule: "*/2 * * * *",
};
