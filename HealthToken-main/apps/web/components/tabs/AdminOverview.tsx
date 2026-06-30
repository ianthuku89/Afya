'use client';
import MiniChart from '../MiniChart';
import TokenCoin from '../TokenCoin';
import Icon from '../Icon';
import { useAdminAPI } from '../../lib/api';

function StatCard({ label, value, sub, badge, badgeType = 'green', icon, color = '#006B3C', chart }: {
    label: string; value: string; sub?: string; badge?: string;
    badgeType?: string; icon: string; color?: string; chart?: number[];
}) {
    return (
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: 11, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginTop: 4 }}>{value}</div>
                    {sub && <div style={{ fontSize: 12, color: '#8A9BB5', marginTop: 2 }}>{sub}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={icon} size={20} color={color} />
                    </div>
                    {badge && <span className={`badge badge-${badgeType}`}>▲ {badge}</span>}
                </div>
            </div>
            {chart && <MiniChart data={chart} color={color} />}
        </div>
    );
}

function TxRow({ hash, from, to, amount, status, time }: { hash: string; from: string; to: string; amount: string; status: string; time: string; }) {
    const cls = status === 'Confirmed' ? 'badge-green' : status === 'Pending' ? 'badge-gold' : 'badge-red';
    return (
        <div className="table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 80px 70px', gap: 8, padding: '10px 14px', alignItems: 'center', fontSize: 12 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", color: '#00C165', fontSize: 10 }}>{hash}</span>
            <span style={{ color: '#8A9BB5', fontSize: 11 }}>{from} → {to}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", color: '#F0C040' }}>{amount} AFYA</span>
            <span className={`badge ${cls}`}>{status}</span>
            <span style={{ color: '#8A9BB5', fontSize: 10 }}>{time}</span>
        </div>
    );
}

function fmt(num: number) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
}

export default function AdminOverview() {
    const { data: stats, error: dashErr } = useAdminAPI('/api/v1/admin/dashboard');
    const { data: activity } = useAdminAPI('/api/v1/admin/activity', { refreshInterval: 5000 });

    if (!stats && !dashErr) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8A9BB5' }}>Loading Dashboard Metrics…</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="slide-up">
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                <StatCard label="Total Coverage Contributions" value={stats ? fmt(stats.afyaTokenInCirculation) : '0'} sub={`≈ KES ${stats ? fmt(stats.afyaTokenInCirculation * 10) : '0'} value`} badge="12.4%" icon="shield" color="#00C165" chart={stats?.circulationTrend} />
                <StatCard label="Active Coverages" value={stats ? fmt(stats.activeWallets) : '0'} sub="Verified SHIF members" badge="8.1%" icon="user-check" color="#00C165" chart={stats?.walletsTrend} />
                <StatCard label="Coverage Verifications" value={stats ? fmt(stats.smartContractExecutions) : '0'} sub="Facility visits verified" badge="5.3%" icon="check-circle" color="#F0C040" chart={stats?.execTrend} />
                <StatCard label="Fraud Prevented" value={`KES ${stats ? fmt(stats.fraudPreventedKES) : '0'}`} sub="AI-detected anomalies" badge="Saved" badgeType="gold" icon="shield" color="#E74C3C" chart={stats?.fraudTrend} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                {/* Transaction Volume Chart */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>Contribution Volume (AFYA)</div>
                            <div style={{ fontSize: 11, color: '#8A9BB5', fontFamily: "'DM Mono', monospace" }}>LAST 12 MONTHS · REAL-TIME</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['1W', '1M', '3M', '1Y'].map(t => (
                                <button key={t} className={t === '1M' ? 'btn-emerald' : 'btn-ghost'} style={{ padding: '5px 10px', fontSize: 11 }}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <MiniChart data={stats?.volumeChart || [120, 145, 138, 160, 155, 180, 210, 195, 220, 240, 235, 260]} color="#00C165" height={120} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#8A9BB5', fontFamily: "'DM Mono', monospace" }}>
                        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map(m => <span key={m}>{m}</span>)}
                    </div>
                </div>

                {/* Token Allocation */}
                <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>Token Allocation</div>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                        <TokenCoin size={90} />
                    </div>
                    {([
                        ['Treasury Reserve', '45%', '#D4A017'],
                        ['Active Coverages', '32%', '#00C165'],
                        ['Pending Claims', '15%', '#F0C040'],
                        ['Government Match Fund', '8%', '#E74C3C'],
                    ] as [string, string, string][]).map(([label, pct, color]) => (
                        <div key={label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: '#8A9BB5' }}>{label}</span>
                                <span style={{ fontFamily: "'DM Mono', monospace", color }}>{pct}</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: pct, background: color, borderRadius: 2, transition: 'width 1s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Live Blockchain Activity */}
            <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>Live Blockchain Activity</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C165', animation: 'pulse-dot 1.5s infinite' }} />
                        <span style={{ fontSize: 11, color: '#00C165', fontFamily: "'DM Mono', monospace" }}>LIVE</span>
                    </div>
                </div>
                <div style={{ fontSize: 11, color: '#8A9BB5', display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 80px 70px', padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontFamily: "'DM Mono', monospace", letterSpacing: .5 }}>
                    <span>TX HASH</span><span>ROUTE</span><span>AMOUNT</span><span>STATUS</span><span>TIME</span>
                </div>
                {(activity || []).length > 0
                    ? (activity || []).map((tx: any) => <TxRow key={tx.id} hash={tx.hash} from={tx.from} to={tx.to} amount={tx.amount} status={tx.status} time={tx.time} />)
                    : <div style={{ padding: 14, color: '#8A9BB5', fontSize: 12 }}>No recent transactions.</div>
                }
            </div>
        </div>
    );
}
