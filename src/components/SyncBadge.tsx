'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useEffect, useState } from 'react';
import { getPendingCount } from '@/lib/offline';

export default function SyncBadge() {
    const isOnline = useOnlineStatus();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        getPendingCount().then(setPendingCount).catch(() => { });
        const interval = setInterval(() => {
            getPendingCount().then(setPendingCount).catch(() => { });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    if (isOnline && pendingCount === 0) return null;

    return (
        <div className={`sync-badge ${isOnline ? 'online' : ''}`}>
            <span className="sync-dot" />
            {!isOnline
                ? 'Offline'
                : `${pendingCount} data belum tersinkron`}
        </div>
    );
}
