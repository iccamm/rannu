'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSkeleton } from '@/components';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user || !profile) {
            router.replace('/login');
            return;
        }

        if (!profile.isAdmin) {
            // Unauthorized users are sent back to their dashboard
            router.replace('/dashboard');
        }
    }, [user, profile, loading, router]);

    // Show loading state while checking auth
    if (loading || !profile?.isAdmin) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
                <div style={{ width: '80%', maxWidth: '300px' }}>
                    <LoadingSkeleton variant="text" width="60%" height="24px" />
                    <div style={{ marginTop: 24 }}><LoadingSkeleton variant="card" height="120px" /></div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
