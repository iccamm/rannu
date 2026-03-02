'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useBabyAge } from '@/hooks/useBabyAge';
import { Navbar, ProgressCircle, WeeklyChart, SyncBadge, PageHeader, LoadingSkeleton, TopBar, ChildSelector } from '@/components';
import { getGreeting, MDD_THRESHOLD, isMMFAchieved, isMADAchieved, getMMFThreshold } from '@/lib/constants';
import { checkTodayLog, getWeeklyLogs, DailyLog } from '@/lib/firestore';
import { getTextureRecommendation } from '@/lib/age-calculator';

// Demo data for when Firebase is not configured
const DEMO_PROFILE = {
    mom_name: 'Ibu Demo',
    baby_name: 'Adik',
    children: []
};

const DEMO_AGE = {
    months: 8,
    days: 15,
    ageLabel: '8 bulan 15 hari',
    ageRange: '6-8' as const,
    totalDays: 255,
};

export default function DashboardPage() {
    const { user, profile, activeChild, setActiveChild, loading: authLoading, firebaseReady } = useAuth();
    const router = useRouter();
    const babyAge = useBabyAge();

    const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
    const [weeklyData, setWeeklyData] = useState<Array<{ date: string; label: string; mdd_score: number }>>([]);
    const [dataLoading, setDataLoading] = useState(true);

    // Use demo data if Firebase not configured
    const isDemo = !firebaseReady;
    const displayProfile = profile || (isDemo ? DEMO_PROFILE : null);
    const displayAge = babyAge || (isDemo ? DEMO_AGE : null);

    const loadData = useCallback(async () => {
        if (!user || isDemo) {
            // Show demo weekly data
            if (isDemo) {
                const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                const today = new Date();
                setWeeklyData(
                    Array.from({ length: 5 }, (_, i) => {
                        const d = new Date(today);
                        d.setDate(d.getDate() - (4 - i));
                        return {
                            date: d.toISOString().split('T')[0],
                            label: dayLabels[d.getDay()],
                            mdd_score: [3, 5, 4, 6, 5][i],
                        };
                    })
                );
            }
            setDataLoading(false);
            return;
        }
        try {
            const isFirstChild = displayProfile?.children?.[0]?.id === activeChild?.id;
            const [today, weekly] = await Promise.all([
                checkTodayLog(user.uid, activeChild?.id, isFirstChild),
                getWeeklyLogs(user.uid, activeChild?.id, isFirstChild),
            ]);
            setTodayLog(today);

            const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            setWeeklyData(
                weekly.map((log) => ({
                    date: log.date,
                    label: dayLabels[new Date(log.date).getDay()],
                    mdd_score: log.mdd_score,
                }))
            );
        } catch (err) {
            console.error('Load data error:', err);
        } finally {
            setDataLoading(false);
        }
    }, [user, isDemo, activeChild?.id]);

    useEffect(() => {
        if (authLoading) return;
        if (!isDemo && !user) { router.replace('/login'); return; }
        if (!isDemo && !profile) { router.replace('/register'); return; }
        // Admin users should never see the consumer dashboard
        if (profile?.isAdmin) { router.replace('/admin'); return; }
        loadData();
    }, [user, profile, activeChild?.id, authLoading, isDemo, router, loadData]);

    if (authLoading && !isDemo) {
        return (
            <div className="page">
                <div className="container">
                    <LoadingSkeleton variant="text" width="60%" height="24px" />
                    <LoadingSkeleton variant="text" width="80%" height="16px" />
                    <div style={{ marginTop: 32 }}><LoadingSkeleton variant="card" height="200px" /></div>
                    <div style={{ marginTop: 16 }}><LoadingSkeleton variant="card" height="160px" /></div>
                </div>
            </div>
        );
    }

    const todayScore = isDemo ? 5 : (todayLog?.mdd_score ?? 0);
    const hasTodayEntry = isDemo ? true : !!todayLog;
    const isUnder6Months = displayAge ? displayAge.months < 6 : false;
    const isBaduta = displayAge ? displayAge.months < 24 : true; // Baduta = 0-23 bulan

    // PMBA Indicators for today
    const ageMonths = displayAge?.months ?? 0;
    const todayMealFreq = todayLog?.meal_frequency ?? 0;
    const todayIsBreastfed = todayLog?.is_breastfed ?? true;
    const todayMDD = todayScore >= MDD_THRESHOLD;
    const todayMMF = isMMFAchieved(ageMonths, todayMealFreq, todayIsBreastfed);
    const todayMAD = isMADAchieved(todayScore, ageMonths, todayMealFreq, todayIsBreastfed);
    const mmfThreshold = getMMFThreshold(ageMonths, todayIsBreastfed);

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            <SyncBadge />
            <div className="container" style={{ paddingTop: 24 }}>
                {/* Demo Banner */}
                {isDemo && (
                    <div style={{
                        padding: '10px 16px',
                        background: '#fef3c7',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 16,
                        fontSize: '0.8125rem',
                        color: '#92400e',
                        textAlign: 'center',
                        fontWeight: 500,
                    }}>
                        ⚡ Mode Preview — Konfigurasi Firebase untuk data nyata
                    </div>
                )}

                {/* Greeting */}
                <PageHeader
                    title={`${getGreeting()}, Ibu ${(displayProfile?.mom_name || 'Ibu').split(' ')[0]}!`}
                    subtitle={
                        displayAge
                            ? `Si kecil ${isDemo ? DEMO_PROFILE.baby_name : activeChild?.name || 'Adik'} hari ini berusia ${displayAge.ageLabel}`
                            : undefined
                    }
                />

                {/* Swipeable Child Selector */}
                {displayProfile?.children && displayProfile.children.length > 1 && (
                    <ChildSelector
                        childrenData={displayProfile.children}
                        activeChildId={activeChild?.id || ''}
                        onSelect={setActiveChild}
                    />
                )}

                {/* Age Info Badge */}
                {displayAge && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }} className="animate-fade-in">
                        <span className="badge badge-info">
                            📅 {displayAge.months} bulan {displayAge.days} hari
                        </span>
                        {!isUnder6Months && (
                            <span className="badge badge-success">
                                🍽️ {getTextureRecommendation(displayAge.months)}
                            </span>
                        )}
                        {isUnder6Months && (
                            <span className="badge badge-success">
                                🤱 Hanya ASI (0-6 Bulan)
                            </span>
                        )}
                    </div>
                )}

                {/* Progress Circle Card */}
                <div className="card animate-scale-in" style={{ textAlign: 'center', marginBottom: 16, padding: '32px 24px' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                        {isUnder6Months ? 'Pantau ASI Hari Ini' : (hasTodayEntry ? 'Skor PMBA Hari Ini' : 'Pemantauan Hari Ini')}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 24 }}>
                        {hasTodayEntry ? 'Nutrisi harian si kecil telah terkumpul' : 'Belum ada data nutrisi yang masuk'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {isUnder6Months ? (
                            <ProgressCircle
                                score={hasTodayEntry ? (todayLog?.is_breastfed ? 1 : 0) : 0}
                                maxScore={1}
                                threshold={1}
                                centerContent={
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '3rem', marginBottom: 4 }}>
                                            {hasTodayEntry ? (todayLog?.is_breastfed ? '🤱' : '🍼') : '👶'}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {hasTodayEntry
                                                ? (todayLog?.is_breastfed ? 'ASI Eksklusif' : 'Tidak ASI')
                                                : 'Belum Input'}
                                        </span>
                                    </div>
                                }
                            />
                        ) : (
                            <ProgressCircle
                                score={todayScore}
                                label={todayScore >= MDD_THRESHOLD ? 'MDD TERCAPAI ✓' : hasTodayEntry ? 'MDD Belum Tercapai' : undefined}
                                sublabel={hasTodayEntry ? `${todayScore} dari 8 kelompok pangan` : undefined}
                            />
                        )}
                    </div>

                    {/* PMBA Indicator Badges (MDD + MMF + MAD) */}
                    {!isUnder6Months && hasTodayEntry && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                            <span className={`badge ${todayMDD ? 'badge-success' : 'badge-warning'}`}>
                                MDD {todayMDD ? '✓' : '✗'} ({todayScore}/{MDD_THRESHOLD})
                            </span>
                            <span className={`badge ${todayMMF ? 'badge-success' : 'badge-warning'}`}>
                                MMF {todayMMF ? '✓' : '✗'} ({todayMealFreq}/{mmfThreshold}x)
                            </span>
                            <span className={`badge ${todayMAD ? 'badge-success' : 'badge-warning'}`}>
                                MAD {todayMAD ? '✓' : '✗'}
                            </span>
                        </div>
                    )}

                    {isBaduta ? (
                        <Link
                            href="/tracker"
                            className={`btn ${hasTodayEntry ? 'btn-secondary' : 'btn-primary'} btn-full`}
                            style={{ marginTop: 28 }}
                        >
                            {hasTodayEntry ? '✓ Sudah Input Hari Ini' : '+ Input Data Hari Ini'}
                        </Link>
                    ) : (
                        <button className="btn btn-secondary btn-full" disabled style={{ marginTop: 28, opacity: 0.6 }}>
                            ❌ Pemantauan Khusus Baduta (0-24 Bulan)
                        </button>
                    )}
                </div>

                {/* Weekly Trend */}
                {!isUnder6Months && (
                    <div className="card animate-fade-in" style={{ marginBottom: 16, padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Tren 7 Hari</h3>
                            <Link href="/tracker/history" style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, padding: '4px 8px', background: 'var(--primary-soft)', borderRadius: 'var(--radius-full)' }}>
                                Lihat semua &rarr;
                            </Link>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                            {todayScore >= MDD_THRESHOLD ? 'Hebat! Pertahankan nutrisi si kecil! 🌟' : 'Terus pantau asupan gizi si kecil setiap hari.'}
                        </p>
                        {dataLoading ? (
                            <LoadingSkeleton variant="card" height="160px" />
                        ) : (
                            <WeeklyChart data={weeklyData} />
                        )}
                    </div>
                )}

                <div className="card animate-fade-in" style={{
                    background: 'linear-gradient(135deg, var(--primary-soft) 0%, rgba(47, 128, 237, 0.02) 100%)',
                    border: '1px solid rgba(47, 128, 237, 0.1)',
                    marginBottom: 24,
                    padding: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: '20px' }}>💡</span>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary-dark)', letterSpacing: '0.5px' }}>TAHUKAH IBU?</p>
                    </div>
                    <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                        {isUnder6Months
                            ? <span>Bayi berusia di bawah 6 bulan <strong style={{ color: 'var(--secondary-dark)' }}>hanya membutuhkan ASI</strong>. ASI mengandung zat gizi lengkap dan HMO (prebiotik alami) untuk bakteri baik usus bayi.</span>
                            : <span>Bayi membutuhkan minimal <strong style={{ color: 'var(--secondary-dark)' }}>5 dari 8 kelompok pangan</strong> (MDD) setiap hari. Keberagaman makanan mendukung pertumbuhan <em>Bacteroidetes</em> di usus yang memproduksi butirat untuk mencegah stunting.</span>
                        }
                    </p>
                    <Link
                        href="/education"
                        className="btn btn-secondary"
                        style={{ marginTop: 20, width: '100%', border: 'none', background: '#fff', boxShadow: 'var(--shadow-sm)' }}
                    >
                        Pelajari Lebih Lanjut &rarr;
                    </Link>
                </div>
            </div>
            <Navbar />
        </div>
    );
}
