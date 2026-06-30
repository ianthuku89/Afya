'use client';
import { useAdminAPI } from '../../lib/api';

export default function AdminBlockchain() {
    const { data: bc, error } = useAdminAPI('/api/v1/admin/blockchain');

    const blockHeight = bc?.blockHeight ? `#${Number(bc.blockHeight).toLocaleString()}` : '—';
    const avgConfirm = bc?.avgConfirmTime || '—';
    const contracts = bc?.activeContracts ? Number(bc.activeContracts).toLocaleString() : '—';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="slide-up">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {[
                    { label: 'Block Height', value: blockHeight, color: '#00C165' },
                    { label: 'Avg. Confirm Time', value: avgConfirm, color: '#F0C040' },
                    { label: 'Smart Contracts Active', value: contracts, color: '#8A9BB5' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: 18, textAlign: 'center' }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8A9BB5', marginBottom: 8, letterSpacing: 1 }}>{s.label}</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Smart Contract Code Viewer */}
            <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                    Smart Contract Logic — Healthcare Payment Trigger
                </div>
                <div className="code-block">
                    <div style={{ color: '#8A9BB5' }}>{'// AfyaToken Payment Smart Contract v2.1 — Hyperledger Besu'}</div>
                    <div style={{ color: '#78DCE8' }}>pragma solidity ^0.8.20;</div>
                    <br />
                    <div><span style={{ color: '#FF6188' }}>import </span><span style={{ color: '#FFD866' }}>&quot;@openzeppelin/contracts/utils/ReentrancyGuard.sol&quot;</span>;</div>
                    <br />
                    <div><span style={{ color: '#FF6188' }}>contract </span><span style={{ color: '#FFD866' }}>AfyaTokenHealthPayment</span> {'{'}</div>
                    <div style={{ paddingLeft: 24 }}>
                        <div><span style={{ color: '#FF6188' }}>mapping</span>(address ={'>'} uint256) <span style={{ color: '#78DCE8' }}>public</span> walletBalance;</div>
                        <div><span style={{ color: '#FF6188' }}>mapping</span>(bytes32 ={'>'} bool) <span style={{ color: '#78DCE8' }}>public</span> claimVerified;</div>
                        <br />
                        <div style={{ color: '#8A9BB5' }}>{'// Dual-trigger: claimVerified AND facilityAccredited'}</div>
                        <div><span style={{ color: '#78DCE8' }}>function </span><span style={{ color: '#A9DC76' }}>executePayment</span>(</div>
                        <div style={{ paddingLeft: 24 }}>address patient, address facility,</div>
                        <div style={{ paddingLeft: 24 }}>uint256 amount, bytes32 claimId</div>
                        <div>) <span style={{ color: '#78DCE8' }}>external nonReentrant</span> {'{'}</div>
                        <div style={{ paddingLeft: 24 }}><span style={{ color: '#FF6188' }}>require</span>(claimVerified[claimId], <span style={{ color: '#FFD866' }}>&quot;Claim not verified&quot;</span>);</div>
                        <div style={{ paddingLeft: 24 }}><span style={{ color: '#FF6188' }}>require</span>(walletBalance[patient] {'>'} amount, <span style={{ color: '#FFD866' }}>&quot;Insufficient AfyaToken&quot;</span>);</div>
                        <div style={{ paddingLeft: 24 }}><span style={{ color: '#FF6188' }}>require</span>(isSHAAccredited(facility), <span style={{ color: '#FFD866' }}>&quot;Facility not accredited&quot;</span>);</div>
                        <div style={{ paddingLeft: 24, color: '#8A9BB5' }}>{'// CEI: effects before interactions'}</div>
                        <div style={{ paddingLeft: 24 }}>walletBalance[patient] -= amount;</div>
                        <div style={{ paddingLeft: 24 }}>walletBalance[facility] += amount;</div>
                        <div style={{ paddingLeft: 24 }}><span style={{ color: '#78DCE8' }}>emit </span>PaymentExecuted(patient, facility, amount, claimId);</div>
                        <div>{'}'}</div>
                    </div>
                    <div>{'}'}</div>
                </div>
            </div>

            {/* Token Issuance Register */}
            <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Token Issuance Register</div>
                <div style={{ fontSize: 11, color: '#8A9BB5', marginBottom: 16 }}>CBK-regulated issuance backed 1:1 by Treasury — 3-of-5 multi-sig required</div>
                {[
                    { batch: 'AfyaToken-2025-Q1', amount: '500,000 AfyaToken', backed: 'KES 500M', auth: 'CBK #TRE-441', status: 'Active' },
                    { batch: 'AfyaToken-2025-Q2', amount: '350,000 AfyaToken', backed: 'KES 350M', auth: 'CBK #TRE-442', status: 'Active' },
                    { batch: 'AfyaToken-2025-Q3', amount: '420,000 AfyaToken', backed: 'KES 420M', auth: 'CBK #TRE-443', status: 'Pending' },
                ].map(row => (
                    <div key={row.batch} className="table-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.5fr 80px', gap: 8, padding: '12px 14px', fontSize: 12, alignItems: 'center' }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", color: '#F0C040' }}>{row.batch}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace" }}>{row.amount}</span>
                        <span style={{ color: '#8A9BB5' }}>{row.backed}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", color: '#8A9BB5', fontSize: 10 }}>{row.auth}</span>
                        <span className={`badge ${row.status === 'Active' ? 'badge-green' : 'badge-gold'}`}>{row.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
