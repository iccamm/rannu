'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBabyAge } from '@/hooks/useBabyAge';
import { Navbar, FoodGroupCard, PageHeader, Toast, Modal, SyncBadge, TopBar, ChildSelector } from '@/components';
import { FOOD_GROUPS, DEFAULT_FOOD_GROUPS, FoodGroupState, MDD_THRESHOLD, FOOD_TEXTURES, isMMFAchieved, isMADAchieved, getMMFThreshold } from '@/lib/constants';
import { checkTodayLog, saveDailyLog, computeMDDScore } from '@/lib/firestore';
import { savePendingLog, hasPendingLogForToday } from '@/lib/offline';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function TrackerPage() {
    const { user, profile, activeChild, setActiveChild, loading: authLoading } = useAuth();
    const router = useRouter();
    const isOnline = useOnlineStatus();
    const babyAge = useBabyAge();

    const [foodGroups, setFoodGroups] = useState<FoodGroupState>({ ...DEFAULT_FOOD_GROUPS });
    const [mealFrequency, setMealFrequency] = useState(0);
    const [isBreastfed, setIsBreastfed] = useState(true);
    const [texture, setTexture] = useState<string>('');
    const [notes, setNotes] = useState('');

    // New states for < 6 months
    const [breastfeedingFreq, setBreastfeedingFreq] = useState(0);
    const [wetDiapers, setWetDiapers] = useState(0);
    const [motherMood, setMotherMood] = useState<string>('');

    const [alreadyLogged, setAlreadyLogged] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [pageLoading, setPageLoading] = useState(true);

    const mddScore = computeMDDScore(foodGroups);
    const ageMonths = babyAge?.months ?? 0;
    const isUnder6Months = babyAge ? babyAge.months < 6 : false;
    const isBaduta = babyAge ? babyAge.months < 24 : true; // Baduta = 0-23 bulan

    // WHO PMBA Indicators
    const isMDDAchieved = mddScore >= MDD_THRESHOLD;
    const mmfThreshold = getMMFThreshold(ageMonths, isBreastfed);
    const mmfAchieved = isMMFAchieved(ageMonths, mealFrequency, isBreastfed);
    const madAchieved = isMADAchieved(mddScore, ageMonths, mealFrequency, isBreastfed);

    // For under 6mo, achievement is simply being exclusively breastfed
    const isAchieved = isUnder6Months ? isBreastfed : madAchieved;

    const checkExisting = useCallback(async () => {
        if (!user || !activeChild) return;
        setPageLoading(true);
        try {
            const isFirstChild = profile?.children?.[0]?.id === activeChild.id;
            const existing = await checkTodayLog(user.uid, activeChild.id, isFirstChild);
            const pendingExists = await hasPendingLogForToday(user.uid, activeChild.id, isFirstChild);
            if (existing || pendingExists) {
                setAlreadyLogged(true);
                if (existing) {
                    setFoodGroups(existing.food_groups);
                    setMealFrequency(existing.meal_frequency);
                    setIsBreastfed(existing.is_breastfed);
                    setTexture(existing.texture || '');
                    setNotes(existing.notes || '');
                    setBreastfeedingFreq(existing.breastfeeding_freq || 0);
                    setWetDiapers(existing.wet_diapers || 0);
                    setMotherMood(existing.mother_mood || '');
                }
            } else {
                // reset form if moving to a new unlogged child
                setAlreadyLogged(false);
                setFoodGroups({ ...DEFAULT_FOOD_GROUPS });
                setMealFrequency(0);
                setIsBreastfed(true);
                setTexture('');
                setNotes('');
                setBreastfeedingFreq(0);
                setWetDiapers(0);
                setMotherMood('');
            }
        } catch (err) {
            console.error('Check existing error:', err);
        } finally {
            setPageLoading(false);
        }
    }, [user, activeChild]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.replace('/login'); return; }
        checkExisting();
    }, [user, authLoading, router, checkExisting]);

    const toggleFoodGroup = (key: string) => {
        if (alreadyLogged) return;
        setFoodGroups((prev) => ({
            ...prev,
            [key]: !prev[key as keyof FoodGroupState],
        }));
    };

    const handleSave = async () => {
        if (!user || !activeChild || alreadyLogged || saving) return;
        setSaving(true);

        try {
            if (isOnline) {
                await saveDailyLog(
                    user.uid, activeChild.id, foodGroups, mealFrequency, isBreastfed,
                    texture || undefined, notes, ageMonths, breastfeedingFreq, wetDiapers, motherMood
                );
            } else {
                const today = new Date().toISOString().split('T')[0];
                await savePendingLog({
                    id: `${user.uid}_${activeChild.id}_${today}`,
                    uid: user.uid,
                    child_id: activeChild.id,
                    date: today,
                    food_groups: foodGroups,
                    mdd_score: mddScore,
                    is_mdd_achieved: isMDDAchieved,
                    is_mmf_achieved: mmfAchieved,
                    is_mad_achieved: madAchieved,
                    meal_frequency: mealFrequency,
                    is_breastfed: isBreastfed,
                    age_months: ageMonths,
                    texture: texture || undefined,
                    notes,
                    breastfeeding_freq: breastfeedingFreq,
                    wet_diapers: wetDiapers,
                    mother_mood: motherMood,
                    created_at: new Date().toISOString(),
                });
            }
            setAlreadyLogged(true);
            setShowSuccess(true);
        } catch (err) {
            console.error('Save error:', err);
            setShowToast({ message: 'Gagal menyimpan data', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="page" style={{ background: 'var(--bg-warm)' }}>
                <div className="container" style={{ paddingTop: 24 }}>
                    <div className="skeleton" style={{ width: '60%', height: 24, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: '80%', height: 16, marginBottom: 32 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />
                        ))}
                    </div>
                </div>
                <Navbar />
            </div>
        );
    }

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <TopBar />
            <SyncBadge />
            <div className="container" style={{ paddingTop: 24 }}>
                <PageHeader
                    title={!isBaduta ? "Tracker" : isUnder6Months ? "Pantau ASI Eksklusif" : "Skor PMBA Hari Ini"}
                    subtitle={!isBaduta
                        ? `${activeChild?.name || 'Anak'} sudah melewati usia baduta`
                        : alreadyLogged
                            ? 'Data hari ini telah terkunci dan direkam'
                            : isUnder6Months
                                ? 'Usia si kecil masih di bawah 6 bulan. Pastikan hanya memberikan ASI!'
                                : 'Pilih kelompok pangan yang dikonsumsi hari ini'
                    }
                />

                {/* Swipeable Child Selector — always visible */}
                {profile?.children && profile.children.length > 1 && (
                    <ChildSelector
                        childrenData={profile.children}
                        activeChildId={activeChild?.id || ''}
                        onSelect={(id) => {
                            if (!saving) setActiveChild(id);
                        }}
                    />
                )}

                {/* Inline message for children outside baduta range */}
                {!isBaduta && (
                    <div className="card animate-scale-in" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 24 }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>👶</div>
                        <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Fitur Khusus Baduta</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                            Pemantauan PMBA hanya tersedia untuk usia 0-24 bulan.
                            <br /><strong>{activeChild?.name}</strong> saat ini berusia <strong>{babyAge?.ageLabel}</strong>.
                        </p>
                        {profile?.children && profile.children.length > 1 && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--primary)', marginTop: 12, fontWeight: 500 }}>
                                ↑ Geser ke anak lain di atas untuk berpindah
                            </p>
                        )}
                    </div>
                )}

                {isBaduta && (<>
                    <div style={{
                        opacity: alreadyLogged ? 0.6 : 1,
                        pointerEvents: alreadyLogged ? 'none' : 'auto',
                        transition: 'all 0.3s ease',
                        filter: alreadyLogged ? 'grayscale(0.4)' : 'none'
                    }}>
                        {!isUnder6Months && (
                            <>
                                {/* ================== PMBA Indicators (MDD + MMF + MAD) ================== */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 8,
                                    marginBottom: 16,
                                }}>
                                    {/* MDD Indicator */}
                                    <div style={{
                                        padding: '12px 8px',
                                        background: isMDDAchieved ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-warm)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${isMDDAchieved ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                                        textAlign: 'center',
                                    }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", color: isMDDAchieved ? 'var(--success)' : 'var(--text-primary)' }}>
                                            {mddScore}/{MDD_THRESHOLD}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
                                            MDD {isMDDAchieved ? '✓' : ''}
                                        </div>
                                    </div>

                                    {/* MMF Indicator */}
                                    <div style={{
                                        padding: '12px 8px',
                                        background: mmfAchieved ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-warm)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${mmfAchieved ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                                        textAlign: 'center',
                                    }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", color: mmfAchieved ? 'var(--success)' : 'var(--text-primary)' }}>
                                            {mealFrequency}/{mmfThreshold}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
                                            MMF {mmfAchieved ? '✓' : ''}
                                        </div>
                                    </div>

                                    {/* MAD Indicator */}
                                    <div style={{
                                        padding: '12px 8px',
                                        background: madAchieved ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-warm)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${madAchieved ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                                        textAlign: 'center',
                                    }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: "'Poppins', sans-serif", color: madAchieved ? 'var(--success)' : 'var(--text-muted)' }}>
                                            {madAchieved ? '✓' : '✗'}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
                                            MAD {madAchieved ? '✓' : ''}
                                        </div>
                                    </div>
                                </div>

                                {/* MDD Progress Bar */}
                                <div style={{
                                    marginBottom: 16,
                                    padding: '16px 20px',
                                    background: isMDDAchieved
                                        ? 'var(--primary-soft)'
                                        : 'var(--bg-warm)',
                                    borderRadius: 'var(--radius-md)',
                                    border: `1px solid ${isMDDAchieved ? 'var(--primary-light)' : 'var(--border)'}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                            {isMDDAchieved ? '✓ MDD Tercapai!' : `${mddScore} / ${MDD_THRESHOLD} kelompok pangan`}
                                        </span>
                                        <span style={{ fontSize: '1.25rem', fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: 'var(--primary)' }}>
                                            {mddScore}/8
                                        </span>
                                    </div>
                                    <div style={{
                                        height: 6,
                                        background: 'var(--border-light)',
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(mddScore / 8) * 100}%`,
                                            background: isMDDAchieved
                                                ? 'var(--accent)'
                                                : 'var(--secondary)',
                                            borderRadius: 3,
                                            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        }} />
                                    </div>
                                </div>

                                {/* Food Group Grid — 8 Kelompok WHO */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                                    {FOOD_GROUPS.map((group) => (
                                        <FoodGroupCard
                                            key={group.key}
                                            label={group.label}
                                            description={group.description}
                                            icon={group.icon}
                                            checked={foodGroups[group.key as keyof FoodGroupState]}
                                            onChange={() => toggleFoodGroup(group.key)}
                                            disabled={alreadyLogged}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ASI & PMBA Section */}
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>
                                {isUnder6Months ? '📋 Pemantauan ASI & Kondisi Ibu' : '📋 Data PMBA Tambahan'}
                            </h3>

                            {/* ASI toggle only for under 6 months */}
                            {isUnder6Months && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <label style={{ fontWeight: 600, fontSize: '0.875rem' }}>Masih ASI Eksklusif?</label>
                                    <button
                                        type="button"
                                        className={`toggle ${isBreastfed ? 'active' : ''}`}
                                        onClick={() => !alreadyLogged && setIsBreastfed(!isBreastfed)}
                                        disabled={alreadyLogged}
                                        aria-label={`ASI: ${isBreastfed ? 'Ya' : 'Tidak'}`}
                                    />
                                </div>
                            )}

                            {isUnder6Months && (
                                <>
                                    <div className="input-group">
                                        <label>Frekuensi Menyusui (24 Jam)</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ width: 44, height: 44, padding: 0 }}
                                                onClick={() => setBreastfeedingFreq(Math.max(0, breastfeedingFreq - 1))}
                                                disabled={alreadyLogged}
                                            >
                                                −
                                            </button>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: "'Poppins', sans-serif", minWidth: 32, textAlign: 'center' }}>
                                                {breastfeedingFreq}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ width: 44, height: 44, padding: 0 }}
                                                onClick={() => setBreastfeedingFreq(Math.min(30, breastfeedingFreq + 1))}
                                                disabled={alreadyLogged}
                                            >
                                                +
                                            </button>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>kali</span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                            *Normalnya bayi menyusu 8-12 kali dalam sehari semalam.
                                        </p>
                                    </div>
                                    <div className="input-group">
                                        <label>Popok Basah (BAK) Hari Ini</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ width: 44, height: 44, padding: 0 }}
                                                onClick={() => setWetDiapers(Math.max(0, wetDiapers - 1))}
                                                disabled={alreadyLogged}
                                            >
                                                −
                                            </button>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: "'Poppins', sans-serif", minWidth: 32, textAlign: 'center' }}>
                                                {wetDiapers}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ width: 44, height: 44, padding: 0 }}
                                                onClick={() => setWetDiapers(Math.min(30, wetDiapers + 1))}
                                                disabled={alreadyLogged}
                                            >
                                                +
                                            </button>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>kali</span>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                            *Tanda ASI cukup: bayi ganti popok basah minimal 6x sehari.
                                        </p>
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 16 }}>
                                        <label>Perasaan Ibu Hari Ini</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                                            {[
                                                { label: 'Senang', value: 'Senang', emoji: '😊' },
                                                { label: 'Cukup', value: 'Cukup', emoji: '😐' },
                                                { label: 'Lelah', value: 'Lelah', emoji: '😫' },
                                            ].map(mood => (
                                                <button
                                                    key={mood.value}
                                                    type="button"
                                                    onClick={() => setMotherMood(mood.value)}
                                                    disabled={alreadyLogged}
                                                    style={{
                                                        padding: '12px 8px',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: `1px solid ${motherMood === mood.value ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: motherMood === mood.value ? 'var(--primary-soft)' : 'var(--bg-warm)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    <span style={{ fontSize: '1.5rem' }}>{mood.emoji}</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: motherMood === mood.value ? 600 : 400, color: motherMood === mood.value ? 'var(--primary-dark)' : 'var(--text-secondary)' }}>
                                                        {mood.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                            *Kondisi ibu sangat berpengaruh pada kelancaran ASI. Ibu hebat!
                                        </p>
                                    </div>
                                </>
                            )}

                            {!isUnder6Months && (
                                <>
                                    <div className="input-group">
                                        <label htmlFor="meal-freq">Frekuensi Makan (24 Jam)
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                                                Target: ≥ {mmfThreshold}x (MMF)
                                            </span>
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ width: 44, height: 44, padding: 0 }}
                                                onClick={() => setMealFrequency(Math.max(0, mealFrequency - 1))}
                                                disabled={alreadyLogged}
                                            >
                                                −
                                            </button>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 600, fontFamily: "'Poppins', sans-serif", minWidth: 32, textAlign: 'center' }}>
                                                {mealFrequency}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ width: 44, height: 44, padding: 0 }}
                                                onClick={() => setMealFrequency(Math.min(10, mealFrequency + 1))}
                                                disabled={alreadyLogged}
                                            >
                                                +
                                            </button>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>kali</span>
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ marginBottom: 16 }}>
                                        <label htmlFor="texture">Tekstur Makanan Hari Ini</label>
                                        <select
                                            id="texture"
                                            className="input-field"
                                            value={texture}
                                            onChange={(e) => setTexture(e.target.value)}
                                            disabled={alreadyLogged}
                                        >
                                            <option value="" disabled>Pilih tekstur makanan...</option>
                                            {FOOD_TEXTURES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="notes">Catatan (opsional)</label>
                                <textarea
                                    id="notes"
                                    className="input-field"
                                    rows={2}
                                    placeholder="Contoh: bayi menolak sayur hari ini"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={alreadyLogged}
                                    style={{ resize: 'vertical', fontFamily: "'Poppins', sans-serif" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    {!alreadyLogged && (
                        <button
                            className="btn btn-primary btn-full btn-lg"
                            onClick={handleSave}
                            disabled={saving || (!isUnder6Months && mddScore === 0)}
                            style={{ marginBottom: 24 }}
                        >
                            {saving
                                ? 'Menyimpan...'
                                : isUnder6Months
                                    ? 'Simpan Data ASI'
                                    : `Simpan Data (${mddScore} kelompok)`}
                        </button>
                    )}
                </>)}
            </div> {/* End container */}

            {/* Success Modal */}
            <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Data Berhasil Disimpan!">
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: isAchieved ? 'var(--accent)' : 'var(--secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '1.75rem', color: '#fff',
                    }}>
                        {isAchieved ? '🌟' : '👍'}
                    </div>
                    <h3 style={{ marginBottom: 8 }}>
                        {isAchieved ? 'Luar Biasa, Bu!' : 'Terima Kasih, Bu!'}
                    </h3>
                    <p style={{ fontSize: '0.9375rem', marginBottom: 4 }}>
                        {isUnder6Months
                            ? isAchieved
                                ? 'Pemberian ASI Eksklusif berhasil dicatat hari ini.'
                                : 'Si kecil terpantau sudah tidak ASI. Tetap semangat, Bu!'
                            : madAchieved
                                ? `🏆 MAD Tercapai! MDD ${mddScore}/8 ✓ MMF ${mealFrequency}x ✓`
                                : isMDDAchieved
                                    ? `MDD tercapai (${mddScore}/8)! ${mmfAchieved ? 'MMF tercapai' : `Frekuensi makan masih ${mealFrequency}x, target ≥${mmfThreshold}x`}`
                                    : `Si kecil mengonsumsi ${mddScore} kelompok pangan. Target ≥${MDD_THRESHOLD} per hari.`
                        }
                    </p>

                    {/* PMBA Status Badges */}
                    {!isUnder6Months && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                            <span className={`badge ${isMDDAchieved ? 'badge-success' : 'badge-warning'}`}>
                                MDD {isMDDAchieved ? '✓' : '✗'} ({mddScore}/8)
                            </span>
                            <span className={`badge ${mmfAchieved ? 'badge-success' : 'badge-warning'}`}>
                                MMF {mmfAchieved ? '✓' : '✗'} ({mealFrequency}x)
                            </span>
                            <span className={`badge ${madAchieved ? 'badge-success' : 'badge-warning'}`}>
                                MAD {madAchieved ? '✓' : '✗'}
                            </span>
                        </div>
                    )}

                    {!isOnline && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--warning)', marginTop: 8 }}>
                            📱 Data disimpan offline dan akan tersinkron saat ada internet
                        </p>
                    )}
                    <button
                        className="btn btn-primary btn-full"
                        onClick={async () => {
                            setShowSuccess(false);

                            // Check if there's another unlogged child
                            if (profile && profile.children.length > 1) {
                                const ix = profile.children.findIndex(c => c.id === activeChild?.id);
                                const nextIx = (ix + 1) % profile.children.length;
                                const nextChild = profile.children[nextIx];

                                if (nextChild && nextChild.id !== activeChild?.id) {
                                    await setActiveChild(nextChild.id);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    return;
                                }
                            }

                            // Default action if 1 child or loop completed: go home
                            router.push('/dashboard');
                        }}
                        style={{ marginTop: 20 }}
                    >
                        {profile && profile.children.length > 1 ? 'Lanjutkan' : 'Kembali ke Beranda'}
                    </button>
                </div>
            </Modal>

            {showToast && (
                <Toast
                    message={showToast.message}
                    type={showToast.type}
                    onClose={() => setShowToast(null)}
                />
            )}

            <Navbar />
        </div>
    );
}
