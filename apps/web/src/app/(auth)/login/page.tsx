import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Lexport account to manage contracts, e-signatures, and payments.",
};

import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const oauthError = (typeof params.error_description === "string" ? params.error_description : undefined)
    || (typeof params.error === "string" ? params.error : undefined);
  const action = typeof params.action === "string" ? params.action : undefined;
  const prompt = typeof params.prompt === "string" ? params.prompt : undefined;

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
            Welcome back
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Sign in to your account to continue
          </p>

          <LoginForm initialError={oauthError} action={action} prompt={prompt} />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-brand-600 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
