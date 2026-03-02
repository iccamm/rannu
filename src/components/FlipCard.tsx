'use client';

import { useState } from 'react';
import styles from './FlipCard.module.css';

interface FlipCardProps {
    mythText: string;
    factText: string;
    title?: string;
}

export default function FlipCard({ mythText, factText, title }: FlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className={`${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? 'Klik untuk lihat mitos' : 'Klik untuk lihat fakta'}
            onKeyDown={(e) => e.key === 'Enter' && setIsFlipped(!isFlipped)}
        >
            <div className={styles.flipInner}>
                {/* Front: Myth */}
                <div className={`${styles.flipFace} ${styles.front}`}>
                    <span className={styles.tag}>🚫 Mitos</span>
                    {title && <h4 className={styles.title}>{title}</h4>}
                    <p className={styles.text}>{mythText}</p>
                    <span className={styles.hint}>
                        Ketuk untuk lihat faktanya
                        <span className={styles.hintArrow}>→</span>
                    </span>
                </div>
                {/* Back: Fact */}
                <div className={`${styles.flipFace} ${styles.back}`}>
                    <span className={styles.tag}>✅ Fakta Sains</span>
                    {title && <h4 className={styles.title}>{title}</h4>}
                    <p className={styles.text}>{factText}</p>
                    <span className={styles.hint}>
                        <span className={styles.hintArrow}>←</span>
                        Ketuk untuk kembali
                    </span>
                </div>
            </div>
        </div>
    );
}
