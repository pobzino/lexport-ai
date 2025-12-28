"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Loader2, AlertCircle, Check } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setError("Invalid or missing token");
            return;
        }

        async function verifyToken() {
            try {
                const response = await fetch("/api/portal/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Verification failed");
                }

                setStatus("success");

                // Redirect to portal after a brief success message
                setTimeout(() => {
                    router.push("/portal");
                }, 1500);
            } catch (err) {
                setStatus("error");
                setError(err instanceof Error ? err.message : "Verification failed");
            }
        }

        verifyToken();
    }, [token, router]);

    return (
        <>
            {status === "loading" && (
                <>
                    <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        Verifying your link...
                    </h1>
                    <p className="text-slate-300">
                        Please wait while we verify your login link
                    </p>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        Verified!
                    </h1>
                    <p className="text-slate-300">
                        Redirecting you to your contracts...
                    </p>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        Link Invalid
                    </h1>
                    <p className="text-slate-300 mb-6">
                        {error || "This link is invalid or has expired"}
                    </p>
                    <Link
                        href="/portal/login"
                        className="inline-flex items-center justify-center px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
                    >
                        Request a new link
                    </Link>
                </>
            )}
        </>
    );
}

function LoadingFallback() {
    return (
        <>
            <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
                Loading...
            </h1>
            <p className="text-slate-300">
                Please wait...
            </p>
        </>
    );
}

export default function PortalVerifyPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center">
                        <FileText className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-white">Lexport</span>
                </div>

                {/* Status Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
                    <Suspense fallback={<LoadingFallback />}>
                        <VerifyContent />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
