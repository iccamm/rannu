'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    duration?: number;
    onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            className={`toast toast-${type}`}
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
            role="alert"
        >
            {type === 'success' ? '✓ ' : '✕ '}{message}
        </div>
    );
}
