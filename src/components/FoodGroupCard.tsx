'use client';

import styles from './FoodGroupCard.module.css';

interface FoodGroupCardProps {
    label: string;
    description: string;
    icon: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export default function FoodGroupCard({
    label,
    description,
    icon,
    checked,
    onChange,
    disabled = false,
}: FoodGroupCardProps) {
    return (
        <button
            className={`${styles.card} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''}`}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            type="button"
            aria-pressed={checked}
            aria-label={`${label}: ${checked ? 'sudah dipilih' : 'belum dipilih'}`}
        >
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>{label}</span>
            <span className={styles.description}>{description}</span>
            <span className={styles.checkbox}>
                {checked && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </span>
        </button>
    );
}
