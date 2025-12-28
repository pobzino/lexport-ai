import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Skip auth check for public routes that don't need it
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/sign/") ||
    request.nextUrl.pathname.startsWith("/pay/") ||
    request.nextUrl.pathname.startsWith("/api/webhooks") ||
    request.nextUrl.pathname.startsWith("/privacy") ||
    request.nextUrl.pathname.startsWith("/portal/login") ||
    request.nextUrl.pathname.startsWith("/portal/verify") ||
    request.nextUrl.pathname === "/";

  if (isPublicRoute) {
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

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - all routes in the (dashboard) group
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/contracts") ||
    request.nextUrl.pathname.startsWith("/signatures") ||
    request.nextUrl.pathname.startsWith("/settings");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(supabaseResponse);
}

