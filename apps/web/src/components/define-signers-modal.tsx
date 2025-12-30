"use client";

import { useState } from "react";
import { X, Plus, Trash2, User, Mail, AlertCircle, Building2 } from "lucide-react";

export interface SignerDefinition {
    id: string;
    role: string;
    name: string;
    email: string;
    company?: string; // Optional
    color: string;
}

// Predefined colors for signers
const SIGNER_COLORS = [
    "#8b5cf6", // violet
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#ec4899", // pink
];

interface DefineSignersModalProps {
    isOpen: boolean;
    initialRoles: string[];
    existingSigners?: SignerDefinition[];
    onClose: () => void;
    onConfirm: (signers: SignerDefinition[]) => void;
}

export function DefineSignersModal({
    isOpen,
    initialRoles,
    existingSigners,
    onClose,
    onConfirm,
}: DefineSignersModalProps) {
    const [signers, setSigners] = useState<SignerDefinition[]>(() => {
        if (existingSigners && existingSigners.length > 0) {
            return existingSigners;
        }
        // Initialize with initial roles
        return initialRoles.map((role, idx) => ({
            id: `signer-${idx}`,
            role,
            name: "",
            email: "",
            company: "",
            color: SIGNER_COLORS[idx % SIGNER_COLORS.length],
        }));
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateSigner = (id: string, field: keyof SignerDefinition, value: string) => {
        setSigners((prev) =>
            prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
        // Clear error when user types
        if (errors[`${id}-${field}`]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`${id}-${field}`];
                return next;
            });
        }
    };

    const addSigner = () => {
        const newIdx = signers.length;
        setSigners((prev) => [
            ...prev,
            {
                id: `signer-${Date.now()}`,
                role: `Signer ${newIdx + 1}`,
                name: "",
                email: "",
                company: "",
                color: SIGNER_COLORS[newIdx % SIGNER_COLORS.length],
            },
        ]);
    };

    const removeSigner = (id: string) => {
        if (signers.length <= 1) return; // Keep at least one signer
        setSigners((prev) => prev.filter((s) => s.id !== id));
    };

    const validateAndConfirm = () => {
        const newErrors: Record<string, string> = {};

        signers.forEach((signer) => {
            if (!signer.name.trim()) {
                newErrors[`${signer.id}-name`] = "Name is required";
            }
            if (!signer.email.trim()) {
                newErrors[`${signer.id}-email`] = "Email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email)) {
                newErrors[`${signer.id}-email`] = "Invalid email format";
            }
        });

        // Check for duplicate emails
        const emails = signers.map((s) => s.email.toLowerCase().trim());
        const seen = new Set<string>();
        emails.forEach((email, idx) => {
            if (email && seen.has(email)) {
                newErrors[`${signers[idx].id}-email`] = "Duplicate email";
            }
            seen.add(email);
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onConfirm(signers);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Define Signers
                        </h2>
                        <p className="text-sm text-slate-500">
                            Add name and email for each person who needs to sign
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[60vh] overflow-auto">
                    <div className="space-y-4">
                        {signers.map((signer, idx) => (
                            <div
                                key={signer.id}
                                className="p-4 rounded-lg border-2 transition-colors"
                                style={{ borderColor: `${signer.color}40` }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: signer.color }}
                                        />
                                        <input
                                            type="text"
                                            value={signer.role}
                                            onChange={(e) => updateSigner(signer.id, "role", e.target.value)}
                                            className="font-medium text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                                            placeholder="Role name"
                                        />
                                    </div>
                                    {signers.length > 1 && (
                                        <button
                                            onClick={() => removeSigner(signer.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={signer.name}
                                                onChange={(e) => updateSigner(signer.id, "name", e.target.value)}
                                                placeholder="Full name"
                                                className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] ${errors[`${signer.id}-name`]
                                                    ? "border-red-300 focus:ring-red-400"
                                                    : "border-slate-200"
                                                    }`}
                                            />
                                        </div>
                                        {errors[`${signer.id}-name`] && (
                                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors[`${signer.id}-name`]}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="email"
                                                value={signer.email}
                                                onChange={(e) => updateSigner(signer.id, "email", e.target.value)}
                                                placeholder="email@example.com"
                                                className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] ${errors[`${signer.id}-email`]
                                                    ? "border-red-300 focus:ring-red-400"
                                                    : "border-slate-200"
                                                    }`}
                                            />
                                        </div>
                                        {errors[`${signer.id}-email`] && (
                                            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {errors[`${signer.id}-email`]}
                                            </p>
                                        )}
                                    </div>

                                    {/* Company Name (Optional) */}
                                    <div>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={signer.company || ""}
                                                onChange={(e) => updateSigner(signer.id, "company", e.target.value)}
                                                placeholder="Company name (optional)"
                                                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6] border-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addSigner}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border-2 border-dashed border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Another Signer
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={validateAndConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#529ec6] hover:bg-[#4189b1] rounded-lg transition-colors"
                    >
                        Continue to Field Placement
                    </button>
                </div>
            </div>
        </div>
    );
}
