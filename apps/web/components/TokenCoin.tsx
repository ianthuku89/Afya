'use client';
interface Props { size?: number; animated?: boolean; }

export default function TokenCoin({ size = 80, animated = false }: Props) {
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `conic-gradient(from 0deg, #D4A017, #F0C040, #006B3C, #D4A017)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 ${size * 0.4}px rgba(212,160,23,.5), inset 0 0 ${size * 0.2}px rgba(0,0,0,.3)`,
            animation: animated ? 'token-spin 12s linear infinite' : 'none',
            position: 'relative', flexShrink: 0,
        }}>
            <div style={{
                width: size * 0.82, height: size * 0.82, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #E8C050, #D4A017)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: size * 0.2, color: '#0A0F1E', lineHeight: 1 }}>AfyaToken</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: size * 0.09, color: 'rgba(10,15,30,.7)', letterSpacing: 1 }}>KENYA</div>
            </div>
        </div>
    );
}
