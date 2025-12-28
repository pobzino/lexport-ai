"use client";

import { useState } from "react";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";

interface KeyboardShortcutsProviderProps {
    children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
    const [showHelp, setShowHelp] = useState(false);

    useKeyboardShortcuts({
        onHelpOpen: () => setShowHelp(true),
    });

    return (
        <>
            {children}
            <KeyboardShortcutsModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
            />
        </>
    );
}
