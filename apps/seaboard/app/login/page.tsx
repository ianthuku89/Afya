'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InternalLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiUrl}/api/v1/internal/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Authentication failed');
            }

            const { data } = await res.json();
            localStorage.setItem('seaboard_internal_token', data.token);
            localStorage.setItem('seaboard_internal_staff', JSON.stringify(data.staff));

            // Route based on role
            switch (data.staff.role) {
                case 'DIRECTOR': router.push('/director'); break;
                case 'FINANCE': router.push('/finance'); break;
                case 'SUPER_ADMIN': router.push('/admin'); break;
                default: router.push('/dashboard'); break; // Fallback for HR/Tech/Office
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: '#050B14' }}>
            <style jsx>{`
                @media (min-width: 900px) {
                    .right-visual-panel { display: block !important; }
                }
            `}</style>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 2 }}>
                <div style={{ width: '100%', maxWidth: 400, background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 40, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ marginBottom: 32, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, background: 'linear-gradient(135deg, #1A365D, #2563EB)', borderRadius: 12, marginBottom: 16 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#fff', letterSpacing: '-0.02em' }}>Seaboard Internal</h1>
                        <p style={{ color: '#8A9BB5', fontSize: 14, margin: 0 }}>Enterprise Resource Portal</p>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)', color: '#E74C3C', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>CORPORATE EMAIL</label>
                            <input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="staff@seaboard.com"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#8A9BB5' }}>PASSWORD</label>
                            </div>
                            <input
                                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none', letterSpacing: 2, transition: 'border 0.2s' }}
                                onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <button
                            type="submit" disabled={loading}
                            style={{ width: '100%', padding: '14px', marginTop: 8, background: loading ? '#1e3a8a' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                        >
                            {loading ? 'Authenticating...' : 'Secure Login'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#5C6C85' }}>
                            Restricted to authorized Seaboard Technologies Ltd personnel. All activities are logged and monitored.
                        </div>
                    </form>
                </div>
            </div>
            
            {/* Right Side Visual (Abstract Corporate) */}
            <div className="right-visual-panel" style={{ flex: 1.2, display: 'none', position: 'relative', overflow: 'hidden', background: '#0A1224' }}>
                {/* Abstract grid and glowing nodes to represent enterprise data */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '100% 100%, 40px 40px, 40px 40px', backgroundPosition: 'center, center, center' }} />
                
                <div style={{ position: 'absolute', bottom: 40, right: 40, textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>ERP SYSTEM v2.4</div>
                    <div style={{ color: '#2563EB', fontSize: 14, marginTop: 4 }}>Secured by AfyaToken Network</div>
                </div>
            </div>
        </div>
    );
}