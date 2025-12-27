import type { Config, Context } from "@netlify/functions";

// Scheduled function that runs every hour to process reminders
export default async (req: Request, context: Context) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!appUrl) {
    console.error("APP_URL not configured");
    return new Response("APP_URL not configured", { status: 500 });
  }

  try {
    const response = await fetch(`${appUrl}/api/reminders/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
    });

    const result = await response.json();
    console.log("Reminder processing result:", result);

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to process reminders:", error);
    return new Response(JSON.stringify({ error: "Failed to process reminders" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Run every hour
export const config: Config = {
  schedule: "0 * * * *", // Every hour at minute 0
};
