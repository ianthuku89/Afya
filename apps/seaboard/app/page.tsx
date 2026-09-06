'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.push('/login');
    }, [router]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0F1E', color: '#fff' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14 }}>Redirecting to secure portal...</div>
        </div>
    );
}
