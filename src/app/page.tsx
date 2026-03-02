'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function SplashPage() {
  const { user, profile, loading, firebaseReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseReady) { router.replace('/login'); return; }
    if (!user) { router.replace('/login'); }
    else if (!profile) { router.replace('/register'); }
    else { router.replace('/dashboard'); }
  }, [user, profile, loading, firebaseReady, router]);

  return (
    <div className="page" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s ease forwards' }}>
        <div style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 30 75 V 25 C 30 25 30 25 50 25 C 70 25 70 50 50 50 L 30 50 M 50 50 L 70 75" stroke="white" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="75" cy="25" r="10" fill="var(--accent)" />
          </svg>
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>RANNU</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Monitoring Gizi Anak Berbasis COM-B Model
        </p>
        <div style={{
          width: 40,
          height: 3,
          borderRadius: 2,
          margin: '24px auto 0',
          background: 'var(--secondary)',
          opacity: 0.6,
        }} />
      </div>
    </div >
  );
}
