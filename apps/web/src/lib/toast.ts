/**
 * Toast Utility Functions
 *
 * Provides helper functions for displaying toast notifications.
 * These functions work outside of React components by using the
 * global toast context reference.
 *
 * Usage in React components:
 *   import { useToast } from "@/components/ui/toast";
 *   const toast = useToast();
 *   toast.success("Operation completed!");
 *
 * Usage in non-React code (after ToastProvider mounts):
 *   import { showSuccess, showError } from "@/lib/toast";
 *   showSuccess("Operation completed!");
 *
 * Or use the toast object:
 *   import toast from "@/lib/toast";
 *   toast.success("Operation completed!");
 */

import { getToastContext, type ToastContextValue, type PromiseMessages } from "@/components/ui/toast";

/**
 * Get the toast context. Returns a no-op implementation if not initialized.
 */
function getToast(): ToastContextValue {
    const context = getToastContext();
    if (!context) {
        console.warn("Toast context not initialized. Make sure ToastProvider is mounted.");
        // Return a no-op implementation to prevent crashes
        return {
            toasts: [],
            addToast: () => "",
            removeToast: () => {},
            dismiss: () => {},
            dismissAll: () => {},
            success: () => "",
            error: () => "",
            info: () => "",
            warning: () => "",
            loading: () => "",
            promise: async (p) => p,
        };
    }
    return context;
}

/**
 * Show a success toast notification.
 * @param message - The message to display
 * @param description - Optional description text
 * @returns The toast ID
 */
export function showSuccess(message: string, description?: string): string {
    return getToast().success(message, description);
}

/**
 * Show an error toast notification.
 * @param message - The message to display
 * @param description - Optional description text
 * @returns The toast ID
 */
export function showError(message: string, description?: string): string {
    return getToast().error(message, description);
}

/**
 * Show a warning toast notification.
 * @param message - The message to display
 * @param description - Optional description text
 * @returns The toast ID
 */
export function showWarning(message: string, description?: string): string {
    return getToast().warning(message, description);
}

/**
 * Show an info toast notification.
 * @param message - The message to display
 * @param description - Optional description text
 * @returns The toast ID
 */
export function showInfo(message: string, description?: string): string {
    return getToast().info(message, description);
}

/**
 * Show a loading toast notification.
 * Loading toasts don't auto-dismiss - use dismiss() to remove them.
 * @param message - The message to display
 * @returns The toast ID
 */
export function showLoading(message: string): string {
    return getToast().loading(message);
}

/**
 * Show toast notifications for a promise-based operation.
 * Displays loading, then success or error based on the result.
 *
 * @example
 * showPromise(
 *   fetch("/api/contracts"),
 *   {
 *     loading: "Saving contract...",
 *     success: "Contract saved!",
 *     error: "Failed to save contract"
 *   }
 * );
 *
 * @example
 * // With dynamic messages
 * showPromise(
 *   createContract(data),
 *   {
 *     loading: "Creating contract...",
 *     success: (result) => `Contract "${result.title}" created!`,
 *     error: (err) => `Error: ${err.message}`
 *   }
 * );
 */
export function showPromise<T>(
    promise: Promise<T>,
    messages: PromiseMessages<T>
): Promise<T> {
    return getToast().promise(promise, messages);
}

/**
 * Dismiss a specific toast by its ID.
 * @param id - The toast ID to dismiss
 */
export function dismiss(id: string): void {
    getToast().dismiss(id);
}

/**
 * Dismiss all toasts.
 */
export function dismissAll(): void {
    getToast().dismissAll();
}

// Re-export toast configuration for customization
export { TOAST_CONFIG } from "@/components/ui/toast";

/**
 * Toast object for chained method calls (sonner-like API)
 *
 * @example
 * toast.success("Saved!");
 * toast.error("Something went wrong");
 * toast.promise(fetchData(), { loading: "...", success: "...", error: "..." });
 */
export const toast = {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    loading: showLoading,
    promise: showPromise,
    dismiss,
    dismissAll,
};

export default toast;
