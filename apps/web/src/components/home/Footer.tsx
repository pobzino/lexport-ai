"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-12 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-10 sm:mb-12">
                    {/* Brand */}
                    <div className="col-span-2 sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center mb-4 sm:mb-6">
                            <Image
                                src="/dark-logo.png"
                                alt="Lexport"
                                width={140}
                                height={42}
                                className="h-8 sm:h-10 w-auto opacity-90"
                            />
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mb-4 sm:mb-6 max-w-xs">
                            Revolutionizing legal workflows with AI-powered contract
                            generation and e-signatures.
                        </p>
                        <div className="flex gap-4">
                            {/* Social icons could go here */}
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-4 sm:mb-6 text-sm sm:text-base">Product</h4>
                        <ul className="space-y-2 sm:space-y-3">
                            <li>
                                <a href="#features" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Features
                                </a>
                            </li>
                            <li>
                                <a href="#pricing" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Pricing
                                </a>
                            </li>
                            <li>
                                <Link href="/templates" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Templates
                                </Link>
                            </li>
                            <li>
                                <Link href="/contracts/new" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Create Contract
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-4 sm:mb-6 text-sm sm:text-base">Resources</h4>
                        <ul className="space-y-2 sm:space-y-3">
                            <li>
                                <Link href="/templates" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Legal Templates
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <a href="#faq" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    FAQ
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-4 sm:mb-6 text-sm sm:text-base">Company</h4>
                        <ul className="space-y-2 sm:space-y-3">
                            <li>
                                <Link href="/about" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-slate-500 hover:text-brand-600 text-xs sm:text-sm transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                    <p className="text-slate-400 text-xs text-center sm:text-left">
                        &copy; {currentYear} Lexport AI Inc. All rights reserved.
                    </p>
                    <div className="flex gap-4 sm:gap-6">
                        <Link href="/privacy" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Privacy</Link>
                        <Link href="/terms" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Terms</Link>
                        <Link href="/contact" className="text-slate-400 hover:text-slate-600 text-xs transition-colors">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
