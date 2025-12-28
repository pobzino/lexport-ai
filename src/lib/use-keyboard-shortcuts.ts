"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    action: () => void;
    description: string;
}

// Available shortcuts for documentation
export const KEYBOARD_SHORTCUTS = [
    { keys: ["⌘", "N"], description: "Create new contract" },
    { keys: ["?"], description: "Show keyboard shortcuts" },
    { keys: ["Esc"], description: "Close modal / Go back" },
] as const;

interface UseKeyboardShortcutsOptions {
    onHelpOpen?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
    const router = useRouter();
    const { onHelpOpen } = options;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            const target = event.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.contentEditable === "true"
            ) {
                return;
            }

            // ⌘+N or Ctrl+N - New contract
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
                event.preventDefault();
                router.push("/contracts/new");
                return;
            }

            // ? - Show help
            if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
                event.preventDefault();
                onHelpOpen?.();
                return;
            }
        },
        [router, onHelpOpen]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);
}
