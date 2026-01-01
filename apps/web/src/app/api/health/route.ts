import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Health Check Endpoint
 *
 * Returns the health status of the application and its dependencies.
 * Used for uptime monitoring, load balancer health checks, and debugging.
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: "healthy" | "unhealthy" | "degraded"; latency?: number; error?: string }> = {};

  // Check Supabase connectivity
  try {
    const dbStart = Date.now();
    const supabase = await createClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    const dbLatency = Date.now() - dbStart;

    if (error) {
      checks.database = { status: "unhealthy", latency: dbLatency, error: error.message };
    } else {
      checks.database = { status: "healthy", latency: dbLatency };
    }
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Database connection failed"
    };
  }

  // Check required environment variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "OPENAI_API_KEY",
  ];

  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

  if (missingEnvVars.length > 0) {
    checks.environment = {
      status: "unhealthy",
      error: `Missing: ${missingEnvVars.join(", ")}`
    };
  } else {
    checks.environment = { status: "healthy" };
  }

  // Check Stripe configuration (optional but important for payments)
  if (process.env.STRIPE_SECRET_KEY) {
    checks.stripe = { status: "healthy" };
  } else {
    checks.stripe = { status: "degraded", error: "Stripe not configured" };
  }

  // Determine overall health
  const hasUnhealthy = Object.values(checks).some(c => c.status === "unhealthy");
  const hasDegraded = Object.values(checks).some(c => c.status === "degraded");

  const overallStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";
  const totalLatency = Date.now() - startTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    latency: totalLatency,
    checks,
  };

  // Return appropriate status code
  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(response, { status: statusCode });
}
