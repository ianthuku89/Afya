'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '../../../components/Logo';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('PATIENT');
    const [name, setName] = useState('');
    const [nationalId, setNationalId] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiUrl}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    password, 
                    role, 
                    fullName: name, 
                    nationalId: nationalId ? nationalId : undefined,
                    phoneNumber: phone ? phone : undefined
                })
            });

            if (!res.ok) {
                const data = await res.json();
                const errorPayload = data.error;
                let errMsg = 'Registration failed';
                if (errorPayload && errorPayload.details && Array.isArray(errorPayload.details)) {
                    errMsg = errorPayload.details.map((d: any) => d.message).join(' | ');
                } else if (errorPayload && typeof errorPayload === 'object' && errorPayload.message) {
                    errMsg = errorPayload.message;
                } else if (typeof errorPayload === 'string') {
                    errMsg = errorPayload;
                }
                throw new Error(errMsg);
            }

            // Route to sign in after successful registration
            router.push('/auth/signin');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#0A0F1E' }}>
            {/* Left Side: Visual Panel */}
            <div style={{ flex: 1, display: 'none', '@media (minWidth: 900px)': { display: 'block' }, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'url(/afyatoken-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,107,60,0.8), rgba(10,15,30,0.9))' }} />
                
                <div style={{ position: 'relative', zIndex: 2, padding: '60px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Logo />
                    <div>
                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontWeight: 700, color: '#fff', marginBottom: 24, lineHeight: 1.2 }}>
                            Join the Network<br/>Empowering Kenya.
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, lineHeight: 1.6, maxWidth: 400 }}>
                            By registering, you are opting in to the mandatory AfyaToken SHIF auto-deduction program. Securing your health, one transaction at a time.
                        </p>
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                        © 2026 Seaboard Technologies Ltd. All rights reserved.
                    </div>
                </div>
            </div>

            {/* Right Side: Registration Form */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ width: '100%', maxWidth: 450 }}>
                    <div style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,193,101,0.1)', border: '1px solid rgba(0,193,101,0.2)', borderRadius: 20, color: '#00C165', fontSize: 11, fontWeight: 700 }}>
                                ENTERPRISE PORTAL
                            </div>
                        </div>
                        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>Create Account</h1>
                        <p style={{ color: '#8A9BB5', fontSize: 14, margin: 0 }}>Register to access the AfyaToken Admin Platform</p>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)', color: '#E74C3C', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>FULL NAME</label>
                                <input
                                    type="text" value={name} onChange={(e) => setName(e.target.value)} required
                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                                    onFocus={(e) => e.target.style.borderColor = '#00C165'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>ROLE</label>
                                <select
                                    value={role} onChange={(e) => setRole(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}
                                >
                                    <option value="PATIENT" style={{ background: '#0D1B3E' }}>Citizen (Patient)</option>
                                    <option value="FACILITY" style={{ background: '#0D1B3E' }}>Hospital (Facility)</option>
                                    <option value="SHA_ADMIN" style={{ background: '#0D1B3E' }}>SHA Admin</option>
                                    <option value="SUPER_ADMIN" style={{ background: '#0D1B3E' }}>System Admin</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>NATIONAL ID <span style={{ color: '#5C6C85', fontWeight: 400 }}>(Optional)</span></label>
                            <input
                                type="text" value={nationalId} onChange={(e) => setNationalId(e.target.value)}
                                placeholder="Enter ID number"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#00C165'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>EMAIL ADDRESS</label>
                            <input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@sha.go.ke"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#00C165'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>PHONE NUMBER <span style={{ color: '#5C6C85', fontWeight: 400 }}>(Optional)</span></label>
                            <input
                                type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254700000000"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#00C165'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>PASSWORD</label>
                            <input
                                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none', letterSpacing: 2, transition: 'border 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#00C165'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                            <div style={{ fontSize: 11, color: '#5C6C85', marginTop: 6 }}>Must contain 12+ chars, uppercase, number, & special character</div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            style={{ width: '100%', padding: '16px', marginTop: 16, background: loading ? 'rgba(0,107,60,0.5)' : 'linear-gradient(135deg,#006B3C,#008B4A)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: loading ? 'none' : '0 8px 24px rgba(0, 107, 60, 0.4)' }}
                        >
                            {loading ? 'Processing...' : 'Create Account'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#8A9BB5' }}>
                            Already have an account? <span style={{ color: '#00C165', cursor: 'pointer', fontWeight: 600, transition: 'color 0.2s' }} onClick={() => router.push('/auth/signin')} onMouseOver={(e) => e.currentTarget.style.color = '#008B4A'} onMouseOut={(e) => e.currentTarget.style.color = '#00C165'}>Sign In instead</span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
