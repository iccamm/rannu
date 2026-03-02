import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
    increment,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { FoodGroupState } from '@/lib/constants';

export interface DailyLog {
    log_id: string;
    uid: string;
    child_id?: string;
    date: string;
    timestamp: Date;
    food_groups: FoodGroupState;
    mdd_score: number;
    is_mdd_achieved: boolean;
    meal_frequency: number;
    is_breastfed: boolean;
    is_mmf_achieved: boolean;
    is_mad_achieved: boolean;
    age_months?: number;
    texture?: string;
    notes: string;
    breastfeeding_freq?: number;
    wet_diapers?: number;
    mother_mood?: string;
}

export function getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

export function computeMDDScore(foodGroups: FoodGroupState): number {
    return Object.values(foodGroups).filter(Boolean).length;
}

export async function checkTodayLog(uid: string, childId?: string, isFirstChild = false): Promise<DailyLog | null> {
    const today = getTodayDateString();
    const db = getFirebaseDb();
    if (!db) return null;

    if (childId) {
        // Precise lookup for specific child
        const specificLogRef = doc(db, 'daily_logs', `${uid}_${childId}_${today}`);
        const specificDoc = await getDoc(specificLogRef);
        if (specificDoc.exists()) {
            const data = specificDoc.data();
            return { ...data, timestamp: data.timestamp?.toDate?.() || new Date() } as DailyLog;
        }
    }

    // Fallback: check legacy daily log format
    const legacyLogRef = doc(db, 'daily_logs', `${uid}_${today}`);
    const legacyDoc = await getDoc(legacyLogRef);
    if (legacyDoc.exists()) {
        const data = legacyDoc.data();
        if (data.child_id === childId || (!data.child_id && isFirstChild)) {
            return { ...data, timestamp: data.timestamp?.toDate?.() || new Date() } as DailyLog;
        }
    }

    return null;
}

export async function saveDailyLog(
    uid: string,
    childId: string | undefined,
    foodGroups: FoodGroupState,
    mealFrequency: number,
    isBreastfed: boolean,
    texture: string | undefined,
    notes: string,
    ageMonths?: number,
    breastfeedingFreq?: number,
    wetDiapers?: number,
    motherMood?: string
): Promise<DailyLog> {
    const today = getTodayDateString();
    const logId = childId ? `${uid}_${childId}_${today}` : `${uid}_${today}`;
    const mddScore = computeMDDScore(foodGroups);
    const db = getFirebaseDb();
    if (!db) throw new Error("Firebase DB not initialized");

    // Hitung MMF & MAD berdasarkan standar WHO
    const { isMMFAchieved, isMADAchieved, MDD_THRESHOLD } = await import('@/lib/constants');
    const mmfAchieved = ageMonths !== undefined ? isMMFAchieved(ageMonths, mealFrequency, isBreastfed) : false;
    const madAchieved = ageMonths !== undefined ? isMADAchieved(mddScore, ageMonths, mealFrequency, isBreastfed) : false;

    const logData = {
        log_id: logId,
        uid,
        ...(childId && { child_id: childId }),
        date: today,
        timestamp: serverTimestamp(),
        food_groups: foodGroups,
        mdd_score: mddScore,
        is_mdd_achieved: mddScore >= MDD_THRESHOLD,
        meal_frequency: mealFrequency,
        is_breastfed: isBreastfed,
        is_mmf_achieved: mmfAchieved,
        is_mad_achieved: madAchieved,
        ...(ageMonths !== undefined && { age_months: ageMonths }),
        ...(texture && { texture }),
        notes,
        ...(breastfeedingFreq !== undefined && { breastfeeding_freq: breastfeedingFreq }),
        ...(wetDiapers !== undefined && { wet_diapers: wetDiapers }),
        ...(motherMood && { mother_mood: motherMood }),
    };

    await setDoc(doc(db, 'daily_logs', logId), logData);

    return {
        ...logData,
        is_mmf_achieved: mmfAchieved,
        is_mad_achieved: madAchieved,
        timestamp: new Date(),
    } as DailyLog;
}

export async function getWeeklyLogs(uid: string, childId?: string, isFirstChild = false): Promise<DailyLog[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const db = getFirebaseDb();
    if (!db) return [];

    const q = query(
        collection(db, 'daily_logs'),
        where('uid', '==', uid),
        where('date', '>=', sevenDaysAgo.toISOString().split('T')[0]),
        orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const allLogs = snapshot.docs.map((d) => {
        const data = d.data();
        return {
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date(),
        } as DailyLog;
    });

    if (childId) {
        return allLogs.filter(log => log.child_id === childId || (!log.child_id && isFirstChild)).slice(-7);
    }
    return allLogs.slice(-7);
}

export async function getAllLogs(uid: string, childId?: string, isFirstChild = false): Promise<DailyLog[]> {
    const db = getFirebaseDb();
    if (!db) return [];

    const q = query(
        collection(db, 'daily_logs'),
        where('uid', '==', uid),
        orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    const allLogs = snapshot.docs.map((d) => {
        const data = d.data();
        return {
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date(),
        } as DailyLog;
    });

    if (childId) {
        return allLogs.filter(log => log.child_id === childId || (!log.child_id && isFirstChild));
    }
    return allLogs;
}

/* ==================== Reading Logs ==================== */

export interface ReadingLog {
    uid: string;
    article_id: string;
    article_title: string;
    date: string;
    read_at: Date;
}

/**
 * Mark an article as read for today.
 * The log ID now includes the articleId so users can read multiple different articles per day 
 * (for different age categories).
 */
export async function markArticleRead(
    uid: string,
    articleId: string,
    articleTitle: string
): Promise<void> {
    const today = getTodayDateString();
    const logId = `${uid}_${articleId}_${today}`;
    const db = getFirebaseDb();
    if (!db) throw new Error('Firebase DB not initialized');

    await setDoc(doc(db, 'reading_logs', logId), {
        uid,
        article_id: articleId,
        article_title: articleTitle,
        date: today,
        read_at: serverTimestamp(),
    });
}

/**
 * Check if user has read a SPECIFIC article today.
 * If articleId is provided, checks for that specific article.
 * If not provided, falls back to the old behavior (checks if ANY article was read today via query).
 */
export async function checkTodayReading(uid: string, articleId?: string): Promise<ReadingLog | null> {
    const today = getTodayDateString();
    const db = getFirebaseDb();
    if (!db) return null;

    if (articleId) {
        // Precise lookup for a specific article
        const logRef = doc(db, 'reading_logs', `${uid}_${articleId}_${today}`);
        const logDoc = await getDoc(logRef);
        if (logDoc.exists()) {
            const data = logDoc.data();
            return {
                ...data,
                read_at: data.read_at?.toDate?.() || new Date(),
            } as ReadingLog;
        }
        return null;
    } else {
        // Fallback: check if ANY article was read today (used if we just want a general "did they read")
        const q = query(
            collection(db, 'reading_logs'),
            where('uid', '==', uid),
            where('date', '==', today)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            return {
                ...data,
                read_at: data.read_at?.toDate?.() || new Date(),
            } as ReadingLog;
        }
        return null;
    }
}

/**
 * Admin: get all reading logs for all users.
 */
export async function getAllReadingLogs(): Promise<ReadingLog[]> {
    const db = getFirebaseDb();
    if (!db) return [];

    const snapshot = await getDocs(collection(db, 'reading_logs'));
    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            ...data,
            read_at: data.read_at?.toDate?.() || new Date(),
        } as ReadingLog;
    });
}

