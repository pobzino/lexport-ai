"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  // Single browser client instance for the component lifetime. Same
  // `createClient()` browser client used in login-form.tsx.
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // The recovery link points at /auth/callback, which exchanges the PKCE code
  // for a session (cookies) and forwards here. Verify that session via the
  // browser client so a direct visit without a recovery session fails clearly
  // instead of silently calling updateUser.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) setHasSession(true);
      setCheckingSession(false);
    });

    // Supabase emits PASSWORD_RECOVERY/SIGNED_IN once the recovery session is
    // ready; pick it up in case it settles just after the initial check.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // The recovery session is now a full session, so send the user
        // straight into the app.
        setTimeout(() => {
          window.location.assign("/dashboard");
        }, 2000);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Verifying the recovery session established by the callback code exchange.
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // No recovery session: a direct visit, or an expired/already-used link.
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Link href="/">
              <Image
                src="/dark-logo.png"
                alt="Lexport"
                width={160}
                height={48}
                className="h-11 w-auto"
              />
            </Link>
          </div>

          {/* Error Card */}
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-brand-950 mb-2">
              Reset link invalid or expired
            </h2>
            <p className="text-gray-500 mb-6">
              Open this page from your password reset email, or request a new
              reset link to continue.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:ring-offset-2 font-medium transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Link href="/">
              <Image
                src="/dark-logo.png"
                alt="Lexport"
                width={160}
                height={48}
                className="h-11 w-auto"
              />
            </Link>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-brand-950 mb-2">Password Updated!</h2>
            <p className="text-gray-500">Redirecting to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link href="/">
            <Image
              src="/dark-logo.png"
              alt="Lexport"
              width={160}
              height={48}
              className="h-11 w-auto"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-brand-950 text-center mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Enter your new password below
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] focus:outline-none focus:ring-2 focus:ring-[#529ec6] focus:ring-offset-2 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Remember your password?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
