'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DirectorDashboard() {
    const router = useRouter();
    const [staff, setStaff] = useState<any>(null);
    const [metrics, setMetrics] = useState<any>({ totalRevenue: 0, pendingReceivables: 0, totalClaims: 0, activeStaff: 0 });

    useEffect(() => {
        const token = localStorage.getItem('seaboard_internal_token');
        const st = localStorage.getItem('seaboard_internal_staff');
        
        if (!token || !st) {
            router.push('/login');
            return;
        }

        const parsed = JSON.parse(st);
        if (parsed.role !== 'DIRECTOR' && parsed.role !== 'SUPER_ADMIN') {
            router.push('/login'); // Unauthorized
            return;
        }

        setStaff(parsed);
        fetchDirectorData(token);
    }, [router]);

    const fetchDirectorData = async (token: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            
            // We can fetch from finance ledger and staff to aggregate metrics
            const [ledRes, staffRes] = await Promise.all([
                fetch(`${apiUrl}/api/v1/internal/finance/ledger`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/v1/internal/auth/staff`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            let totalRev = 0;
            let pendingRec = 0;
            let totalClm = 0;
            let activeStaffCount = 0;

            if (ledRes.ok) {
                const led = await ledRes.json();
                totalClm = led.data.length;
                led.data.forEach((l: any) => {
                    totalRev += Number(l.seaboardFeeKES);
                    if (l.status !== 'PAID') pendingRec += Number(l.seaboardFeeKES);
                });
            }

            if (staffRes.ok) {
                const st = await staffRes.json();
                activeStaffCount = st.data.filter((s: any) => s.isActive).length;
            }

            setMetrics({ totalRevenue: totalRev, pendingReceivables: pendingRec, totalClaims: totalClm, activeStaff: activeStaffCount });
        } catch (e) {
            console.error("Failed to load director data", e);
        }
    };

    if (!staff) return <div style={{ color: '#fff', padding: 40 }}>Loading secure portal...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#050B14', color: '#fff', padding: 40, fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Director Overview</h1>
                    <p style={{ color: '#8A9BB5', margin: 0 }}>Seaboard Technologies • Executive Dashboard</p>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <button onClick={() => router.push('/finance')} style={{ background: 'transparent', border: '1px solid rgba(37,99,235,0.5)', color: '#60A5FA', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>View Finance ERP</button>
                    <button onClick={() => { localStorage.clear(); router.push('/login'); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 40 }}>
                <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, borderTop: '4px solid #00C165' }}>
                    <div style={{ color: '#8A9BB5', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>ALL-TIME REVENUE (1.75% CUT)</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>KES {metrics.totalRevenue.toLocaleString()}</div>
                </div>
                <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, borderTop: '4px solid #E74C3C' }}>
                    <div style={{ color: '#8A9BB5', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>PENDING RECEIVABLES (SHA)</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>KES {metrics.pendingReceivables.toLocaleString()}</div>
                </div>
                <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, borderTop: '4px solid #F59E0B' }}>
                    <div style={{ color: '#8A9BB5', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>PROCESSED CLAIMS</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>{metrics.totalClaims.toLocaleString()}</div>
                </div>
                <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, borderTop: '4px solid #3B82F6' }}>
                    <div style={{ color: '#8A9BB5', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>ACTIVE INTERNAL STAFF</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>{metrics.activeStaff}</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ flex: 2, background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Revenue Growth (Mocked Chart Area)</h2>
                    <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16 }}>
                        {[40, 60, 45, 80, 50, 90, 75].map((h, i) => (
                            <div key={i} style={{ flex: 1, background: 'linear-gradient(to top, rgba(0,193,101,0.2), rgba(0,193,101,0.8))', height: `${h}%`, borderRadius: '4px 4px 0 0' }} />
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1, background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recent Staff Activity</h2>
                    <div style={{ color: '#8A9BB5', fontSize: 14 }}>
                        • Finance generated INV-SHA-002<br/><br/>
                        • Office Admin logged in<br/><br/>
                        • HR reviewed pending staff contracts<br/><br/>
                        • System automatically flagged 400 claims for review
                    </div>
                </div>
            </div>

        </div>
    );
}
