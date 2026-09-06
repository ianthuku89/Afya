'use client';
export default function AdminSettings() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700 }} className="slide-up">
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20 }}>Platform Settings</div>
            {[
                {
                    section: 'Token Configuration', items: [
                        { label: 'AfyaToken Peg Ratio', value: '1 AfyaToken = KES 1' },
                        { label: 'Daily Contribution Limit', value: 'KES 2,000' },
                        { label: 'Emergency Fund Reserve %', value: '8%' },
                        { label: 'Max Token Supply', value: '10,000,000 AfyaToken' },
                    ]
                },
                {
                    section: 'AI & Security', items: [
                        { label: 'Fraud Score Threshold (auto-block)', value: '< 40%' },
                        { label: 'Model Retraining Schedule', value: 'Every 30 days' },
                        { label: 'Federated Learning Nodes', value: '12 County Clusters' },
                        { label: 'JWT Algorithm', value: 'RS256 (15-min access tokens)' },
                        { label: 'Encryption Standard', value: 'AES-256-GCM' },
                        { label: 'Rate Limit (Public)', value: '100 req/min per IP' },
                        { label: 'Rate Limit (Facility)', value: '1,000 req/min' },
                    ]
                },
                {
                    section: 'DHA Compliance', items: [
                        { label: 'FHIR Version', value: 'R4' },
                        { label: 'Data Retention Period', value: '7 years (per KDPA 2019)' },
                        { label: 'ODPC Registration No.', value: 'ODPC-2024-KE-00841' },
                        { label: 'DHA Cert Expiry', value: 'March 2026' },
                        { label: 'Audit Log Integrity', value: 'INSERT-only PostgreSQL role' },
                    ]
                },
                {
                    section: 'Smart Contracts', items: [
                        { label: 'Network', value: 'Hyperledger Besu (permissioned)' },
                        { label: 'Treasury Multi-sig', value: '3-of-5 signatories required' },
                        { label: 'Issuance Time-lock', value: '48 hours' },
                        { label: 'Solidity Version', value: '0.8.20' },
                        { label: 'OpenZeppelin Version', value: 'v5.0.2 (ReentrancyGuard, AccessControl)' },
                    ]
                },
            ].map(grp => (
                <div key={grp.section} className="glass-card" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 14, color: '#00C165', fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{grp.section}</div>
                    {grp.items.map(item => (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.12)', fontSize: 13 }}>
                            <span style={{ color: '#8A9BB5' }}>{item.label}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace" }}>{item.value}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
