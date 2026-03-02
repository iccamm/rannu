'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './ProgressCircle.module.css';

interface ProgressCircleProps {
    score: number;
    maxScore?: number;
    threshold?: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
    sublabel?: string;
    centerContent?: React.ReactNode;
}

export default function ProgressCircle({
    score,
    maxScore = 8,
    threshold = 5,
    size = 180,
    strokeWidth = 12,
    label,
    sublabel,
    centerContent,
}: ProgressCircleProps) {
    const [animatedScore, setAnimatedScore] = useState(0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = animatedScore / maxScore;
    const dashOffset = circumference * (1 - progress);
    const isAchieved = score >= threshold;
    const prevScoreRef = useRef(0);

    useEffect(() => {
        const start = prevScoreRef.current;
        const end = score;
        const duration = 800;
        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            setAnimatedScore(start + (end - start) * eased);
            if (t < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        prevScoreRef.current = end;
    }, [score]);

    return (
        <div className={styles.container}>
            <svg width={size} height={size} className={styles.svg}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--border-light)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={isAchieved ? 'var(--accent)' : 'var(--secondary)'}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className={styles.progress}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                {/* Glow effect when achieved */}
                {isAchieved && (
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--accent-light)"
                        strokeWidth={strokeWidth + 8}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        opacity={0.3}
                        className={styles.progress}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                )}
            </svg>
            <div className={styles.center}>
                {centerContent ? (
                    centerContent
                ) : (
                    <>
                        <span className={styles.score}>{Math.round(animatedScore)}</span>
                        <span className={styles.maxScore}>/ {maxScore}</span>
                        {label && <span className={styles.label}>{label}</span>}
                        {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
                    </>
                )}
            </div>
        </div>
    );
}
