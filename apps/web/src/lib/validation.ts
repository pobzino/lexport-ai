/**
 * Form Validation Utilities
 * Provides validators, hooks, and utilities for form validation
 */

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type Validator = (value: string) => ValidationResult;

export interface FieldValidation {
  value: string;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  error?: string;
  validating?: boolean;
}

// ============================================================================
// CORE VALIDATORS
// ============================================================================

/**
 * Check if a field is required (non-empty)
 */
export function required(message = "This field is required"): Validator {
  return (value: string) => {
    const isValid = value.trim().length > 0;
    return {
      valid: isValid,
      error: isValid ? undefined : message,
    };
  };
}

/**
 * Validate email format
 */
export function email(message = "Please enter a valid email address"): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true }; // Empty is valid for optional fields
    }
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const isValid = emailRegex.test(value.trim());
    return {
      valid: isValid,
      error: isValid ? undefined : message,
    };
  };
}

/**
 * Validate minimum length
 */
export function minLength(min: number, message?: string): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true }; // Empty is valid for optional fields
    }
    const isValid = value.length >= min;
    return {
      valid: isValid,
      error: isValid ? undefined : message || `Must be at least ${min} characters`,
    };
  };
}

/**
 * Validate maximum length
 */
export function maxLength(max: number, message?: string): Validator {
  return (value: string) => {
    const isValid = value.length <= max;
    return {
      valid: isValid,
      error: isValid ? undefined : message || `Must be no more than ${max} characters`,
    };
  };
}

/**
 * Validate that value matches a pattern
 */
export function pattern(regex: RegExp, message = "Invalid format"): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true }; // Empty is valid for optional fields
    }
    const isValid = regex.test(value);
    return {
      valid: isValid,
      error: isValid ? undefined : message,
    };
  };
}

/**
 * Validate password strength
 */
export function password(options?: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
}): Validator {
  const {
    minLength: min = 6,
    requireUppercase = false,
    requireLowercase = false,
    requireNumber = false,
    requireSpecial = false,
  } = options || {};

  return (value: string) => {
    if (!value) {
      return { valid: true };
    }

    if (value.length < min) {
      return { valid: false, error: `Password must be at least ${min} characters` };
    }

    if (requireUppercase && !/[A-Z]/.test(value)) {
      return { valid: false, error: "Password must contain an uppercase letter" };
    }

    if (requireLowercase && !/[a-z]/.test(value)) {
      return { valid: false, error: "Password must contain a lowercase letter" };
    }

    if (requireNumber && !/\d/.test(value)) {
      return { valid: false, error: "Password must contain a number" };
    }

    if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      return { valid: false, error: "Password must contain a special character" };
    }

    return { valid: true };
  };
}

/**
 * Validate that value is a valid URL
 */
export function url(message = "Please enter a valid URL"): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true };
    }
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: message };
    }
  };
}

/**
 * Validate that value is a number within range
 */
export function numberRange(min?: number, max?: number, message?: string): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true };
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: "Please enter a valid number" };
    }
    if (min !== undefined && num < min) {
      return { valid: false, error: message || `Must be at least ${min}` };
    }
    if (max !== undefined && num > max) {
      return { valid: false, error: message || `Must be no more than ${max}` };
    }
    return { valid: true };
  };
}

/**
 * Validate phone number (basic format)
 */
export function phone(message = "Please enter a valid phone number"): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true };
    }
    // Basic phone validation - allows various formats
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    const digitsOnly = value.replace(/\D/g, "");
    const isValid = phoneRegex.test(value) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
    return {
      valid: isValid,
      error: isValid ? undefined : message,
    };
  };
}

// ============================================================================
// VALIDATOR COMBINATORS
// ============================================================================

/**
 * Combine multiple validators - all must pass
 */
export function all(...validators: Validator[]): Validator {
  return (value: string) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}

/**
 * Run validators in sequence, short-circuiting on first error
 */
export function chain(...validators: Validator[]): Validator {
  return all(...validators);
}

/**
 * Make a field optional (skip validation if empty)
 */
export function optional(validator: Validator): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true };
    }
    return validator(value);
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a single value with multiple validators
 */
export function validate(value: string, ...validators: Validator[]): ValidationResult {
  return all(...validators)(value);
}

/**
 * Check if an email is unique (not in a list of existing emails)
 */
export function uniqueEmail(existingEmails: string[], message = "This email is already added"): Validator {
  return (value: string) => {
    if (!value.trim()) {
      return { valid: true };
    }
    const normalizedValue = value.toLowerCase().trim();
    const isDuplicate = existingEmails
      .map((e) => e.toLowerCase().trim())
      .filter((e) => e.length > 0)
      .includes(normalizedValue);
    return {
      valid: !isDuplicate,
      error: isDuplicate ? message : undefined,
    };
  };
}

/**
 * Validate a form object with validation rules
 */
export function validateForm<T extends Record<string, string>>(
  values: T,
  rules: Partial<Record<keyof T, Validator[]>>
): Record<keyof T, ValidationResult> {
  const results = {} as Record<keyof T, ValidationResult>;

  for (const key of Object.keys(values) as Array<keyof T>) {
    const value = values[key];
    const fieldRules = rules[key];

    if (fieldRules && fieldRules.length > 0) {
      results[key] = all(...fieldRules)(value);
    } else {
      results[key] = { valid: true };
    }
  }

  return results;
}

/**
 * Check if all fields in a validation result are valid
 */
export function isFormValid(results: Record<string, ValidationResult>): boolean {
  return Object.values(results).every((r) => r.valid);
}

/**
 * Get all errors from a validation result
 */
export function getFormErrors(results: Record<string, ValidationResult>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, result] of Object.entries(results)) {
    if (!result.valid && result.error) {
      errors[key] = result.error;
    }
  }
  return errors;
}

// ============================================================================
// DEBOUNCED VALIDATION
// ============================================================================

/**
 * Create a debounced validator for real-time validation
 */
export function createDebouncedValidator(
  validator: Validator,
  delayMs = 300
): (value: string, callback: (result: ValidationResult) => void) => () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (value: string, callback: (result: ValidationResult) => void) => {
    // Cancel any pending validation
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Schedule new validation
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delayMs);

    // Return cancel function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  };
}

// ============================================================================
// COMMON FIELD VALIDATORS
// ============================================================================

export const validators = {
  // Authentication
  loginEmail: all(required("Email is required"), email()),
  loginPassword: required("Password is required"),
  registerEmail: all(required("Email is required"), email()),
  registerPassword: all(required("Password is required"), minLength(6, "Password must be at least 6 characters")),
  registerName: all(required("Name is required"), minLength(2, "Name must be at least 2 characters")),

  // Contract fields
  contractTitle: all(required("Title is required"), minLength(3, "Title must be at least 3 characters")),
  signerEmail: all(required("Email is required"), email()),
  signerName: all(required("Name is required"), minLength(2, "Name must be at least 2 characters")),

  // Amount fields
  amount: all(required("Amount is required"), numberRange(0, undefined, "Amount must be positive")),

  // Optional fields
  optionalEmail: optional(email()),
  optionalPhone: optional(phone()),
  optionalUrl: optional(url()),
};
