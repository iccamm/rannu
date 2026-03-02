'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './CustomSelect.module.css';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface CustomSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
}

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = 'Pilih...',
    disabled = false,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
    const [searchString, setSearchString] = useState('');
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    const calcPos = useCallback(() => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4 + window.scrollY, left: r.left + window.scrollX, width: r.width });
    }, []);

    // Recalculate on open
    useEffect(() => {
        if (isOpen) calcPos();
    }, [isOpen, calcPos]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        function handleClick(e: MouseEvent) {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            ) return;
            setIsOpen(false);
        }
        function handleScroll() {
            calcPos();
        }
        document.addEventListener('mousedown', handleClick);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen, calcPos]);

    // Scroll active item into view when value changes and dropdown is open
    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const activeEl = dropdownRef.current.querySelector<HTMLDivElement>(`.${styles.optionActive}`);
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [isOpen, value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(v => !v);
            return;
        }

        if (e.key === 'Escape') {
            setIsOpen(false);
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
                return;
            }
            const currentIndex = options.findIndex(o => o.value === value);
            let nextIndex = currentIndex;
            const step = e.key === 'ArrowDown' ? 1 : -1;
            nextIndex += step;
            while (nextIndex >= 0 && nextIndex < options.length) {
                if (!options[nextIndex].disabled) {
                    onChange(options[nextIndex].value);
                    break;
                }
                nextIndex += step;
            }
            return;
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const char = e.key.toLowerCase();
            const newSearchString = searchString + char;
            setSearchString(newSearchString);

            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                setSearchString('');
            }, 600);

            // Find matching option
            const matchIndex = options.findIndex(opt =>
                !opt.disabled && opt.label.toLowerCase().startsWith(newSearchString)
            );

            if (matchIndex !== -1) {
                onChange(options[matchIndex].value);
            } else {
                // fallback for repeated single character presses
                if (newSearchString.length > 1 && newSearchString.split('').every(c => c === char)) {
                    const matches = options.filter(opt => !opt.disabled && opt.label.toLowerCase().startsWith(char));
                    if (matches.length > 0) {
                        const currentMatchIdx = matches.findIndex(m => m.value === value);
                        const nextItem = matches[(currentMatchIdx + 1) % matches.length];
                        if (nextItem) onChange(nextItem.value);
                    }
                }
            }
        }
    };

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={styles.wrapper}>
            <button
                type="button"
                ref={triggerRef}
                className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''} ${disabled ? styles.triggerDisabled : ''}`}
                onClick={() => { if (!disabled) setIsOpen(v => !v); }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
            >
                <span className={!selectedOption ? styles.placeholder : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className={styles.dropdown}
                    style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width }}
                >
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={`${styles.option} ${opt.value === value ? styles.optionActive : ''} ${opt.disabled ? styles.optionDisabled : ''}`}
                            onClick={() => { if (!opt.disabled) { onChange(opt.value); setIsOpen(false); } }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}
