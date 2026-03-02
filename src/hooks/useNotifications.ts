'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { checkTodayLog } from '@/lib/firestore';
import { checkTodayReading } from '@/lib/firestore';
import { getDailyArticle } from '@/lib/daily-article';
import { calculateBabyAge } from '@/lib/age-calculator';
import { getTodayDateString } from '@/lib/firestore';

export interface AppNotification {
    id: string;
    type: 'tracker' | 'reading' | 'system';
    title: string;
    message: string;
    actionPath: string;
    isRead: boolean;
    date: string;
}

const STORAGE_KEY = 'rannu_notifications_state';

export function useNotifications() {
    const { user, activeChild } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    // Load read state from localStorage
    const getLocalReadState = useCallback(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }, []);

    const saveLocalReadState = useCallback((state: Record<string, boolean>) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function fetchNotifications() {
            if (!user || !activeChild) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            const today = getTodayDateString();
            const newNotifs: AppNotification[] = [];

            try {
                // 1. Check Tracker
                const trackerLog = await checkTodayLog(user.uid);
                if (!trackerLog) {
                    newNotifs.push({
                        id: `tracker_${activeChild.id}_${today}`,
                        type: 'tracker',
                        title: 'Tracker Belum Diisi',
                        message: `Jangan lupa isi porsi dan tekstur makan ${activeChild.name} hari ini ya, Bun!`,
                        actionPath: '/tracker',
                        isRead: false,
                        date: today
                    });
                }

                // 2. Check Reading (for active child only to keep it simple)
                const age = calculateBabyAge(new Date(activeChild.dob));
                if (age.months <= 23) {
                    const article = getDailyArticle(age.months);
                    if (article) {
                        const readingLog = await checkTodayReading(user.uid, article.id);
                        if (!readingLog) {
                            newNotifs.push({
                                id: `reading_${activeChild.id}_${article.id}_${today}`,
                                type: 'reading',
                                title: 'Bacaan Baru Tersedia',
                                message: `Ada artikel baru tentang nutrisi usia ${age.months} bulan. Yuk baca sekarang!`,
                                actionPath: '/bacaan',
                                isRead: false,
                                date: today
                            });
                        }
                    }
                }

                if (!isMounted) return;

                // Merge with local read state
                const readState = getLocalReadState();
                const mergedNotifs = newNotifs.map(n => ({
                    ...n,
                    isRead: !!readState[n.id]
                }));

                setNotifications(mergedNotifs);
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchNotifications();

        return () => {
            isMounted = false;
        };
    }, [user, activeChild, getLocalReadState]);

    const markAsRead = useCallback((notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );

        const readState = getLocalReadState();
        readState[notificationId] = true;
        saveLocalReadState(readState);
    }, [getLocalReadState, saveLocalReadState]);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        const readState = getLocalReadState();
        notifications.forEach(n => {
            readState[n.id] = true;
        });
        saveLocalReadState(readState);
    }, [getLocalReadState, saveLocalReadState, notifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead
    };
}
