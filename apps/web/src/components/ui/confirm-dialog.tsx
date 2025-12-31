"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirmDialog must be used within a ConfirmDialogProvider");
  }
  return context;
}

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (options?.onConfirm) {
      setIsLoading(true);
      try {
        await options.onConfirm();
      } finally {
        setIsLoading(false);
      }
    }
    setIsOpen(false);
    resolveRef?.(true);
    setOptions(null);
    setResolveRef(null);
  }, [options, resolveRef]);

  const handleCancel = useCallback(() => {
    options?.onCancel?.();
    setIsOpen(false);
    resolveRef?.(false);
    setOptions(null);
    setResolveRef(null);
  }, [options, resolveRef]);

  const getVariantStyles = () => {
    switch (options?.variant) {
      case "danger":
        return {
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          buttonBg: "bg-red-600 hover:bg-red-700",
          Icon: Trash2,
        };
      case "warning":
        return {
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          buttonBg: "bg-amber-600 hover:bg-amber-700",
          Icon: AlertTriangle,
        };
      default:
        return {
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          buttonBg: "bg-[#529ec6] hover:bg-[#4a8db3]",
          Icon: AlertTriangle,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
        >
          {/* Modal Content */}
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 p-6 pb-4">
              <div className={`p-3 rounded-full ${styles.iconBg}`}>
                <styles.Icon className={`w-6 h-6 ${styles.iconColor}`} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2
                  id="confirm-dialog-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {options?.title}
                </h2>
                <p
                  id="confirm-dialog-description"
                  className="mt-2 text-sm text-slate-600"
                >
                  {options?.message}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5 text-slate-400" aria-hidden="true" />
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {options?.cancelText || "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${styles.buttonBg}`}
              >
                {isLoading ? "Processing..." : (options?.confirmText || "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

// Standalone component for simpler use cases
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
          buttonBg: "bg-red-600 hover:bg-red-700",
          Icon: Trash2,
        };
      case "warning":
        return {
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          buttonBg: "bg-amber-600 hover:bg-amber-700",
          Icon: AlertTriangle,
        };
      default:
        return {
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          buttonBg: "bg-[#529ec6] hover:bg-[#4a8db3]",
          Icon: AlertTriangle,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={`p-3 rounded-full ${styles.iconBg}`}>
            <styles.Icon className={`w-6 h-6 ${styles.iconColor}`} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-2 text-sm text-slate-600"
            >
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${styles.buttonBg}`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
