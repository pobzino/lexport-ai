"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, FileText, FileSignature, Receipt, Menu, X } from "lucide-react";

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            href="/login"
                            className="hidden sm:block text-sm text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/register"
                            className="text-sm font-medium bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
                        >
                            Get started
                        </Link>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 -mr-2 rounded-lg hover:bg-slate-100 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-5 h-5 text-slate-600" />
                            ) : (
                                <Menu className="w-5 h-5 text-slate-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile menu panel */}
                <div className={cn(
                    "md:hidden overflow-hidden transition-all duration-300",
                    mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}>
                    <div className="py-4 border-t border-slate-200/50">
                        {/* Solutions section */}
                        <div className="mb-4">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">
                                Solutions
                            </p>
                            <div className="space-y-1">
                                {SOLUTIONS.map((solution) => (
                                    <Link
                                        key={solution.name}
                                        href={solution.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-[#529ec6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <solution.icon className="w-4 h-4 text-[#529ec6]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{solution.name}</p>
                                            <p className="text-xs text-slate-500">{solution.description}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Other links */}
                        <div className="space-y-1 mb-4">
                            <a
                                href="#how-it-works"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                How it works
                            </a>
                            <a
                                href="#pricing"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Pricing
                            </a>
                        </div>

                        {/* Sign in link for mobile */}
                        <div className="pt-4 border-t border-slate-200/50">
                            <Link
                                href="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

