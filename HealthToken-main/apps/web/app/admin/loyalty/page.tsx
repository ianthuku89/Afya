'use client';
import { useState } from 'react';
import Icon from '../../../components/Icon';

// Mock data — in production, fetched from GET /api/v1/loyalty/stats
const MOCK_STATS = {
    totalRegistered: 12540,
    bundledTodayKES: 45000,
    systemDeficitKES: 85000,
    usersAtRisk: 840,
    healthDistribution: {
        'Reached KES 50 Limit': 45,
        'Actively Contributing': 40,
        'Insufficient Balance (Deficit)': 15,
    }
};

const MOCK_RECENT_BATCHES = [
    { date: 'Yesterday 7:00 PM', evaluated: 12500, deficitAddedKES: 14200, totalDeficitKES: 85000 },
    { date: 'Apr 18, 7:00 PM', evaluated: 12450, deficitAddedKES: 13800, totalDeficitKES: 70800 },
    { date: 'Apr 17, 7:00 PM', evaluated: 12100, deficitAddedKES: 12500, totalDeficitKES: 57000 },
    { date: 'Apr 16, 7:00 PM', evaluated: 11800, deficitAddedKES: 11800, totalDeficitKES: 44500 },
];

export default function LoyaltyPage() {
    const [stats] = useState(MOCK_STATS);

    return (
        <div className="slide-up" style={{ maxWidth: 1200 }}>
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                    SHIF Auto-Deductions
                </div>
                <div style={{ fontSize: 13, color: '#8A9BB5' }}>
                    Monitoring compulsory SHIF micro-contributions bundled within daily M-PESA user transactions.
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Registered Users', value: stats.totalRegistered.toLocaleString(), icon: 'users', color: '#00C165', delta: `100% compulsory enrollment` },
                    { label: "Today's Bundled Yield", value: `KES ${stats.bundledTodayKES.toLocaleString()}`, icon: 'zap', color: '#00C165', delta: 'Processed in real-time' },
                    { label: 'Total System Deficit', value: `KES ${stats.systemDeficitKES.toLocaleString()}`, icon: 'clock', color: '#F0C040', delta: 'Carried-forward unpaid SHIF' },
                    { label: 'Users at Risk (5+ Missed)', value: stats.usersAtRisk.toLocaleString(), icon: 'alert-triangle', color: '#E74C3C', delta: 'Sent SMS & App Warnings' },
                ].map(kpi => (
                    <div key={kpi.label} style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 16, padding: 20,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: `${kpi.color}15`, border: `1px solid ${kpi.color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon name={kpi.icon} size={16} color={kpi.color} />
                            </div>
                            <span style={{ fontSize: 11, color: '#8A9BB5', fontFamily: "'DM Mono', monospace" }}>{kpi.label}</span>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                            {kpi.value}
                        </div>
                        <div style={{ fontSize: 11, color: kpi.color }}>{kpi.delta}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
                {/* Deduction Health Status */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16, padding: 24,
                }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                        Deduction Health Status
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {Object.entries(stats.healthDistribution).map(([bracket, pct], i) => {
                            const colors = ['#00C165', '#3498DB', '#F0C040', '#C0C0C0'];
                            const color = colors[i % colors.length];
                            return (
                                <div key={bracket}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{bracket}</span>
                                        </div>
                                        <span style={{ fontSize: 12, color: color, fontFamily: "'DM Mono', monospace" }}>
                                            {pct}%
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%', height: 6, borderRadius: 3,
                                        background: 'rgba(255,255,255,0.06)',
                                    }}>
                                        <div style={{
                                            width: `${pct}%`, height: '100%', borderRadius: 3,
                                            background: color, transition: 'width 1s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* EOD Deficit Carry-Forward History */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16, padding: 24,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>
                            EOD Deficit Carry-Forward History
                        </div>
                        <button className="btn-emerald" style={{ padding: '6px 12px', fontSize: 12 }}>Run Calculation Now</button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                                {['Date', 'Wallets Evaluated', 'New Deficit Added', 'Total Carried Forward'].map(h => (
                                    <th key={h} style={{
                                        textAlign: 'left', padding: '10px 12px', fontSize: 11,
                                        color: '#8A9BB5', fontFamily: "'DM Mono', monospace", fontWeight: 500,
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_RECENT_BATCHES.map((batch, i) => (
                                <tr key={batch.date} style={{
                                    borderBottom: i < MOCK_RECENT_BATCHES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                }}>
                                    <td style={{ padding: '12px', fontWeight: 600, fontSize: 13 }}>{batch.date}</td>
                                    <td style={{ padding: '12px', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
                                        {batch.evaluated.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: 13, fontFamily: "'DM Mono', monospace", color: '#F0C040' }}>
                                        + KES {batch.deficitAddedKES.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
                                        KES {batch.totalDeficitKES.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Compliance Note */}
            <div style={{
                background: 'rgba(0,193,101,0.06)', border: '1px solid rgba(0,193,101,0.2)',
                borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <Icon name="shield-check" size={20} color="#00C165" />
                <div style={{ fontSize: 12, color: '#8A9BB5' }}>
                    <strong style={{ color: '#00C165' }}>Compulsory SHIF Contribution:</strong> All registered users are automatically enrolled in the per-transaction SHIF deduction per updated Terms and Conditions. Deficits are automatically tracked and carried forward.
                </div>
            </div>
        </div>
    );
}
