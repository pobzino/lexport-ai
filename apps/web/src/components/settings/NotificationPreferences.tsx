"use client";

import { useState, useEffect } from "react";
import {
    Bell,
    Mail,
    Smartphone,
    Loader2,
    CheckCircle2,
    AlertCircle,
    FileSignature,
    CreditCard,
    FileText,
    MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationType, NOTIFICATION_TYPE_INFO } from "@/lib/notifications";

interface PreferencesMap {
    [key: string]: {
        email_enabled: boolean;
        in_app_enabled: boolean;
    };
}

interface NotificationTypeInfo {
    label: string;
    description: string;
    category: "signature" | "payment" | "contract" | "collaboration";
}

const CATEGORY_INFO = {
    signature: {
        label: "Signature Notifications",
        icon: FileSignature,
        color: "text-brand-600",
        bgColor: "bg-brand-100",
    },
    payment: {
        label: "Payment Notifications",
        icon: CreditCard,
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
    },
    contract: {
        label: "Contract Notifications",
        icon: FileText,
        color: "text-[#529ec6]",
        bgColor: "bg-[#529ec6]/10",
    },
    collaboration: {
        label: "Collaboration Notifications",
        icon: MessageSquare,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
    },
};

export function NotificationPreferences() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<PreferencesMap>({});
    const [types, setTypes] = useState<Record<string, NotificationTypeInfo>>({});

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            const res = await fetch("/api/settings/notifications");
            if (!res.ok) throw new Error("Failed to fetch preferences");
            const data = await res.json();
            setPreferences(data.preferences);
            setTypes(data.types);
        } catch (err) {
            console.error("Error fetching preferences:", err);
            setError("Failed to load notification preferences");
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (
        notificationType: string,
        field: "email_enabled" | "in_app_enabled",
        value: boolean
    ) => {
        setSaving(notificationType);
        setError(null);

        // Optimistic update
        setPreferences((prev) => ({
            ...prev,
            [notificationType]: {
                ...prev[notificationType],
                [field]: value,
            },
        }));

        try {
            const res = await fetch("/api/settings/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notification_type: notificationType,
                    [field]: value,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update preference");
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            console.error("Error updating preference:", err);
            // Revert optimistic update
            setPreferences((prev) => ({
                ...prev,
                [notificationType]: {
                    ...prev[notificationType],
                    [field]: !value,
                },
            }));
            setError("Failed to update preference");
        } finally {
            setSaving(null);
        }
    };

    // Group types by category
    const groupedTypes = Object.entries(types).reduce(
        (acc, [type, info]) => {
            const category = info.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({ type, ...info });
            return acc;
        },
        {} as Record<string, Array<{ type: string } & NotificationTypeInfo>>
    );

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-5 h-5 text-[#529ec6]" />
                    <h2 className="text-lg font-semibold text-slate-900">
                        Notification Preferences
                    </h2>
                </div>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-[#529ec6]" />
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Notification Preferences
                        </h2>
                        <p className="text-sm text-slate-500">
                            Choose how you want to be notified
                        </p>
                    </div>
                </div>
                {success && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Saved
                    </div>
                )}
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Header row - sticky on desktop */}
            <div className="hidden sm:grid sm:grid-cols-[1fr,80px,80px] gap-4 mb-4 px-4 py-2 bg-slate-100 rounded-lg text-xs uppercase tracking-wide text-slate-600 font-semibold">
                <div>Notification Type</div>
                <div className="text-center flex items-center justify-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                </div>
                <div className="text-center flex items-center justify-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    In-App
                </div>
            </div>

            <div className="space-y-6">
                {(["signature", "payment", "contract", "collaboration"] as const).map(
                    (category) => {
                        const categoryInfo = CATEGORY_INFO[category];
                        const CategoryIcon = categoryInfo.icon;
                        const categoryTypes = groupedTypes[category] || [];

                        if (categoryTypes.length === 0) return null;

                        return (
                            <div key={category}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div
                                        className={`w-8 h-8 rounded-lg ${categoryInfo.bgColor} flex items-center justify-center`}
                                    >
                                        <CategoryIcon
                                            className={`w-4 h-4 ${categoryInfo.color}`}
                                        />
                                    </div>
                                    <h3 className="font-medium text-slate-900">
                                        {categoryInfo.label}
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    {categoryTypes.map(({ type, label, description }) => {
                                        const pref = preferences[type] || {
                                            email_enabled: true,
                                            in_app_enabled: true,
                                        };
                                        const isSaving = saving === type;

                                        return (
                                            <div
                                                key={type}
                                                className="grid grid-cols-1 sm:grid-cols-[1fr,80px,80px] gap-2 sm:gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">
                                                        {label}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {description}
                                                    </p>
                                                </div>

                                                {/* Mobile layout */}
                                                <div className="flex sm:hidden items-center gap-4 mt-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={pref.email_enabled}
                                                            onChange={(e) =>
                                                                updatePreference(
                                                                    type,
                                                                    "email_enabled",
                                                                    e.target.checked
                                                                )
                                                            }
                                                            disabled={isSaving}
                                                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                        />
                                                        <Mail className="w-4 h-4 text-slate-400" />
                                                        <span className="text-xs text-slate-600">
                                                            Email
                                                        </span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={pref.in_app_enabled}
                                                            onChange={(e) =>
                                                                updatePreference(
                                                                    type,
                                                                    "in_app_enabled",
                                                                    e.target.checked
                                                                )
                                                            }
                                                            disabled={isSaving}
                                                            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                        />
                                                        <Smartphone className="w-4 h-4 text-slate-400" />
                                                        <span className="text-xs text-slate-600">
                                                            In-App
                                                        </span>
                                                    </label>
                                                </div>

                                                {/* Desktop layout - toggle switches with labels */}
                                                <div className="hidden sm:flex items-center justify-center">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={pref.email_enabled}
                                                            onChange={(e) =>
                                                                updatePreference(
                                                                    type,
                                                                    "email_enabled",
                                                                    e.target.checked
                                                                )
                                                            }
                                                            disabled={isSaving}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600 peer-disabled:opacity-50"></div>
                                                    </label>
                                                </div>
                                                <div className="hidden sm:flex items-center justify-center">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={pref.in_app_enabled}
                                                            onChange={(e) =>
                                                                updatePreference(
                                                                    type,
                                                                    "in_app_enabled",
                                                                    e.target.checked
                                                                )
                                                            }
                                                            disabled={isSaving}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600 peer-disabled:opacity-50"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                    Changes are saved automatically. Email notifications require a verified
                    email address.
                </p>
            </div>
        </div>
    );
}
