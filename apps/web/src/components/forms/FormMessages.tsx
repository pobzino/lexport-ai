"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, X, AlertTriangle, Info } from "lucide-react";

// ============================================================================
// FORM ERROR
// ============================================================================

export interface FormErrorProps {
  /** Error message to display */
  message?: string | null;
  /** Title for the error (optional) */
  title?: string;
  /** Whether the error is dismissible */
  dismissible?: boolean;
  /** Callback when error is dismissed */
  onDismiss?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * FormError - Displays an error message with icon and optional dismiss button
 */
export function FormError({
  message,
  title,
  dismissible = false,
  onDismiss,
  className,
}: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "bg-red-50 border border-red-200 rounded-lg p-4 text-red-700",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium text-red-800">{title}</p>}
          <p className={cn("text-sm", title && "mt-1")}>{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-red-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FORM SUCCESS
// ============================================================================

export interface FormSuccessProps {
  /** Success message to display */
  message?: string | null;
  /** Title for the success message (optional) */
  title?: string;
  /** Whether the message is dismissible */
  dismissible?: boolean;
  /** Callback when message is dismissed */
  onDismiss?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * FormSuccess - Displays a success message with icon and optional dismiss button
 */
export function FormSuccess({
  message,
  title,
  dismissible = false,
  onDismiss,
  className,
}: FormSuccessProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className={cn(
        "bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-700",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500" />
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium text-emerald-800">{title}</p>}
          <p className={cn("text-sm", title && "mt-1")}>{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded transition-colors"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FORM WARNING
// ============================================================================

export interface FormWarningProps {
  /** Warning message to display */
  message?: string | null;
  /** Title for the warning (optional) */
  title?: string;
  /** Whether the warning is dismissible */
  dismissible?: boolean;
  /** Callback when warning is dismissed */
  onDismiss?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * FormWarning - Displays a warning message with icon and optional dismiss button
 */
export function FormWarning({
  message,
  title,
  dismissible = false,
  onDismiss,
  className,
}: FormWarningProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium text-amber-800">{title}</p>}
          <p className={cn("text-sm", title && "mt-1")}>{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-100 rounded transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FORM INFO
// ============================================================================

export interface FormInfoProps {
  /** Info message to display */
  message?: string | null;
  /** Title for the info message (optional) */
  title?: string;
  /** Whether the message is dismissible */
  dismissible?: boolean;
  /** Callback when message is dismissed */
  onDismiss?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * FormInfo - Displays an informational message with icon and optional dismiss button
 */
export function FormInfo({
  message,
  title,
  dismissible = false,
  onDismiss,
  className,
}: FormInfoProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      className={cn(
        "bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-500" />
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium text-blue-800">{title}</p>}
          <p className={cn("text-sm", title && "mt-1")}>{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
            aria-label="Dismiss info"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INLINE ERROR (for use next to fields)
// ============================================================================

export interface InlineErrorProps {
  /** Error message */
  message?: string | null;
  /** Additional class name */
  className?: string;
}

/**
 * InlineError - Small inline error message for field-level errors
 */
export function InlineError({ message, className }: InlineErrorProps) {
  if (!message) return null;

  return (
    <p className={cn("text-xs text-red-600 mt-1 flex items-center gap-1", className)}>
      <AlertCircle className="w-3 h-3" />
      {message}
    </p>
  );
}

// ============================================================================
// INLINE SUCCESS (for use next to fields)
// ============================================================================

export interface InlineSuccessProps {
  /** Success message */
  message?: string | null;
  /** Additional class name */
  className?: string;
}

/**
 * InlineSuccess - Small inline success message for field-level feedback
 */
export function InlineSuccess({ message, className }: InlineSuccessProps) {
  if (!message) return null;

  return (
    <p className={cn("text-xs text-emerald-600 mt-1 flex items-center gap-1", className)}>
      <CheckCircle2 className="w-3 h-3" />
      {message}
    </p>
  );
}
