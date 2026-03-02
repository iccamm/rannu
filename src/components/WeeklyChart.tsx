'use client';

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import styles from './WeeklyChart.module.css';
import { MDD_THRESHOLD } from '@/lib/constants';

interface ChartDataPoint {
    date: string;
    label: string;
    mdd_score: number;
}

interface WeeklyChartProps {
    data: ChartDataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
    if (active && payload && payload.length) {
        return (
            <div className={styles.tooltip}>
                <p className={styles.tooltipLabel}>{label}</p>
                <p className={styles.tooltipValue}>Skor: <strong>{payload[0].value}</strong></p>
            </div>
        );
    }
    return null;
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className={styles.empty}>
                <p>Belum ada data minggu ini</p>
                <p className={styles.emptyHint}>Mulai input data harian untuk melihat tren</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        domain={[0, 8]}
                        ticks={[0, 2, 4, 5, 6, 8]}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                        y={MDD_THRESHOLD}
                        stroke="var(--accent)"
                        strokeDasharray="4 4"
                        strokeOpacity={0.6}
                        label={{ value: 'Target', position: 'right', fontSize: 10, fill: 'var(--accent)' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="mdd_score"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: 'var(--secondary)', stroke: 'var(--primary)', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
