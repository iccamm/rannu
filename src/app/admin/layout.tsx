'use client';

import { AdminRoute } from '@/components';
import Link from 'next/link';
import { UserCircle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminRoute>
            <div style={{ minHeight: '100dvh', backgroundColor: '#F4F7FA' }}>
                {/* Admin Top Navigation */}
                <nav style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: 'var(--primary)',
                    padding: 'max(12px, env(safe-area-inset-top)) 20px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-md)',
                }}>
                    <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{
                            width: 32, height: 32, background: 'white', borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.125rem'
                        }}>R</div>
                        <span style={{ color: 'white', fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                            Admin Panel
                        </span>
                    </Link>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={() => {
                                import('@/lib/firebase').then(({ getFirebaseAuth }) => {
                                    getFirebaseAuth()?.signOut();
                                });
                            }}
                            style={{
                                color: 'white', fontSize: '0.875rem', display: 'flex', alignItems: 'center',
                                background: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: 20,
                                border: 'none', cursor: 'pointer', fontWeight: 500
                            }}
                        >
                            <UserCircle size={16} style={{ marginRight: 6 }} />
                            Keluar
                        </button>
                    </div>
                </nav>

                {/* Admin Page Content */}
                <main style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
                    {children}
                </main>
            </div>
        </AdminRoute>
    );
}
