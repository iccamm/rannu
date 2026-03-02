export interface BabyAge {
    months: number;
    days: number;
    totalDays: number;
    ageLabel: string;
    ageRange: '0-5' | '6-8' | '9-11' | '12-23' | 'other';
}

export function calculateBabyAge(dob: Date): BabyAge {
    const now = new Date();
    const dobDate = new Date(dob);

    // Calculate total days
    const diffTime = now.getTime() - dobDate.getTime();
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate months and remaining days
    let months = (now.getFullYear() - dobDate.getFullYear()) * 12;
    months += now.getMonth() - dobDate.getMonth();

    let days = now.getDate() - dobDate.getDate();
    if (days < 0) {
        months--;
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }

    // Age label
    const ageLabel = `${months} bulan ${days} hari`;

    // Age range for baduta (0-23 bulan 29 hari)
    let ageRange: BabyAge['ageRange'] = 'other';
    if (months >= 0 && months <= 5) ageRange = '0-5';
    else if (months >= 6 && months <= 8) ageRange = '6-8';
    else if (months >= 9 && months <= 11) ageRange = '9-11';
    else if (months >= 12 && months <= 23) ageRange = '12-23';

    return { months, days, totalDays, ageLabel, ageRange };
}

export function getTextureRecommendation(months: number): string {
    if (months >= 6 && months <= 8) {
        return 'Tekstur Lumat (Puree)';
    } else if (months >= 9 && months <= 11) {
        return 'Tekstur Cincang Halus';
    } else if (months >= 12) {
        return 'Makanan Keluarga';
    }
    return 'Belum MPASI';
}
