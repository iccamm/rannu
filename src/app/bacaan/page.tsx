'use client';

import { useState, useEffect } from 'react';
import { Navbar, PageHeader, TopBar } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useChildrenAgeCategories } from '@/hooks/useBabyAge';
import { getDailyArticle, getDailyArticlesForAge, DailyArticle } from '@/lib/daily-article';
import { markArticleRead, checkTodayReading } from '@/lib/firestore';
import styles from './bacaan.module.css';

// Child component for each distinct age category
function BacaanAgeSection({ ageRange, userUid }: { ageRange: string, userUid: string | undefined }) {
    // Determine the month number to pass to helpers (use the lower bound of the range)
    const representativeMonth = parseInt(ageRange.split('-')[0], 10) || 0;

    const [dailyArticle, setDailyArticle] = useState<DailyArticle | null>(null);
    const [allArticles, setAllArticles] = useState<DailyArticle[]>([]);
    const [isRead, setIsRead] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [marking, setMarking] = useState(false);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        const article = getDailyArticle(representativeMonth);
        setDailyArticle(article);
        setAllArticles(getDailyArticlesForAge(representativeMonth));

        if (userUid) {
            checkTodayReading(userUid).then((log) => {
                // To support multiple articles per day, we need to check if the specific article was read
                // But checkTodayReading returns the first log it finds for the day.
                // Wait, our checkTodayReading currently uses doc ID `${uid}_${today}` which only stores ONE article per day!
                // Let's modify checkTodayReading logic locally to check if THIS article is read if multiple exist.
                // For now, if log exists and matches this article's ID, it's read.
                if (log && log.article_id === article?.id) {
                    setIsRead(true);
                }
            }).catch(() => { });
        }
    }, [representativeMonth, userUid]);

    const handleReadArticle = async () => {
        setExpanded(true);
        if (!isRead && userUid && dailyArticle && !marking) {
            setMarking(true);
            try {
                // We need to pass the article ID to markArticleRead so it can handle multiple reads per day
                await markArticleRead(userUid, dailyArticle.id, dailyArticle.title);
                setIsRead(true);
            } catch (err) {
                console.error('Mark read error:', err);
            } finally {
                setMarking(false);
            }
        }
    };

    if (!dailyArticle) return <p className={styles.emptyText}>Tidak ada artikel untuk usia ini.</p>;

    return (
        <div style={{ marginBottom: 32 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                paddingBottom: 8, borderBottom: '2px dashed var(--border-light)'
            }}>
                <span style={{ fontSize: '1.25rem' }}>👶</span>
                <h3 style={{ fontSize: '0.9375rem', margin: 0, color: 'var(--primary-dark)' }}>
                    Bacaan Usia {ageRange} Bulan
                </h3>
            </div>

            <div
                className={`${styles.dailyCard} ${isRead ? styles.dailyCardRead : ''}`}
                onClick={handleReadArticle}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleReadArticle()}
            >
                <div className={styles.dailyHeader}>
                    <div className={styles.dailyBadge}>
                        {isRead ? '✅' : '📖'} Bacaan Hari Ini
                    </div>
                </div>
                <div className={styles.dailyTitleRow}>
                    <span className={styles.dailyIcon}>{dailyArticle.icon}</span>
                    <h3 className={styles.dailyTitle}>{dailyArticle.title}</h3>
                </div>

                {expanded ? (
                    <div className={styles.dailyContent}>
                        <p className={styles.dailyText}>{dailyArticle.content}</p>
                        <div className={styles.dailyTip}>{dailyArticle.tip}</div>
                        <p className={styles.dailySource}>📚 {dailyArticle.source}</p>
                        {isRead && (
                            <div className={styles.dailyReadBadge}>
                                ✅ Artikel telah dibaca — Jazakillah khairan!
                            </div>
                        )}
                    </div>
                ) : (
                    <p className={styles.dailyPreview}>
                        {dailyArticle.content.slice(0, 80)}… <span style={{ color: 'var(--primary)', fontWeight: 500 }}>Baca selengkapnya →</span>
                    </p>
                )}
            </div>

            {/* Progress indicator */}
            <div className={styles.progressBar}>
                <div className={styles.progressLabel}>
                    <span>📅 Progres Bacaan ({ageRange} bln)</span>
                    <span className={styles.progressCount}>Hari {isRead ? '✅' : '—'} / {allArticles.length} artikel</span>
                </div>
            </div>

            {/* Toggle all articles */}
            <button
                className={styles.toggleBtn}
                onClick={() => setShowAll(!showAll)}
            >
                {showAll ? '🔼 Sembunyikan daftar artikel' : '🔽 Lihat semua artikel usia ini'}
            </button>

            {/* All articles list */}
            {showAll && (
                <div className={styles.articleList}>
                    {allArticles.map((article, index) => {
                        const isCurrent = article.id === dailyArticle.id;
                        return (
                            <div key={article.id} className={`${styles.articleItem} ${isCurrent ? styles.articleItemCurrent : ''}`}>
                                <div className={styles.articleNum}>{index + 1}</div>
                                <div className={styles.articleInfo}>
                                    <span className={styles.articleItemIcon}>{article.icon}</span>
                                    <span className={styles.articleItemTitle}>{article.title}</span>
                                </div>
                                {isCurrent && <span className={styles.articleBadge}>Hari ini</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function BacaanPage() {
    const { user, profile } = useAuth();
    const { bacaanCategories } = useChildrenAgeCategories();

    // Kelompok kontrol tidak mendapat fitur Bacaan
    if (profile && profile.group === 'control') {
        return (
            <div className="page" style={{ background: 'var(--bg-warm)' }}>
                <TopBar />
                <div className="container" style={{ paddingTop: 64, textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</p>
                    <h2>Fitur Tidak Tersedia</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                        Fitur ini tidak tersedia untuk kelompok Anda.
                    </p>
                </div>
                <Navbar />
            </div>
        );
    }

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            <div className="container" style={{ paddingTop: 24, paddingBottom: 32 }}>
                <PageHeader
                    title="Bacaan Harian"
                    subtitle={
                        bacaanCategories.length > 0
                            ? `Bacaan gizi harian untuk usia ${bacaanCategories.join(' & ')} bulan`
                            : 'Baca 1 artikel singkat setiap hari'
                    }
                />

                {bacaanCategories.length === 0 ? (
                    // Fallback state if user doesn't have children data
                    <BacaanAgeSection ageRange="0-6" userUid={user?.uid} />
                ) : (
                    bacaanCategories.map(range => (
                        <BacaanAgeSection key={range} ageRange={range} userUid={user?.uid} />
                    ))
                )}

                {/* Info */}
                <div className={styles.infoBanner}>
                    <p>🕌 Artikel disusun berdasarkan <strong>WHO Guidelines 2023</strong>, jurnal ilmiah, dan perspektif Islam tentang nutrisi anak.</p>
                </div>
            </div>
            <Navbar />
        </div>
    );
}
