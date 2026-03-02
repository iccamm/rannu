'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    User,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';

export interface ChildData {
    id: string;
    name: string;
    dob: Date;
    gender: 'L' | 'P';
    birth_weight: number;
    birth_length?: number;
    head_circumference?: number;
}

export interface UserProfile {
    uid: string;
    mom_name: string;
    mom_phone: string;
    mom_age?: number;                                           // Usia Ibu (kovariat ANCOVA)
    education_level?: string;                                   // Pendidikan terakhir
    income_level?: string;                                      // Pendapatan keluarga
    family_support?: number;                                    // Dukungan keluarga (1-5 Likert)
    puskesmas?: string;                                         // Puskesmas (Bissappu/Baruga)
    village: string;        // Desa/Kelurahan
    sub_district: string;   // Kecamatan (Default Bantaeng)
    posyandu: string;       // Nama Posyandu
    group: 'intervention' | 'control' | 'admin';
    children: ChildData[];
    active_child_id: string;
    created_at: Date;
    isAdmin?: boolean;      // Admin Access Flag
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    firebaseReady: boolean;
    activeChild: ChildData | null;
    signInWithGoogle: () => Promise<User>;
    saveProfile: (data: Omit<UserProfile, 'uid' | 'created_at'>) => Promise<void>;
    setActiveChild: (childId: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children: providerChildren }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const firebaseReady = isFirebaseConfigured;

    useEffect(() => {
        if (!firebaseReady) {
            setLoading(false);
            return;
        }

        const auth = getFirebaseAuth();
        if (!auth) { setLoading(false); return; }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setLoading(true);
                setUser(firebaseUser);
                try {
                    const db = getFirebaseDb();
                    if (db) {
                        const profileDoc = await getDoc(doc(db, 'users_profile', firebaseUser.uid));
                        if (profileDoc.exists()) {
                            const data = profileDoc.data();

                            // Parse children array
                            const childrenData: ChildData[] = (data.children || []).map((c: Record<string, unknown>) => ({
                                ...c,
                                dob: (c.dob as { toDate?: () => Date })?.toDate?.() || new Date(c.dob as string),
                            }));

                            // Legacy support
                            if (childrenData.length === 0 && data.baby_name) {
                                childrenData.push({
                                    id: 'child_1',
                                    name: data.baby_name as string,
                                    dob: (data.baby_dob as { toDate?: () => Date })?.toDate?.() || new Date(data.baby_dob as string),
                                    gender: (data.baby_gender as 'L' | 'P') || 'L',
                                    birth_weight: (data.baby_birth_weight as number) || 0,
                                    birth_length: (data.baby_birth_length as number) || undefined,
                                    head_circumference: (data.baby_head_circumference as number) || undefined,
                                });
                            }

                            setProfile({
                                uid: firebaseUser.uid,
                                mom_name: data.mom_name as string,
                                mom_phone: (data.mom_phone as string) || '',
                                mom_age: (data.mom_age as number) || undefined,
                                education_level: (data.education_level as string) || undefined,
                                income_level: (data.income_level as string) || undefined,
                                family_support: (data.family_support as number) || undefined,
                                puskesmas: (data.puskesmas as string) || undefined,
                                village: (data.village as string) || '',
                                sub_district: (data.sub_district as string) || '',
                                posyandu: (data.posyandu as string) || '',
                                group: (data.group as 'intervention' | 'control' | 'admin') || 'intervention',
                                children: childrenData,
                                active_child_id: (data.active_child_id as string) || childrenData[0]?.id || '',
                                created_at: (data.created_at as { toDate?: () => Date })?.toDate?.() || new Date(data.created_at as string),
                                isAdmin: !!data.isAdmin,
                            });
                        } else {
                            setProfile(null);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching profile:', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [firebaseReady]);

    const signInWithGoogle = async () => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Firebase not configured');
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
    };

    const saveProfile = async (data: Omit<UserProfile, 'uid' | 'created_at'>) => {
        if (!user) throw new Error('User not authenticated');
        const db = getFirebaseDb();
        if (!db) throw new Error('Firebase not configured');
        const profileData = {
            ...data,
            uid: user.uid,
            children: data.children.map(c => ({
                ...c,
                dob: Timestamp.fromDate(new Date(c.dob)),
            })),
            created_at: Timestamp.now(),
        };
        await setDoc(doc(db, 'users_profile', user.uid), profileData);
        setProfile({
            ...data,
            uid: user.uid,
            children: data.children.map(c => ({ ...c, dob: new Date(c.dob) })),
            created_at: new Date(),
        });
    };

    const setActiveChild = async (childId: string) => {
        if (!user || !profile) return;
        const db = getFirebaseDb();
        if (!db) return;
        await setDoc(doc(db, 'users_profile', user.uid), { active_child_id: childId }, { merge: true });
        setProfile(prev => prev ? { ...prev, active_child_id: childId } : prev);
    };

    const activeChild = profile?.children.find(c => c.id === profile.active_child_id) || profile?.children[0] || null;

    const signOutFn = async () => {
        const auth = getFirebaseAuth();
        if (auth) await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{
            user, profile, loading, firebaseReady, activeChild,
            signInWithGoogle, saveProfile, setActiveChild, signOut: signOutFn,
        }}>
            {providerChildren}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
