'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const { signInWithGoogle, profile, firebaseReady } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithGoogle();
            // The profile will be loaded by AuthProvider after sign-in,
            // but we can't read it immediately here. Dashboard will handle the redirect.
            router.replace('/dashboard');
        } catch (err: unknown) {
            console.error('Google Sign-In Error:', err);
            const message = err instanceof Error ? err.message : 'Gagal masuk dengan Google';
            if (message.includes('popup-closed')) {
                setError('Login dibatalkan. Silakan coba lagi.');
            } else {
                setError('Gagal masuk. Pastikan koneksi internet tersedia.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh',
        }}>
            <div className="container">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 48 }} className="animate-fade-in">
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                    }}>
                        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 30 75 V 25 C 30 25 30 25 50 25 C 70 25 70 50 50 50 L 30 50 M 50 50 L 70 75" stroke="white" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="75" cy="25" r="10" fill="var(--accent)" />
                        </svg>
                    </div>
                    <h1 style={{ marginBottom: 4 }}>RANNU</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Monitoring Gizi Anak
                    </p>
                </div>

                {/* Firebase not configured banner */}
                {!firebaseReady && (
                    <div className="card animate-fade-in" style={{
                        marginBottom: 24,
                        background: 'var(--secondary-lighter)',
                        border: '1px solid var(--secondary-light)',
                    }}>
                        <p style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--secondary-dark)', marginBottom: 8 }}>
                            ⚙️ Firebase Belum Dikonfigurasi
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            Buat file <strong>.env.local</strong> dan isi dengan API key dari Firebase Console.
                        </p>
                        <button
                            className="btn btn-secondary"
                            style={{ marginTop: 12, fontSize: '0.8125rem' }}
                            onClick={() => router.push('/dashboard')}
                        >
                            Lihat Preview Dashboard →
                        </button>
                    </div>
                )}

                {/* Google Sign-In */}
                {firebaseReady && (
                    <div className="animate-fade-in">
                        <div className="card" style={{ marginBottom: 24, textAlign: 'center' }}>
                            <h3 style={{ marginBottom: 8 }}>Selamat Datang!</h3>
                            <p style={{ fontSize: '0.8125rem', marginBottom: 24, color: 'var(--text-muted)' }}>
                                Masuk dengan akun Google Anda untuk mulai memantau gizi si kecil
                            </p>

                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    width: '100%',
                                    padding: '14px 24px',
                                    background: '#fff',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9375rem',
                                    fontFamily: "'Poppins', sans-serif",
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    transition: 'all 0.2s ease',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {/* Google "G" Logo */}
                                <svg width="20" height="20" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                </svg>
                                {loading ? 'Memproses...' : 'Masuk dengan Google'}
                            </button>
                        </div>

                        {error && (
                            <p style={{
                                color: 'var(--danger)',
                                fontSize: '0.8125rem',
                                textAlign: 'center',
                                padding: '12px 16px',
                                background: '#fef2f2',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 16,
                            }}>
                                {error}
                            </p>
                        )}

                        <p style={{
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.6,
                        }}>
                            Data Anda aman dan hanya digunakan untuk keperluan penelitian
                        </p>
                    </div>
                )}
            </div>
        </div >
    );
}
