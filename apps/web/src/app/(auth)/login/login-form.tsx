"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/forms";
import { FormError, FormSuccess } from "@/components/forms";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { required, email, minLength, all } from "@/lib/validation";

type LoginMode = "default" | "magic-link" | "forgot-password";

// Google OAuth is currently disabled in Supabase - set to true when enabled
const GOOGLE_OAUTH_ENABLED = false;

// Validators
const emailValidator = all(required("Email is required"), email());
const passwordValidator = required("Password is required");

export function LoginForm() {
  const router = useRouter();
  const [emailValue, setEmailValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>("default");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Field validation states
  const [emailValid, setEmailValid] = useState(true);
  const [passwordValid, setPasswordValid] = useState(true);
  const [formTouched, setFormTouched] = useState(false);

  const validateForm = useCallback(() => {
    const emailResult = emailValidator(emailValue);
    const passwordResult = passwordValidator(password);
    return emailResult.valid && passwordResult.valid;
  }, [emailValue, password]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);

    // Validate all fields
    const emailResult = emailValidator(emailValue);
    const passwordResult = passwordValidator(password);

    setEmailValid(emailResult.valid);
    setPasswordValid(passwordResult.valid);

    if (!emailResult.valid || !passwordResult.valid) {
      setError(emailResult.error || passwordResult.error || "Please fix the errors above");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);

    const emailResult = emailValidator(emailValue);
    setEmailValid(emailResult.valid);

    if (!emailResult.valid) {
      setError(emailResult.error || "Please enter a valid email");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: emailValue,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Check your email for a magic link to sign in.");
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);

    const emailResult = emailValidator(emailValue);
    setEmailValid(emailResult.valid);

    if (!emailResult.valid) {
      setError(emailResult.error || "Please enter a valid email");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Check your email for a password reset link.");
    setLoading(false);
  };

  const resetForm = () => {
    setMode("default");
    setError(null);
    setSuccess(null);
    setResendCountdown(0);
    setFormTouched(false);
    setEmailValid(true);
    setPasswordValid(true);
  };

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleResendMagicLink = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: emailValue,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("New magic link sent! Check your email.");
    setResendCountdown(60);
    setLoading(false);
  };

  const handleResendPasswordReset = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("New reset link sent! Check your email.");
    setResendCountdown(60);
    setLoading(false);
  };

  // Clear error when user starts typing
  const handleEmailChange = (value: string) => {
    setEmailValue(value);
    if (error) setError(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError(null);
  };

  // Magic Link Mode
  if (mode === "magic-link") {
    return (
      <div className="space-y-6">
        <button
          onClick={resetForm}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to login
        </button>

        <div className="text-center">
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Sign in with Magic Link</h2>
          <p className="text-sm text-gray-500 mt-1">
            We&apos;ll send you an email with a link to sign in instantly.
          </p>
        </div>

        <form onSubmit={handleMagicLink} className="space-y-4">
          <ValidatedInput
            type="email"
            placeholder="Email address"
            value={emailValue}
            onChange={handleEmailChange}
            validators={[emailValidator]}
            disabled={loading}
            required
            forceShowError={formTouched && !emailValid}
            autoComplete="email"
          />

          <FormError message={error} />
          {success && (
            <div className="text-center space-y-2">
              <FormSuccess message={success} />
              <p className="text-xs text-gray-500">
                Don&apos;t see it? Check your spam folder.
              </p>
            </div>
          )}

          {!success ? (
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Magic Link"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendMagicLink}
              disabled={loading || resendCountdown > 0}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Magic Link"}
            </Button>
          )}
        </form>
      </div>
    );
  }

  // Forgot Password Mode
  if (mode === "forgot-password") {
    return (
      <div className="space-y-6">
        <button
          onClick={resetForm}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to login
        </button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Reset your password</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <ValidatedInput
            type="email"
            placeholder="Email address"
            value={emailValue}
            onChange={handleEmailChange}
            validators={[emailValidator]}
            disabled={loading}
            required
            forceShowError={formTouched && !emailValid}
            autoComplete="email"
          />

          <FormError message={error} />
          {success && (
            <div className="text-center space-y-2">
              <FormSuccess message={success} />
              <p className="text-xs text-gray-500">
                Don&apos;t see it? Check your spam folder.
              </p>
            </div>
          )}

          {!success ? (
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendPasswordReset}
              disabled={loading || resendCountdown > 0}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Reset Link"}
            </Button>
          )}
        </form>
      </div>
    );
  }

  // Default Login Mode
  return (
    <div className="space-y-6">
      {/* Google OAuth - only show if enabled */}
      {GOOGLE_OAUTH_ENABLED && (
        <Button
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full h-12 text-base"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      )}

      {/* Magic Link Option */}
      <Button
        onClick={() => setMode("magic-link")}
        variant="outline"
        className="w-full h-12 text-base"
        disabled={loading}
      >
        <Mail className="w-5 h-5 mr-3" />
        Sign in with Magic Link
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <ValidatedInput
          type="email"
          placeholder="Email address"
          value={emailValue}
          onChange={handleEmailChange}
          validators={[emailValidator]}
          disabled={loading}
          required
          forceShowError={formTouched && !emailValid}
          autoComplete="email"
        />

        <ValidatedInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
          validators={[passwordValidator]}
          disabled={loading}
          required
          forceShowError={formTouched && !passwordValid}
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMode("forgot-password")}
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            Forgot password?
          </button>
        </div>

        <FormError message={error} />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
