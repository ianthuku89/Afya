'use client';
import { useState } from 'react';
import Icon from './Icon';
import TokenCoin from './TokenCoin';

const BOTTOM_TABS = [
    { id: 'Home', icon: 'home' },
    { id: 'Coverage', icon: 'shield' },
    { id: 'Visits', icon: 'clock' },
    { id: 'Facilities', icon: 'hospital' },
    { id: 'Profile', icon: 'user' },
];

function MobileHome({ setScreen }: { setScreen: (s: string) => void }) {
    return (
        <div style={{ padding: '20px 20px 0' }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 13, color: '#8A9BB5' }}>Habari, Jane 👋</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>Afya Yako</div>
                </div>
                <div style={{ position: 'relative' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#2A2D35,#0A0F1E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="bell" size={18} color="#fff" />
                    </div>
                    <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: '#E74C3C', borderRadius: '50%', border: '2px solid #0A0F1E' }} />
                </div>
            </div>

            {/* Coverage Status Card */}
            <div style={{ background: 'linear-gradient(135deg, #2A2D35, #11141E)', border: '1px solid #808080', borderRadius: 24, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, opacity: .08 }}><TokenCoin size={140} /></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C165' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#00C165', letterSpacing: 1 }}>SHIF ACTIVE</span>
                    </div>
                    <div style={{ background: 'rgba(192,192,192,0.15)', border: '1px solid #808080', padding: '4px 10px', borderRadius: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#C0C0C0' }}>Silver Tier</span>
                    </div>
                </div>

                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,.6)', letterSpacing: 1.5, marginBottom: 6 }}>YOUR AFYA SCORE</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, lineHeight: 1 }}>342</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.4)' }}>/ 1000</div>
                </div>

                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 16 }}>
                    <div style={{ width: '34.2%', height: '100%', background: '#C0C0C0', borderRadius: 3 }} />
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: 10, color: '#8A9BB5', fontWeight: 700, marginBottom: 4 }}>🔥 STREAK</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#F0C040' }}>47 Days</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: 10, color: '#8A9BB5', fontWeight: 700, marginBottom: 4 }}>💎 TOKENS</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#C0C0C0' }}>450 AFYA</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setScreen('Contribute')} className="btn-emerald" style={{ flex: 1, background: 'rgba(255,255,255,.15)', borderColor: 'rgba(255,255,255,0.2)' }}>+ Contribute</button>
                    <button onClick={() => setScreen('Coverage')} className="btn-ghost" style={{ flex: 1, borderColor: 'rgba(255,255,255,.2)', color: 'rgba(255,255,255,.8)' }}>My Coverage</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                    { label: 'Cover Level', value: 'Primary + Emergency', color: '#00C165' },
                    { label: 'Best Streak', value: '112 Days 🏆', color: '#F0C040' },
                    { label: 'Total Contributed', value: 'KES 16,500', color: '#D4A017' },
                    { label: 'SHA Status', value: 'Active ✓', color: '#00C165' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: 14 }}>
                        <div style={{ fontSize: 10, color: '#8A9BB5', fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: 'rgba(212,160,23,0.09)', border: '1px solid rgba(212,160,23,0.2)', borderRadius: 14, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(212,160,23,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="phone" size={18} color="#F0C040" />
                </div>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#F0C040' }}>No internet? No problem.</div>
                    <div style={{ fontSize: 11, color: '#8A9BB5' }}>Dial *384# for USSD access</div>
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Recent Activity</div>
                {[
                    { icon: 'arrow', label: 'Daily Contribution', amt: '+5 AFYA', time: 'Today', color: '#00C165' },
                    { icon: 'shield', label: 'Coverage Verified: Kenyatta NH', amt: 'Silver Tier', time: 'Mar 5', color: '#C0C0C0' },
                    { icon: 'star', label: "7-Day Streak Bonus", amt: '+25 AFYA', time: 'Mar 1', color: '#F0C040' },
                    { icon: 'shield', label: 'Coverage Verified: Pharmacy Plus', amt: 'Silver Tier', time: 'Feb 22', color: '#C0C0C0' },
                ].map((tx, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name={tx.icon} size={16} color={tx.color === '#C0C0C0' ? '#8A9BB5' : tx.color} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.label}</div>
                            <div style={{ fontSize: 11, color: '#8A9BB5' }}>{tx.time}</div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: tx.color }}>
                            {tx.amt}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MobileCoverage() {
    return (
        <div style={{ padding: 20 }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22 }}>My Coverage</div>
                <div style={{ background: 'rgba(192,192,192,0.15)', border: '1px solid #808080', padding: '4px 10px', borderRadius: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C0C0C0' }}>Silver Tier</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 16 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: '#00C165', borderRadius: 12, color: 'white', fontWeight: 600, fontSize: 12 }}>QR Proof</div>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: '#8A9BB5', fontWeight: 600, fontSize: 12 }}>Details</div>
            </div>

            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C165' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#00C165' }}>SHIF Coverage Active</span>
                </div>
                
                <div style={{ width: 200, height: 200, background: 'white', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '4px solid #C0C0C0' }}>
                    <Icon name="maximize" size={80} color="#0A0F1E" />
                </div>
                
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Jane Wanjiku</div>
                <div style={{ fontSize: 12, color: '#8A9BB5', fontFamily: "'DM Mono', monospace", marginBottom: 20 }}>AfyaScore: 342 · Silver Tier</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="clock" size={14} color="#00C165" />
                    <span style={{ fontSize: 12, color: '#00C165' }}>Expires in 4:59</span>
                </div>
            </div>

            <button className="btn-ghost" style={{ width: '100%', padding: '14px 0', justifyContent: 'center', display: 'flex', gap: 8 }}>
                <Icon name="refresh-cw" size={16} color="white" />
                <span>Generate New QR</span>
            </button>
        </div>
    );
}

function MobileContribute() {
    const [amount, setAmount] = useState(50);
    const [done, setDone] = useState(false);
    return (
        <div style={{ padding: 20 }} className="slide-up">
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Boost Your Coverage</div>
            <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 24 }}>Small daily amounts = big health protection</div>
            {!done ? (
                <>
                    <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8A9BB5', marginBottom: 4 }}>CONTRIBUTE TODAY</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 900, color: '#F0C040', textAlign: 'center', margin: '16px 0' }}>KES {amount * 10}</div>
                        <div style={{ fontSize: 12, color: '#8A9BB5', textAlign: 'center', marginBottom: 4 }}>= {amount} AfyaTokens added to coverage</div>
                        <div style={{ fontSize: 11, color: '#00C165', textAlign: 'center', marginBottom: 16 }}>≈ +{Math.floor(amount / 5) + 10} AfyaScore points</div>
                        <input type="range" min={5} max={200} value={amount} onChange={e => setAmount(+e.target.value)} style={{ width: '100%', accentColor: '#00C165' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8A9BB5', marginTop: 4 }}>
                            <span>KES 50 min</span><span>KES 2,000 max</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        {[50, 100, 200, 500].map(v => (
                            <button key={v} onClick={() => setAmount(v)} className={amount === v ? 'btn-emerald' : 'btn-ghost'} style={{ padding: 14 }}>KES {v * 10}</button>
                        ))}
                    </div>
                    <div style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
                        <div style={{ fontSize: 12, color: '#F0C040', fontWeight: 600, marginBottom: 4 }}>🎯 Active Challenge</div>
                        <div style={{ fontSize: 11, color: '#8A9BB5' }}>Contribute 7 consecutive days to earn 25 bonus AfyaTokens + 50 score points!</div>
                    </div>
                    <button className="btn-emerald" style={{ width: '100%', padding: 16, fontSize: 15, justifyContent: 'center' }} onClick={() => setDone(true)}>Contribute via M-PESA</button>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }} className="pop-in">
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,193,101,0.13)', border: '2px solid #00C165', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Icon name="check" size={40} color="#00C165" />
                    </div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Coverage Boosted!</div>
                    <div style={{ color: '#8A9BB5', marginBottom: 16 }}>KES {amount * 10} → {amount} AfyaTokens added to your coverage</div>
                    
                    <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#F0C040', marginBottom: 12 }}>📈 AFYASCORE UPDATE</div>
                        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                            <div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#00C165' }}>+{Math.floor(amount / 5) + 10}</div>
                                <div style={{ fontSize: 10, color: '#8A9BB5' }}>Points Earned</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#F0C040' }}>🔥 48</div>
                                <div style={{ fontSize: 10, color: '#8A9BB5' }}>Day Streak</div>
                            </div>
                        </div>
                    </div>
                    
                    <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setDone(false)}>Return Home</button>
                </div>
            )}
        </div>
    );
}

function MobileVisits() {
    return (
        <div style={{ padding: 20 }} className="slide-up">
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Visit History</div>
            <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 20 }}>Your facility visits with coverage verification</div>
            
            {[
                { facility: 'Kenyatta National Hospital', type: 'Outpatient', date: 'Mar 5, 2025', tier: 'Silver', status: 'Covered ✓', color: '#00C165' },
                { facility: 'Pharmacy Plus Nairobi', type: 'Prescription', date: 'Feb 22, 2025', tier: 'Silver', status: 'Covered ✓', color: '#00C165' },
                { facility: 'Mama Lucy Hospital', type: 'Consultation', date: 'Jan 15, 2025', tier: 'Bronze', status: 'Lapsed ❌', color: '#E74C3C' },
            ].map((v, i) => (
                <div key={i} className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{v.facility}</div>
                        <div style={{ background: `${v.color}20`, padding: '2px 8px', borderRadius: 6 }}>
                            <span style={{ color: v.color, fontSize: 10, fontWeight: 700 }}>{v.status}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={{ fontSize: 12, color: '#8A9BB5' }}>{v.date}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: v.tier === 'Silver' ? '#C0C0C0' : '#CD7F32' }}>{v.tier} Tier</div>
                    </div>
                </div>
            ))}
            <div style={{ textAlign: 'center', padding: 20, color: '#8A9BB5', fontSize: 11 }}>
                * Financial data is not exposed to facilities
            </div>
        </div>
    );
}

function MobileFacilities() {
    return (
        <div style={{ padding: 20 }} className="slide-up">
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, marginBottom: 4 }}>Find Care</div>
            <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 16 }}>SHA-accredited facilities covered by your SHIF</div>
            
            <div style={{ background: 'rgba(0,193,101,0.1)', border: '1px solid rgba(0,193,101,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Icon name="shield" size={16} color="#00C165" />
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#00C165' }}>Your Coverage is Active</div>
                    <div style={{ fontSize: 11, color: '#8A9BB5' }}>Present your QR code at any facility below</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
                {['All', 'Hospitals', 'Clinics', 'Pharmacy', 'Lab', 'Dental'].map((f, i) => (
                    <button key={f} className={i === 0 ? 'btn-emerald' : 'btn-ghost'} style={{ whiteSpace: 'nowrap', padding: '7px 14px', fontSize: 11, flexShrink: 0 }}>{f}</button>
                ))}
            </div>
            {[
                { name: 'Kenyatta National Hospital', dist: '2.4 km', level: 'Level 6', rating: '4.8' },
                { name: 'MP Shah Hospital', dist: '3.1 km', level: 'Level 5', rating: '4.7' },
                { name: 'Nairobi Hospital', dist: '4.2 km', level: 'Level 5', rating: '4.9' },
            ].map((f, i) => (
                <div key={i} className="glass-card" style={{ padding: 16, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#F0C040' }}>⭐ {f.rating}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <span className="badge badge-slate" style={{ fontSize: 10 }}>{f.level}</span>
                        <span className="badge badge-green" style={{ fontSize: 10 }}>SHIF Covered</span>
                        <span style={{ fontSize: 11, color: '#8A9BB5' }}>{f.dist} away</span>
                    </div>
                    <button className="btn-emerald" style={{ width: '100%', padding: 10, fontSize: 12, justifyContent: 'center' }}>Verify Coverage Here</button>
                </div>
            ))}
        </div>
    );
}

function MobileProfile() {
    return (
        <div style={{ padding: 20 }} className="slide-up">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#006B3C,#0D1B3E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Icon name="user" size={36} color="#fff" />
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>Jane Wanjiku</div>
                <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 8 }}>SHA Member · Nairobi County</div>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ background: 'rgba(192,192,192,0.15)', padding: '2px 8px', borderRadius: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#C0C0C0' }}>Silver Tier</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#F0C040', fontWeight: 700 }}>AfyaScore: 342</div>
                </div>

                <div className="glass-card" style={{ display: 'inline-block', padding: '6px 16px' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#00C165' }}>SHA-KE-2024-8821</span>
                </div>
            </div>
            <div className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, color: '#00C165', fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>COVERAGE DETAILS</div>
                {[{ label: 'Plan', value: 'SHA Standard' }, { label: 'Primary Healthcare Fund', value: 'Active' }, { label: 'Emergency Fund', value: 'Active' }, { label: 'SHIF Contributions', value: '342 score' }, { label: 'Dependants Covered', value: '3' }].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.12)', fontSize: 12 }}>
                        <span style={{ color: '#8A9BB5' }}>{r.label}</span>
                        <span style={{ fontWeight: 600 }}>{r.value}</span>
                    </div>
                ))}
            </div>
            <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, color: '#D4A017', fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>DATA & PRIVACY</div>
                {[{ label: 'Health Data Portability', icon: 'eye' }, { label: 'Download My Records (FHIR)', icon: 'file' }, { label: 'Data Consent Settings', icon: 'lock' }, { label: 'ODPC Complaint Portal', icon: 'shield' }].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
                        <Icon name={r.icon} size={16} color="#8A9BB5" />
                        <span style={{ fontSize: 13, flex: 1 }}>{r.label}</span>
                        <Icon name="arrow" size={14} color="#8A9BB5" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function MobileApp() {
    const [screen, setScreen] = useState('Home');

    const screens: Record<string, React.ReactNode> = {
        Home: <MobileHome setScreen={setScreen} />,
        Coverage: <MobileCoverage />,
        Contribute: <MobileContribute />,
        Visits: <MobileVisits />,
        Facilities: <MobileFacilities />,
        Profile: <MobileProfile />,
    };

    return (
        <div style={{
            width: 375, height: 812, background: '#0A0F1E', borderRadius: 44, overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column',
            position: 'relative', boxShadow: '0 40px 80px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.1)',
        }}>
            {/* Status Bar */}
            <div style={{ height: 44, background: '#0D1B3E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>9:41</span>
                <div style={{ width: 100, height: 16, background: '#0A0F1E', borderRadius: 8 }} />
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ width: 4, height: 8, background: '#fff', borderRadius: 1 }} />
                    <div style={{ width: 4, height: 12, background: '#fff', borderRadius: 1 }} />
                    <div style={{ width: 4, height: 8, background: '#8A9BB5', borderRadius: 1 }} />
                    <div style={{ width: 10, height: 8, border: '1.5px solid #fff', borderRadius: 2, marginLeft: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6, height: 4, background: '#00C165', borderRadius: 1 }} />
                    </div>
                </div>
            </div>

            {/* Screen Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {screens[screen]}
            </div>

            {/* Bottom Nav */}
            <div style={{ height: 80, background: '#0D1B3E', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 16, flexShrink: 0 }}>
                {BOTTOM_TABS.map(t => {
                    const active = t.id === screen || (screen === 'Contribute' && t.id === 'Home');
                    return (
                        <button key={t.id} onClick={() => setScreen(t.id)} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: active ? '#00C165' : '#8A9BB5', padding: '8px 12px', borderRadius: 12, transition: 'all .2s',
                        }}>
                            <Icon name={t.icon} size={22} color={active ? '#00C165' : '#8A9BB5'} />
                            <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 600 : 400 }}>{t.id}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
