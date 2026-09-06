'use client';
import { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';

const TIER_CONFIG = {
    BRONZE:   { label: 'Bronze',   color: '#CD7F32', bg: 'rgba(205,127,50,0.1)',  border: 'rgba(205,127,50,0.25)' },
    SILVER:   { label: 'Silver',   color: '#C0C0C0', bg: 'rgba(192,192,192,0.1)', border: 'rgba(192,192,192,0.25)' },
    GOLD:     { label: 'Gold',     color: '#FFD700', bg: 'rgba(255,215,0,0.1)',    border: 'rgba(255,215,0,0.25)' },
    PLATINUM: { label: 'Platinum', color: '#00C165', bg: 'rgba(0,193,101,0.1)',    border: 'rgba(0,193,101,0.25)' },
};

// Mock data — in production, fetched from GET /api/v1/afyascore/stats
const MOCK_STATS = {
    totalUsers: 12847,
    averageScore: 342,
    averageStreak: 18,
    tierDistribution: { BRONZE: 7240, SILVER: 3820, GOLD: 1450, PLATINUM: 337 },
};

const MOCK_TREND = [
    { month: 'Jan', bronze: 8500, silver: 2100, gold: 800, platinum: 120 },
    { month: 'Feb', bronze: 8200, silver: 2500, gold: 950, platinum: 180 },
    { month: 'Mar', bronze: 7800, silver: 3100, gold: 1200, platinum: 250 },
    { month: 'Apr', bronze: 7240, silver: 3820, gold: 1450, platinum: 337 },
];

const MOCK_TOP_COUNTIES = [
    { county: 'Nairobi', users: 3240, avgScore: 412, topTier: 'GOLD' },
    { county: 'Mombasa', users: 1820, avgScore: 378, topTier: 'SILVER' },
    { county: 'Kisumu', users: 1540, avgScore: 345, topTier: 'SILVER' },
    { county: 'Nakuru', users: 1280, avgScore: 298, topTier: 'BRONZE' },
    { county: 'Eldoret', users: 980, avgScore: 356, topTier: 'SILVER' },
];

export default function AfyaScorePage() {
    const [stats, setStats] = useState(MOCK_STATS);
    const [loading, setLoading] = useState(false);

    const coverageRate = ((stats.tierDistribution.SILVER + stats.tierDistribution.GOLD + stats.tierDistribution.PLATINUM) / stats.totalUsers * 100).toFixed(1);

    return (
        <div className="slide-up" style={{ maxWidth: 1200 }}>
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
                    AfyaScore Analytics
                </div>
                <div style={{ fontSize: 13, color: '#8A9BB5' }}>
                    Gamification metrics driving SHIF contribution uptake from informal workers
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Contributors', value: stats.totalUsers.toLocaleString(), icon: 'user', color: '#00C165', delta: '+847 this month' },
                    { label: 'Average AfyaScore', value: stats.averageScore.toString(), icon: 'activity', color: '#FFD700', delta: `${coverageRate}% above Bronze` },
                    { label: 'Average Streak', value: `${stats.averageStreak} days`, icon: 'zap', color: '#F0C040', delta: '+3 days vs last month' },
                    { label: 'Coverage Rate', value: `${coverageRate}%`, icon: 'shield', color: '#00C165', delta: 'Silver+ tier members' },
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

            {/* Tier Distribution + Score Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Tier Distribution */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16, padding: 24,
                }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                        Tier Distribution
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {Object.entries(stats.tierDistribution).map(([tier, count]) => {
                            const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
                            const pct = (count / stats.totalUsers * 100).toFixed(1);
                            return (
                                <div key={tier}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 10, height: 10, borderRadius: '50%',
                                                background: config.color,
                                            }} />
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{config.label}</span>
                                        </div>
                                        <span style={{ fontSize: 12, color: '#8A9BB5', fontFamily: "'DM Mono', monospace" }}>
                                            {count.toLocaleString()} ({pct}%)
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%', height: 8, borderRadius: 4,
                                        background: 'rgba(255,255,255,0.06)',
                                    }}>
                                        <div style={{
                                            width: `${pct}%`, height: '100%', borderRadius: 4,
                                            background: config.color, transition: 'width 1s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly Growth Trend */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 16, padding: 24,
                }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                        Monthly Tier Progression
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {MOCK_TREND.map(month => {
                            const total = month.bronze + month.silver + month.gold + month.platinum;
                            return (
                                <div key={month.month}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{month.month} 2025</span>
                                        <span style={{ fontSize: 11, color: '#8A9BB5' }}>{total.toLocaleString()} total</span>
                                    </div>
                                    <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden' }}>
                                        <div style={{ width: `${(month.bronze / total) * 100}%`, background: TIER_CONFIG.BRONZE.color, transition: 'width 0.5s' }} />
                                        <div style={{ width: `${(month.silver / total) * 100}%`, background: TIER_CONFIG.SILVER.color, transition: 'width 0.5s' }} />
                                        <div style={{ width: `${(month.gold / total) * 100}%`, background: TIER_CONFIG.GOLD.color, transition: 'width 0.5s' }} />
                                        <div style={{ width: `${(month.platinum / total) * 100}%`, background: TIER_CONFIG.PLATINUM.color, transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                        {Object.entries(TIER_CONFIG).map(([tier, config]) => (
                            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: config.color }} />
                                <span style={{ fontSize: 10, color: '#8A9BB5' }}>{config.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Counties Table */}
            <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16, padding: 24, marginBottom: 24,
            }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                    Top Counties by AfyaScore
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                            {['County', 'Contributors', 'Avg Score', 'Top Tier'].map(h => (
                                <th key={h} style={{
                                    textAlign: 'left', padding: '10px 12px', fontSize: 11,
                                    color: '#8A9BB5', fontFamily: "'DM Mono', monospace", fontWeight: 500,
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_TOP_COUNTIES.map((county, i) => {
                            const tierConfig = TIER_CONFIG[county.topTier as keyof typeof TIER_CONFIG];
                            return (
                                <tr key={county.county} style={{
                                    borderBottom: i < MOCK_TOP_COUNTIES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                }}>
                                    <td style={{ padding: '12px', fontWeight: 600, fontSize: 13 }}>{county.county}</td>
                                    <td style={{ padding: '12px', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
                                        {county.users.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600 }}>
                                                {county.avgScore}
                                            </span>
                                            <div style={{
                                                width: 60, height: 6, borderRadius: 3,
                                                background: 'rgba(255,255,255,0.06)',
                                            }}>
                                                <div style={{
                                                    width: `${(county.avgScore / 1000) * 100}%`, height: '100%',
                                                    borderRadius: 3, background: '#00C165',
                                                }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                            background: tierConfig.bg, color: tierConfig.color,
                                            border: `1px solid ${tierConfig.border}`,
                                        }}>
                                            {tierConfig.label}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Coverage-Proof Model Info Banner */}
            <div style={{
                background: 'rgba(0,193,101,0.06)', border: '1px solid rgba(0,193,101,0.2)',
                borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16,
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'rgba(0,193,101,0.12)', border: '1px solid rgba(0,193,101,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <Icon name="shield" size={20} color="#00C165" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>UHC Coverage-Proof Model Active</div>
                    <div style={{ fontSize: 12, color: '#8A9BB5', lineHeight: 1.6 }}>
                        AfyaTokens function as coverage-proof credentials — patients present QR codes at facilities to verify SHIF membership.
                        Facilities are reimbursed from the SHIF Treasury pool. Patient wallets are never debited.
                    </div>
                </div>
            </div>
        </div>
    );
}
