'use client';
import React from 'react';

interface IconProps { name: string; size?: number; color?: string; }

export default function Icon({ name, size = 16, color = 'currentColor' }: IconProps) {
    const icons: Record<string, React.ReactNode> = {
        shield: <><path d="M12 2L4 5v6c0 5.25 3.5 10.1 8 11.4C16.5 21.1 20 16.25 20 11V5l-8-3z" fill="none" stroke={color} strokeWidth="1.8" /></>,
        wallet: <><rect x="2" y="7" width="20" height="14" rx="3" fill="none" stroke={color} strokeWidth="1.8" /><path d="M16 14a1 1 0 100-2 1 1 0 000 2z" fill={color} /><path d="M2 10h20" stroke={color} strokeWidth="1.8" /></>,
        chart: <><path d="M3 20V10l5-5 4 4 5-8v19" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></>,
        hospital: <><rect x="3" y="5" width="18" height="16" rx="1" fill="none" stroke={color} strokeWidth="1.8" /><path d="M12 9v6M9 12h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></>,
        cpu: <><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke={color} strokeWidth="1.8" /><rect x="9" y="9" width="6" height="6" fill="none" stroke={color} strokeWidth="1.5" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" stroke={color} strokeWidth="1.5" /></>,
        link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></>,
        bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke={color} strokeWidth="1.8" /><path d="M13.73 21a2 2 0 01-3.46 0" fill="none" stroke={color} strokeWidth="1.8" /></>,
        user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="none" stroke={color} strokeWidth="1.8" /><circle cx="12" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.8" /></>,
        lock: <><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke={color} strokeWidth="1.8" /><path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke={color} strokeWidth="1.8" /></>,
        check: <><polyline points="20 6 9 17 4 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></>,
        phone: <><rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke={color} strokeWidth="1.8" /><line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></>,
        globe: <><circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.8" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" fill="none" stroke={color} strokeWidth="1.8" /></>,
        settings: <><circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.8" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" fill="none" stroke={color} strokeWidth="1.8" /></>,
        zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></>,
        eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke={color} strokeWidth="1.8" /><circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.8" /></>,
        send: <><line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth="1.8" /><polygon points="22 2 15 22 11 13 2 9 22 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" /></>,
        home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke={color} strokeWidth="1.8" /><polyline points="9 22 9 12 15 12 15 22" fill="none" stroke={color} strokeWidth="1.8" /></>,
        menu: <><line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" /></>,
        plus: <><line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" /></>,
        arrow: <><line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" /><polyline points="12 5 19 12 12 19" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></>,
        file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke={color} strokeWidth="1.8" /><polyline points="14 2 14 8 20 8" fill="none" stroke={color} strokeWidth="1.8" /></>,
        activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
        alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke={color} strokeWidth="1.8" /><line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" strokeLinecap="round" stroke={color} /></>,
        download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><polyline points="7 10 12 15 17 10" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></>,
        refresh: <><polyline points="23 4 23 10 17 10" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" /></>,
    };

    return (
        <svg viewBox="0 0 24 24" width={size} height={size} style={{ flexShrink: 0 }}>
            {icons[name] ?? null}
        </svg>
    );
}
