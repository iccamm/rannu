'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBabyAge } from '@/hooks/useBabyAge';
import { Navbar, PageHeader, WeeklyChart, LoadingSkeleton, TopBar, ChildSelector } from '@/components';
import { getAllLogs, DailyLog } from '@/lib/firestore';
import { FOOD_GROUPS, FoodGroupState } from '@/lib/constants';

export default function HistoryPage() {
    const { user, profile, activeChild, setActiveChild, loading: authLoading } = useAuth();
    const babyAge = useBabyAge();
    const isUnder6Months = babyAge ? babyAge.months < 6 : false;

    const router = useRouter();
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const loadLogs = useCallback(async () => {
        if (!user) return;
        setDataLoading(true);
        try {
            const isFirstChild = profile?.children?.[0]?.id === activeChild?.id;
            const allLogs = await getAllLogs(user.uid, activeChild?.id, isFirstChild);
            setLogs(allLogs);
        } catch (err) {
            console.error('Error loading logs:', err);
        } finally {
            setDataLoading(false);
        }
    }, [user, activeChild?.id]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.replace('/login'); return; }
        loadLogs();
    }, [user, authLoading, router, loadLogs]);

    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const chartData = logs.slice(0, 7).reverse().map((log) => ({
        date: log.date,
        label: dayLabels[new Date(log.date).getDay()],
        mdd_score: log.mdd_score,
    }));

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            <div className="container" style={{ paddingTop: 24 }}>
                <PageHeader title="Riwayat Input" subtitle={`${logs.length} entri tercatat`} />

                {/* Swipeable Child Selector */}
                {profile?.children && profile.children.length > 1 && (
                    <ChildSelector
                        childrenData={profile.children}
                        activeChildId={activeChild?.id || ''}
                        onSelect={setActiveChild}
                    />
                )}

                {/* Chart */}
                {!isUnder6Months && (
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Tren Skor MDD</h3>
                        {dataLoading ? (
                            <LoadingSkeleton variant="card" height="160px" />
                        ) : (
                            <WeeklyChart data={chartData} />
                        )}
                    </div>
                )}

                {/* Log List */}
                {dataLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <LoadingSkeleton variant="card" height="80px" count={3} />
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                        <p style={{ fontSize: '2rem', marginBottom: 12 }}>📊</p>
                        <p>Belum ada riwayat input</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        {logs.map((log) => (
                            <div key={log.log_id} className="card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{formatDate(log.date)}</span>
                                    {isUnder6Months ? (
                                        <span className={`badge ${log.is_breastfed ? 'badge-success' : 'badge-warning'}`}>
                                            {log.is_breastfed ? '🤱 ASI Eksklusif' : 'Tidak ASI'}
                                        </span>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {log.texture && (
                                                <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                    🍽️ {log.texture}
                                                </span>
                                            )}
                                            <span className={`badge ${log.is_mdd_achieved ? 'badge-success' : 'badge-warning'}`}>
                                                MDD {log.mdd_score}/8
                                            </span>
                                            {log.is_mmf_achieved !== undefined && (
                                                <span className={`badge ${log.is_mmf_achieved ? 'badge-success' : 'badge-warning'}`}>
                                                    MMF {log.is_mmf_achieved ? '✓' : '✗'}
                                                </span>
                                            )}
                                            {log.is_mad_achieved !== undefined && (
                                                <span className={`badge ${log.is_mad_achieved ? 'badge-success' : 'badge-warning'}`}>
                                                    MAD {log.is_mad_achieved ? '✓' : '✗'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!isUnder6Months && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {FOOD_GROUPS.map((group) => (
                                            <span
                                                key={group.key}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: log.food_groups[group.key as keyof FoodGroupState]
                                                        ? 'rgba(47, 128, 237, 0.15)'
                                                        : 'var(--border-light)',
                                                    color: log.food_groups[group.key as keyof FoodGroupState]
                                                        ? 'var(--accent-dark)'
                                                        : 'var(--text-muted)',
                                                }}
                                            >
                                                {group.icon} {group.label.split(' ')[0]}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {isUnder6Months && (log.breastfeeding_freq !== undefined || log.wet_diapers !== undefined || log.mother_mood) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                        {log.breastfeeding_freq !== undefined && log.breastfeeding_freq > 0 && (
                                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-warm)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                🤱 Menyusui <b>{log.breastfeeding_freq}x</b>
                                            </span>
                                        )}
                                        {log.wet_diapers !== undefined && log.wet_diapers > 0 && (
                                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-warm)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                💧 Popok Basah <b>{log.wet_diapers}x</b>
                                            </span>
                                        )}
                                        {log.mother_mood && (
                                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-warm)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                {log.mother_mood === 'Senang' ? '😊' : log.mother_mood === 'Cukup' ? '😐' : '😫'} Perasaan Ibu <b>{log.mother_mood}</b>
                                            </span>
                                        )}
                                    </div>
                                )}
                                {log.notes && (
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                                        📝 {log.notes}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Navbar />
        </div>
    );
}
