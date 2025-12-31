"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { Validator, ValidationResult } from "@/lib/validation";

// ============================================================================
// VALIDATED INPUT
// ============================================================================

export interface ValidatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  /** Value of the input */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Validators to run on the value */
  validators?: Validator[];
  /** Debounce delay in ms for validation (default: 300) */
  debounceMs?: number;
  /** Whether to validate on blur only (default: false - validates on change) */
  validateOnBlur?: boolean;
  /** Whether to show validation icons */
  showValidationIcon?: boolean;
  /** Callback when validation state changes */
  onValidation?: (result: ValidationResult, touched: boolean) => void;
  /** External error to display (overrides internal validation) */
  externalError?: string;
  /** Force show error even if not touched */
  forceShowError?: boolean;
  /** Label for the input */
  label?: string;
  /** Whether field is required */
  required?: boolean;
  /** Helper text */
  helperText?: string;
  /** Wrapper class name */
  wrapperClassName?: string;
}

/**
 * ValidatedInput - Input with built-in real-time validation
 *
 * Usage:
 * ```tsx
 * <ValidatedInput
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={setEmail}
 *   validators={[required("Email is required"), email()]}
 *   required
 * />
 * ```
 */
export function ValidatedInput({
  value,
  onChange,
  validators = [],
  debounceMs = 300,
  validateOnBlur = false,
  showValidationIcon = true,
  onValidation,
  externalError,
  forceShowError = false,
  label,
  required = false,
  helperText,
  wrapperClassName,
  className,
  onBlur,
  onFocus,
  ...props
}: ValidatedInputProps) {
  const [touched, setTouched] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult>({
    valid: true,
  });
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Run validation
  const validate = React.useCallback(
    (val: string) => {
      if (validators.length === 0) {
        setValidationResult({ valid: true });
        return;
      }

      for (const validator of validators) {
        const result = validator(val);
        if (!result.valid) {
          setValidationResult(result);
          onValidation?.(result, touched);
          return;
        }
      }

      const result = { valid: true };
      setValidationResult(result);
      onValidation?.(result, touched);
    },
    [validators, touched, onValidation]
  );

  // Debounced validation for real-time feedback
  const debouncedValidate = React.useCallback(
    (val: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (validateOnBlur) {
        return; // Skip debounced validation if validating on blur only
      }

      setValidating(true);
      debounceRef.current = setTimeout(() => {
        validate(val);
        setValidating(false);
      }, debounceMs);
    },
    [validate, debounceMs, validateOnBlur]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear error when user starts typing (if previously had error and was touched)
    if (touched && validationResult.error) {
      setValidationResult({ valid: true });
    }

    debouncedValidate(newValue);
  };

  // Handle blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    setTouched(true);

    // Cancel any pending debounced validation
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Validate immediately on blur
    validate(value);
    setValidating(false);

    onBlur?.(e);
  };

  // Handle focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  // Determine error and valid states
  const showError = (touched || forceShowError) && !focused;
  const error = externalError || (showError && validationResult.error);
  const isValid = showError && !error && value.trim().length > 0 && validationResult.valid;

  // Input border classes
  const inputClasses = cn(
    "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "transition-colors duration-150",
    {
      "border-input focus-visible:ring-ring": !error && !isValid,
      "border-red-300 focus-visible:ring-red-400": error,
      "border-emerald-300 focus-visible:ring-emerald-400": isValid,
      "pr-10": showValidationIcon,
    },
    className
  );

  return (
    <div className={cn("space-y-1.5", wrapperClassName)}>
      {/* Label */}
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

      {/* Input with icon */}
      <div className="relative">
        <input
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />

        {/* Status icon */}
        {showValidationIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {validating && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            {!validating && error && <AlertCircle className="w-4 h-4 text-red-500" />}
            {!validating && isValid && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
        )}
      </div>

      {/* Error or helper text */}
      {error && (
        <p id={`${props.id}-error`} className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}

// ============================================================================
// VALIDATED TEXTAREA
// ============================================================================

export interface ValidatedTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  /** Value of the textarea */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Validators to run on the value */
  validators?: Validator[];
  /** Debounce delay in ms for validation (default: 300) */
  debounceMs?: number;
  /** Whether to validate on blur only (default: false) */
  validateOnBlur?: boolean;
  /** Callback when validation state changes */
  onValidation?: (result: ValidationResult, touched: boolean) => void;
  /** External error to display */
  externalError?: string;
  /** Force show error even if not touched */
  forceShowError?: boolean;
  /** Label for the textarea */
  label?: string;
  /** Whether field is required */
  required?: boolean;
  /** Helper text */
  helperText?: string;
  /** Show character count */
  showCharCount?: boolean;
  /** Maximum characters */
  maxChars?: number;
  /** Wrapper class name */
  wrapperClassName?: string;
}

/**
 * ValidatedTextarea - Textarea with built-in real-time validation
 */
export function ValidatedTextarea({
  value,
  onChange,
  validators = [],
  debounceMs = 300,
  validateOnBlur = false,
  onValidation,
  externalError,
  forceShowError = false,
  label,
  required = false,
  helperText,
  showCharCount = false,
  maxChars,
  wrapperClassName,
  className,
  onBlur,
  onFocus,
  ...props
}: ValidatedTextareaProps) {
  const [touched, setTouched] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ValidationResult>({
    valid: true,
  });
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const validate = React.useCallback(
    (val: string) => {
      if (validators.length === 0) {
        setValidationResult({ valid: true });
        return;
      }

      for (const validator of validators) {
        const result = validator(val);
        if (!result.valid) {
          setValidationResult(result);
          onValidation?.(result, touched);
          return;
        }
      }

      setValidationResult({ valid: true });
      onValidation?.({ valid: true }, touched);
    },
    [validators, touched, onValidation]
  );

  const debouncedValidate = React.useCallback(
    (val: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (validateOnBlur) return;

      debounceRef.current = setTimeout(() => {
        validate(val);
      }, debounceMs);
    },
    [validate, debounceMs, validateOnBlur]
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (touched && validationResult.error) {
      setValidationResult({ valid: true });
    }

    debouncedValidate(newValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocused(false);
    setTouched(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    validate(value);
    onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const showError = (touched || forceShowError) && !focused;
  const error = externalError || (showError && validationResult.error);
  const isValid = showError && !error && value.trim().length > 0 && validationResult.valid;
  const isOverLimit = maxChars && value.length > maxChars;

  const textareaClasses = cn(
    "flex w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "resize-none transition-colors duration-150",
    {
      "border-input focus-visible:ring-ring": !error && !isValid && !isOverLimit,
      "border-red-300 focus-visible:ring-red-400": error || isOverLimit,
      "border-emerald-300 focus-visible:ring-emerald-400": isValid && !isOverLimit,
    },
    className
  );

  return (
    <div className={cn("space-y-1.5", wrapperClassName)}>
      {/* Label and char count */}
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
              {value.length}/{maxChars}
            </span>
          )}
        </div>
      )}

      <textarea
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={textareaClasses}
        aria-invalid={!!error}
        {...props}
      />

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
