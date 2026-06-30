'use client';
import Icon from '../Icon';
import { useAdminAPI } from '../../lib/api';

export default function AdminFacilities() {
    const { data: facilities, error } = useAdminAPI('/api/v1/admin/facilities');

    if (!facilities && !error) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8A9BB5' }}>Loading Facilities…</div>;
    }

    const rows = facilities || [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20 }}>SHA-Accredited Facilities</div>
                    <div style={{ fontSize: 12, color: '#8A9BB5' }}>Connected to DHA Facility Registry · MFL codes verified</div>
                </div>
                <button className="btn-emerald">+ Register Facility</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {rows.length > 0 ? rows.map((f: any) => (
                    <div key={f.id} className="glass-card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span className="badge badge-green" style={{ fontSize: 10 }}>{f.level}</span>
                            <span className={`badge ${f.fhirEnabled ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: 10 }}>
                                FHIR R4 {f.fhirEnabled ? '✓' : 'Pending'}
                            </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: '#8A9BB5', marginBottom: 4 }}>{f.county} County</div>
                        <div style={{ fontSize: 10, color: '#8A9BB5', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>MFL: {f.mflCode}</div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '8px 0' }} />
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, alignItems: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C165' }} />
                            <span style={{ color: '#00C165' }}>AfyaToken Wallet Active</span>
                            <div style={{ flex: 1 }} />
                            <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 10 }}>
                                <Icon name="eye" size={12} color="#8A9BB5" /> View
                            </button>
                        </div>
                    </div>
                )) : <div style={{ padding: 14, color: '#8A9BB5', fontSize: 12, gridColumn: '1 / -1' }}>No accredited facilities found.</div>}
            </div>
        </div>
    );
}
