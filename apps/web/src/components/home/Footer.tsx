"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center mb-6">
                            <Image
                                src="/dark-logo.png"
                                alt="Lexport"
                                width={140}
                                height={42}
                                className="h-10 w-auto opacity-90"
                            />
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Revolutionizing legal workflows with AI-powered contract
                            generation and e-signatures.
                        </p>
                        <div className="flex gap-4">
                            {/* Social icons could go here */}
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-6">Product</h4>
                        <ul className="space-y-3">
                            {["Features", "Pricing", "Templates", "Integrations"].map(
                                (item) => (
                                    <li key={item}>
                                        <a
                                            href="#"
                                            className="text-slate-500 hover:text-brand-600 text-sm transition-colors"
                                        >
                                            {item}
                                        </a>
                                    </li>
                                )
                            )}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-6">Resources</h4>
                        <ul className="space-y-3">
                            {[
                                "Documentation",
                                "Legal Templates",
                                "Help Center",
                                "Blog",
                            ].map((item) => (
                                <li key={item}>
                                    <a
                                        href="#"
                                        className="text-slate-500 hover:text-brand-600 text-sm transition-colors"
                                    >
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-6">Company</h4>
                        <ul className="space-y-3">
                            <li>
                                <a href="#" className="text-slate-500 hover:text-brand-600 text-sm transition-colors">
                                    About
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-slate-500 hover:text-brand-600 text-sm transition-colors">
                                    Careers
                                </a>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-slate-500 hover:text-brand-600 text-sm transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <a href="#" className="text-slate-500 hover:text-brand-600 text-sm transition-colors">
                                    Terms of Service
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-slate-400 text-xs">
                        &copy; {currentYear} Lexport AI Inc. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Twitter</a>
                        <a href="#" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">LinkedIn</a>
                        <a href="#" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">GitHub</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
