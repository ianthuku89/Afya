'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FinanceDashboard() {
    const router = useRouter();
    const [staff, setStaff] = useState<any>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('seaboard_internal_token');
        const st = localStorage.getItem('seaboard_internal_staff');
        
        if (!token || !st) {
            router.push('/login');
            return;
        }

        const parsed = JSON.parse(st);
        if (parsed.role !== 'FINANCE' && parsed.role !== 'DIRECTOR' && parsed.role !== 'SUPER_ADMIN') {
            router.push('/login'); // Unauthorized
            return;
        }

        setStaff(parsed);
        fetchFinanceData(token);
    }, [router]);

    const fetchFinanceData = async (token: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            
            const [invRes, ledRes] = await Promise.all([
                fetch(`${apiUrl}/api/v1/internal/finance/invoices`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/v1/internal/finance/ledger`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (invRes.ok) {
                const inv = await invRes.json();
                setInvoices(inv.data);
            }
            if (ledRes.ok) {
                const led = await ledRes.json();
                setLedger(led.data);
            }
        } catch (e) {
            console.error("Failed to load finance data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInvoice = async () => {
        const token = localStorage.getItem('seaboard_internal_token');
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiUrl}/api/v1/internal/finance/invoices/generate`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (res.ok) fetchFinanceData(token!);
            else alert("Failed to generate invoice or no unbilled claims found.");
        } catch (e) { console.error(e); }
    };

    const handleSyncQuickBooks = async (invoiceId: string) => {
        const token = localStorage.getItem('seaboard_internal_token');
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiUrl}/api/v1/internal/finance/invoices/${invoiceId}/sync-quickbooks`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Successfully synced to QuickBooks! Reference: ${data.data.erpReferenceId}`);
                fetchFinanceData(token!);
            } else {
                alert("Failed to sync to QuickBooks.");
            }
        } catch (e) { console.error(e); }
    };

    if (loading) return <div style={{ color: '#fff', padding: 40 }}>Loading secure financial data...</div>;

    const unbilledAmount = ledger.filter(l => l.status === 'UNBILLED').reduce((sum, l) => sum + Number(l.seaboardFeeKES), 0);
    const totalBilled = invoices.reduce((sum, i) => sum + Number(i.totalFeeKES), 0);

    return (
        <div style={{ minHeight: '100vh', background: '#050B14', color: '#fff', padding: 40, fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Finance ERP</h1>
                    <p style={{ color: '#8A9BB5', margin: 0 }}>Seaboard Technologies • {staff?.fullName} ({staff?.role})</p>
                </div>
                <button onClick={() => { localStorage.clear(); router.push('/login'); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }}>
                <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 24 }}>
                    <div style={{ color: '#8A9BB5', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>UNBILLED 1.75% REVENUE</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>KES {unbilledAmount.toLocaleString()}</div>
                    <button onClick={handleGenerateInvoice} style={{ marginTop: 16, background: '#2563EB', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}>Generate SHA Invoice</button>
                </div>
                <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 24 }}>
                    <div style={{ color: '#8A9BB5', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>TOTAL INVOICED TO SHA</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>KES {totalBilled.toLocaleString()}</div>
                    <div style={{ fontSize: 13, color: '#5C6C85', marginTop: 16 }}>From {invoices.length} total invoices generated.</div>
                </div>
                <div style={{ background: '#0A1224', border: '1px solid rgba(0, 193, 101, 0.2)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: '#00C165', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>QUICKBOOKS ONLINE</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>API Connected</div>
                    <div style={{ fontSize: 13, color: '#5C6C85', marginTop: 8 }}>Last sync: {invoices.find(i => i.erpSyncedAt)?.erpSyncedAt ? new Date(invoices.find(i => i.erpSyncedAt)!.erpSyncedAt).toLocaleString() : 'Never'}</div>
                </div>
            </div>

            {/* Invoices Table */}
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Monthly SHA Invoices</h2>
            <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', marginBottom: 40 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>INVOICE REF</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>PERIOD</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>CLAIMS</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>FEE (1.75%)</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>STATUS</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>QUICKBOOKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#5C6C85' }}>No invoices generated yet.</td></tr>
                        )}
                        {invoices.map((inv) => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '16px 24px', fontSize: 14, fontFamily: "'DM Mono', monospace" }}>{inv.invoiceNumber}</td>
                                <td style={{ padding: '16px 24px', fontSize: 14 }}>{inv.billingPeriod}</td>
                                <td style={{ padding: '16px 24px', fontSize: 14 }}>{inv.totalClaims}</td>
                                <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 600 }}>KES {Number(inv.totalFeeKES).toLocaleString()}</td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: inv.status === 'SENT_TO_SHA' ? 'rgba(37,99,235,0.1)' : 'rgba(255,255,255,0.1)', color: inv.status === 'SENT_TO_SHA' ? '#60A5FA' : '#fff' }}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    {inv.erpSyncStatus === 'SYNCED' ? (
                                        <span style={{ color: '#00C165', fontSize: 12, fontWeight: 600 }}>✓ {inv.erpReferenceId}</span>
                                    ) : (
                                        <button onClick={() => handleSyncQuickBooks(inv.id)} style={{ background: 'transparent', border: '1px solid #2563EB', color: '#60A5FA', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Sync Now</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Claims Breakdown Table */}
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Recent Claims Breakdown (1.75% Extraction)</h2>
            <div style={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <tr>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>CLAIM #</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>FACILITY</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>TOTAL AMOUNT</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>OUR FEE (1.75%)</th>
                            <th style={{ padding: '16px 24px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ledger.slice(0, 10).map((l) => (
                            <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '16px 24px', fontSize: 14, fontFamily: "'DM Mono', monospace" }}>{l.claim?.claimNumber}</td>
                                <td style={{ padding: '16px 24px', fontSize: 14 }}>{l.claim?.facility?.name}</td>
                                <td style={{ padding: '16px 24px', fontSize: 14 }}>KES {Number(l.claimAmountKES).toLocaleString()}</td>
                                <td style={{ padding: '16px 24px', fontSize: 14, color: '#00C165', fontWeight: 600 }}>KES {Number(l.seaboardFeeKES).toLocaleString()}</td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: l.status === 'BILLED' ? 'rgba(0,193,101,0.1)' : 'rgba(255,255,255,0.1)', color: l.status === 'BILLED' ? '#00C165' : '#8A9BB5' }}>
                                        {l.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
