// ==========================================
// RANNU Gamifikasi — COM-B: MOTIVATION
// Sistem poin, streak, dan lencana digital
// ==========================================

import { doc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

// === Poin System ===
export const POINT_VALUES = {
    daily_log: 10,            // Input harian
    mdd_achieved: 20,         // MDD tercapai (≥5 kelompok)
    mad_achieved: 30,         // MAD tercapai (MDD + MMF)
    article_read: 5,          // Bacaan harian
    myth_opened: 5,           // Myth-buster card dibuka
    streak_bonus_7: 50,       // Bonus streak 7 hari
    streak_bonus_14: 100,     // Bonus streak 14 hari
    streak_bonus_30: 200,     // Bonus streak 30 hari
} as const;

// === Lencana (Badges) ===
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: string;
}

export const BADGES: Badge[] = [
    {
        id: 'first_log',
        name: 'Langkah Pertama',
        description: 'Input data pertama kali',
        icon: '🌱',
        requirement: 'total_logs >= 1',
    },
    {
        id: 'streak_3',
        name: 'Ibu Rajin',
        description: 'Input 3 hari berturut-turut',
        icon: '⭐',
        requirement: 'streak >= 3',
    },
    {
        id: 'streak_7',
        name: 'Ibu Konsisten',
        description: 'Input 7 hari berturut-turut',
        icon: '🏅',
        requirement: 'streak >= 7',
    },
    {
        id: 'streak_14',
        name: 'Ibu Teladan',
        description: 'Input 14 hari berturut-turut',
        icon: '🥇',
        requirement: 'streak >= 14',
    },
    {
        id: 'streak_30',
        name: 'Pahlawan PMBA',
        description: 'Input 30 hari berturut-turut',
        icon: '🏆',
        requirement: 'streak >= 30',
    },
    {
        id: 'mdd_master_5',
        name: 'MDD Master',
        description: 'MDD tercapai 5 kali',
        icon: '🌟',
        requirement: 'mdd_count >= 5',
    },
    {
        id: 'mdd_master_20',
        name: 'Pahlawan Gizi',
        description: 'MDD tercapai 20 kali',
        icon: '💪',
        requirement: 'mdd_count >= 20',
    },
    {
        id: 'myth_explorer_5',
        name: 'Pembasmi Mitos',
        description: 'Buka 5 kartu Myth-Buster',
        icon: '🛡️',
        requirement: 'myths_opened >= 5',
    },
    {
        id: 'myth_explorer_10',
        name: 'Perisai Keluarga',
        description: 'Buka 10 kartu Myth-Buster',
        icon: '🔰',
        requirement: 'myths_opened >= 10',
    },
    {
        id: 'reader_7',
        name: 'Ibu Cerdas',
        description: 'Baca 7 artikel harian',
        icon: '📖',
        requirement: 'articles_read >= 7',
    },
];

// === UserStats Interface ===
export interface UserStats {
    total_points: number;
    current_streak: number;
    max_streak: number;
    last_log_date: string;
    total_logs: number;
    mdd_count: number;
    mad_count: number;
    myths_opened: number;
    articles_read: number;
    earned_badges: string[];
    updated_at?: Date;
}

const DEFAULT_STATS: UserStats = {
    total_points: 0,
    current_streak: 0,
    max_streak: 0,
    last_log_date: '',
    total_logs: 0,
    mdd_count: 0,
    mad_count: 0,
    myths_opened: 0,
    articles_read: 0,
    earned_badges: [],
};

// === Firestore Operations ===

export async function getUserStats(uid: string): Promise<UserStats> {
    const db = getFirebaseDb();
    if (!db) return { ...DEFAULT_STATS };

    try {
        const docSnap = await getDoc(doc(db, 'user_stats', uid));
        if (docSnap.exists()) {
            return { ...DEFAULT_STATS, ...docSnap.data() } as UserStats;
        }
        return { ...DEFAULT_STATS };
    } catch (err) {
        console.error('getUserStats error:', err);
        return { ...DEFAULT_STATS };
    }
}

/**
 * Add points and update stats after a daily log is saved.
 */
export async function recordDailyLogPoints(
    uid: string,
    isMDDAchieved: boolean,
    isMADAchieved: boolean,
): Promise<{ pointsEarned: number; newBadges: string[] }> {
    const db = getFirebaseDb();
    if (!db) return { pointsEarned: 0, newBadges: [] };

    const stats = await getUserStats(uid);
    const today = new Date().toISOString().split('T')[0];

    // Calculate streak
    let newStreak = 1;
    if (stats.last_log_date) {
        const lastDate = new Date(stats.last_log_date);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            newStreak = stats.current_streak + 1;
        } else if (diffDays === 0) {
            // Same day — don't change streak, don't add points again
            return { pointsEarned: 0, newBadges: [] };
        }
        // If > 1 day gap, streak resets to 1
    }

    // Calculate points
    let pointsEarned = POINT_VALUES.daily_log;
    if (isMDDAchieved) pointsEarned += POINT_VALUES.mdd_achieved;
    if (isMADAchieved) pointsEarned += POINT_VALUES.mad_achieved;
    if (newStreak === 7) pointsEarned += POINT_VALUES.streak_bonus_7;
    if (newStreak === 14) pointsEarned += POINT_VALUES.streak_bonus_14;
    if (newStreak === 30) pointsEarned += POINT_VALUES.streak_bonus_30;

    // Update stats
    const newMddCount = stats.mdd_count + (isMDDAchieved ? 1 : 0);
    const newMadCount = stats.mad_count + (isMADAchieved ? 1 : 0);
    const newTotalLogs = stats.total_logs + 1;
    const maxStreak = Math.max(stats.max_streak, newStreak);

    // Check for new badges
    const newBadges: string[] = [];
    const allBadgeChecks: Record<string, boolean> = {
        first_log: newTotalLogs >= 1,
        streak_3: newStreak >= 3,
        streak_7: newStreak >= 7,
        streak_14: newStreak >= 14,
        streak_30: newStreak >= 30,
        mdd_master_5: newMddCount >= 5,
        mdd_master_20: newMddCount >= 20,
    };

    const earnedBadges = [...stats.earned_badges];
    for (const [badgeId, achieved] of Object.entries(allBadgeChecks)) {
        if (achieved && !earnedBadges.includes(badgeId)) {
            earnedBadges.push(badgeId);
            newBadges.push(badgeId);
        }
    }

    // Save to Firestore
    try {
        await setDoc(doc(db, 'user_stats', uid), {
            total_points: stats.total_points + pointsEarned,
            current_streak: newStreak,
            max_streak: maxStreak,
            last_log_date: today,
            total_logs: newTotalLogs,
            mdd_count: newMddCount,
            mad_count: newMadCount,
            myths_opened: stats.myths_opened,
            articles_read: stats.articles_read,
            earned_badges: earnedBadges,
            updated_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('recordDailyLogPoints error:', err);
    }

    return { pointsEarned, newBadges };
}

/**
 * Record a myth-buster card open
 */
export async function recordMythOpened(uid: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    try {
        const stats = await getUserStats(uid);
        const newMythsOpened = stats.myths_opened + 1;
        const earnedBadges = [...stats.earned_badges];

        // Check myth badges
        if (newMythsOpened >= 5 && !earnedBadges.includes('myth_explorer_5')) {
            earnedBadges.push('myth_explorer_5');
        }
        if (newMythsOpened >= 10 && !earnedBadges.includes('myth_explorer_10')) {
            earnedBadges.push('myth_explorer_10');
        }

        await setDoc(doc(db, 'user_stats', uid), {
            ...stats,
            total_points: stats.total_points + POINT_VALUES.myth_opened,
            myths_opened: newMythsOpened,
            earned_badges: earnedBadges,
            updated_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('recordMythOpened error:', err);
    }
}

/**
 * Record an article read
 */
export async function recordArticleRead(uid: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    try {
        const stats = await getUserStats(uid);
        const newArticlesRead = stats.articles_read + 1;
        const earnedBadges = [...stats.earned_badges];

        if (newArticlesRead >= 7 && !earnedBadges.includes('reader_7')) {
            earnedBadges.push('reader_7');
        }

        await setDoc(doc(db, 'user_stats', uid), {
            ...stats,
            total_points: stats.total_points + POINT_VALUES.article_read,
            articles_read: newArticlesRead,
            earned_badges: earnedBadges,
            updated_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('recordArticleRead error:', err);
    }
}

/**
 * Get badge info by ID
 */
export function getBadgeById(badgeId: string): Badge | undefined {
    return BADGES.find(b => b.id === badgeId);
}
