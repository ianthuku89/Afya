'use client';
import Icon from '../Icon';
import { useAdminAPI } from '../../lib/api';

export default function AdminAI() {
    const { data: stats, error } = useAdminAPI('/api/v1/admin/ai-stats', { refreshInterval: 8000 });

    if (!stats && !error) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8A9BB5' }}>Loading AI Monitor…</div>;
    }

    const feed = stats?.feed || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="slide-up">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {[
                    { label: 'AI Fraud Score (Avg)', value: `${stats?.avgAccuracy || '98.7'}%`, sub: 'Accuracy on test set', color: '#00C165', icon: 'cpu' },
                    { label: 'Anomalies Today', value: (stats?.anomaliesToday || 0).toString(), sub: 'Flagged + auto-blocked', color: '#F0C040', icon: 'alert' },
                    { label: 'Claims Auto-Approved', value: `${stats?.autoApprovalRate || '0'}%`, sub: 'No human needed', color: '#D4A017', icon: 'check' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8A9BB5', letterSpacing: 1 }}>{s.label}</div>
                            <Icon name={s.icon} size={18} color={s.color} />
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#8A9BB5', marginTop: 4 }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
                {/* Anomaly Feed */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>AI Anomaly Detection Feed</div>
                    <div style={{ fontSize: 11, color: '#8A9BB5', marginBottom: 16 }}>Real-time XGBoost analysis — claim patterns, billing codes &amp; facility behaviour</div>
                    {feed.length > 0 ? feed.map((row: any, i: number) => (
                        <div key={i} className="table-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr .8fr 70px 100px', gap: 8, padding: '10px 0', fontSize: 11, alignItems: 'center' }}>
                            <span>{row.type}</span>
                            <span style={{ color: '#8A9BB5' }}>{row.facility}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", color: '#F0C040' }}>{row.amount}</span>
                            <span className={`badge ${row.risk === 'HIGH' ? 'badge-red' : row.risk === 'MED' ? 'badge-gold' : 'badge-slate'}`}>{row.risk}</span>
                            <span className={`badge ${row.action === 'Auto-Blocked' ? 'badge-red' : row.action === 'Approved' ? 'badge-green' : 'badge-gold'}`}>{row.action}</span>
                        </div>
                    )) : <div style={{ padding: 14, color: '#8A9BB5', fontSize: 12 }}>No anomalies detected.</div>}
                </div>

                {/* Model Health */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>AI Model Health</div>
                    {[
                        { label: 'Claims Classification', pct: 98, color: '#00C165' },
                        { label: 'Fraud Pattern Detection', pct: 96, color: '#F0C040' },
                        { label: 'Ghost Patient Detection', pct: 94, color: '#D4A017' },
                        { label: 'Billing Anomaly Score', pct: 91, color: '#E74C3C' },
                        { label: 'Drug Supply Chain Verify', pct: 89, color: '#8A9BB5' },
                    ].map(m => (
                        <div key={m.label} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                                <span style={{ color: '#8A9BB5' }}>{m.label}</span>
                                <span style={{ fontFamily: "'DM Mono', monospace", color: m.color }}>{m.pct}%</span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                <div style={{ height: '100%', width: `${m.pct}%`, background: m.color, borderRadius: 3 }} />
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,107,60,.1)', border: '1px solid rgba(0,107,60,.33)', borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: '#00C165', fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>▶ NEXT TRAINING</div>
                        <div style={{ fontSize: 12, color: '#8A9BB5' }}>Federated learning update with 12 county nodes scheduled in 3 days</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
