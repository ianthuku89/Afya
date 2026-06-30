'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Logo from './Logo';

export default function LandingPage() {
    const router = useRouter();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const images = [
        '/afyatoken-bg.png', // AI generated token/digital health background
        'https://images.unsplash.com/photo-1628348070830-df4f6f8742fc?q=80&w=1000&auto=format&fit=crop', // Healthcare/Hospital representation
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1000&auto=format&fit=crop' // Laboratory/Tech representation
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [images.length]);

    return (
        <div style={{ minHeight: '100vh', background: '#0A0F1E', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Navbar */}
            <div style={{ height: 80, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, position: 'relative' }}>
                <Logo />
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <button onClick={() => router.push('/auth/signin')} style={{ background: 'transparent', color: '#8A9BB5', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, padding: '8px 16px', transition: 'color 0.2s' }}>Sign In</button>
                    <button onClick={() => router.push('/auth/register')} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#006B3C,#008B4A)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, boxShadow: '0 4px 12px rgba(0, 107, 60, 0.3)' }}>Get Started</button>
                </div>
            </div>

            {/* Split Content */}
            <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 1 }}>
                
                {/* Left side: Text Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', zIndex: 2 }}>
                    <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(0,193,101,0.1)', border: '1px solid rgba(0,193,101,0.2)', borderRadius: 20, color: '#00C165', fontSize: 12, fontWeight: 700, marginBottom: 24, alignSelf: 'flex-start', letterSpacing: 1 }}>
                        NOW WITH MANDATORY SHIF AUTO-DEDUCT
                    </div>
                    
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 900, marginBottom: 24, lineHeight: 1.1 }}>
                        Tokenizing Universal <br />
                        <span style={{ color: '#00C165' }}>Health Coverage.</span>
                    </h1>
                    
                    <p style={{ color: '#8A9BB5', fontSize: 18, lineHeight: 1.6, marginBottom: 40, maxWidth: 500 }}>
                        AfyaToken is an enterprise-grade blockchain platform empowering Kenya's informal sector. We automate SHIF contributions by bundling them directly into daily M-PESA transactions—ensuring health coverage for everyone.
                    </p>
                    
                    <div style={{ display: 'flex', gap: 16 }}>
                        <button onClick={() => router.push('/auth/register')} style={{ padding: '16px 36px', background: 'linear-gradient(135deg,#006B3C,#008B4A)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16, boxShadow: '0 8px 24px rgba(0, 107, 60, 0.4)', transition: 'transform 0.2s' }}>
                            Join the Network
                        </button>
                        <button onClick={() => router.push('/auth/signin')} style={{ padding: '16px 36px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16, transition: 'background 0.2s' }}>
                            Admin Login
                        </button>
                    </div>

                    <div style={{ marginTop: 60, display: 'flex', gap: 40, alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>+12k</div>
                            <div style={{ fontSize: 12, color: '#8A9BB5', marginTop: 4 }}>Registered Workers</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#00C165', fontFamily: "'DM Mono', monospace" }}>100%</div>
                            <div style={{ fontSize: 12, color: '#8A9BB5', marginTop: 4 }}>SHIF Compliance</div>
                        </div>
                    </div>
                </div>

                {/* Right side: Image Carousel */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderTopLeftRadius: 40, borderBottomLeftRadius: 40, boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}>
                    {images.map((img, index) => (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0, width: '100%', height: '100%',
                                opacity: currentImageIndex === index ? 1 : 0,
                                transition: 'opacity 1.5s ease-in-out',
                                backgroundImage: `url(${img})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        >
                            {/* Overlay gradient for readability */}
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, #0A0F1E 0%, rgba(10, 15, 30, 0.2) 50%, transparent 100%)' }} />
                        </div>
                    ))}
                    
                    {/* Carousel Indicators */}
                    <div style={{ position: 'absolute', bottom: 40, right: 40, display: 'flex', gap: 12 }}>
                        {images.map((_, index) => (
                            <div 
                                key={index} 
                                onClick={() => setCurrentImageIndex(index)}
                                style={{ 
                                    width: currentImageIndex === index ? 32 : 8, 
                                    height: 8, 
                                    borderRadius: 4, 
                                    background: currentImageIndex === index ? '#00C165' : 'rgba(255,255,255,0.3)', 
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                }} 
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
