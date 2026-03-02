// ==========================================
// RANNU — Standar 8 Kelompok Pangan WHO
// Sesuai Lampiran 2 Proposal Tesis (Food Recall 24-Jam)
// ==========================================

export const FOOD_GROUPS = [
    {
        key: 'breast_milk',
        label: 'ASI',
        description: 'Air Susu Ibu (ASI)',
        icon: '🤱',
    },
    {
        key: 'grains',
        label: 'Serealia & Umbi',
        description: 'Nasi, roti, kentang, jagung, mie, singkong',
        icon: '🌾',
    },
    {
        key: 'legumes',
        label: 'Kacang-kacangan',
        description: 'Kacang hijau, kedelai, tahu, tempe',
        icon: '🫘',
    },
    {
        key: 'dairy',
        label: 'Susu & Produk Susu',
        description: 'Susu, yogurt, keju',
        icon: '🥛',
    },
    {
        key: 'protein_animal',
        label: 'Daging & Ikan',
        description: 'Daging ayam, sapi, ikan, hati, udang',
        icon: '🍖',
    },
    {
        key: 'eggs',
        label: 'Telur',
        description: 'Telur ayam, telur puyuh, telur bebek',
        icon: '🥚',
    },
    {
        key: 'vitamin_a_rich',
        label: 'Sayur & Buah Kaya Vit A',
        description: 'Wortel, labu kuning, ubi jalar, bayam, mangga matang',
        icon: '🥕',
    },
    {
        key: 'other_veg_fruit',
        label: 'Sayur & Buah Lainnya',
        description: 'Pisang, apel, tomat, brokoli, kangkung',
        icon: '🥬',
    },
] as const;

export type FoodGroupKey = typeof FOOD_GROUPS[number]['key'];

export const FOOD_TEXTURES = [
    { value: 'Saring/Lumat', label: 'Saring/Lumat (6-8 bulan)' },
    { value: 'Cincang Halus', label: 'Cincang Halus (9-11 bulan)' },
    { value: 'Cincang Kasar', label: 'Cincang Kasar (9-11 bulan)' },
    { value: 'Makanan Keluarga', label: 'Makanan Keluarga (12-24 bulan)' },
] as const;

export interface FoodGroupState {
    breast_milk: boolean;
    grains: boolean;
    legumes: boolean;
    dairy: boolean;
    protein_animal: boolean;
    eggs: boolean;
    vitamin_a_rich: boolean;
    other_veg_fruit: boolean;
}

export const DEFAULT_FOOD_GROUPS: FoodGroupState = {
    breast_milk: false,
    grains: false,
    legumes: false,
    dairy: false,
    protein_animal: false,
    eggs: false,
    vitamin_a_rich: false,
    other_veg_fruit: false,
};

// ==========================================
// MDD — Minimum Dietary Diversity (WHO)
// Standar: Lulus jika ≥ 5 dari 8 kelompok pangan
// ==========================================
export const MDD_THRESHOLD = 5;

// ==========================================
// MMF — Minimum Meal Frequency (WHO)
// Berdasarkan usia anak dan status ASI
// ==========================================
export const MMF_THRESHOLDS: Record<string, number> = {
    '6-8_breastfed': 2,      // 6-8 bulan + ASI: ≥ 2x makan utama
    '6-8_non_breastfed': 4,  // 6-8 bulan tanpa ASI: ≥ 4x
    '9-23_breastfed': 3,     // 9-23 bulan + ASI: ≥ 3x makan utama
    '9-23_non_breastfed': 4, // 9-23 bulan tanpa ASI: ≥ 4x
};

/**
 * Menentukan apakah MMF tercapai berdasarkan usia (bulan), frekuensi makan, dan status ASI.
 */
export function isMMFAchieved(ageMonths: number, mealFrequency: number, isBreastfed: boolean): boolean {
    if (ageMonths < 6) return true; // Belum MPASI, tidak relevan
    const ageKey = ageMonths <= 8 ? '6-8' : '9-23';
    const asiKey = isBreastfed ? 'breastfed' : 'non_breastfed';
    const threshold = MMF_THRESHOLDS[`${ageKey}_${asiKey}`] ?? 3;
    return mealFrequency >= threshold;
}

/**
 * Mendapatkan threshold MMF berdasarkan usia dan status ASI.
 */
export function getMMFThreshold(ageMonths: number, isBreastfed: boolean): number {
    if (ageMonths < 6) return 0;
    const ageKey = ageMonths <= 8 ? '6-8' : '9-23';
    const asiKey = isBreastfed ? 'breastfed' : 'non_breastfed';
    return MMF_THRESHOLDS[`${ageKey}_${asiKey}`] ?? 3;
}

/**
 * MAD = Minimum Acceptable Diet
 * MAD tercapai jika MDD tercapai DAN MMF tercapai
 * (Sesuai standar WHO — Fewtrell et al., 2023)
 */
export function isMADAchieved(mddScore: number, ageMonths: number, mealFrequency: number, isBreastfed: boolean): boolean {
    const mddOk = mddScore >= MDD_THRESHOLD;
    const mmfOk = isMMFAchieved(ageMonths, mealFrequency, isBreastfed);
    return mddOk && mmfOk;
}

// ==========================================
// Greetings
// ==========================================
export const GREETINGS: Record<string, string> = {
    morning: 'Selamat Pagi',
    afternoon: 'Selamat Siang',
    evening: 'Selamat Sore',
    night: 'Selamat Malam',
};

export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return GREETINGS.morning;
    if (hour >= 11 && hour < 15) return GREETINGS.afternoon;
    if (hour >= 15 && hour < 18) return GREETINGS.evening;
    return GREETINGS.night;
}
