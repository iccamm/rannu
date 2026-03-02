'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, getCountFromServer, where, doc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { LoadingSkeleton, PageHeader, TopBar, Navbar } from '@/components';
import { useAuth, UserProfile } from '@/hooks/useAuth';
import { EngagementChart, DemographicsPieChart, InputBarChart } from './components/AnalyticsCharts';

interface DashboardStats {
    totalUsers: number;
    totalIntervention: number;
    totalControl: number;
    recentUsers: UserProfile[];
    demographicsData: { name: string; value: number }[];
    engagementData: { date: string; users: number; logs: number }[];
    inputData: { name: string; count: number }[];
}

export default function AdminDashboard() {
    const { user, profile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.replace('/login'); return; }
        if (!profile?.isAdmin) { router.replace('/dashboard'); return; }
        fetchAdminData();
    }, [user, profile, authLoading]);

    async function fetchAdminData() {
        try {
            const db = getFirebaseDb();
            if (!db) return;

            // 1. Fetch Users Info & Demographics
            const usersQuery = query(collection(db, 'users_profile'), orderBy('created_at', 'desc'));
            const usersSnapshot = await getDocs(usersQuery);

            let total = 0, intervention = 0, control = 0;
            const recent: UserProfile[] = [];
            const villageCounts: Record<string, number> = {};

            usersSnapshot.forEach((docSnap) => {
                const data = docSnap.data() as UserProfile;
                if (data.isAdmin) return;
                const group = data.group || 'intervention';
                total++;
                if (group === 'intervention') intervention++;
                if (group === 'control') control++;
                if (recent.length < 10) recent.push(data);
                const village = data.village || 'Lainnya';
                villageCounts[village] = (villageCounts[village] || 0) + 1;
            });

            const demographicsData = Object.entries(villageCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            // 2. Fetch Engagement (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

            const logsQuery = query(collection(db, 'daily_logs'), where('date', '>=', thirtyDaysAgoStr));
            let logsSnapshot;
            try {
                logsSnapshot = await getDocs(logsQuery);
            } catch (e) {
                console.error("Needs index for date filtering", e);
                logsSnapshot = { forEach: () => { } };
            }

            const dailyCounts: Record<string, { users: Set<string>, logs: number }> = {};
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                dailyCounts[dateStr] = { users: new Set(), logs: 0 };
            }

            logsSnapshot.forEach((doc: any) => {
                const data = doc.data();
                if (data.date && dailyCounts[data.date]) {
                    dailyCounts[data.date].logs++;
                    if (data.uid) dailyCounts[data.date].users.add(data.uid);
                }
            });

            const engagementData = Object.keys(dailyCounts).sort().map(date => ({
                date: date.substring(5),
                users: dailyCounts[date].users.size,
                logs: dailyCounts[date].logs
            }));

            // 3. Fetch Input Counts
            try {
                const [dailyRes, readingRes, activityRes] = await Promise.all([
                    getCountFromServer(collection(db, 'daily_logs')),
                    getCountFromServer(collection(db, 'reading_logs')),
                    getCountFromServer(collection(db, 'activity_logs'))
                ]);

                const inputData = [
                    { name: 'Gizi/Makan', count: dailyRes.data().count },
                    { name: 'Aktivitas', count: activityRes.data().count },
                    { name: 'Edukasi', count: readingRes.data().count },
                ];

                setStats({
                    totalUsers: total,
                    totalIntervention: intervention,
                    totalControl: control,
                    recentUsers: recent,
                    demographicsData,
                    engagementData,
                    inputData
                });
            } catch (err) {
                console.error("Counts error:", err);
            }
        } catch (err) {
            console.error("Failed to fetch admin stats:", err);
        } finally {
            setLoading(false);
        }
    }

    const handleGroupChange = async (uid: string, newGroup: string, oldGroup: string) => {
        try {
            const db = getFirebaseDb();
            if (!db) return;
            await updateDoc(doc(db, 'users_profile', uid), { group: newGroup });
            if (stats) {
                const updatedRecentUsers = stats.recentUsers.map(u =>
                    u.uid === uid ? { ...u, group: newGroup as 'intervention' | 'control' } : u
                );
                let dIntervention = 0;
                let dControl = 0;
                if (newGroup === 'intervention' && oldGroup !== 'intervention') { dIntervention = 1; dControl = -1; }
                else if (newGroup === 'control' && oldGroup !== 'control') { dIntervention = -1; dControl = 1; }
                setStats({
                    ...stats,
                    recentUsers: updatedRecentUsers,
                    totalIntervention: stats.totalIntervention + dIntervention,
                    totalControl: stats.totalControl + dControl
                });
            }
        } catch (err) {
            console.error("Failed to update group:", err);
            alert("Gagal memperbarui kelompok.");
        }
    };

    if (authLoading || loading || !stats) {
        return (
            <div className="page" style={{ background: 'var(--bg-warm)' }}>
                <TopBar />
                <div className="container" style={{ paddingTop: 24 }}>
                    <LoadingSkeleton variant="text" width="60%" height="32px" />
                    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <LoadingSkeleton variant="card" height="100px" />
                        <LoadingSkeleton variant="card" height="100px" />
                    </div>
                    <div style={{ marginTop: 24 }}><LoadingSkeleton variant="card" height="200px" /></div>
                </div>
                <Navbar />
            </div>
        );
    }

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            <div className="container" style={{ paddingTop: 24, paddingBottom: 100 }}>
                <PageHeader title="🔐 Admin Dashboard" subtitle="Pantauan analitik RANNU" />

                {/* Overview Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1, fontFamily: "'Poppins', sans-serif" }}>
                            {stats.totalUsers}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>Total Pengguna</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 8 }}>
                        <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Intervensi</span>
                            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)', fontFamily: "'Poppins', sans-serif" }}>{stats.totalIntervention}</span>
                        </div>
                        <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kontrol</span>
                            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--warning)', fontFamily: "'Poppins', sans-serif" }}>{stats.totalControl}</span>
                        </div>
                    </div>
                </div>

                {/* Engagement Trends */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.9375rem', marginBottom: 12 }}>📊 Tren Aktivitas (30 Hari)</h3>
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <EngagementChart data={stats.engagementData} />
                    </div>
                </div>

                {/* Charts: Demographics + Input Counts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', marginBottom: 12 }}>📍 Sebaran Lokasi (Desa)</h3>
                        <DemographicsPieChart data={stats.demographicsData} />
                    </div>
                    <div className="card">
                        <h3 style={{ fontSize: '0.9375rem', marginBottom: 12 }}>📋 Volume Input Data</h3>
                        <InputBarChart data={stats.inputData} />
                    </div>
                </div>

                {/* Recent Registrations */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 16px 8px' }}>
                        <h3 style={{ fontSize: '0.9375rem', margin: 0 }}>👥 Pendaftar Terbaru</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {stats.recentUsers.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data.</div>
                        ) : (
                            stats.recentUsers.map((u, i) => (
                                <div key={u.uid} style={{
                                    padding: '12px 16px',
                                    borderBottom: i === stats.recentUsers.length - 1 ? 'none' : '1px solid var(--border-light)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.mom_name || 'Tanpa Nama'}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                            📍 {u.village || '-'} • 👶 {u.children?.length || 0} anak
                                        </div>
                                    </div>
                                    <select
                                        value={u.group}
                                        onChange={(e) => handleGroupChange(u.uid, e.target.value, u.group)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.6875rem',
                                            fontWeight: 600,
                                            border: '1px solid var(--border)',
                                            background: u.group === 'intervention' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: u.group === 'intervention' ? 'var(--success)' : 'var(--warning)',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            appearance: 'none',
                                            textAlign: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <option value="intervention">Intervensi</option>
                                        <option value="control">Kontrol</option>
                                    </select>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <Navbar />
        </div>
    );
}
