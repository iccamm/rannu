'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import styles from './TopBar.module.css';

export default function TopBar() {
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    // Close dropdown when clicking outside
    const trayRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleNotificationClick = (notif: AppNotification) => {
        markAsRead(notif.id);
        setIsOpen(false);
        router.push(notif.actionPath);
    };

    return (
        <>
            <div className={styles.topBar}>
                {/* Brand Logo - Minimal Abstract R */}
                <Link href="/dashboard" className={styles.brand} aria-label="RANNU Beranda">
                    <div className={styles.logoWrapper}>
                        <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoSvg}>
                            <path d="M 30 75 V 25 C 30 25 30 25 50 25 C 70 25 70 50 50 50 L 30 50 M 50 50 L 70 75" stroke="var(--primary)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="75" cy="25" r="10" fill="var(--accent)" />
                        </svg>
                    </div>
                    <span className={styles.brandText}>RANNU</span>
                </Link>

                {/* Actions */}
                <div className={styles.notificationWrapper} ref={trayRef}>
                    <button
                        className={styles.bellButton}
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Notifikasi"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>

                        {unreadCount > 0 && <span className={styles.badge} />}
                    </button>

                    {/* Notification Dropdown */}
                    {isOpen && (
                        <div className={styles.tray}>
                            <div className={styles.trayHeader}>
                                <h3 className={styles.trayTitle}>Notifikasi</h3>
                                {unreadCount > 0 && (
                                    <button
                                        className={styles.markAllBtn}
                                        onClick={() => markAllAsRead()}
                                    >
                                        Tandai semua dibaca
                                    </button>
                                )}
                            </div>

                            <div className={styles.trayList}>
                                {notifications.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <span className={styles.emptyIcon}>📭</span>
                                        <p className={styles.emptyText}>Belum ada notifikasi baru hari ini.</p>
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`${styles.notifItem} ${!notif.isRead ? styles.notifUnread : ''}`}
                                            onClick={() => handleNotificationClick(notif)}
                                        >
                                            <div className={`${styles.notifIcon} ${notif.type === 'tracker' ? styles.notifIconTracker : styles.notifIconReading}`}>
                                                {notif.type === 'tracker' ? '🥗' : '📖'}
                                            </div>
                                            <div className={styles.notifContent}>
                                                <h4 className={styles.notifTitle}>{notif.title}</h4>
                                                <p className={styles.notifText}>{notif.message}</p>
                                                <p className={styles.notifTime}>Hari ini</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Backdrop layer just to catch outside clicks on mobile smoothly */}
            {isOpen && <div className={styles.backdrop} onClick={() => setIsOpen(false)} />}
        </>
    );
}
