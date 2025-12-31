"use client";

import {
    createContext,
    useContext,
    useCallback,
    useState,
    useEffect,
    useMemo,
} from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from "lucide-react";

// Toast types
export type ToastType = "success" | "error" | "info" | "warning" | "loading";

// Toast configuration
export const TOAST_CONFIG = {
    // Default durations by type (in ms)
    durations: {
        success: 4000,
        error: 6000,
        info: 4000,
        warning: 5000,
        loading: 0, // No auto-dismiss for loading
    },
    // Maximum number of toasts visible at once
    stackLimit: 3,
    // Position
    position: "bottom-right" as const,
} as const;

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    description?: string;
}

export interface PromiseMessages<T> {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: Error) => string);
}

export interface ToastContextValue {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType, duration?: number) => string;
    removeToast: (id: string) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    success: (message: string, description?: string) => string;
    error: (message: string, description?: string) => string;
    info: (message: string, description?: string) => string;
    warning: (message: string, description?: string) => string;
    loading: (message: string) => string;
    promise: <T>(
        promise: Promise<T>,
        messages: PromiseMessages<T>
    ) => Promise<T>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Store reference for use outside React components
let toastContextRef: ToastContextValue | null = null;

/**
 * Get the toast context reference for use outside React components.
 * Returns null if ToastProvider hasn't mounted yet.
 */
export function getToastContext(): ToastContextValue | null {
    return toastContextRef;
}

// Hook to use toast
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const dismiss = useCallback((id: string) => {
        removeToast(id);
    }, [removeToast]);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    const addToast = useCallback(
        (message: string, type: ToastType = "info", duration?: number, description?: string): string => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const finalDuration = duration ?? TOAST_CONFIG.durations[type];

            setToasts((prev) => {
                // Enforce stack limit - remove oldest toasts if over limit
                const newToasts = [...prev, { id, message, type, duration: finalDuration, description }];
                if (newToasts.length > TOAST_CONFIG.stackLimit) {
                    return newToasts.slice(-TOAST_CONFIG.stackLimit);
                }
                return newToasts;
            });

            // Auto remove after duration (except for loading toasts)
            if (finalDuration > 0) {
                setTimeout(() => removeToast(id), finalDuration);
            }

            return id;
        },
        [removeToast]
    );

    const success = useCallback(
        (message: string, description?: string): string =>
            addToast(message, "success", TOAST_CONFIG.durations.success, description),
        [addToast]
    );

    const error = useCallback(
        (message: string, description?: string): string =>
            addToast(message, "error", TOAST_CONFIG.durations.error, description),
        [addToast]
    );

    const info = useCallback(
        (message: string, description?: string): string =>
            addToast(message, "info", TOAST_CONFIG.durations.info, description),
        [addToast]
    );

    const warning = useCallback(
        (message: string, description?: string): string =>
            addToast(message, "warning", TOAST_CONFIG.durations.warning, description),
        [addToast]
    );

    const loading = useCallback(
        (message: string): string =>
            addToast(message, "loading", 0),
        [addToast]
    );

    const promiseHandler = useCallback(
        async <T,>(
            promise: Promise<T>,
            messages: PromiseMessages<T>
        ): Promise<T> => {
            const loadingId = addToast(messages.loading, "loading", 0);

            try {
                const result = await promise;
                removeToast(loadingId);
                const successMessage = typeof messages.success === "function"
                    ? messages.success(result)
                    : messages.success;
                addToast(successMessage, "success");
                return result;
            } catch (err) {
                removeToast(loadingId);
                const errorMessage = typeof messages.error === "function"
                    ? messages.error(err as Error)
                    : messages.error;
                addToast(errorMessage, "error");
                throw err;
            }
        },
        [addToast, removeToast]
    );

    const contextValue = useMemo(
        () => ({
            toasts,
            addToast,
            removeToast,
            dismiss,
            dismissAll,
            success,
            error,
            info,
            warning,
            loading,
            promise: promiseHandler,
        }),
        [toasts, addToast, removeToast, dismiss, dismissAll, success, error, info, warning, loading, promiseHandler]
    );

    // Store context reference for use outside React components
    useEffect(() => {
        toastContextRef = contextValue;
        return () => {
            toastContextRef = null;
        };
    }, [contextValue]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
        </ToastContext.Provider>
    );
}

// Toast icons and styles by type - Updated with Lexport brand colors
const toastConfig: Record<
    ToastType,
    { icon: typeof CheckCircle2; bgColor: string; iconColor: string; borderColor: string; progressColor?: string }
> = {
    success: {
        icon: CheckCircle2,
        bgColor: "bg-emerald-50",
        iconColor: "text-emerald-500",
        borderColor: "border-emerald-200",
        progressColor: "bg-emerald-500",
    },
    error: {
        icon: AlertCircle,
        bgColor: "bg-red-50",
        iconColor: "text-red-500",
        borderColor: "border-red-200",
        progressColor: "bg-red-500",
    },
    info: {
        icon: Info,
        bgColor: "bg-[#529ec6]/10",
        iconColor: "text-[#529ec6]",
        borderColor: "border-[#529ec6]/20",
        progressColor: "bg-[#529ec6]",
    },
    warning: {
        icon: AlertTriangle,
        bgColor: "bg-amber-50",
        iconColor: "text-amber-500",
        borderColor: "border-amber-200",
        progressColor: "bg-amber-500",
    },
    loading: {
        icon: Loader2,
        bgColor: "bg-[#202e46]/5",
        iconColor: "text-[#202e46]",
        borderColor: "border-[#202e46]/10",
    },
};

// Individual Toast component
function ToastItem({
    toast,
    onRemove,
}: {
    toast: Toast;
    onRemove: () => void;
}) {
    const [isExiting, setIsExiting] = useState(false);
    const [progress, setProgress] = useState(100);
    const config = toastConfig[toast.type];
    const Icon = config.icon;
    const isLoading = toast.type === "loading";

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(onRemove, 200);
    };

    // Progress bar animation
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const interval = 50; // Update every 50ms
            const decrement = (100 * interval) / toast.duration;

            const timer = setInterval(() => {
                setProgress((prev) => {
                    const next = prev - decrement;
                    return next > 0 ? next : 0;
                });
            }, interval);

            return () => clearInterval(timer);
        }
    }, [toast.duration]);

    // Auto trigger exit animation before removal
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const exitTimer = setTimeout(() => {
                setIsExiting(true);
            }, toast.duration - 200);
            return () => clearTimeout(exitTimer);
        }
    }, [toast.duration]);

    return (
        <div
            className={`
                relative flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg overflow-hidden
                ${config.bgColor} ${config.borderColor}
                transition-all duration-200 ease-out
                ${isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}
            `}
            role="alert"
        >
            <Icon
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor} ${isLoading ? "animate-spin" : ""}`}
            />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{toast.message}</p>
                {toast.description && (
                    <p className="text-xs text-slate-600 mt-0.5">{toast.description}</p>
                )}
            </div>
            {!isLoading && (
                <button
                    onClick={handleRemove}
                    className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors -mt-0.5"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            )}
            {/* Progress bar for timed toasts */}
            {toast.duration && toast.duration > 0 && config.progressColor && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5">
                    <div
                        className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}

// Toaster - renders all toasts
export function Toaster() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto animate-fadeIn">
                    <ToastItem
                        toast={toast}
                        onRemove={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
}
