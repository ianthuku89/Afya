'use client';
import Icon from '../Icon';

const DOCS = [
    { doc: 'Tax Compliance Certificate (KRA)', status: 'Filed', date: 'Jan 2025' },
    { doc: 'ODPC Registration Certificate', status: 'Filed', date: 'Dec 2024' },
    { doc: 'Data Protection Impact Assessment', status: 'Filed', date: 'Feb 2025' },
    { doc: 'System Manual & Requirements Spec', status: 'Filed', date: 'Jan 2025' },
    { doc: 'Self-attestation Report', status: 'Filed', date: 'Jan 2025' },
    { doc: 'Security, Privacy & Confidentiality Policy', status: 'Filed', date: 'Jan 2025' },
    { doc: 'System Backup & Recovery Policy', status: 'Filed', date: 'Jan 2025' },
    { doc: 'Cybersecurity Assessment Report', status: 'Due Apr 25', date: 'Annual' },
    { doc: 'Proof of Certification Fee Payment', status: 'Filed', date: 'Jan 2025' },
];

const INTEGRATIONS = [
    { label: 'DHA Enterprise\nService Bus', connected: true },
    { label: 'SHA Insurance\nPortal', connected: true },
    { label: 'Client\nRegistry', connected: true },
    { label: 'Facility\nRegistry', connected: true },
    { label: 'Health Worker\nRegistry', connected: true },
    { label: 'CBK Payment\nRails', connected: true },
    { label: 'KEMSA Supply\nChain', connected: false },
];

export default function AdminDHA() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20 }}>DHA Certification Dashboard</div>
                    <div style={{ fontSize: 12, color: '#8A9BB5' }}>Digital Health Act No. 15 of 2023 · Regulation Compliance Tracker</div>
                </div>
                <div style={{ padding: '10px 20px', background: 'rgba(0,107,60,0.13)', border: '1px solid rgba(0,107,60,0.27)', borderRadius: 12 }}>
                    <div style={{ fontSize: 10, color: '#8A9BB5', fontFamily: "'DM Mono', monospace" }}>CERT VALIDITY</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#00C165' }}>Active · Expires Mar 2026</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Required Docs */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Required Documentation</div>
                    {DOCS.map(d => (
                        <div key={d.doc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.12)', fontSize: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Icon name={d.status === 'Filed' ? 'check' : 'alert'} size={14} color={d.status === 'Filed' ? '#00C165' : '#F0C040'} />
                                <span style={{ color: d.status === 'Filed' ? '#fff' : '#F0C040' }}>{d.doc}</span>
                            </div>
                            <span className={`badge ${d.status === 'Filed' ? 'badge-green' : 'badge-gold'}`}>{d.status}</span>
                        </div>
                    ))}
                </div>

                {/* Compliance Pillars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                        { title: 'Functionality & Data Quality', desc: 'FHIR R4 compliant APIs, minimum dataset submission to DHA, comprehensive service costing for insurance', score: 97, color: '#00C165' },
                        { title: 'Interoperability Framework', desc: 'Connected to DHA Enterprise Service Bus, Client Registry, Facility Registry & Health Worker Registry', score: 94, color: '#F0C040' },
                        { title: 'Information Security & Privacy', desc: 'End-to-end AES-256-GCM encryption, KDPA 2019 compliant, ODPC-2024-KE-00841 registered, RS256 JWT auth', score: 98, color: '#00C165' },
                        { title: 'Reporting & Alerts', desc: 'Automated reporting to SHA, CBK, and DHA dashboards. Real-time alert triggers for anomalies', score: 92, color: '#D4A017' },
                    ].map(p => (
                        <div key={p.title} className="glass-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, flex: 1, paddingRight: 12 }}>{p.title}</div>
                                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 700, color: p.color, flexShrink: 0 }}>{p.score}%</div>
                            </div>
                            <div style={{ fontSize: 11, color: '#8A9BB5', marginBottom: 10 }}>{p.desc}</div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${p.score}%`, background: p.color }} /></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Integration Map */}
            <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>DHA System Integration Map</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                    {INTEGRATIONS.map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: s.connected ? 'rgba(0,107,60,0.13)' : 'rgba(212,160,23,0.13)',
                                border: `2px solid ${s.connected ? '#00C165' : '#F0C040'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
                            }}>
                                <Icon name={s.connected ? 'check' : 'alert'} size={22} color={s.connected ? '#00C165' : '#F0C040'} />
                            </div>
                            <div style={{ fontSize: 10, color: s.connected ? '#fff' : '#F0C040', whiteSpace: 'pre-line', lineHeight: 1.4 }}>{s.label}</div>
                            <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: s.connected ? '#00C165' : '#F0C040', marginTop: 4 }}>{s.connected ? 'LIVE' : 'Q3 2025'}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
