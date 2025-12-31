"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Error message - shows in error state */
  error?: string;
  /** Success message - shows in valid state */
  success?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Current character count */
  charCount?: number;
  /** Maximum character limit */
  maxChars?: number;
  /** Whether field has been touched */
  touched?: boolean;
  /** Whether to show validation status icon */
  showStatusIcon?: boolean;
  /** Additional class name for the wrapper */
  className?: string;
  /** The form input element(s) */
  children: React.ReactNode;
}

/**
 * FormField - Wrapper component for form inputs with label, error, and helper text
 *
 * Usage:
 * ```tsx
 * <FormField
 *   label="Email"
 *   required
 *   error={emailError}
 *   helperText="We'll never share your email"
 * >
 *   <Input
 *     type="email"
 *     value={email}
 *     onChange={(e) => setEmail(e.target.value)}
 *   />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  helperText,
  error,
  success,
  required = false,
  showCharCount = false,
  charCount = 0,
  maxChars,
  touched = true,
  showStatusIcon = false,
  className,
  children,
}: FormFieldProps) {
  const hasError = touched && !!error;
  const hasSuccess = touched && !error && !!success;
  const showMessage = hasError || hasSuccess || helperText;
  const isOverLimit = maxChars && charCount > maxChars;

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label Row */}
      {(label || (showCharCount && maxChars)) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="block text-sm font-medium text-slate-700">
              {label}
              {required && (
                <span className="text-red-500 ml-0.5" aria-hidden="true">
                  *
                </span>
              )}
            </label>
          )}
          {showCharCount && maxChars && (
            <span
              className={cn(
                "text-xs",
                isOverLimit ? "text-red-500 font-medium" : "text-slate-400"
              )}
            >
              {charCount}/{maxChars}
            </span>
          )}
        </div>
      )}

      {/* Input with optional status icon */}
      <div className="relative">
        {children}
        {showStatusIcon && touched && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
            {hasSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
        )}
      </div>

      {/* Message Row */}
      {showMessage && (
        <div className="flex items-start gap-1.5">
          {hasError && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </>
          )}
          {hasSuccess && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-600">{success}</p>
            </>
          )}
          {!hasError && !hasSuccess && helperText && (
            <>
              <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500">{helperText}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * FormFieldGroup - Groups related form fields together
 */
export function FormFieldGroup({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
