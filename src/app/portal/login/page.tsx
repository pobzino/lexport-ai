"use client";

import { useState } from "react";
import { Mail, Loader2, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function PortalLoginPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/portal/magic-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send magic link");
            }

            setIsSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f2f4f8] px-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h1 className="text-xl font-semibold text-slate-900 mb-2">
                            Check your email
                        </h1>
                        <p className="text-slate-600 mb-6">
                            We sent a login link to <span className="font-medium text-slate-900">{email}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                            Click the link in the email to access your contracts. The link expires in 24 hours.
                        </p>
                        <button
                            onClick={() => {
                                setIsSent(false);
                                setEmail("");
                            }}
                            className="mt-6 text-[#202e46] hover:text-[#1a2539] text-sm font-medium"
                        >
                            Use a different email
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f2f4f8] px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center mb-8">
                    <Image
                        src="/dark-logo.png"
                        alt="Lexport"
                        width={160}
                        height={48}
                        className="h-10 w-auto"
                    />
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                    <h1 className="text-xl font-semibold text-slate-900 text-center mb-1">
                        Client Portal
                    </h1>
                    <p className="text-slate-500 text-center mb-6">
                        Enter your email to access your contracts
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#202e46]/20 focus:border-[#202e46]"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !email}
                            className="w-full py-2.5 px-4 bg-[#202e46] hover:bg-[#1a2539] disabled:bg-[#202e46]/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5" />
                                    Send me a login link
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                        <p className="text-sm text-slate-500">
                            Looking for the main app?{" "}
                            <Link href="/login" className="text-[#202e46] hover:text-[#1a2539] font-medium">
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Back link */}
                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
