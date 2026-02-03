'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useCallback, useRef, useEffect, createContext, useContext } from 'react';

// ============================================
// ADVANCED FORM COMPONENTS
// Six22 Silk Road Renaissance Forms
// ============================================

// ============================================
// SEARCH INPUT
// Animated search with suggestions
// ============================================

interface SearchSuggestion {
    id: string;
    label: string;
    category?: string;
    icon?: ReactNode;
}

interface SearchInputProps {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    suggestions?: SearchSuggestion[];
    onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
    loading?: boolean;
    className?: string;
}

export function SearchInput({
    placeholder = 'Search...',
    value: controlledValue,
    onChange,
    onSearch,
    suggestions = [],
    onSuggestionSelect,
    loading = false,
    className = '',
}: SearchInputProps) {
    const [internalValue, setInternalValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const value = controlledValue !== undefined ? controlledValue : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        onChange?.(newValue);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                onSuggestionSelect?.(suggestions[selectedIndex]);
            } else {
                onSearch?.(value);
            }
        } else if (e.key === 'Escape') {
            setIsFocused(false);
            inputRef.current?.blur();
        }
    };

    const showSuggestions = isFocused && (suggestions.length > 0 || loading);

    return (
        <div className={`relative ${className}`}>
            <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl
                bg-white/5 border transition-all duration-300
                ${isFocused
                    ? 'border-violet-500/50 bg-white/10 shadow-lg shadow-violet-500/10'
                    : 'border-white/10 hover:border-white/20'}
            `}>
                <svg
                    className={`w-5 h-5 transition-colors ${isFocused ? 'text-violet-400' : 'text-white/40'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white placeholder:text-white/30 focus:outline-none"
                />

                {loading && (
                    <motion.div
                        className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                )}

                {value && !loading && (
                    <button
                        onClick={() => {
                            setInternalValue('');
                            onChange?.('');
                        }}
                        className="text-white/40 hover:text-white/60"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showSuggestions && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 py-2 bg-[#0a0a12] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        {loading ? (
                            <div className="px-4 py-3 text-white/40 text-center">Searching...</div>
                        ) : suggestions.length > 0 ? (
                            suggestions.map((suggestion, i) => (
                                <button
                                    key={suggestion.id}
                                    onClick={() => onSuggestionSelect?.(suggestion)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-2 text-left
                                        transition-colors
                                        ${i === selectedIndex ? 'bg-violet-500/20' : 'hover:bg-white/5'}
                                    `}
                                >
                                    {suggestion.icon && (
                                        <span className="text-white/40">{suggestion.icon}</span>
                                    )}
                                    <div className="flex-1">
                                        <div className="text-white">{suggestion.label}</div>
                                        {suggestion.category && (
                                            <div className="text-xs text-white/40">{suggestion.category}</div>
                                        )}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-3 text-white/40 text-center">No results found</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// SELECT DROPDOWN
// Animated custom select
// ============================================

interface SelectOption {
    value: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
}

interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    className?: string;
}

export function Select({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    error,
    className = '',
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen && highlightedIndex >= 0) {
                const option = options[highlightedIndex];
                if (!option.disabled) {
                    onChange?.(option.value);
                    setIsOpen(false);
                }
            } else {
                setIsOpen(true);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else {
                setHighlightedIndex(i => Math.min(i + 1, options.length - 1));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm text-white/60 mb-2">{label}</label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    bg-white/5 border transition-all duration-300 text-left
                    ${isOpen
                        ? 'border-violet-500/50 ring-2 ring-violet-500/20'
                        : error
                            ? 'border-rose-500/50'
                            : 'border-white/10 hover:border-white/20'}
                `}
            >
                {selectedOption?.icon && (
                    <span className="text-white/60">{selectedOption.icon}</span>
                )}
                <span className={`flex-1 ${selectedOption ? 'text-white' : 'text-white/30'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <motion.svg
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="w-4 h-4 text-white/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
            </button>

            {error && (
                <p className="mt-1 text-sm text-rose-400">{error}</p>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 py-2 bg-[#0a0a12] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        {options.map((option, i) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    if (!option.disabled) {
                                        onChange?.(option.value);
                                        setIsOpen(false);
                                    }
                                }}
                                onMouseEnter={() => setHighlightedIndex(i)}
                                disabled={option.disabled}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2 text-left
                                    transition-colors
                                    ${option.disabled
                                        ? 'opacity-40 cursor-not-allowed'
                                        : i === highlightedIndex
                                            ? 'bg-violet-500/20'
                                            : 'hover:bg-white/5'}
                                    ${option.value === value ? 'text-violet-400' : 'text-white'}
                                `}
                            >
                                {option.icon && <span>{option.icon}</span>}
                                <span>{option.label}</span>
                                {option.value === value && (
                                    <svg className="w-4 h-4 ml-auto text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// TEXTAREA
// Auto-resizing text area
// ============================================

interface TextareaProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    maxLength?: number;
    minRows?: number;
    maxRows?: number;
    className?: string;
}

export function Textarea({
    value = '',
    onChange,
    placeholder,
    label,
    error,
    maxLength,
    minRows = 3,
    maxRows = 10,
    className = '',
}: TextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const lineHeight = 24;
            const minHeight = minRows * lineHeight;
            const maxHeight = maxRows * lineHeight;
            const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
            textarea.style.height = `${newHeight}px`;
        }
    }, [value, minRows, maxRows]);

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm text-white/60 mb-2">{label}</label>
            )}

            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={`
                        w-full px-4 py-3 rounded-xl resize-none
                        bg-white/5 border transition-all duration-300
                        text-white placeholder:text-white/30
                        focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20
                        ${error ? 'border-rose-500/50' : 'border-white/10'}
                    `}
                    style={{ lineHeight: '24px' }}
                />

                {maxLength && (
                    <div className={`absolute bottom-2 right-3 text-xs ${value.length >= maxLength ? 'text-rose-400' : 'text-white/30'}`}>
                        {value.length}/{maxLength}
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-1 text-sm text-rose-400">{error}</p>
            )}
        </div>
    );
}

// ============================================
// CHECKBOX
// Animated checkbox with label
// ============================================

interface CheckboxProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: ReactNode;
    description?: string;
    disabled?: boolean;
    className?: string;
}

export function Checkbox({
    checked = false,
    onChange,
    label,
    description,
    disabled = false,
    className = '',
}: CheckboxProps) {
    return (
        <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative mt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => !disabled && onChange?.(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                />
                <motion.div
                    animate={{
                        backgroundColor: checked ? 'rgb(139, 92, 246)' : 'rgba(255, 255, 255, 0.05)',
                        borderColor: checked ? 'rgb(139, 92, 246)' : 'rgba(255, 255, 255, 0.1)',
                    }}
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
                >
                    <motion.svg
                        initial={false}
                        animate={{
                            scale: checked ? 1 : 0,
                            opacity: checked ? 1 : 0
                        }}
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </motion.svg>
                </motion.div>
            </div>

            {(label || description) && (
                <div>
                    {label && <div className="text-white">{label}</div>}
                    {description && <div className="text-sm text-white/50">{description}</div>}
                </div>
            )}
        </label>
    );
}

// ============================================
// TOGGLE SWITCH
// iOS-style toggle
// ============================================

interface ToggleProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Toggle({
    checked = false,
    onChange,
    label,
    disabled = false,
    size = 'md',
    className = '',
}: ToggleProps) {
    const sizes = {
        sm: { track: 'w-8 h-5', thumb: 'w-3 h-3', translate: 14 },
        md: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 20 },
        lg: { track: 'w-14 h-8', thumb: 'w-6 h-6', translate: 24 },
    };

    const { track, thumb, translate } = sizes[size];

    return (
        <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange?.(!checked)}
                className={`
                    relative rounded-full transition-colors shrink-0
                    ${track}
                    ${checked ? 'bg-violet-500' : 'bg-white/10'}
                `}
            >
                <motion.div
                    animate={{ x: checked ? translate : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`
                        absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md
                        ${thumb}
                    `}
                />
            </button>

            {label && <span className="text-white">{label}</span>}
        </label>
    );
}

// ============================================
// SLIDER
// Range input with value display
// ============================================

interface SliderProps {
    value?: number;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    showValue?: boolean;
    formatValue?: (value: number) => string;
    className?: string;
}

export function Slider({
    value = 0,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    showValue = true,
    formatValue = (v) => String(v),
    className = '',
}: SliderProps) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={className}>
            {(label || showValue) && (
                <div className="flex justify-between mb-2">
                    {label && <span className="text-sm text-white/60">{label}</span>}
                    {showValue && <span className="text-sm text-violet-400 font-medium">{formatValue(value)}</span>}
                </div>
            )}

            <div className="relative h-2">
                <div className="absolute inset-0 bg-white/10 rounded-full" />
                <motion.div
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-violet-500 to-rose-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange?.(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
                <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-violet-500"
                    style={{ left: `calc(${percentage}% - 8px)` }}
                />
            </div>
        </div>
    );
}

// ============================================
// FILE UPLOAD
// Drag and drop file input
// ============================================

interface FileUploadProps {
    onFiles?: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number; // bytes
    label?: string;
    description?: string;
    className?: string;
}

export function FileUpload({
    onFiles,
    accept,
    multiple = false,
    maxSize,
    label = 'Upload files',
    description = 'Drag and drop or click to browse',
    className = '',
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFiles = (files: FileList): File[] => {
        const validFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (maxSize && file.size > maxSize) {
                setError(`File "${file.name}" exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
                continue;
            }

            validFiles.push(file);
        }

        return validFiles;
    };

    const handleFiles = (files: FileList) => {
        setError(null);
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
            onFiles?.(validFiles);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    return (
        <div className={className}>
            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                    relative p-8 border-2 border-dashed rounded-xl
                    text-center cursor-pointer transition-all
                    ${isDragging
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    className="hidden"
                />

                <motion.div
                    animate={{ scale: isDragging ? 1.1 : 1 }}
                    className="w-12 h-12 mx-auto mb-4 rounded-full bg-violet-500/20 flex items-center justify-center"
                >
                    <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </motion.div>

                <p className="text-white font-medium">{label}</p>
                <p className="text-sm text-white/50 mt-1">{description}</p>
            </div>

            {error && (
                <p className="mt-2 text-sm text-rose-400">{error}</p>
            )}
        </div>
    );
}

// ============================================
// OTP INPUT
// One-time password input
// ============================================

interface OTPInputProps {
    length?: number;
    value?: string;
    onChange?: (value: string) => void;
    onComplete?: (value: string) => void;
    className?: string;
}

export function OTPInput({
    length = 6,
    value = '',
    onChange,
    onComplete,
    className = '',
}: OTPInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, char: string) => {
        if (!/^\d*$/.test(char)) return;

        const newValue = value.split('');
        newValue[index] = char;
        const joined = newValue.join('').slice(0, length);

        onChange?.(joined);

        if (joined.length === length) {
            onComplete?.(joined);
        }

        if (char && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        onChange?.(pastedData);

        if (pastedData.length === length) {
            onComplete?.(pastedData);
        }
    };

    return (
        <div className={`flex gap-2 justify-center ${className}`}>
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className={`
                        w-12 h-14 text-center text-xl font-bold
                        bg-white/5 border border-white/10 rounded-xl
                        text-white focus:outline-none focus:border-violet-500
                        transition-colors
                    `}
                />
            ))}
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type SearchSuggestion,
    type SearchInputProps,
    type SelectOption,
    type SelectProps,
    type TextareaProps,
    type CheckboxProps,
    type ToggleProps,
    type SliderProps,
    type FileUploadProps,
    type OTPInputProps,
};
