'use client';

import { useState, useMemo, useCallback } from 'react';
import { Navbar, FlipCard, PageHeader, InfoCard, TopBar } from '@/components';
import { useChildrenAgeCategories } from '@/hooks/useBabyAge';
import educationData from '@/data/education.json';
import styles from './education.module.css';

type Category = 'semua' | 'mitos' | 'tekstur' | 'porsi' | 'mikrobioma';

const TABS: { key: Category; label: string; icon: string }[] = [
    { key: 'semua', label: 'Semua', icon: '📚' },
    { key: 'mitos', label: 'Mitos', icon: '🚫' },
    { key: 'tekstur', label: 'Tekstur', icon: '🍽️' },
    { key: 'porsi', label: 'Porsi', icon: '📏' },
    { key: 'mikrobioma', label: 'Mikrobioma', icon: '🦠' },
];

export default function EducationPage() {
    const [activeTab, setActiveTab] = useState<Category>('semua');
    const [animKey, setAnimKey] = useState(0);

    // Get distinct age categories for all baduta children
    const { eduCategories } = useChildrenAgeCategories();

    const handleTabChange = useCallback((tab: Category) => {
        setActiveTab(tab);
        setAnimKey((k) => k + 1);
    }, []);

    // Helper to get items for a specific age range and current tab
    const getItemsForRangeAndTab = useCallback((range: string) => {
        return educationData.filter(item => {
            const matchAge = item.age_range === range;
            const matchTab = activeTab === 'semua' || item.category === activeTab;
            return matchAge && matchTab;
        });
    }, [activeTab]);

    // Total count calculation based on user's specific age categories
    const getCategoryCount = useCallback((category: Category) => {
        // If no children, we show all data globally
        if (eduCategories.length === 0) {
            if (category === 'semua') return educationData.length;
            return educationData.filter((item) => item.category === category).length;
        }

        // If user has children, strictly count items that match their age categories
        return educationData.filter((item) => {
            const matchAge = eduCategories.includes(item.age_range);
            const matchCategory = category === 'semua' || item.category === category;
            return matchAge && matchCategory;
        }).length;
    }, [eduCategories]);

    const hasAnyContentForCurrentTab = eduCategories.length === 0
        ? getCategoryCount(activeTab) > 0
        : eduCategories.some(range => getItemsForRangeAndTab(range).length > 0);

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            <div className="container" style={{ paddingTop: 24, paddingBottom: 32 }}>
                {/* Header with floating emoji decoration */}
                <div className={styles.headerWrap}>
                    <PageHeader
                        title="Edukasi Gizi"
                        subtitle={
                            eduCategories.length > 0
                                ? `Konten edukasi khusus usia ${eduCategories.join(' & ')} bulan`
                                : 'Mitos vs Fakta Sains tentang nutrisi anak'
                        }
                    />
                    <span className={styles.headerEmoji} aria-hidden="true">🧬</span>
                </div>

                {/* Category Tabs — Animated pills */}
                <div className={styles.tabBar}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`${styles.tabPill} ${isActive ? styles.tabPillActive : ''}`}
                                aria-pressed={isActive}
                            >
                                <span className={styles.tabIcon}>{tab.icon}</span>
                                <span>{tab.label}</span>
                                <span className={styles.tabCount}>{getCategoryCount(tab.key)}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                {!hasAnyContentForCurrentTab ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📖</span>
                        <p className={styles.emptyTitle}>Tidak ada konten untuk kategori ini</p>
                        <p className={styles.emptyText}>
                            Coba pilih kategori lain atau lihat semua konten
                        </p>
                    </div>
                ) : (
                    <div className={styles.cardList} key={animKey}>
                        {eduCategories.length === 0 ? (
                            // Fallback for users with no children profile yet (show all matching tab)
                            educationData
                                .filter(item => activeTab === 'semua' || item.category === activeTab)
                                .map((item, index) => (
                                    <div key={item.id} className={styles.cardItem} style={{ animationDelay: `${index * 0.05}s` }}>
                                        {item.category === 'mitos' ? (
                                            <FlipCard title={item.title} mythText={item.myth_text} factText={item.fact_text} />
                                        ) : (
                                            <InfoCard title={item.title} mythText={item.myth_text} factText={item.fact_text} source={item.source} category={item.category} />
                                        )}
                                    </div>
                                ))
                        ) : (
                            // Render distinct sections for each age category
                            eduCategories.map((range) => {
                                const items = getItemsForRangeAndTab(range);
                                if (items.length === 0) return null;

                                return (
                                    <div key={range} style={{ marginBottom: 24 }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                                            paddingBottom: 8, borderBottom: '2px dashed var(--border-light)'
                                        }}>
                                            <span style={{ fontSize: '1.25rem' }}>👶</span>
                                            <h3 style={{ fontSize: '0.9375rem', margin: 0, color: 'var(--primary-dark)' }}>
                                                Usia {range} Bulan
                                            </h3>
                                            <span style={{
                                                marginLeft: 'auto', fontSize: '0.6875rem', fontWeight: 600,
                                                background: 'var(--primary-soft)', color: 'var(--primary)',
                                                padding: '2px 8px', borderRadius: '12px'
                                            }}>
                                                {items.length} konten
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {items.map((item, index) => (
                                                <div key={item.id} className={styles.cardItem} style={{ animationDelay: `${index * 0.05}s` }}>
                                                    {item.category === 'mitos' ? (
                                                        <FlipCard title={item.title} mythText={item.myth_text} factText={item.fact_text} />
                                                    ) : (
                                                        <InfoCard title={item.title} mythText={item.myth_text} factText={item.fact_text} source={item.source} category={item.category} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Info Banner — Enhanced */}
                <div className={styles.infoBanner}>
                    <p className={styles.infoBannerText}>
                        🔬 Semua informasi disusun berdasarkan <strong>Pedoman WHO 2023</strong> dan kajian ilmiah terkini tentang nutrisi pada bayi baduta.
                    </p>
                </div>
            </div>
            <Navbar />
        </div>
    );
}
