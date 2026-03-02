'use client';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar, Legend
} from 'recharts';
import { useState, useEffect, useRef, ReactNode } from 'react';

// --- Custom Wrapper to Fix Recharts Negative Dimension Warnings ---
function ChartWrapper({ children, height = 300 }: { children: ReactNode; height?: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hasDimensions, setHasDimensions] = useState(false);

    useEffect(() => {
        const currentRef = containerRef.current;
        if (!currentRef) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setHasDimensions(true);
                } else {
                    setHasDimensions(false);
                }
            }
        });

        observer.observe(currentRef);

        const rect = currentRef.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setHasDimensions(true);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height, minWidth: 0, overflow: 'hidden' }}>
            {hasDimensions ? children : null}
        </div>
    );
}
// -------------------------------------------------------------------

const COLORS = ['#2F80ED', '#F59E0B', '#27AE60', '#EB5757', '#9B51E0'];

export function EngagementChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return <div className="text-center text-muted p-4">Belum ada data aktivitas.</div>;

    return (
        <ChartWrapper height={300}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#828282' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#828282' }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="users"
                        stroke="var(--primary)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        name="Pengguna Aktif"
                    />
                    <Line
                        type="monotone"
                        dataKey="logs"
                        stroke="#F59E0B"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        name="Laporan Harian"
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
}

export function DemographicsPieChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return <div className="text-center text-muted p-4">Belum ada data demografi.</div>;

    return (
        <ChartWrapper height={300}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
}

export function InputBarChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) return <div className="text-center text-muted p-4">Belum ada data input.</div>;

    return (
        <ChartWrapper height={300}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#828282' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#828282' }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" name="Jumlah Laporan" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartWrapper>
    );
}
