import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getPortalSession();

    if (!session) {
        redirect("/portal/login");
    }

    return (
        <div className="min-h-screen bg-[#f2f4f8]">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/portal" className="flex items-center gap-3">
                            <Image
                                src="/dark-logo.png"
                                alt="Lexport"
                                width={160}
                                height={48}
                                className="h-11 w-auto"
                            />
                            <span className="hidden sm:inline text-sm text-slate-400 border-l border-slate-200 pl-3">Client Portal</span>
                        </Link>

                        {/* Right side */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            <Link
                                href="/"
                                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                href="/register"
                                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Create Account
                            </Link>
                            <span className="text-slate-200">|</span>
                            <span className="text-sm text-slate-600 hidden sm:block">
                                {session.email}
                            </span>
                            <form action="/api/portal/logout" method="POST">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Sign out</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
