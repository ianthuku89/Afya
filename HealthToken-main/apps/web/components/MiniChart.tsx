'use client';
interface Props { data: number[]; color?: string; height?: number; }

export default function MiniChart({ data, color = '#00C165', height = 50 }: Props) {
    const max = Math.max(...data);
    const pts = data.map((v, i) =>
        `${(i / (data.length - 1)) * 100},${height - (v / max) * height * 0.85}`
    ).join(' ');
    const gradId = `g${color.replace('#', '')}`;
    return (
        <svg viewBox={`0 0 100 ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity=".35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`0,${height} ${pts} 100,${height}`} fill={`url(#${gradId})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
