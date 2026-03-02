'use client';

import { useState } from 'react';
import { Navbar, PageHeader, TopBar } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { recordMythOpened } from '@/lib/gamification';
import mythbusterData from '@/data/mythbuster.json';
import styles from './mythbuster.module.css';

interface MythCard {
    id: string;
    category: string;
    age_range: string;
    title: string;
    myth_text: string;
    fact_text: string;
    source: string;
    context: string;
    icon: string;
}

/**
 * Menentukan mitos harian berdasarkan tanggal (rotasi terjadwal).
 * Setiap hari muncul 1 mitos baru.
 */
function getDailyMythIndex(): number {
    const today = new Date();
    const epochDay = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
    return epochDay % mythbusterData.length;
}

export default function MythBusterPage() {
    const { user, profile } = useAuth();
    const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
    const [showArchive, setShowArchive] = useState(false);

    const allMyths = mythbusterData as MythCard[];
    const todayIndex = getDailyMythIndex();
    const todayMyth = allMyths[todayIndex];
    const archiveMyths = allMyths.filter((_, i) => i !== todayIndex);

    const totalOpened = flippedCards.size;

    // Control group guard
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

    const toggleFlip = (id: string) => {
        setFlippedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                if (user) recordMythOpened(user.uid).catch(() => { });
            }
            return next;
        });
    };

    const renderMythCard = (myth: MythCard) => {
        const isFlipped = flippedCards.has(myth.id);
        return (
            <div
                key={myth.id}
                className={`${styles.mythCard} ${isFlipped ? styles.flipped : ''}`}
                onClick={() => toggleFlip(myth.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleFlip(myth.id)}
            >
                {/* FRONT — Myth */}
                <div className={styles.mythFront}>
                    <div className={`${styles.mythBadge} ${styles.mythBadgeMitos}`}>
                        ❌ MITOS
                    </div>
                    <div className={styles.mythIcon}>{myth.icon}</div>
                    <div className={styles.mythTitle}>{myth.title}</div>
                    <p className={styles.mythText}>&ldquo;{myth.myth_text}&rdquo;</p>
                    <div className={styles.mythFlipHint}>👆 Ketuk untuk lihat fakta medis</div>
                </div>

                {/* BACK — Fact */}
                <div className={styles.mythBack}>
                    <div className={`${styles.mythBadge} ${styles.mythBadgeFakta}`}>
                        ✅ FAKTA MEDIS
                    </div>
                    <div className={styles.mythTitle}>{myth.title}</div>
                    <p className={styles.mythText}>{myth.fact_text}</p>
                    {myth.context && (
                        <div className={styles.mythContext}>
                            🏘️ <strong>Konteks Lokal:</strong> {myth.context}
                        </div>
                    )}
                    <div className={styles.mythSource}>
                        📚 {myth.source}
                    </div>
                    <div className={styles.mythFlipHint}>👆 Ketuk untuk kembali ke mitos</div>
                </div>
            </div>
        );
    };

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            <div className="container" style={{ paddingTop: 24, paddingBottom: 32 }}>
                <PageHeader
                    title="🛡️ Perisai Mitos"
                    subtitle="Satu mitos baru setiap hari. Ketuk kartu untuk membuka fakta medis!"
                />

                {/* Stats */}
                <div className={styles.statsBanner}>
                    <div className={styles.statCard} style={{ background: 'rgba(74, 136, 225, 0.04)' }}>
                        <div className={styles.statNumber} style={{ color: 'var(--primary)' }}>{allMyths.length}</div>
                        <div className={styles.statLabel}>Total Mitos</div>
                    </div>
                    <div className={styles.statCard} style={{ background: 'rgba(16, 185, 129, 0.04)' }}>
                        <div className={styles.statNumber} style={{ color: 'var(--success)' }}>{totalOpened}</div>
                        <div className={styles.statLabel}>Fakta Terbuka</div>
                    </div>
                </div>

                {/* ====== MITOS HARI INI ====== */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                    paddingBottom: 8, borderBottom: '2px dashed var(--border-light)'
                }}>
                    <span style={{ fontSize: '1.25rem' }}>📅</span>
                    <h3 style={{ fontSize: '0.9375rem', margin: 0, color: 'var(--primary-dark)' }}>
                        Mitos Hari Ini
                    </h3>
                </div>

                {todayMyth && renderMythCard(todayMyth)}

                {/* Info Banner */}
                <div style={{
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(56, 189, 248, 0.04) 100%)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    margin: '20px 0',
                }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        💡 <strong>Tips:</strong> Tunjukkan kartu fakta medis ini ke suami, mertua, atau anggota keluarga. Setiap fakta dilengkapi sumber ilmiah dari <strong>WHO 2023</strong> dan jurnal internasional.
                    </p>
                </div>

                {/* ====== ARSIP MITOS SEBELUMNYA ====== */}
                <button
                    className={styles.filterBtn}
                    onClick={() => setShowArchive(!showArchive)}
                    style={{ width: '100%', marginBottom: 16, padding: '12px 16px', textAlign: 'center' }}
                >
                    {showArchive ? '🔼 Sembunyikan arsip mitos' : `🔽 Lihat arsip mitos (${archiveMyths.length} mitos lainnya)`}
                </button>

                {showArchive && (
                    <div className={styles.mythGrid}>
                        {archiveMyths.map(myth => renderMythCard(myth))}
                    </div>
                )}
            </div>
            <Navbar />
        </div>
    );
}
