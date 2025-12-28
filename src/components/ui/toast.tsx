"use client";

import {
    createContext,
    useContext,
    useCallback,
    useState,
    useEffect,
} from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

// Toast types
type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

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

    const addToast = useCallback(
        (message: string, type: ToastType = "info", duration = 4000) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            setToasts((prev) => [...prev, { id, message, type, duration }]);

            // Auto remove after duration
            if (duration > 0) {
                setTimeout(() => removeToast(id), duration);
            }
        },
        [removeToast]
    );

    const success = useCallback(
        (message: string) => addToast(message, "success"),
        [addToast]
    );
    const error = useCallback(
        (message: string) => addToast(message, "error"),
        [addToast]
    );
    const info = useCallback(
        (message: string) => addToast(message, "info"),
        [addToast]
    );
    const warning = useCallback(
        (message: string) => addToast(message, "warning"),
        [addToast]
    );

    return (
        <ToastContext.Provider
            value={{ toasts, addToast, removeToast, success, error, info, warning }}
        >
            {children}
        </ToastContext.Provider>
    );
}

// Toast icons and styles by type
const toastConfig: Record<
    ToastType,
    { icon: typeof CheckCircle2; bgColor: string; iconColor: string; borderColor: string }
> = {
    success: {
        icon: CheckCircle2,
        bgColor: "bg-emerald-50",
        iconColor: "text-emerald-500",
        borderColor: "border-emerald-200",
    },
    error: {
        icon: AlertCircle,
        bgColor: "bg-red-50",
        iconColor: "text-red-500",
        borderColor: "border-red-200",
    },
    info: {
        icon: Info,
        bgColor: "bg-blue-50",
        iconColor: "text-blue-500",
        borderColor: "border-blue-200",
    },
    warning: {
        icon: AlertTriangle,
        bgColor: "bg-amber-50",
        iconColor: "text-amber-500",
        borderColor: "border-amber-200",
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
    const config = toastConfig[toast.type];
    const Icon = config.icon;

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(onRemove, 200);
    };

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
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${config.bgColor} ${config.borderColor}
        transition-all duration-200 ease-out
        ${isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}
      `}
            role="alert"
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
            <p className="text-sm font-medium text-slate-800 flex-1">{toast.message}</p>
            <button
                onClick={handleRemove}
                className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
                aria-label="Close"
            >
                <X className="w-4 h-4 text-slate-400" />
            </button>
        </div>
    );
}

// Toaster - renders all toasts
export function Toaster() {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onRemove={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}
