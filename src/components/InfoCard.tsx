'use client';

import { useState, useRef, useEffect } from 'react';
import { Info, Utensils, Scale, Activity, ChevronDown } from 'lucide-react';
import styles from './InfoCard.module.css';

interface InfoCardProps {
    title: string;
    mythText?: string;
    factText: string;
    source?: string;
    category: string;
}

export default function InfoCard({ title, mythText, factText, source, category }: InfoCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [needsTruncation, setNeedsTruncation] = useState(false);
    const factRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (factRef.current) {
            // Check if text overflows 3 lines (~4.8em)
            const lineHeight = parseFloat(getComputedStyle(factRef.current).lineHeight) || 24;
            setNeedsTruncation(factRef.current.scrollHeight > lineHeight * 3.2);
        }
    }, [factText]);

    const getIcon = () => {
        const size = 24;
        switch (category) {
            case 'tekstur': return <Utensils size={size} color="var(--primary)" />;
            case 'porsi': return <Scale size={size} color="var(--secondary)" />;
            case 'mikrobioma': return <Activity size={size} color="var(--info)" />;
            default: return <Info size={size} color="var(--accent)" />;
        }
    };

    const getBorderClass = () => {
        switch (category) {
            case 'tekstur': return styles.borderTekstur;
            case 'porsi': return styles.borderPorsi;
            case 'mikrobioma': return styles.borderMikrobioma;
            default: return styles.borderDefault;
        }
    };

    const getIconWrapClass = () => {
        switch (category) {
            case 'tekstur': return styles.iconWrapTekstur;
            case 'porsi': return styles.iconWrapPorsi;
            case 'mikrobioma': return styles.iconWrapMikrobioma;
            default: return styles.iconWrapDefault;
        }
    };

    return (
        <div
            className={`${styles.infoCard} ${getBorderClass()}`}
            onClick={() => needsTruncation && setIsExpanded(!isExpanded)}
        >
            <div className={styles.headerRow}>
                <div className={`${styles.iconWrap} ${getIconWrapClass()}`}>
                    {getIcon()}
                </div>
                <div className={styles.contentBody}>
                    <h3 className={styles.cardTitle}>{title}</h3>

                    {mythText && (
                        <div className={styles.mythBlock}>
                            <span className={styles.mythLabel}>Mitos Masyarakat:</span>
                            <p className={styles.mythText}>&quot;{mythText}&quot;</p>
                        </div>
                    )}

                    <div className={styles.factBlock}>
                        <span className={styles.factLabel}>✅ Fakta &amp; Rekomendasi Medis:</span>
                        <p
                            ref={factRef}
                            className={`${styles.factTextContent} ${needsTruncation && !isExpanded ? styles.factCollapsed : styles.factExpanded
                                }`}
                        >
                            {factText}
                        </p>
                        {needsTruncation && (
                            <button
                                className={styles.toggleBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                aria-expanded={isExpanded}
                            >
                                {isExpanded ? 'Lebih sedikit' : 'Baca selengkapnya'}
                                <span className={`${styles.toggleChevron} ${isExpanded ? styles.toggleChevronUp : ''}`}>
                                    <ChevronDown size={14} />
                                </span>
                            </button>
                        )}
                    </div>

                    {source && (
                        <p className={styles.sourceText}>
                            <span>📚 Sumber:</span> {source}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
