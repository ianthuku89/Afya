'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const router = useRouter();
    const [staffList, setStaffList] = useState<any[]>([]);
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'FINANCE' });

    useEffect(() => {
        const token = localStorage.getItem('seaboard_internal_token');
        const st = localStorage.getItem('seaboard_internal_staff');
        
        if (!token || !st) {
            router.push('/login');
            return;
        }

        const parsed = JSON.parse(st);
        if (parsed.role !== 'SUPER_ADMIN') {
            router.push('/login'); // Unauthorized
            return;
        }

        setStaff(parsed);
        fetchStaff(token);
    }, [router]);

    const fetchStaff = async (token: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiUrl}/api/v1/internal/auth/staff`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setStaffList(data.data);
            }
        } catch (e) {
            console.error("Failed to load staff", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('seaboard_internal_token');
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiUrl}/api/v1/internal/auth/staff`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('Staff account created successfully.');
                setForm({ fullName: '', email: '', password: '', role: 'FINANCE' });
                fetchStaff(token!);
            } else {
                const d = await res.json();
                alert(`Error: ${d.error || 'Failed to create account'}`);
            }
        } catch (e) { console.error(e); }
    };

    if (loading) return <div style={{ color: '#fff', padding: 40 }}>Loading secure portal...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#050B14', color: '#fff', padding: 40, fontFamily: "'Inter', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Access Management</h1>
                    <p style={{ color: '#8A9BB5', margin: 0 }}>Seaboard Technologies • Super Admin Console</p>
                </div>
                <button onClick={() => { localStorage.clear(); router.push('/login'); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
            </div>

            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                {/* Create User Form */}
                <div style={{ flex: 1, minWidth: 350, background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 32 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Provision Staff Account</h2>
                    <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>FULL NAME</label>
                            <input
                                type="text" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} required
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>CORPORATE EMAIL</label>
                            <input
                                type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>ROLE</label>
                            <select
                                value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}
                            >
                                <option value="DIRECTOR" style={{ background: '#0A1224' }}>Director</option>
                                <option value="FINANCE" style={{ background: '#0A1224' }}>Finance</option>
                                <option value="HR" style={{ background: '#0A1224' }}>Human Resources</option>
                                <option value="TECH" style={{ background: '#0A1224' }}>Tech & Support</option>
                                <option value="OFFICE_ADMIN" style={{ background: '#0A1224' }}>Office Admin</option>
                                <option value="SUPER_ADMIN" style={{ background: '#0A1224' }}>Super Admin</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8A9BB5', marginBottom: 8 }}>INITIAL PASSWORD</label>
                            <input
                                type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required minLength={8}
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontFamily: "'DM Mono', monospace", fontSize: 14, outline: 'none', letterSpacing: 2 }}
                            />
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '14px', marginTop: 8, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                            Create Account
                        </button>
                    </form>
                </div>

                {/* Staff List */}
                <div style={{ flex: 2, minWidth: 450, background: '#0A1224', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Registered Staff ({staffList.length})</h2>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ padding: '16px 32px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>NAME / EMAIL</th>
                                <th style={{ padding: '16px 32px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>ROLE</th>
                                <th style={{ padding: '16px 32px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>LAST LOGIN</th>
                                <th style={{ padding: '16px 32px', fontSize: 12, color: '#8A9BB5', fontWeight: 600 }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.map((s) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '16px 32px' }}>
                                        <div style={{ fontWeight: 600 }}>{s.fullName}</div>
                                        <div style={{ fontSize: 12, color: '#8A9BB5' }}>{s.email}</div>
                                    </td>
                                    <td style={{ padding: '16px 32px', fontSize: 13 }}>
                                        <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>{s.role}</span>
                                    </td>
                                    <td style={{ padding: '16px 32px', fontSize: 13, color: '#8A9BB5' }}>
                                        {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : 'Never'}
                                    </td>
                                    <td style={{ padding: '16px 32px' }}>
                                        {s.isActive ? (
                                            <span style={{ color: '#00C165', fontSize: 12, fontWeight: 600 }}>Active</span>
                                        ) : (
                                            <span style={{ color: '#E74C3C', fontSize: 12, fontWeight: 600 }}>Suspended</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
