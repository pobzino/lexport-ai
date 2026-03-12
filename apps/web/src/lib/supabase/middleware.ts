import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security";
import { generateCorrelationId, CORRELATION_ID_HEADER } from "@/lib/logging";

export async function updateSession(request: NextRequest) {
  // Generate or use existing correlation ID
  const correlationId = request.headers.get(CORRELATION_ID_HEADER) || generateCorrelationId();

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Add correlation ID to response headers for tracing
  supabaseResponse.headers.set(CORRELATION_ID_HEADER, correlationId);

  // Skip auth check for public routes that don't need it
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/sign/") ||
    request.nextUrl.pathname.startsWith("/pay/") ||
    request.nextUrl.pathname.startsWith("/api/webhooks") ||
    request.nextUrl.pathname.startsWith("/privacy") ||
    request.nextUrl.pathname.startsWith("/portal/login") ||
    request.nextUrl.pathname.startsWith("/portal/verify") ||
    request.nextUrl.pathname.startsWith("/templates") ||
    request.nextUrl.pathname === "/";

  if (isPublicRoute) {
    return applySecurityHeaders(supabaseResponse);
  }

  // Protected routes - check before creating Supabase client
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/contracts") ||
    request.nextUrl.pathname.startsWith("/signatures") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/my-templates") ||
    request.nextUrl.pathname.startsWith("/invoices") ||
    request.nextUrl.pathname.startsWith("/activity") ||
    request.nextUrl.pathname.startsWith("/payments");

  // Skip Supabase client creation for non-protected, non-auth routes
  if (!isProtectedRoute && !isAuthRoute) {
    return applySecurityHeaders(supabaseResponse);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession() first - reads from cookie without network call
  // This is faster for most navigation checks
  const { data: { session } } = await supabase.auth.getSession();

  // For protected routes without session, redirect to login
  if (!session && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
    return applySecurityHeaders(redirectResponse);
  }

  // For auth routes with session, redirect appropriately
  if (session && isAuthRoute) {
    const url = request.nextUrl.clone();
    const returnTo = request.nextUrl.searchParams.get("returnTo");
    const action = request.nextUrl.searchParams.get("action");
    const prompt = request.nextUrl.searchParams.get("prompt");
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      // Redirect to returnTo path (e.g., from template marketplace)
      url.pathname = returnTo;
      url.search = "";
    } else if (action === "create" && prompt) {
      url.pathname = "/contracts/new";
      url.search = `?mode=smart&prompt=${encodeURIComponent(prompt)}`;
    } else {
      url.pathname = "/dashboard";
    }
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
    return applySecurityHeaders(redirectResponse);
  }

  // Only call getUser() to refresh token if session exists and might be stale
  // This avoids unnecessary network calls for most navigations
  if (session) {
    // Check if token is close to expiry (within 5 minutes)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    if (expiresAt && expiresAt - now < fiveMinutes) {
      // Token is close to expiry, refresh it
      await supabase.auth.getUser();
    }
  }

  return applySecurityHeaders(supabaseResponse);
}

