'use client';

import styles from './LoadingSkeleton.module.css';

interface LoadingSkeletonProps {
    variant?: 'text' | 'circle' | 'card';
    width?: string;
    height?: string;
    count?: number;
}

export default function LoadingSkeleton({
    variant = 'text',
    width,
    height,
    count = 1,
}: LoadingSkeletonProps) {
    const items = Array.from({ length: count });

    return (
        <>
            {items.map((_, i) => (
                <div
                    key={i}
                    className={`skeleton ${styles[variant]}`}
                    style={{
                        width: width || (variant === 'circle' ? '48px' : '100%'),
                        height: height || (variant === 'text' ? '16px' : variant === 'circle' ? '48px' : '120px'),
                        marginBottom: i < count - 1 ? '8px' : 0,
                    }}
                />
            ))}
        </>
    );
}
