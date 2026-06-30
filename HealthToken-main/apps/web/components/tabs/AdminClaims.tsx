'use client';
import { useState } from 'react';
import { useAdminAPI } from '../../lib/api';

export default function AdminClaims() {
    const [filter, setFilter] = useState('All');
    const { data, error, mutate } = useAdminAPI(`/api/v1/admin/claims?status=${filter}`);

    const summary = data?.summary || { pending: 0, approved: 0, flagged: 0, totalKES: 0 };
    const rows = data?.rows || [];

    async function handleApprove(claimId: string) {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/admin/claims/${claimId}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) mutate();
        } catch (e) {
            console.error('Approve failed', e);
        }
    }

    if (!data && !error) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8A9BB5' }}>Loading Claims…</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20 }}>Claims Processing</div>
                    <div style={{ fontSize: 12, color: '#8A9BB5' }}>Smart contract-verified, AI-screened health claims</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost">Export CSV</button>
                    <button className="btn-emerald">+ New Batch Review</button>
                </div>
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { label: 'Pending', value: summary.pending.toString(), color: '#F0C040' },
                    { label: 'Approved', value: summary.approved.toString(), color: '#00C165' },
                    { label: 'Flagged', value: summary.flagged.toString(), color: '#E74C3C' },
                    { label: 'Total KES', value: `KES ${(summary.totalKES / 1_000_000).toFixed(1)}M`, color: '#D4A017' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8A9BB5', letterSpacing: 1 }}>{s.label}</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 8 }}>
                {['All', 'Pending', 'Approved', 'Flagged'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={filter === f ? 'btn-emerald' : 'btn-ghost'}
                        style={{ padding: '6px 14px', fontSize: 12 }}>{f}</button>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1fr .8fr 80px 120px', gap: 8, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontSize: 10, color: '#8A9BB5', fontFamily: "'DM Mono', monospace", letterSpacing: .8 }}>
                    <span>CLAIM ID</span><span>PATIENT</span><span>FACILITY</span><span>SERVICE</span><span>AMOUNT</span><span>AI SCORE</span><span>STATUS</span>
                </div>
                {rows.length > 0 ? rows.map((row: any) => (
                    <div key={row.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr 1fr .8fr 80px 120px', gap: 8, padding: '11px 14px', fontSize: 12, alignItems: 'center' }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", color: '#F0C040', fontSize: 11 }}>{row.id}</span>
                        <span style={{ color: '#8A9BB5' }}>{row.patient}</span>
                        <span>{row.facility}</span>
                        <span style={{ color: '#8A9BB5' }}>{row.svc}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace" }}>{row.amt}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", color: row.ai > 80 ? '#00C165' : row.ai > 50 ? '#F0C040' : '#E74C3C' }}>{row.ai}%</span>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <span className={`badge ${row.status === 'Approved' ? 'badge-green' : row.status === 'Pending' ? 'badge-gold' : 'badge-red'}`}>{row.status}</span>
                            {row.status === 'Pending' && (
                                <button onClick={() => handleApprove(row.id)}
                                    style={{ background: 'rgba(0,193,101,0.15)', border: '1px solid rgba(0,193,101,0.4)', borderRadius: 6, color: '#00C165', fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}>✓</button>
                            )}
                        </div>
                    </div>
                )) : <div style={{ padding: 14, color: '#8A9BB5', fontSize: 12 }}>No claims found.</div>}
            </div>
        </div>
    );
}
