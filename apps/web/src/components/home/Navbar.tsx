"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, FileSignature, Receipt } from "lucide-react";

const SOLUTIONS = [
    {
        name: "AI Contracts",
        href: "/solutions/contracts",
        description: "Generate contracts in seconds",
        icon: FileText
    },
    {
        name: "E-Signatures",
        href: "/solutions/signatures",
        description: "Legally-binding digital signatures",
        icon: FileSignature
    },
    {
        name: "Invoicing & Payments",
        href: "/solutions/invoicing",
        description: "Get paid when they sign",
        icon: Receipt
    },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [solutionsOpen, setSolutionsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setSolutionsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setSolutionsOpen(false);
        }, 150);
    };

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
                            {/* Solutions Dropdown */}
                            <div
                                className="relative"
                                ref={dropdownRef}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                            >
                                <button
                                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    Solutions
                                    <ChevronDown className={cn(
                                        "w-4 h-4 transition-transform",
                                        solutionsOpen && "rotate-180"
                                    )} />
                                </button>

                                {/* Dropdown Menu */}
                                <div className={cn(
                                    "absolute top-full left-0 pt-2 transition-all duration-200",
                                    solutionsOpen
                                        ? "opacity-100 translate-y-0 pointer-events-auto"
                                        : "opacity-0 -translate-y-2 pointer-events-none"
                                )}>
                                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[280px]">
                                        {SOLUTIONS.map((solution) => (
                                            <Link
                                                key={solution.name}
                                                href={solution.href}
                                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                                            >
                                                <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#529ec6]/20 transition-colors">
                                                    <solution.icon className="w-5 h-5 text-[#529ec6]" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">{solution.name}</p>
                                                    <p className="text-xs text-slate-500">{solution.description}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {[
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

