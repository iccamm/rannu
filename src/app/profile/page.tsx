'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useBabyAge } from '@/hooks/useBabyAge';
import { Navbar, PageHeader, TopBar, Toast } from '@/components';
import { getUserStats, BADGES, getBadgeById, UserStats } from '@/lib/gamification';

export default function ProfilePage() {
    const { user, profile, loading, firebaseReady, signOut } = useAuth();
    const router = useRouter();
    const babyAge = useBabyAge();

    // Hidden Admin Bootstrap State
    const [tapCount, setTapCount] = useState(0);
    const [toastMsg, setToastMsg] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [stats, setStats] = useState<UserStats | null>(null);

    useEffect(() => {
        if (loading) return;
        if (!firebaseReady || !user) { router.replace('/login'); }
    }, [user, loading, firebaseReady, router]);

    // Load gamification stats
    useEffect(() => {
        if (!user) return;
        getUserStats(user.uid).then(setStats).catch(() => { });
    }, [user]);

    const handleLogout = async () => {
        await signOut();
        router.replace('/login');
    };

    const handleAvatarTap = async () => {
        if (!user || !profile) return;
        if (profile.isAdmin) return;

        const newCount = tapCount + 1;
        setTapCount(newCount);

        if (newCount === 5) {
            setTapCount(0);
            try {
                const db = getFirebaseDb();
                if (!db) return;

                const adminQuery = query(
                    collection(db, 'users_profile'),
                    where('isAdmin', '==', true),
                    limit(1)
                );
                const adminSnapshot = await getDocs(adminQuery);

                if (!adminSnapshot.empty) {
                    setToastType('error');
                    setToastMsg('Admin sudah ada. Tidak dapat membuat admin baru.');
                    return;
                }

                await updateDoc(doc(db, 'users_profile', user.uid), {
                    isAdmin: true
                });
                setToastType('success');
                setToastMsg('Anda telah menjadi Admin!');
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error("Failed to bootstrap admin:", error);
            }
        }
    };

    if (loading || !user) return null;

    const groupLabel = profile?.group === 'intervention' ? 'Intervensi' : profile?.group === 'control' ? 'Kontrol' : profile?.group === 'admin' ? 'Admin' : '-';
    const educationLabel: Record<string, string> = {
        SD: 'SD / Sederajat', SMP: 'SMP / Sederajat', SMA: 'SMA / SMK', D3: 'D3 / Diploma', S1: 'S1 / Sarjana', S2: 'S2 / S3'
    };
    const incomeLabel: Record<string, string> = {
        dibawah_umk: '< UMK', diatas_umk: '≥ UMK'
    };

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg('')} />}
            <div className="container" style={{ paddingTop: 24 }}>
                <PageHeader
                    title="Profil"
                    subtitle="Informasi akun dan data keluarga"
                />

                {/* Account Card */}
                <div className="card animate-fade-in" style={{ marginBottom: 16, boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                            onClick={handleAvatarTap}
                            style={{
                                width: 52, height: 52, borderRadius: '50%',
                                background: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '1.25rem', fontWeight: 600,
                                flexShrink: 0, boxShadow: 'var(--shadow-sm)',
                                cursor: 'pointer', userSelect: 'none'
                            }}>
                            {(profile?.mom_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                {profile?.mom_name || 'Belum diisi'}
                            </p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.email || 'Google Account'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                            {profile && (
                                <button onClick={() => router.push('/register')} style={{ background: 'var(--primary-soft)', border: 'none', color: 'var(--primary-dark)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>Edit</button>
                            )}
                            {profile?.isAdmin && (
                                <button onClick={() => router.push('/admin')} style={{ background: 'var(--warning)', border: 'none', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>Admin</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Gamification Card — Poin & Streak */}
                {stats && (
                    <div className="card animate-fade-in" style={{ marginBottom: 16, borderTop: '4px solid var(--accent)' }}>
                        <h3 style={{ fontSize: '0.9375rem', marginBottom: 16, color: 'var(--accent-dark)' }}>🏆 Pencapaian</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", color: 'var(--primary)' }}>
                                    {stats.total_points}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Poin</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", color: 'var(--accent)' }}>
                                    {stats.current_streak}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>Hari Streak 🔥</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", color: 'var(--success)' }}>
                                    {stats.mdd_count}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>MDD Tercapai</div>
                            </div>
                        </div>

                        {/* Earned Badges */}
                        {stats.earned_badges.length > 0 && (
                            <div>
                                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Lencana Diperoleh:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {stats.earned_badges.map(badgeId => {
                                        const badge = getBadgeById(badgeId);
                                        if (!badge) return null;
                                        return (
                                            <div key={badgeId} style={{
                                                padding: '6px 12px',
                                                borderRadius: 'var(--radius-full)',
                                                background: 'var(--bg-warm)',
                                                border: '1px solid var(--border)',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}>
                                                <span>{badge.icon}</span>
                                                <span>{badge.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {stats.earned_badges.length === 0 && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Belum ada lencana. Terus pantau PMBA si kecil untuk mendapatkan lencana! 💪
                            </p>
                        )}
                    </div>
                )}

                {/* Data Ibu */}
                {profile && (
                    <div className="card animate-fade-in" style={{ marginBottom: 16, borderTop: '4px solid var(--primary)' }}>
                        <h3 style={{ fontSize: '0.9375rem', marginBottom: 16, color: 'var(--primary-dark)' }}>👩 Data Ibu</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                ['No. HP', profile.mom_phone || '-'],
                                ['Usia', profile.mom_age ? `${profile.mom_age} tahun` : '-'],
                                ['Pendidikan', profile.education_level ? educationLabel[profile.education_level] || profile.education_level : '-'],
                                ['Pendapatan', profile.income_level ? incomeLabel[profile.income_level] || profile.income_level : '-'],
                                ['Puskesmas', profile.puskesmas || '-'],
                                ['Desa/Kelurahan', profile.village || '-'],
                                ['Kecamatan', profile.sub_district || '-'],
                                ['Posyandu', profile.posyandu || '-'],
                                ['Kelompok', groupLabel],
                                ['Dukungan Keluarga', profile.family_support ? `${profile.family_support}/5` : '-'],
                            ].map(([label, value], i, arr) => (
                                <div key={label} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    ...(i < arr.length - 1 ? { borderBottom: '1px solid var(--border-light)', paddingBottom: 8 } : { paddingBottom: 8 })
                                }}>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</span>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Data Anak */}
                {profile?.children?.map((child, index) => (
                    <div key={child.id} className="card animate-fade-in" style={{ marginBottom: 16, borderTop: '4px solid var(--secondary)' }}>
                        <h3 style={{ fontSize: '0.9375rem', marginBottom: 16, color: 'var(--secondary-dark)' }}>
                            👶 Data Anak {profile.children.length > 1 ? `#${index + 1}` : ''}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                ['Nama Panggilan', child.name || '-'],
                                ['Jenis Kelamin', child.gender === 'L' ? 'Laki-laki' : child.gender === 'P' ? 'Perempuan' : '-'],
                                ['Tanggal Lahir', child.dob ? new Date(child.dob).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
                                ['BB Lahir', child.birth_weight ? `${child.birth_weight} gram` : '-'],
                                ['TB/PB Lahir', child.birth_length ? `${child.birth_length} cm` : '-'],
                                ['Lingkar Kepala', child.head_circumference ? `${child.head_circumference} cm` : '-'],
                            ].map(([label, value], i, arr) => (
                                <div key={label} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    ...(i < arr.length - 1 ? { borderBottom: '1px solid var(--border-light)', paddingBottom: 8 } : { paddingBottom: 8 })
                                }}>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</span>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {!profile && (
                    <div className="card animate-fade-in" style={{ marginBottom: 16, textAlign: 'center' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                            Profil belum lengkap
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/register')}
                        >
                            Lengkapi Profil
                        </button>
                    </div>
                )}

                {/* Logout Button */}
                <button
                    className="btn btn-full"
                    onClick={handleLogout}
                    style={{
                        marginBottom: 24,
                        background: 'none',
                        border: '1.5px solid var(--danger)',
                        color: 'var(--danger)',
                        fontWeight: 600,
                    }}
                >
                    Keluar dari Akun
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    RANNU v2.0 — Harapan untuk Gizi Anak
                </p>
            </div>
            <Navbar />
        </div>
    );
}
