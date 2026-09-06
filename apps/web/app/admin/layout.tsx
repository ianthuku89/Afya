"use client";
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
    { label: 'Overview', icon: 'home', path: '/admin/overview' },
    { label: 'AfyaScore', icon: 'activity', path: '/admin/afyascore' },
    { label: 'Auto-Deduct', icon: 'zap', path: '/admin/loyalty' },
    { label: 'Blockchain', icon: 'link', path: '/admin/blockchain', requiresRole: ['SUPER_ADMIN'] },
    { label: 'AI Monitor', icon: 'cpu', path: '/admin/ai-monitor', requiresRole: ['SUPER_ADMIN'] },
    { label: 'Claims', icon: 'file', path: '/admin/claims' },
    { label: 'Facilities', icon: 'hospital', path: '/admin/facilities', requiresRole: ['SUPER_ADMIN', 'SHA_ADMIN'] },
    { label: 'DHA Compliance', icon: 'shield', path: '/admin/dha-compliance', requiresRole: ['SUPER_ADMIN'] },
    { label: 'Settings', icon: 'settings', path: '/admin/settings', requiresRole: ['SUPER_ADMIN'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [sideOpen, setSideOpen] = useState(true);

    const role = (session?.user as any)?.role || 'GUEST';

    // Filter Navigation based on role
    const allowedNav = NAV.filter(n => {
        if (!n.requiresRole) return true;
        return n.requiresRole.includes(role);
    });

    // Find current label for topbar
    const currentNav = NAV.find(n => pathname.startsWith(n.path));
    const title = currentNav ? currentNav.label : 'Dashboard';

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0A0F1E', overflow: 'hidden', color: '#fff' }}>
            {/* Sidebar */}
            <div style={{
                width: sideOpen ? 220 : 64, transition: 'width .3s ease',
                background: '#0D1B3E', borderRight: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
            }}>
                <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                    {sideOpen ? <Logo /> : (
                        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#006B3C,#008B4A)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="activity" size={18} color="#fff" />
                        </div>
                    )}
                </div>

                <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {allowedNav.map(({ label, icon, path }) => {
                        const active = pathname.startsWith(path);
                        return (
                            <Link href={path} key={label} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: sideOpen ? '10px 12px' : '10px',
                                    borderRadius: 10, cursor: 'pointer',
                                    background: active ? 'rgba(0,107,60,0.13)' : 'transparent',
                                    borderLeft: active ? '2px solid #00C165' : '2px solid transparent',
                                    color: active ? '#00C165' : '#8A9BB5',
                                    fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 600 : 400, fontSize: 13,
                                    transition: 'all .2s', whiteSpace: 'nowrap', width: '100%',
                                }}>
                                    <Icon name={icon} size={17} color={active ? '#00C165' : '#8A9BB5'} />
                                    {sideOpen && label}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {sideOpen && (
                    <div style={{ margin: '0 10px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 10, color: '#8A9BB5', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>DHA CERT STATUS</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C165', animation: 'pulse-dot 2s infinite' }} />
                            <span style={{ fontSize: 11, color: '#00C165' }}>Active · Valid to 2026</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top Bar */}
                <div style={{
                    height: 60, background: '#0D1B3E', borderBottom: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button onClick={() => setSideOpen(s => !s)} className="btn-ghost" style={{ padding: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                            <Icon name="menu" size={16} color="#8A9BB5" />
                        </button>
                        <div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>{title}</div>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#8A9BB5' }}>
                                AFYATOKEN ADMIN · {new Date().toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
                            <button className="btn-ghost" style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <Icon name="bell" size={16} color="#8A9BB5" />
                            </button>
                            <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: '#E74C3C', borderRadius: '50%' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#006B3C,#0D1B3E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="user" size={14} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{session?.user?.name || 'Admin'}</div>
                                <div style={{ fontSize: 10, color: '#8A9BB5', fontFamily: "'DM Mono', monospace" }}>{role}</div>
                            </div>
                            <button onClick={() => signOut()} style={{ marginLeft: 8, padding: '4px 8px', background: 'rgba(231,76,60,0.1)', color: '#E74C3C', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
