"use client";

import { useEffect, useCallback } from "react";
import { X, Keyboard } from "lucide-react";
import { KEYBOARD_SHORTCUTS } from "@/lib/use-keyboard-shortcuts";

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    // Close on Escape
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
                            <Keyboard className="w-5 h-5 text-[#529ec6]" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Keyboard Shortcuts
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Shortcuts list */}
                <div className="px-6 py-4 space-y-3">
                    {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between py-2"
                        >
                            <span className="text-slate-700">{shortcut.description}</span>
                            <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, keyIndex) => (
                                    <kbd
                                        key={keyIndex}
                                        className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-md shadow-sm"
                                    >
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-sm text-slate-500 text-center">
                        Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-slate-200 border border-slate-300 rounded">?</kbd> anytime to show this help
                    </p>
                </div>
            </div>
        </div>
    );
}
