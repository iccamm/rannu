import { openDB, IDBPDatabase } from 'idb';
import { FoodGroupState } from '@/lib/constants';

const DB_NAME = 'rannu-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_logs';

interface PendingLog {
    id: string;
    uid: string;
    child_id?: string;
    date: string;
    food_groups: FoodGroupState;
    mdd_score: number;
    is_mdd_achieved: boolean;
    is_mmf_achieved: boolean;
    is_mad_achieved: boolean;
    meal_frequency: number;
    is_breastfed: boolean;
    age_months?: number;
    texture?: string;
    notes: string;
    breastfeeding_freq?: number;
    wet_diapers?: number;
    mother_mood?: string;
    created_at: string;
}

async function getDB(): Promise<IDBPDatabase> {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
}

export async function savePendingLog(log: PendingLog): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, log);
}

export async function getPendingLogs(): Promise<PendingLog[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
}

export async function removePendingLog(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
}

export async function getPendingCount(): Promise<number> {
    const db = await getDB();
    return db.count(STORE_NAME);
}

export async function hasPendingLogForToday(uid: string, childId?: string, isFirstChild = false): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const db = await getDB();

    if (childId) {
        const specificLog = await db.get(STORE_NAME, `${uid}_${childId}_${today}`);
        if (specificLog) return true;
    }

    const legacyLog = await db.get(STORE_NAME, `${uid}_${today}`);
    if (legacyLog) {
        if (legacyLog.child_id === childId || (!legacyLog.child_id && isFirstChild)) return true;
    }

    return false;
}
