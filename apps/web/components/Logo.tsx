'use client';
import Icon from './Icon';

interface LogoProps { small?: boolean; }

export default function Logo({ small }: LogoProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
                width: small ? 32 : 40, height: small ? 32 : 40,
                background: 'linear-gradient(135deg, #006B3C, #008B4A)',
                borderRadius: small ? 10 : 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,107,60,.4)',
            }}>
                <Icon name="activity" size={small ? 16 : 20} color="#fff" />
            </div>
            <div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: small ? 13 : 15, color: '#fff', lineHeight: 1.1 }}>Seaboard</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: small ? 8 : 9, color: '#00C165', letterSpacing: 2, textTransform: 'uppercase' }}>Health Token</div>
            </div>
        </div>
    );
}
