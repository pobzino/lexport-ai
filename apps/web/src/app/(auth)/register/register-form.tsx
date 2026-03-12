"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ValidatedInput, FormError } from "@/components/forms";
import { RefreshCw } from "lucide-react";
import { required, email as emailValidator, minLength, all } from "@/lib/validation";
import { getAuthCallbackUrl } from "@/lib/auth-urls";

// Google OAuth is enabled in Supabase
const GOOGLE_OAUTH_ENABLED = true;

// Validators
const nameValidator = all(required("Name is required"), minLength(2, "Name must be at least 2 characters"));
const registerEmailValidator = all(required("Email is required"), emailValidator());
const passwordValidatorFn = all(required("Password is required"), minLength(6, "Password must be at least 6 characters"));

interface RegisterFormProps {
  action?: string;
  prompt?: string;
  returnTo?: string;
}

export function RegisterForm({ action, prompt, returnTo }: RegisterFormProps) {
  // Compute where to redirect after auth based on context
  // returnTo takes precedence for template marketplace flow
  const nextPath =
    returnTo && returnTo.startsWith("/")
      ? returnTo
      : action === "create" && prompt
        ? `/contracts/new?mode=smart&prompt=${encodeURIComponent(prompt)}`
        : undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Field validation states
  const [nameValid, setNameValid] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [passwordValid, setPasswordValid] = useState(true);
  const [formTouched, setFormTouched] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Clear error when user starts typing
  const handleNameChange = (value: string) => {
    setName(value);
    if (error) setError(null);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) setError(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError(null);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);

    // Validate all fields
    const nameResult = nameValidator(name);
    const emailResult = registerEmailValidator(email);
    const passwordResult = passwordValidatorFn(password);

    setNameValid(nameResult.valid);
    setEmailValid(emailResult.valid);
    setPasswordValid(passwordResult.valid);

    if (!nameResult.valid || !emailResult.valid || !passwordResult.valid) {
      setError(nameResult.error || emailResult.error || passwordResult.error || "Please fix the errors above");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: getAuthCallbackUrl(nextPath),
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthCallbackUrl(nextPath),
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setResendCountdown(60);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="font-medium text-gray-900 mb-2">Check your email</h3>
        <p className="text-sm text-gray-500">
          We sent a confirmation link to <strong>{email}</strong>
        </p>
        <p className="text-xs text-gray-400">
          Don&apos;t see it? Check your spam folder.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={handleResendConfirmation}
          disabled={loading || resendCountdown > 0}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend confirmation email"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google OAuth - only show if enabled */}
      {GOOGLE_OAUTH_ENABLED && (
        <>
          <Button
            onClick={handleGoogleSignup}
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>
        </>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <ValidatedInput
          type="text"
          placeholder="Full name"
          value={name}
          onChange={handleNameChange}
          validators={[nameValidator]}
          disabled={loading}
          forceShowError={formTouched && !nameValid}
        />
        <ValidatedInput
          type="email"
          placeholder="Email address"
          value={email}
          onChange={handleEmailChange}
          validators={[registerEmailValidator]}
          disabled={loading}
          forceShowError={formTouched && !emailValid}
        />
        <ValidatedInput
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={handlePasswordChange}
          validators={[passwordValidatorFn]}
          disabled={loading}
          forceShowError={formTouched && !passwordValid}
        />

        {error && <FormError message={error} />}

        {/* Terms and Privacy - shown before signup */}
        <p className="text-xs text-gray-500 text-center">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-brand-600 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand-600 hover:underline">
            Privacy Policy
          </Link>
        </p>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </div>
  );
}
