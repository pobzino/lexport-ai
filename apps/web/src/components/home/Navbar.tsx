"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={cn(
                "sticky top-0 z-50 transition-all duration-200",
                scrolled
                    ? "bg-white/90 backdrop-blur-md border-b border-slate-200/50"
                    : "bg-transparent"
            )}
        >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/dark-logo.png"
                                alt="Lexport"
                                width={120}
                                height={36}
                                className="h-8 w-auto"
                                priority
                            />
                        </Link>

                        <div className="hidden md:flex items-center gap-6">
                            {[
                                { name: "Features", href: "#features" },
                                { name: "How it works", href: "#how-it-works" },
                                { name: "Pricing", href: "#pricing" },
                            ].map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    {item.name}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/register"
                            className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
