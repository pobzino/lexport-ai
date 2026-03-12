import type { Context } from "@netlify/functions";
import { processContractGenerationJob } from "../../src/lib/contracts/generation-jobs";

export default async (req: Request, _context: Context) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const queryJobId = url.searchParams.get("jobId");
    const body = await req.json().catch(() => null) as { jobId?: string } | null;
    const jobId = queryJobId || body?.jobId;

    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing jobId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await processContractGenerationJob(jobId);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Netlify background contract generation failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Contract generation failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
