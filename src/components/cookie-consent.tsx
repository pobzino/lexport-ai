"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, Settings } from "lucide-react";

const CONSENT_COOKIE_NAME = "cookie_consent";
const CONSENT_VERSION = "1"; // Increment when policy changes

interface CookiePreferences {
    essential: boolean; // Always true, required
    functional: boolean;
    analytics: boolean;
    version: string;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
    essential: true,
    functional: true,
    analytics: true,
    version: CONSENT_VERSION,
};

export function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false);
    const [showCustomize, setShowCustomize] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

    useEffect(() => {
        // Check for existing consent
        const stored = localStorage.getItem(CONSENT_COOKIE_NAME);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as CookiePreferences;
                // Show banner if consent version is outdated
                if (parsed.version !== CONSENT_VERSION) {
                    setShowBanner(true);
                } else {
                    setPreferences(parsed);
                }
            } catch {
                setShowBanner(true);
            }
        } else {
            // Check Do Not Track
            const dnt = navigator.doNotTrack === "1" || (window as unknown as { doNotTrack?: string }).doNotTrack === "1";
            if (dnt) {
                // Auto-set minimal preferences
                const minimalPrefs: CookiePreferences = {
                    essential: true,
                    functional: false,
                    analytics: false,
                    version: CONSENT_VERSION,
                };
                savePreferences(minimalPrefs);
            } else {
                setShowBanner(true);
            }
        }
    }, []);

    const savePreferences = (prefs: CookiePreferences) => {
        localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(prefs));
        // Also set a cookie for server-side access
        document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(prefs))}; path=/; max-age=31536000; SameSite=Lax`;
        setPreferences(prefs);
        setShowBanner(false);
        setShowCustomize(false);
    };

    const acceptAll = () => {
        savePreferences(DEFAULT_PREFERENCES);
    };

    const rejectNonEssential = () => {
        savePreferences({
            essential: true,
            functional: false,
            analytics: false,
            version: CONSENT_VERSION,
        });
    };

    const saveCustom = () => {
        savePreferences({ ...preferences, version: CONSENT_VERSION });
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-[100] p-4 animate-in slide-in-from-bottom duration-300">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {showCustomize ? (
                    // Customize View
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Cookie Preferences</h3>
                            <button
                                onClick={() => setShowCustomize(false)}
                                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Essential */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-900">Essential Cookies</p>
                                    <p className="text-sm text-slate-500">Required for the website to function</p>
                                </div>
                                <div className="px-3 py-1 bg-slate-200 text-slate-600 text-sm rounded-full">
                                    Always On
                                </div>
                            </div>

                            {/* Functional */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-900">Functional Cookies</p>
                                    <p className="text-sm text-slate-500">Remember your preferences and settings</p>
                                </div>
                                <button
                                    onClick={() => setPreferences(p => ({ ...p, functional: !p.functional }))}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.functional ? "bg-violet-600" : "bg-slate-300"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${preferences.functional ? "translate-x-6" : ""}`} />
                                </button>
                            </div>

                            {/* Analytics */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-900">Analytics Cookies</p>
                                    <p className="text-sm text-slate-500">Help us understand how you use the site</p>
                                </div>
                                <button
                                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${preferences.analytics ? "bg-violet-600" : "bg-slate-300"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${preferences.analytics ? "translate-x-6" : ""}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6">
                            <button
                                onClick={saveCustom}
                                className="flex-1 px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                ) : (
                    // Main Banner
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Cookie className="w-5 h-5 text-violet-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-900 mb-1">We value your privacy</h3>
                                <p className="text-slate-600 text-sm">
                                    We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.
                                    Read our{" "}
                                    <Link href="/privacy" className="text-violet-600 hover:underline">
                                        Privacy Policy
                                    </Link>{" "}
                                    for more information.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
                            <button
                                onClick={() => setShowCustomize(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Customize
                            </button>
                            <button
                                onClick={rejectNonEssential}
                                className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Reject Non-Essential
                            </button>
                            <button
                                onClick={acceptAll}
                                className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
                            >
                                Accept All
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Hook to check cookie consent
export function useCookieConsent(): CookiePreferences | null {
    const [consent, setConsent] = useState<CookiePreferences | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(CONSENT_COOKIE_NAME);
        if (stored) {
            try {
                setConsent(JSON.parse(stored));
            } catch {
                setConsent(null);
            }
        }
    }, []);

    return consent;
}
