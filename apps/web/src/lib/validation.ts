/**
 * Input Validation Utilities
 * Production-grade validation for all user inputs
 */

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface ValidationRule<T = string> {
    validate: (value: T) => boolean;
    message: string;
}

// ============================================
// STRING VALIDATORS
// ============================================

export const validators = {
    /**
     * Check if value is not empty
     */
    required: (message = 'This field is required'): ValidationRule => ({
        validate: (value) => value !== undefined && value !== null && value.trim().length > 0,
        message,
    }),

    /**
     * Check minimum length
     */
    minLength: (min: number, message?: string): ValidationRule => ({
        validate: (value) => value.length >= min,
        message: message || `Must be at least ${min} characters`,
    }),

    /**
     * Check maximum length
     */
    maxLength: (max: number, message?: string): ValidationRule => ({
        validate: (value) => value.length <= max,
        message: message || `Must be no more than ${max} characters`,
    }),

    /**
     * Email validation
     */
    email: (message = 'Please enter a valid email address'): ValidationRule => ({
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message,
    }),

    /**
     * URL validation
     */
    url: (message = 'Please enter a valid URL'): ValidationRule => ({
        validate: (value) => {
            if (!value) return true; // Allow empty
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        },
        message,
    }),

    /**
     * Username validation (alphanumeric + underscore)
     */
    username: (message = 'Username can only contain letters, numbers, and underscores'): ValidationRule => ({
        validate: (value) => /^[a-zA-Z0-9_]+$/.test(value),
        message,
    }),

    /**
     * Password strength
     */
    password: (message = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number'): ValidationRule => ({
        validate: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value),
        message,
    }),

    /**
     * Simple password (less strict)
     */
    simplePassword: (message = 'Password must be at least 6 characters'): ValidationRule => ({
        validate: (value) => value.length >= 6,
        message,
    }),

    /**
     * Confirm password match
     */
    matches: (compareValue: string, message = 'Passwords do not match'): ValidationRule => ({
        validate: (value) => value === compareValue,
        message,
    }),

    /**
     * Pattern match
     */
    pattern: (regex: RegExp, message: string): ValidationRule => ({
        validate: (value) => regex.test(value),
        message,
    }),

    /**
     * Custom validator
     */
    custom: (fn: (value: string) => boolean, message: string): ValidationRule => ({
        validate: fn,
        message,
    }),
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate a single value against multiple rules
 */
export function validate(value: string, rules: ValidationRule[]): ValidationResult {
    for (const rule of rules) {
        if (!rule.validate(value)) {
            return { isValid: false, error: rule.message };
        }
    }
    return { isValid: true };
}

/**
 * Validate multiple fields at once
 */
export function validateForm<T extends Record<string, string>>(
    values: T,
    schema: Partial<Record<keyof T, ValidationRule[]>>
): Record<keyof T, ValidationResult> {
    const results = {} as Record<keyof T, ValidationResult>;

    for (const key of Object.keys(schema) as (keyof T)[]) {
        const rules = schema[key];
        const value = values[key] || '';
        results[key] = rules ? validate(value, rules) : { isValid: true };
    }

    return results;
}

/**
 * Check if all validation results are valid
 */
export function isFormValid(results: Record<string, ValidationResult>): boolean {
    return Object.values(results).every((r) => r.isValid);
}

/**
 * Get first error from validation results
 */
export function getFirstError(results: Record<string, ValidationResult>): string | undefined {
    for (const result of Object.values(results)) {
        if (!result.isValid && result.error) {
            return result.error;
        }
    }
    return undefined;
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize for SQL (basic - use parameterized queries instead)
 */
export function sanitizeSql(input: string): string {
    return input.replace(/['";\\]/g, '');
}

/**
 * Remove extra whitespace
 */
export function normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(input: string, maxLength: number): string {
    if (input.length <= maxLength) return input;
    return input.slice(0, maxLength - 3) + '...';
}

export default validators;
