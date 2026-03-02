'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import CustomSelect from '@/components/CustomSelect';
import { Plus, Trash2, Baby, UserCircle2, MapPin, Building2, Home, ShieldCheck, Heart } from 'lucide-react';

// Month names for the DD-MM-YYYY date picker
const MONTHS = [
    { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' }, { value: '04', label: 'April' },
    { value: '05', label: 'Mei' }, { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
];

// Generate day options (1-31)
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

// Generate year options (current year down to 2020)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => String(currentYear - i));

// Data Kecamatan -> Desa/Kelurahan di Kabupaten Bantaeng (Referensi: Kemendagri)
const KECAMATAN_BANTAENG: Record<string, string[]> = {
    'Bantaeng': ['Karatuang', 'Lamalaka', 'Lembang', 'Letta', 'Mallilingi', 'Onto', 'Pallantikang', 'Tappanjeng', 'Kayu Loe'],
    'Bissappu': ['Bonto Atu', 'Bonto Jaya', 'Bonto Langkasa', 'Bonto Lebang', 'Bonto Manai', 'Bonto Rita', 'Bonto Sunggu', 'Bonto Cinde', 'Bonto Jai', 'Bonto Loe', 'Bonto Salluang'],
    'Eremerasa': ['Barua', 'Kampala', 'Lonrong', 'Mamampang', 'Mappilawing', 'Pa\'bentengan', 'Pa\'bumbungang', 'Parangloe', 'Ulu Galung'],
    'Gantarangkeke': ['Gantarangkeke', 'Tanah Loe', 'Bajiminasa', 'Kaloling', 'Layoa', 'Tombolo'],
    'Pajukukang': ['Baruga', 'Batu Karaeng', 'Biangkeke', 'Biangloe', 'Borongloe', 'Lumpangan', 'Nipa-Nipa', 'Pa\'jukukang', 'Papanloe', 'Rappoa'],
    'Sinoa': ['Bonto Bulaeng', 'Bonto Karaeng', 'Bonto Maccini', 'Bonto Majannang', 'Bonto Mate\'ne', 'Bonto Tiro'],
    'Tompobulu': ['Banyorang', 'Campaga', 'Ereng-Ereng', 'Lembang Gantarangkeke', 'Balumbung', 'Bonto Tappalang', 'Bonto-Bontoa', 'Labbo', 'Pattallassang', 'Pattaneteang'],
    'Uluere': ['Bonto Daeng', 'Bonto Lojong', 'Bonto Marannu', 'Bonto Rannu', 'Bonto Tallasa', 'Bonto Tangnga']
};

// Puskesmas → Group otomatis (desain quasi-experimental)
const PUSKESMAS_OPTIONS = [
    { value: 'Bissappu', label: 'Puskesmas Bissappu', group: 'intervention' as const },
    { value: 'Baruga', label: 'Puskesmas Baruga', group: 'control' as const },
];

// Pendidikan terakhir
const EDUCATION_OPTIONS = [
    { value: 'SD', label: 'SD / Sederajat' },
    { value: 'SMP', label: 'SMP / Sederajat' },
    { value: 'SMA', label: 'SMA / SMK / Sederajat' },
    { value: 'D3', label: 'D3 / Diploma' },
    { value: 'S1', label: 'S1 / Sarjana' },
    { value: 'S2', label: 'S2 / S3' },
];

// Pendapatan keluarga
const INCOME_OPTIONS = [
    { value: 'dibawah_umk', label: '< UMK (< Rp 3.500.000/bulan)' },
    { value: 'diatas_umk', label: '≥ UMK (≥ Rp 3.500.000/bulan)' },
];

export default function RegisterPage() {
    const { user, profile, saveProfile, firebaseReady } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [adminClaiming, setAdminClaiming] = useState(false);
    const [adminExists, setAdminExists] = useState<boolean | null>(null);

    // Check if an admin already exists by reading a SINGLE document (no collection query)
    useEffect(() => {
        if (!firebaseReady || !user) return;
        async function checkAdmin() {
            try {
                const db = getFirebaseDb();
                if (!db) { setAdminExists(false); return; }
                const adminDoc = await getDoc(doc(db, 'app_config', 'admin'));
                setAdminExists(adminDoc.exists());
            } catch (err) {
                console.error('Error checking admin config:', err);
                setAdminExists(false);
            }
        }
        checkAdmin();
    }, [firebaseReady, user]);

    const handleClaimAdmin = async () => {
        if (adminClaiming) return;
        if (!user) {
            setError('Anda harus login terlebih dahulu.');
            return;
        }
        setAdminClaiming(true);
        setError('');
        try {
            const db = getFirebaseDb();
            if (!db) {
                setError('Firebase belum siap. Coba lagi.');
                return;
            }
            const batch = writeBatch(db);
            batch.set(doc(db, 'users_profile', user.uid), {
                uid: user.uid,
                mom_name: 'Administrator',
                mom_phone: user.email || '',
                village: '',
                sub_district: '',
                posyandu: '',
                group: 'admin',
                children: [],
                active_child_id: '',
                isAdmin: true,
                created_at: serverTimestamp(),
            });
            batch.set(doc(db, 'app_config', 'admin'), {
                uid: user.uid,
                email: user.email || '',
                claimed_at: serverTimestamp(),
            });
            await batch.commit();
            router.replace('/admin');
        } catch (err) {
            console.error('Failed to claim admin:', err);
            setError('Gagal mengklaim admin. Coba lagi.');
        } finally {
            setAdminClaiming(false);
        }
    };

    const [profileData, setProfileData] = useState({
        mom_name: '',
        mom_phone: '',
        mom_age: '',
        education_level: '',
        income_level: '',
        family_support: 0,
        puskesmas: '',
        kabupaten: 'Bantaeng',
        sub_district: '',
        village: '',
        posyandu: '',
    });

    const [children, setChildren] = useState([
        { id: crypto.randomUUID(), name: '', dob: '', gender: '' as 'L' | 'P' | '', birth_weight: '', birth_length: '', head_circumference: '' }
    ]);

    // Prefill form if profile data already exists
    useEffect(() => {
        if (profile) {
            if (adminExists === null) return;
            if (profile.isAdmin && adminExists === true) {
                router.replace('/admin');
                return;
            }

            setProfileData({
                mom_name: profile.mom_name || '',
                mom_phone: profile.mom_phone || '',
                mom_age: profile.mom_age?.toString() || '',
                education_level: profile.education_level || '',
                income_level: profile.income_level || '',
                family_support: profile.family_support || 0,
                puskesmas: profile.puskesmas || '',
                kabupaten: 'Bantaeng',
                sub_district: profile.sub_district || '',
                village: profile.village || '',
                posyandu: profile.posyandu || '',
            });
            if (profile.children && profile.children.length > 0) {
                setChildren(profile.children.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    dob: `${c.dob.getFullYear()}-${String(c.dob.getMonth() + 1).padStart(2, '0')}-${String(c.dob.getDate()).padStart(2, '0')}`,
                    gender: c.gender,
                    birth_weight: c.birth_weight?.toString() || '',
                    birth_length: c.birth_length?.toString() || '',
                    head_circumference: c.head_circumference?.toString() || '',
                })));
            }
        }
    }, [profile, adminExists, router]);

    const updateProfile = (field: string, value: string | number) => {
        setProfileData((prev) => ({ ...prev, [field]: value }));
    };

    const updateChild = (id: string, field: string, value: string) => {
        setChildren(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const addChild = () => {
        setChildren(prev => [...prev, { id: crypto.randomUUID(), name: '', dob: '', gender: '', birth_weight: '', birth_length: '', head_circumference: '' }]);
    };

    const removeChild = (id: string) => {
        if (children.length === 1) return;
        setChildren(prev => prev.filter(c => c.id !== id));
    };

    // Auto-set group based on puskesmas
    const selectedPuskesmas = PUSKESMAS_OPTIONS.find(p => p.value === profileData.puskesmas);
    const autoGroup = selectedPuskesmas?.group || 'intervention';

    const isEditMode = !!profile;
    const isProfileValid = profileData.mom_name && profileData.village && profileData.sub_district && profileData.puskesmas;
    const areChildrenValid = children.every(c => {
        if (!c.name || !c.gender) return false;
        // DOB must have all 3 parts: YYYY-MM-DD
        const parts = (c.dob || '').split('-');
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false;
        const parsed = new Date(c.dob);
        return !isNaN(parsed.getTime());
    });
    const isValid = isProfileValid && areChildrenValid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || !user) return;
        setLoading(true);
        setError('');
        try {
            await saveProfile({
                mom_name: profileData.mom_name,
                mom_phone: profileData.mom_phone || user.email || user.phoneNumber || '',
                mom_age: profileData.mom_age ? parseInt(profileData.mom_age) : undefined,
                education_level: profileData.education_level || undefined,
                income_level: profileData.income_level || undefined,
                family_support: profileData.family_support || undefined,
                puskesmas: profileData.puskesmas,
                village: profileData.village,
                sub_district: profileData.sub_district,
                posyandu: profileData.posyandu,
                group: autoGroup,
                children: children.map((c, i) => ({
                    id: c.id.startsWith('child_') ? c.id : `child_${i + 1}_${Date.now()}`,
                    name: c.name,
                    dob: new Date(c.dob) as unknown as Date,
                    gender: c.gender as 'L' | 'P',
                    birth_weight: c.birth_weight ? parseInt(c.birth_weight) : 0,
                    birth_length: c.birth_length ? parseFloat(c.birth_length) : undefined,
                    head_circumference: c.head_circumference ? parseFloat(c.head_circumference) : undefined,
                })),
                active_child_id: '',
            });
            router.replace('/dashboard');
        } catch (err) {
            console.error('Register Error:', err);
            setError('Gagal menyimpan profil. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{ background: 'var(--bg-warm)' }}>
            <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
                <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-soft)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                        color: 'var(--primary)'
                    }}>
                        <UserCircle2 size={32} />
                    </div>
                    <h1 style={{ marginBottom: 8, fontSize: '1.75rem' }}>
                        {isEditMode ? 'Edit Profil' : 'Selamat Datang!'}
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
                        {isEditMode
                            ? 'Ibu sedang dalam mode edit data. Pastikan semua data sudah benar.'
                            : 'Mari lengkapi profil Ibu dan si kecil untuk mulai memantau gizi.'}
                    </p>
                </div>

                {/* Admin Claim Section */}
                {adminExists === false && (!isEditMode || profile?.isAdmin) && (
                    <div className="card animate-fade-in" style={{
                        marginBottom: 24, border: '2px dashed var(--warning)',
                        background: 'rgba(245, 158, 11, 0.05)', textAlign: 'center', padding: '20px 16px'
                    }}>
                        <ShieldCheck size={28} color="var(--warning)" style={{ marginBottom: 8 }} />
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                            {profile?.isAdmin
                                ? "Profil admin Anda belum lengkap. Klik untuk menyelesaikan."
                                : "Apakah Anda adalah Administrator sistem ini?"}
                        </p>
                        {error && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginBottom: 10 }}>{error}</p>
                        )}
                        <button
                            type="button"
                            onClick={handleClaimAdmin}
                            disabled={adminClaiming}
                            className="btn"
                            style={{
                                background: 'var(--warning)', color: '#fff', fontWeight: 600,
                                padding: '10px 24px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
                                opacity: adminClaiming ? 0.6 : 1,
                            }}
                        >
                            {adminClaiming ? 'Memproses...' : 'Klaim sebagai Admin'}
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="animate-fade-in" style={{ animationDelay: '0.1s' }}>

                    {/* ========== Data Ibu Card ========== */}
                    <div className="card" style={{ marginBottom: 16, border: 'none', boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                            <UserCircle2 size={24} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Data Ibu</h3>
                        </div>

                        <div className="input-group">
                            <label htmlFor="mom_name">Nama Lengkap Ibu *</label>
                            <input
                                id="mom_name" type="text" className="input-field"
                                placeholder="Contoh: Siti Aminah"
                                value={profileData.mom_name}
                                onChange={(e) => updateProfile('mom_name', e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="mom_phone">No. HP</label>
                                <input
                                    id="mom_phone" type="tel" className="input-field"
                                    placeholder="08xx-xxxx-xxxx"
                                    value={profileData.mom_phone}
                                    onChange={(e) => updateProfile('mom_phone', e.target.value)}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="mom_age">Usia Ibu (tahun)</label>
                                <input
                                    id="mom_age" type="number" className="input-field"
                                    placeholder="Cth: 25"
                                    value={profileData.mom_age}
                                    onChange={(e) => updateProfile('mom_age', e.target.value)}
                                    min="15" max="60"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="education">Pendidikan Terakhir</label>
                                <CustomSelect
                                    placeholder="Pilih Pendidikan"
                                    options={EDUCATION_OPTIONS}
                                    value={profileData.education_level}
                                    onChange={(val) => updateProfile('education_level', val)}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="income">Pendapatan Keluarga</label>
                                <CustomSelect
                                    placeholder="Pilih Pendapatan"
                                    options={INCOME_OPTIONS}
                                    value={profileData.income_level}
                                    onChange={(val) => updateProfile('income_level', val)}
                                />
                            </div>
                        </div>

                        {/* Puskesmas (auto-sets intervention/control group) */}
                        <div className="input-group" style={{ marginBottom: 16 }}>
                            <label htmlFor="puskesmas">
                                Puskesmas *
                                {selectedPuskesmas && (
                                    <span style={{
                                        marginLeft: 8,
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-full)',
                                        background: autoGroup === 'intervention' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                                        color: autoGroup === 'intervention' ? '#047857' : '#0284c7',
                                        fontWeight: 600,
                                    }}>
                                        Kelompok: {autoGroup === 'intervention' ? 'Intervensi' : 'Kontrol'}
                                    </span>
                                )}
                            </label>
                            <CustomSelect
                                placeholder="Pilih Puskesmas"
                                options={PUSKESMAS_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
                                value={profileData.puskesmas}
                                onChange={(val) => updateProfile('puskesmas', val)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Kabupaten / Kota</label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                                    <input
                                        type="text" className="input-field"
                                        value={profileData.kabupaten}
                                        disabled
                                        style={{ paddingLeft: 42, backgroundColor: 'var(--border-light)', color: 'var(--text-secondary)' }}
                                    />
                                </div>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="sub_district">Kecamatan *</label>
                                <CustomSelect
                                    placeholder="Pilih Kecamatan"
                                    options={Object.keys(KECAMATAN_BANTAENG).map(kec => ({ value: kec, label: kec }))}
                                    value={profileData.sub_district}
                                    onChange={(val) => {
                                        updateProfile('sub_district', val);
                                        updateProfile('village', '');
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="village">Desa / Kelurahan *</label>
                                <CustomSelect
                                    placeholder="Pilih Desa"
                                    options={(profileData.sub_district ? KECAMATAN_BANTAENG[profileData.sub_district] || [] : []).map(d => ({ value: d, label: d }))}
                                    value={profileData.village}
                                    onChange={(val) => updateProfile('village', val)}
                                    disabled={!profileData.sub_district}
                                />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="posyandu">Nama Posyandu</label>
                                <div style={{ position: 'relative' }}>
                                    <Home size={18} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }} />
                                    <input
                                        id="posyandu" type="text" className="input-field"
                                        placeholder="Cth: Anggrek 1"
                                        value={profileData.posyandu}
                                        style={{ paddingLeft: 42 }}
                                        onChange={(e) => updateProfile('posyandu', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dukungan Keluarga — Likert Scale (kovariat ANCOVA) */}
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label>
                                <Heart size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                                Dukungan Keluarga dalam Pemberian MPASI
                            </label>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                Seberapa besar dukungan suami/keluarga terhadap praktik PMBA si kecil?
                            </p>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {[1, 2, 3, 4, 5].map(val => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => updateProfile('family_support', val)}
                                        style={{
                                            flex: 1,
                                            padding: '12px 4px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: `1.5px solid ${profileData.family_support === val ? 'var(--primary)' : 'var(--border)'}`,
                                            background: profileData.family_support === val ? 'var(--primary-soft)' : 'var(--bg-warm)',
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            color: profileData.family_support === val ? 'var(--primary-dark)' : 'var(--text-muted)',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Sangat Kurang</span>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Sangat Baik</span>
                            </div>
                        </div>
                    </div>

                    {/* ========== Data Anak Cards ========== */}
                    {children.map((child, index) => (
                        <div key={child.id} className="card animate-scale-in" style={{ marginBottom: 16, border: '1px solid var(--border)', position: 'relative' }}>
                            {children.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeChild(child.id)}
                                    style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ background: 'var(--secondary-lighter)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary-dark)' }}>
                                    <Baby size={22} />
                                </div>
                                <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Data Anak {children.length > 1 ? `#${index + 1}` : ''}</h3>
                            </div>

                            <div className="input-group">
                                <label>Nama Panggilan Anak *</label>
                                <input
                                    type="text" className="input-field"
                                    placeholder="Contoh: Budi"
                                    value={child.name}
                                    onChange={(e) => updateChild(child.id, 'name', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Tanggal Lahir (Hari - Bulan - Tahun) *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.2fr', gap: 8 }}>
                                    <CustomSelect
                                        placeholder="Tgl"
                                        options={DAYS.map(d => ({ value: d, label: String(parseInt(d)) }))}
                                        value={child.dob ? child.dob.split('-')[2] || '' : ''}
                                        onChange={(val) => {
                                            const parts = (child.dob || '--').split('-');
                                            updateChild(child.id, 'dob', `${parts[0] || ''}-${parts[1] || ''}-${val}`);
                                        }}
                                    />
                                    <CustomSelect
                                        placeholder="Bulan"
                                        options={MONTHS.map(m => ({ value: m.value, label: m.label }))}
                                        value={child.dob ? child.dob.split('-')[1] || '' : ''}
                                        onChange={(val) => {
                                            const parts = (child.dob || '--').split('-');
                                            updateChild(child.id, 'dob', `${parts[0] || ''}-${val}-${parts[2] || ''}`);
                                        }}
                                    />
                                    <CustomSelect
                                        placeholder="Tahun"
                                        options={YEARS.map(y => ({ value: y, label: y }))}
                                        value={child.dob ? child.dob.split('-')[0] || '' : ''}
                                        onChange={(val) => {
                                            const parts = (child.dob || '--').split('-');
                                            updateChild(child.id, 'dob', `${val}-${parts[1] || ''}-${parts[2] || ''}`);
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Jenis Kelamin *</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            type="button"
                                            className={`btn ${child.gender === 'L' ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ flex: 1, padding: '12px 0', fontSize: '0.875rem' }}
                                            onClick={() => updateChild(child.id, 'gender', 'L')}
                                        >
                                            Laki-laki
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${child.gender === 'P' ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ flex: 1, padding: '12px 0', fontSize: '0.875rem' }}
                                            onClick={() => updateChild(child.id, 'gender', 'P')}
                                        >
                                            Perempuan
                                        </button>
                                    </div>
                                </div>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Berat Lahir (g)</label>
                                    <input
                                        type="number" className="input-field"
                                        placeholder="Cth: 3200"
                                        value={child.birth_weight}
                                        onChange={(e) => updateChild(child.id, 'birth_weight', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Tinggi/Panjang Lahir (cm)</label>
                                    <input
                                        type="number" step="0.1" className="input-field"
                                        placeholder="Cth: 50.5"
                                        value={child.birth_length}
                                        onChange={(e) => updateChild(child.id, 'birth_length', e.target.value)}
                                    />
                                </div>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label>Lingkar Kepala (cm)</label>
                                    <input
                                        type="number" step="0.1" className="input-field"
                                        placeholder="Cth: 34"
                                        value={child.head_circumference}
                                        onChange={(e) => updateChild(child.id, 'head_circumference', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addChild}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            width: '100%', padding: '14px', background: 'transparent',
                            border: '1.5px dashed var(--primary-light)', borderRadius: 'var(--radius-md)',
                            color: 'var(--primary)', fontWeight: 600, fontSize: '0.9375rem',
                            cursor: 'pointer', marginBottom: 32, transition: 'all 0.2s ease'
                        }}
                    >
                        <Plus size={20} />
                        Tambah Anak Baduta Lainnya
                    </button>

                    {error && (
                        <p style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center', marginBottom: 16 }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        disabled={loading || !isValid}
                        style={{ boxShadow: 'var(--shadow-md)' }}
                    >
                        {loading ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Simpan Profil & Mulai')}
                    </button>
                </form>
            </div>
        </div>
    );
}
