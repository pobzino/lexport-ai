"use client";

import { NotificationCenter } from "@/components/notification-center";
import { Search, Command } from "lucide-react";
import { useState, useEffect } from "react";

interface DashboardHeaderProps {
    title?: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Listen for keyboard shortcut (Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === "Escape") {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 lg:top-0 z-30 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-6 lg:-mt-8 mb-6">
            <div className="flex items-center justify-between h-16">
                {/* Title */}
                <div className="flex-1">
                    {title && (
                        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                    )}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2">
                    {/* Search Button */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:text-slate-700 transition-colors"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline">Search...</span>
                        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-slate-100 rounded border border-slate-200">
                            <Command className="h-3 w-3" />K
                        </kbd>
                    </button>

                    {/* Notification Center */}
                    <NotificationCenter />
                </div>
            </div>
        </header>
    );
}
