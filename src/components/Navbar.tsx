'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
    {
        href: '/dashboard',
        label: 'Beranda',
        interventionOnly: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        href: '/tracker',
        label: 'Tracker',
        interventionOnly: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
            </svg>
        ),
    },
    {
        href: '/mythbuster',
        label: 'Mitos',
        interventionOnly: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
            </svg>
        ),
    },
    {
        href: '/bacaan',
        label: 'Bacaan',
        interventionOnly: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                <path d="M8 7h8" />
                <path d="M8 11h6" />
            </svg>
        ),
    },
    {
        href: '/profile',
        label: 'Profil',
        interventionOnly: false,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
    },
];

export default function Navbar() {
    const pathname = usePathname();
    const { profile } = useAuth();

    const isControlGroup = profile?.group === 'control';

    // Filter items: hide intervention-only tabs for control group
    const visibleItems = NAV_ITEMS.filter(item => {
        if (item.interventionOnly && isControlGroup) return false;
        return true;
    });

    return (
        <nav className="navbar" role="navigation" aria-label="Menu utama">
            <div className="navbar-inner">
                {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
