import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Sign up for Lexport — create AI-powered contracts, send e-signatures, and collect payments. Free plan available.",
};

import Link from "next/link";
import Image from "next/image";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
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
            Create your account
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Start creating contracts in minutes
          </p>

          <RegisterForm />

          <div className="mt-6">
            <div className="bg-brand-50 rounded-lg p-4">
              <h3 className="font-medium text-brand-950 mb-2">
                Free plan includes:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>3 contracts per month</li>
                <li>5 e-signatures per month</li>
                <li>All contract templates</li>
                <li>AI contract generation</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          By signing up, you agree to our{" "}
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
