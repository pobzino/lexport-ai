import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Only run middleware on routes that actually need auth gating (the protected
  // app + the login/register pages). Public/marketing routes (/, /for/*,
  // /templates/*, /pricing, /solutions/*, /sign/*, etc.) are intentionally NOT
  // matched: any route matched by middleware must invoke the edge function on
  // every request and can't be served as a pure static CDN hit, which made
  // navigation to those pages slow. Security headers are applied globally via
  // next.config.ts headers(), so they're unaffected by this narrowing.
  matcher: [
    "/dashboard/:path*",
    "/contracts/:path*",
    "/signatures/:path*",
    "/settings/:path*",
    "/my-templates/:path*",
    "/invoices/:path*",
    "/activity/:path*",
    "/payments/:path*",
    "/login",
    "/register",
  ],
};
