'use client';

import React, { useState, useCallback, FormEvent, ChangeEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LoadingButton } from './LoadingStates';

// ============================================
// FORM TYPES
// ============================================

export interface FormField {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date';
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    options?: { value: string; label: string }[];
    validation?: (value: string) => string | null;
    minLength?: number;
    maxLength?: number;
}

export interface FormState {
    values: Record<string, string | boolean>;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    isSubmitting: boolean;
}

// ============================================
// USE FORM HOOK
// ============================================

interface UseFormOptions {
    initialValues?: Record<string, string | boolean>;
    onSubmit: (values: Record<string, string | boolean>) => Promise<void>;
    validate?: (values: Record<string, string | boolean>) => Record<string, string>;
}

export function useForm({ initialValues = {}, onSubmit, validate }: UseFormOptions) {
    const [values, setValues] = useState<Record<string, string | boolean>>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setValue = useCallback((name: string, value: string | boolean) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    }, [errors]);

    const setTouchedField = useCallback((name: string) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
    }, []);

    const handleChange = useCallback((
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setValue(name, finalValue);
    }, [setValue]);

    const handleBlur = useCallback((
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setTouchedField(e.target.name);
    }, [setTouchedField]);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    const handleSubmit = useCallback(async (e?: FormEvent) => {
        e?.preventDefault();

        // Run validation
        if (validate) {
            const validationErrors = validate(values);
            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                // Mark all fields as touched
                setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
                return;
            }
        }

        setIsSubmitting(true);
        try {
            await onSubmit(values);
        } catch (error) {
            if (error instanceof Error) {
                setErrors({ form: error.message });
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [values, validate, onSubmit]);

    return {
        values,
        errors,
        touched,
        isSubmitting,
        setValue,
        setTouchedField,
        handleChange,
        handleBlur,
        handleSubmit,
        reset,
        setErrors,
    };
}

// ============================================
// FORM COMPONENTS
// ============================================

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'date';
    placeholder?: string;
    error?: string;
    touched?: boolean;
    disabled?: boolean;
    required?: boolean;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: ChangeEvent<HTMLInputElement>) => void;
    icon?: ReactNode;
}

export function InputField({
    label,
    name,
    value,
    type = 'text',
    placeholder,
    error,
    touched,
    disabled = false,
    required = false,
    onChange,
    onBlur,
    icon,
}: InputFieldProps) {
    const showError = touched && error;

    return (
        <div className="space-y-1.5">
            <label htmlFor={name} className="block text-sm font-medium text-white/70">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                        {icon}
                    </div>
                )}
                <input
                    id={name}
                    name={name}
                    type={type}
                    value={value}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    onChange={onChange}
                    onBlur={onBlur}
                    className={`
                        w-full px-4 py-3 rounded-xl bg-white/5 border text-white
                        placeholder-white/30 focus:outline-none transition-colors
                        ${icon ? 'pl-10' : ''}
                        ${showError
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-white/10 focus:border-cyan-500/50'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                />
            </div>
            {showError && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
}

interface TextAreaFieldProps extends Omit<InputFieldProps, 'type' | 'icon'> {
    rows?: number;
    maxLength?: number;
}

export function TextAreaField({
    label,
    name,
    value,
    placeholder,
    error,
    touched,
    disabled = false,
    required = false,
    rows = 4,
    maxLength,
    onChange,
    onBlur,
}: TextAreaFieldProps) {
    const showError = touched && error;

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between">
                <label htmlFor={name} className="block text-sm font-medium text-white/70">
                    {label}
                    {required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {maxLength && (
                    <span className={`text-xs ${value.length > maxLength * 0.9 ? 'text-amber-400' : 'text-white/40'}`}>
                        {value.length}/{maxLength}
                    </span>
                )}
            </div>
            <textarea
                id={name}
                name={name}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                rows={rows}
                maxLength={maxLength}
                onChange={onChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
                onBlur={onBlur as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
                className={`
                    w-full px-4 py-3 rounded-xl bg-white/5 border text-white resize-none
                    placeholder-white/30 focus:outline-none transition-colors
                    ${showError
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-white/10 focus:border-cyan-500/50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            />
            {showError && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
}

interface SelectFieldProps extends Omit<InputFieldProps, 'type' | 'icon'> {
    options: { value: string; label: string }[];
}

export function SelectField({
    label,
    name,
    value,
    options,
    error,
    touched,
    disabled = false,
    required = false,
    onChange,
    onBlur,
}: SelectFieldProps) {
    const showError = touched && error;

    return (
        <div className="space-y-1.5">
            <label htmlFor={name} className="block text-sm font-medium text-white/70">
                {label}
                {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <select
                id={name}
                name={name}
                value={value}
                disabled={disabled}
                required={required}
                onChange={onChange as unknown as React.ChangeEventHandler<HTMLSelectElement>}
                onBlur={onBlur as unknown as React.FocusEventHandler<HTMLSelectElement>}
                className={`
                    w-full px-4 py-3 rounded-xl bg-white/5 border text-white
                    focus:outline-none transition-colors appearance-none cursor-pointer
                    ${showError
                        ? 'border-red-500/50 focus:border-red-500'
                        : 'border-white/10 focus:border-cyan-500/50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-gray-900">
                        {opt.label}
                    </option>
                ))}
            </select>
            {showError && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
}

// ============================================
// FORM CONTAINER
// ============================================

interface FormContainerProps {
    children: ReactNode;
    onSubmit: (e: FormEvent) => void;
    className?: string;
}

export function FormContainer({ children, onSubmit, className = '' }: FormContainerProps) {
    return (
        <form onSubmit={onSubmit} className={`space-y-5 ${className}`}>
            {children}
        </form>
    );
}

// ============================================
// EXPORTS
// ============================================

const FormComponents = {
    useForm,
    InputField,
    TextAreaField,
    SelectField,
    FormContainer,
    LoadingButton,
};

export default FormComponents;
