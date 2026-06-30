'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '../../../components/Logo';

export default function SignInPage() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await signIn('credentials', {
            redirect: false,
            phone,
            password
        });

        if (res?.error) {
            setError('Invalid phone number or password. Please try again.');
            setLoading(false);
        } else {
            // Middleware will handle proper redirect after login
            router.push('/admin/overview');
            router.refresh();
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 400, background: '#0D1B3E', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <Logo />
                </div>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>Welcome Back</h1>
                    <p style={{ color: '#8A9BB5', fontSize: 13, margin: 0 }}>Sign in to the AfyaToken Platform</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)', color: '#E74C3C', padding: '12px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>PHONE NUMBER</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+254700000000"
                            style={{
                                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff',
                                fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none'
                            }}
                            required
                        />
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#8A9BB5' }}>PASSWORD</label>
                            <span style={{ fontSize: 12, color: '#00C165', cursor: 'pointer' }}>Forgot?</span>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff',
                                fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none', letterSpacing: 2
                            }}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px', marginTop: 8,
                            background: loading ? 'rgba(0,107,60,0.5)' : 'linear-gradient(135deg,#006B3C,#008B4A)',
                            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#8A9BB5' }}>
                    New to the AfyaToken Platform? <span style={{ color: '#00C165', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push('/auth/register')}>Register</span>
                </div>
            </div>
        </div>
    );
}
