'use client';

import { useRef, useEffect } from 'react';
import { ChildData } from '@/hooks/useAuth';

interface ChildSelectorProps {
    childrenData: ChildData[];
    activeChildId: string;
    onSelect: (id: string) => void;
}

export default function ChildSelector({ childrenData, activeChildId, onSelect }: ChildSelectorProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll the active child into view on load or when activeChildId changes
    useEffect(() => {
        if (!scrollRef.current) return;
        const activeNode = scrollRef.current.querySelector('[data-active="true"]');
        if (activeNode) {
            activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeChildId]);

    if (!childrenData || childrenData.length <= 1) return null;

    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>Pilih Anak</h3>
                <div style={{ display: 'flex', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Geser</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                        <path d="h20l-4-4m4 4l-4 4M4 12h0" />
                    </svg>
                </div>
            </div>

            <div
                ref={scrollRef}
                style={{
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    paddingBottom: 8,
                    // Hide scrollbar
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
                className="hide-scrollbar"
            >
                {childrenData.map((child, index) => {
                    const isActive = child.id === activeChildId;
                    return (
                        <div
                            key={child.id}
                            data-active={isActive}
                            onClick={() => onSelect(child.id)}
                            style={{
                                flex: '0 0 85%',
                                minWidth: 260,
                                maxWidth: 300,
                                scrollSnapAlign: 'center',
                                background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                                border: isActive ? '1px solid var(--primary-dark)' : '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}
                        >
                            <div style={{
                                width: 44, height: 44,
                                borderRadius: '50%',
                                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--primary-soft)',
                                color: isActive ? '#fff' : 'var(--primary-dark)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25rem', fontWeight: 600,
                                flexShrink: 0
                            }}>
                                {child.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: '0.9375rem',
                                    color: isActive ? '#fff' : 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {child.name}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
                                }}>
                                    Anak ke-{index + 1}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
