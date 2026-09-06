
import { useState } from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  obsidian:   "#0A0F1E",
  navy:       "#0D1B3E",
  midnight:   "#122354",
  emerald:    "#006B3C",
  emeraldMid: "#008B4A",
  emeraldLt:  "#00C165",
  gold:       "#D4A017",
  goldLt:     "#F0C040",
  scarlet:    "#C0392B",
  scarletLt:  "#E74C3C",
  ash:        "#E8EDF5",
  slate:      "#8A9BB5",
  white:      "#FFFFFF",
  glass:      "rgba(255,255,255,0.06)",
  glassBorder:"rgba(255,255,255,0.12)",
};

const font = {
  display: "'Playfair Display', Georgia, serif",
  mono:    "'DM Mono', 'Courier New', monospace",
  body:    "'DM Sans', 'Helvetica Neue', sans-serif",
};

// ─── GLOBAL STYLES ──────────────────────────────────────────────────────────
const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.obsidian}; color: ${C.white}; font-family: ${font.body}; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.emerald}; border-radius: 2px; }

  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
  @keyframes slide-up  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes token-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes blink-bar { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes fade-in  { from{opacity:0} to{opacity:1} }
  @keyframes pop-in   { 0%{opacity:0;transform:scale(.92)} 100%{opacity:1;transform:scale(1)} }

  .slide-up { animation: slide-up .45s ease both; }
  .pop-in   { animation: pop-in  .3s  ease both; }

  .glass-card {
    background: ${C.glass};
    border: 1px solid ${C.glassBorder};
    border-radius: 16px;
    backdrop-filter: blur(12px);
  }

  .emerald-btn {
    background: linear-gradient(135deg, ${C.emerald}, ${C.emeraldMid});
    border: none; border-radius: 10px; color: #fff;
    font-family: ${font.body}; font-weight: 600; font-size: 13px;
    cursor: pointer; transition: all .2s;
    padding: 10px 18px; letter-spacing: .3px;
  }
  .emerald-btn:hover { filter: brightness(1.15); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,107,60,.4); }

  .ghost-btn {
    background: transparent; border: 1px solid ${C.glassBorder};
    border-radius: 10px; color: ${C.slate};
    font-family: ${font.body}; font-weight: 500; font-size: 13px;
    cursor: pointer; transition: all .2s; padding: 10px 18px;
  }
  .ghost-btn:hover { border-color: ${C.emeraldLt}; color: ${C.emeraldLt}; }

  .stat-badge {
    font-family: ${font.mono}; font-size: 11px; font-weight: 500;
    padding: 3px 8px; border-radius: 6px; letter-spacing: .5px;
  }
  .badge-green  { background: rgba(0,193,101,.15); color: ${C.emeraldLt}; }
  .badge-gold   { background: rgba(212,160,23,.15); color: ${C.goldLt};   }
  .badge-red    { background: rgba(192,57,43,.18);  color: ${C.scarletLt}; }
  .badge-slate  { background: rgba(138,155,181,.12); color: ${C.slate};   }
`;

// ─── ICONS (inline SVG) ──────────────────────────────────────────────────────
const Icon = ({ name, size=16, color="currentColor" }) => {
  const icons = {
    shield:   <><path d="M12 2L4 5v6c0 5.25 3.5 10.1 8 11.4C16.5 21.1 20 16.25 20 11V5l-8-3z" fill="none" stroke={color} strokeWidth="1.8"/></>,
    wallet:   <><rect x="2" y="7" width="20" height="14" rx="3" fill="none" stroke={color} strokeWidth="1.8"/><path d="M16 14a1 1 0 100-2 1 1 0 000 2z" fill={color}/><path d="M2 10h20" stroke={color} strokeWidth="1.8"/></>,
    chart:    <><path d="M3 20V10l5-5 4 4 5-8v19" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/></>,
    hospital: <><rect x="3" y="5" width="18" height="16" rx="1" fill="none" stroke={color} strokeWidth="1.8"/><path d="M12 9v6M9 12h6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></>,
    cpu:      <><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke={color} strokeWidth="1.8"/><rect x="9" y="9" width="6" height="6" fill="none" stroke={color} strokeWidth="1.5"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" stroke={color} strokeWidth="1.5"/></>,
    link:     <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></>,
    bell:     <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke={color} strokeWidth="1.8"/><path d="M13.73 21a2 2 0 01-3.46 0" fill="none" stroke={color} strokeWidth="1.8"/></>,
    user:     <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="none" stroke={color} strokeWidth="1.8"/><circle cx="12" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.8"/></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke={color} strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke={color} strokeWidth="1.8"/></>,
    check:    <><polyline points="20 6 9 17 4 12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    phone:    <><rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke={color} strokeWidth="1.8"/><line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></>,
    globe:    <><circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.8"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" fill="none" stroke={color} strokeWidth="1.8"/></>,
    settings: <><circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" fill="none" stroke={color} strokeWidth="1.8"/></>,
    zap:      <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/></>,
    eye:      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke={color} strokeWidth="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.8"/></>,
    send:     <><line x1="22" y1="2" x2="11" y2="13" stroke={color} strokeWidth="1.8"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/></>,
    home:     <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke={color} strokeWidth="1.8"/><polyline points="9 22 9 12 15 12 15 22" fill="none" stroke={color} strokeWidth="1.8"/></>,
    menu:     <><line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    arrow:    <><line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/><polyline points="12 5 19 12 12 19" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/></>,
    qr:       <><rect x="3" y="3" width="7" height="7" fill="none" stroke={color} strokeWidth="1.8" rx="1"/><rect x="14" y="3" width="7" height="7" fill="none" stroke={color} strokeWidth="1.8" rx="1"/><rect x="3" y="14" width="7" height="7" fill="none" stroke={color} strokeWidth="1.8" rx="1"/><rect x="5" y="5" width="3" height="3" fill={color}/><rect x="16" y="5" width="3" height="3" fill={color}/><rect x="5" y="16" width="3" height="3" fill={color}/><path d="M14 14h2v2h-2zM18 14h3v1M14 18h1v3M18 18h3M20 20v3" stroke={color} strokeWidth="1.5"/></>,
    file:     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke={color} strokeWidth="1.8"/><polyline points="14 2 14 8 20 8" fill="none" stroke={color} strokeWidth="1.8"/></>,
    activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></>,
    alert:    <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke={color} strokeWidth="1.8"/><line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{flexShrink:0}}>
      {icons[name] || null}
    </svg>
  );
};

// ─── SHARED HEADER ───────────────────────────────────────────────────────────
const Logo = ({ small }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <div style={{
      width: small?32:40, height: small?32:40,
      background: `linear-gradient(135deg, ${C.emerald}, ${C.emeraldMid})`,
      borderRadius: small?10:12,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:`0 4px 16px rgba(0,107,60,.4)`,
    }}>
      <Icon name="activity" size={small?16:20} color="#fff"/>
    </div>
    <div>
      <div style={{ fontFamily:font.display, fontWeight:700, fontSize:small?13:15, color:C.white, lineHeight:1.1 }}>Seaboard</div>
      <div style={{ fontFamily:font.mono, fontSize:small?8:9, color:C.emeraldLt, letterSpacing:2, textTransform:"uppercase" }}>Health Token</div>
    </div>
  </div>
);

// ─── AfyaToken TOKEN VISUAL ────────────────────────────────────────────────────────
const TokenCoin = ({ size=80, animated=false }) => (
  <div style={{
    width:size, height:size, borderRadius:"50%",
    background:`conic-gradient(from 0deg, ${C.gold}, ${C.goldLt}, ${C.emerald}, ${C.gold})`,
    display:"flex", alignItems:"center", justifyContent:"center",
    boxShadow:`0 0 ${size*.4}px rgba(212,160,23,.5), inset 0 0 ${size*.2}px rgba(0,0,0,.3)`,
    animation: animated ? "token-spin 12s linear infinite" : "none",
    position:"relative",
  }}>
    <div style={{
      width:size*.82, height:size*.82, borderRadius:"50%",
      background:`radial-gradient(circle at 35% 35%, #E8C050, ${C.gold})`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{ fontFamily:font.display, fontWeight:900, fontSize:size*.2, color:C.obsidian, lineHeight:1 }}>AfyaToken</div>
      <div style={{ fontFamily:font.mono, fontSize:size*.09, color:"rgba(10,15,30,.7)", letterSpacing:1 }}>KENYA</div>
    </div>
  </div>
);

// ─── MINI CHART ──────────────────────────────────────────────────────────────
const MiniChart = ({ data, color=C.emeraldLt, height=50 }) => {
  const max = Math.max(...data);
  const points = data.map((v,i) => `${(i/(data.length-1))*100},${height - (v/max)*height*.85}`).join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} style={{width:"100%",height}} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} 100,${height}`} fill={`url(#g${color.replace("#","")})`}/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// ─── BLOCKCHAIN TX ROW ───────────────────────────────────────────────────────
const TxRow = ({ hash, from, to, amount, status, time }) => (
  <div style={{
    display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr 80px 70px",
    gap:8, padding:"10px 14px", borderBottom:`1px solid ${C.glassBorder}`,
    alignItems:"center", fontSize:12,
  }}>
    <span style={{ fontFamily:font.mono, color:C.emeraldLt, fontSize:10 }}>{hash}</span>
    <span style={{ color:C.slate, fontSize:11 }}>{from} → {to}</span>
    <span style={{ fontFamily:font.mono, color:C.goldLt }}>{amount} AfyaToken</span>
    <span className={`stat-badge ${status==="Confirmed"?"badge-green":status==="Pending"?"badge-gold":"badge-red"}`}>{status}</span>
    <span style={{ color:C.slate, fontSize:10 }}>{time}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN WEB DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const ADMIN_TABS = ["Overview","Blockchain","AI Monitor","Claims","Facilities","DHA Compliance","Settings"];

const AdminDashboard = () => {
  const [tab, setTab] = useState("Overview");
  const [sideOpen, setSideOpen] = useState(true);

  return (
    <div style={{ display:"flex", height:"100%", background:C.obsidian, overflow:"hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: sideOpen ? 220 : 64, transition:"width .3s ease",
        background: C.navy, borderRight:`1px solid ${C.glassBorder}`,
        display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden",
      }}>
        <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid ${C.glassBorder}` }}>
          {sideOpen ? <Logo/> : (
            <div style={{
              width:36,height:36, background:`linear-gradient(135deg,${C.emerald},${C.emeraldMid})`,
              borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center"
            }}>
              <Icon name="activity" size={18} color="#fff"/>
            </div>
          )}
        </div>

        <nav style={{ flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:4 }}>
          {[
            ["Overview",    "home"],
            ["Blockchain",  "link"],
            ["AI Monitor",  "cpu"],
            ["Claims",      "file"],
            ["Facilities",  "hospital"],
            ["DHA Compliance","shield"],
            ["Settings",    "settings"],
          ].map(([label,icon]) => {
            const active = tab===label;
            return (
              <button key={label} onClick={()=>setTab(label)} style={{
                display:"flex", alignItems:"center", gap:10,
                padding: sideOpen?"10px 12px":"10px",
                borderRadius:10, border:"none", cursor:"pointer",
                background: active ? `linear-gradient(135deg,${C.emerald}22,${C.emeraldMid}22)` : "transparent",
                borderLeft: active ? `2px solid ${C.emeraldLt}` : "2px solid transparent",
                color: active ? C.emeraldLt : C.slate,
                fontFamily:font.body, fontWeight: active?600:400, fontSize:13,
                transition:"all .2s", whiteSpace:"nowrap",
              }}>
                <Icon name={icon} size={17} color={active?C.emeraldLt:C.slate}/>
                {sideOpen && label}
              </button>
            );
          })}
        </nav>

        {sideOpen && (
          <div style={{ margin:"0 10px 16px", background:C.glass, border:`1px solid ${C.glassBorder}`, borderRadius:12, padding:12 }}>
            <div style={{ fontSize:10, color:C.slate, fontFamily:font.mono, marginBottom:6 }}>DHA CERT STATUS</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:C.emeraldLt,animation:"pulse-dot 2s infinite" }}/>
              <span style={{ fontSize:11, color:C.emeraldLt }}>Active · Valid to 2026</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Top Bar */}
        <div style={{
          height:60, background:C.navy, borderBottom:`1px solid ${C.glassBorder}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 24px", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <button onClick={()=>setSideOpen(!sideOpen)} className="ghost-btn" style={{padding:8}}>
              <Icon name="menu" size={16} color={C.slate}/>
            </button>
            <div>
              <div style={{ fontFamily:font.display, fontSize:16, fontWeight:700 }}>{tab}</div>
              <div style={{ fontFamily:font.mono, fontSize:10, color:C.slate }}>SEABOARD ADMIN · {new Date().toLocaleDateString("en-KE",{dateStyle:"medium"})}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative" }}>
              <button className="ghost-btn" style={{padding:8}}>
                <Icon name="bell" size={16} color={C.slate}/>
              </button>
              <div style={{ position:"absolute", top:6, right:6, width:7,height:7,background:C.scarletLt,borderRadius:"50%" }}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:C.glass, border:`1px solid ${C.glassBorder}`, borderRadius:10 }}>
              <div style={{ width:28,height:28, borderRadius:"50%", background:`linear-gradient(135deg,${C.emerald},${C.navy})`, display:"flex",alignItems:"center",justifyContent:"center" }}>
                <Icon name="user" size={14} color="#fff"/>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600 }}>Admin · SHA</div>
                <div style={{ fontSize:10, color:C.slate, fontFamily:font.mono }}>superadmin</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          {tab==="Overview"     && <AdminOverview/>}
          {tab==="Blockchain"   && <AdminBlockchain/>}
          {tab==="AI Monitor"   && <AdminAI/>}
          {tab==="Claims"       && <AdminClaims/>}
          {tab==="Facilities"   && <AdminFacilities/>}
          {tab==="DHA Compliance" && <AdminDHA/>}
          {tab==="Settings"     && <AdminSettings/>}
        </div>
      </div>
    </div>
  );
};

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, badge, badgeType="green", icon, color=C.emerald, chart }) => (
  <div className="glass-card" style={{ padding:20, display:"flex", flexDirection:"column", gap:12 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <div style={{ fontSize:11, color:C.slate, textTransform:"uppercase", letterSpacing:1.2, fontFamily:font.mono }}>{label}</div>
        <div style={{ fontFamily:font.display, fontSize:26, fontWeight:700, marginTop:4, color:C.white }}>{value}</div>
        <div style={{ fontSize:12, color:C.slate, marginTop:2 }}>{sub}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
        <div style={{ width:40,height:40, borderRadius:12, background:`${color}22`, display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon name={icon} size={20} color={color}/>
        </div>
        {badge && <span className={`stat-badge badge-${badgeType}`}>▲ {badge}</span>}
      </div>
    </div>
    {chart && <MiniChart data={chart} color={color==="auto"?C.emeraldLt:color}/>}
  </div>
);

const AdminOverview = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:20 }} className="slide-up">
    {/* KPI Grid */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
      <StatCard label="AfyaToken in Circulation" value="2.4M" sub="≈ KES 2.4B value-locked" badge="12.4%" icon="link" color={C.gold} chart={[40,55,48,70,65,80,92,88,100]}/>
      <StatCard label="Active Wallets" value="847K" sub="Verified citizens" badge="8.1%" icon="wallet" color={C.emeraldLt} chart={[30,35,42,51,48,60,68,75,82]}/>
      <StatCard label="Smart Contract Exec." value="14,302" sub="This month" badge="5.3%" icon="zap" color={C.goldLt} chart={[20,30,28,40,45,52,48,60,65]}/>
      <StatCard label="Fraud Prevented" value="KES 48M" sub="AI-detected anomalies" badge="Saved" badgeType="gold" icon="shield" color={C.scarletLt} chart={[5,12,8,15,20,14,25,30,22]}/>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16 }}>
      {/* Token Flow Chart */}
      <div className="glass-card" style={{ padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16 }}>AfyaToken Transaction Volume</div>
            <div style={{ fontSize:11, color:C.slate, fontFamily:font.mono }}>LAST 12 MONTHS · REAL-TIME</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {["1W","1M","3M","1Y"].map(t=>(
              <button key={t} className={t==="1M"?"emerald-btn":"ghost-btn"} style={{padding:"5px 10px",fontSize:11}}>{t}</button>
            ))}
          </div>
        </div>
        <MiniChart data={[120,145,138,160,155,180,210,195,220,240,235,260]} color={C.emeraldLt} height={120}/>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:10, color:C.slate, fontFamily:font.mono }}>
          {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map(m=><span key={m}>{m}</span>)}
        </div>
      </div>

      {/* Token Distribution */}
      <div className="glass-card" style={{ padding:20, display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16 }}>Token Allocation</div>
        <div style={{ display:"flex", justifyContent:"center", margin:"8px 0" }}>
          <TokenCoin size={90}/>
        </div>
        {[
          ["Treasury Reserve",  "45%", C.gold],
          ["Active Wallets",    "32%", C.emeraldLt],
          ["Claims Locked",     "15%", C.goldLt],
          ["Emergency Fund",    "8%",  C.scarletLt],
        ].map(([label, pct, color]) => (
          <div key={label}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
              <span style={{ color:C.slate }}>{label}</span>
              <span style={{ fontFamily:font.mono, color }}>{pct}</span>
            </div>
            <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:2 }}>
              <div style={{ height:"100%", width:pct, background:color, borderRadius:2, transition:"width 1s ease" }}/>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recent Activity */}
    <div className="glass-card" style={{ padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16 }}>Live Blockchain Activity</div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:7,height:7,borderRadius:"50%",background:C.emeraldLt,animation:"pulse-dot 1.5s infinite" }}/>
          <span style={{ fontSize:11, color:C.emeraldLt, fontFamily:font.mono }}>LIVE</span>
        </div>
      </div>
      <div style={{ fontSize:11, color:C.slate, display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr 80px 70px", padding:"6px 14px", borderBottom:`1px solid ${C.glassBorder}`, fontFamily:font.mono, letterSpacing:.5 }}>
        <span>TX HASH</span><span>ROUTE</span><span>AMOUNT</span><span>STATUS</span><span>TIME</span>
      </div>
      <TxRow hash="0x3f4a...8c2e" from="Treasury" to="SHA Wallet #4471" amount="500" status="Confirmed" time="0:42s ago"/>
      <TxRow hash="0x7b1d...2f9a" from="Patient #8821" to="Kenyatta NH" amount="120" status="Confirmed" time="1:14s ago"/>
      <TxRow hash="0x9c2e...4d3b" from="Treasury" to="Pharmacy #224" amount="75" status="Pending" time="2:03s ago"/>
      <TxRow hash="0x1a5f...7e8c" from="Boda Contrib." to="Wallet #5523" amount="5" status="Confirmed" time="3:28s ago"/>
      <TxRow hash="0x2d8b...1f6a" from="AI Review" to="HOLD" amount="340" status="Flagged" time="4:51s ago"/>
    </div>
  </div>
);

// ─── BLOCKCHAIN ───────────────────────────────────────────────────────────────
const AdminBlockchain = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:20 }} className="slide-up">
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
      {[
        { label:"Block Height", value:"#1,284,471", color:C.emeraldLt },
        { label:"Avg. Confirm Time", value:"2.3s", color:C.goldLt },
        { label:"Smart Contracts Active", value:"1,204", color:C.slate },
      ].map(s=>(
        <div key={s.label} className="glass-card" style={{ padding:18, textAlign:"center" }}>
          <div style={{ fontFamily:font.mono, fontSize:10, color:C.slate, marginBottom:8, letterSpacing:1 }}>{s.label}</div>
          <div style={{ fontFamily:font.display, fontSize:28, fontWeight:700, color:s.color }}>{s.value}</div>
        </div>
      ))}
    </div>

    <div className="glass-card" style={{ padding:20 }}>
      <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16, marginBottom:16 }}>Smart Contract Logic — Healthcare Payment Trigger</div>
      <div style={{ background:"rgba(0,0,0,.4)", borderRadius:12, padding:20, fontFamily:font.mono, fontSize:12, lineHeight:1.8, color:"#A9DC76", overflowX:"auto" }}>
        <div style={{ color:C.slate }}>// AfyaToken Payment Smart Contract v2.1</div>
        <div style={{ color:"#78DCE8" }}>pragma solidity ^0.8.20;</div>
        <br/>
        <div><span style={{color:"#FF6188"}}>contract </span><span style={{color:"#FFD866"}}>AfyaTokenHealthPayment</span> {"{"}</div>
        <div style={{paddingLeft:24}}>
          <div><span style={{color:"#FF6188"}}>mapping</span>(address =&gt; uint256) <span style={{color:"#78DCE8"}}>public</span> walletBalance;</div>
          <div><span style={{color:"#FF6188"}}>mapping</span>(bytes32 =&gt; bool) <span style={{color:"#78DCE8"}}>public</span> claimVerified;</div>
          <br/>
          <div><span style={{color:"#78DCE8"}}>function</span> <span style={{color:"#A9DC76"}}>executePayment</span>(</div>
          <div style={{paddingLeft:24}}>address patient, address facility,</div>
          <div style={{paddingLeft:24}}>uint256 amount, bytes32 claimId</div>
          <div>) <span style={{color:"#78DCE8"}}>external</span> {"{"}</div>
          <div style={{paddingLeft:24}}><span style={{color:"#FF6188"}}>require</span>(claimVerified[claimId], <span style={{color:"#FFD866"}}>"Claim not verified"</span>);</div>
          <div style={{paddingLeft:24}}><span style={{color:"#FF6188"}}>require</span>(walletBalance[patient] &gt;= amount, <span style={{color:"#FFD866"}}>"Insufficient AfyaToken"</span>);</div>
          <div style={{paddingLeft:24}}><span style={{color:"#FF6188"}}>require</span>(isSHAAccredited(facility), <span style={{color:"#FFD866"}}>"Facility not accredited"</span>);</div>
          <div style={{paddingLeft:24, color:C.slate}}>// Auto-transfer: zero manual intervention</div>
          <div style={{paddingLeft:24}}>walletBalance[patient] -= amount;</div>
          <div style={{paddingLeft:24}}>walletBalance[facility] += amount;</div>
          <div style={{paddingLeft:24}}><span style={{color:"#78DCE8"}}>emit</span> PaymentExecuted(patient, facility, amount, claimId);</div>
          <div>{"}"}</div>
        </div>
        <div>{"}"}</div>
      </div>
    </div>

    <div className="glass-card" style={{ padding:20 }}>
      <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16, marginBottom:4 }}>Token Issuance Register</div>
      <div style={{ fontSize:11, color:C.slate, marginBottom:16 }}>CBK-regulated issuance backed 1:1 by Treasury allocations</div>
      {[
        { batch:"AfyaToken-2025-Q1", amount:"500,000 AfyaToken", backed:"KES 500M", auth:"CBK #TRE-441", status:"Active" },
        { batch:"AfyaToken-2025-Q2", amount:"350,000 AfyaToken", backed:"KES 350M", auth:"CBK #TRE-442", status:"Active" },
        { batch:"AfyaToken-2025-Q3", amount:"420,000 AfyaToken", backed:"KES 420M", auth:"CBK #TRE-443", status:"Pending" },
      ].map(row=>(
        <div key={row.batch} style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1.5fr 80px", gap:8, padding:"12px 14px", borderBottom:`1px solid ${C.glassBorder}`, fontSize:12, alignItems:"center" }}>
          <span style={{ fontFamily:font.mono, color:C.goldLt }}>{row.batch}</span>
          <span style={{ fontFamily:font.mono }}>{row.amount}</span>
          <span style={{ color:C.slate }}>{row.backed}</span>
          <span style={{ fontFamily:font.mono, color:C.slate, fontSize:10 }}>{row.auth}</span>
          <span className={`stat-badge ${row.status==="Active"?"badge-green":"badge-gold"}`}>{row.status}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── AI MONITOR ───────────────────────────────────────────────────────────────
const AdminAI = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:20 }} className="slide-up">
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
      {[
        { label:"AI Fraud Score (Avg)", value:"98.7%", sub:"Accuracy on test set", color:C.emeraldLt, icon:"cpu" },
        { label:"Anomalies Today", value:"47", sub:"23 auto-blocked, 24 in review", color:C.goldLt, icon:"alert" },
        { label:"Claims Auto-Approved", value:"89.2%", sub:"No human needed", color:C.gold, icon:"check" },
      ].map(s=>(
        <div key={s.label} className="glass-card" style={{ padding:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontFamily:font.mono, fontSize:10, color:C.slate, letterSpacing:1 }}>{s.label}</div>
            <Icon name={s.icon} size={18} color={s.color}/>
          </div>
          <div style={{ fontFamily:font.display, fontSize:28, fontWeight:700, color:s.color }}>{s.value}</div>
          <div style={{ fontSize:11, color:C.slate, marginTop:4 }}>{s.sub}</div>
        </div>
      ))}
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:16 }}>
      <div className="glass-card" style={{ padding:20 }}>
        <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16, marginBottom:4 }}>AI Anomaly Detection Feed</div>
        <div style={{ fontSize:11, color:C.slate, marginBottom:16 }}>Real-time ML analysis of claim patterns, billing codes & facility behavior</div>
        {[
          { type:"Duplicate Claim", facility:"Nakuru Medical", amount:"KES 45,000", risk:"HIGH", action:"Auto-Blocked" },
          { type:"Inflated Billing", facility:"Pharmacy #884", amount:"KES 12,800", risk:"MED", action:"Under Review" },
          { type:"Ghost Patient", facility:"Mombasa Clinic A", amount:"KES 90,000", risk:"HIGH", action:"Auto-Blocked" },
          { type:"Off-hours Claim", facility:"Rural Disp. #12", amount:"KES 3,200", risk:"LOW", action:"Approved" },
          { type:"Unusual Code", facility:"Kisumu Health", amount:"KES 7,400", risk:"MED", action:"Under Review" },
        ].map((row,i)=>(
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1.2fr 1.3fr .8fr 70px 100px", gap:8, padding:"10px 0", borderBottom:`1px solid ${C.glassBorder}`, fontSize:11, alignItems:"center" }}>
            <span style={{ color:C.white }}>{row.type}</span>
            <span style={{ color:C.slate }}>{row.facility}</span>
            <span style={{ fontFamily:font.mono, color:C.goldLt }}>{row.amount}</span>
            <span className={`stat-badge ${row.risk==="HIGH"?"badge-red":row.risk==="MED"?"badge-gold":"badge-slate"}`}>{row.risk}</span>
            <span className={`stat-badge ${row.action==="Auto-Blocked"?"badge-red":row.action==="Approved"?"badge-green":"badge-gold"}`}>{row.action}</span>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding:20 }}>
        <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16, marginBottom:16 }}>AI Model Health</div>
        {[
          { label:"Claims Classification", pct:98, color:C.emeraldLt },
          { label:"Fraud Pattern Detection", pct:96, color:C.goldLt },
          { label:"Ghost Patient Detection", pct:94, color:C.gold },
          { label:"Billing Anomaly Score", pct:91, color:C.scarletLt },
          { label:"Drug Supply Chain Verify", pct:89, color:C.slate },
        ].map(m=>(
          <div key={m.label} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
              <span style={{ color:C.slate }}>{m.label}</span>
              <span style={{ fontFamily:font.mono, color:m.color }}>{m.pct}%</span>
            </div>
            <div style={{ height:6, background:"rgba(255,255,255,.06)", borderRadius:3 }}>
              <div style={{ height:"100%", width:`${m.pct}%`, background:m.color, borderRadius:3 }}/>
            </div>
          </div>
        ))}
        <div style={{ marginTop:16, padding:12, background:"rgba(0,107,60,.1)", border:`1px solid ${C.emerald}33`, borderRadius:10 }}>
          <div style={{ fontSize:11, color:C.emeraldLt, fontFamily:font.mono, marginBottom:4 }}>▶ NEXT TRAINING</div>
          <div style={{ fontSize:12, color:C.slate }}>Federated learning update with 12 county nodes scheduled in 3 days</div>
        </div>
      </div>
    </div>
  </div>
);

// ─── CLAIMS ───────────────────────────────────────────────────────────────────
const AdminClaims = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:20 }} className="slide-up">
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontFamily:font.display, fontWeight:700, fontSize:20 }}>Claims Processing</div>
        <div style={{ fontSize:12, color:C.slate }}>Smart contract-verified, AI-screened health claims</div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button className="ghost-btn">Export CSV</button>
        <button className="emerald-btn">New Batch Review</button>
      </div>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
      {[
        { label:"Pending", value:"234", color:C.goldLt },
        { label:"Approved", value:"1,847", color:C.emeraldLt },
        { label:"Flagged", value:"47", color:C.scarletLt },
        { label:"Paid (AfyaToken)", value:"KES 24.8M", color:C.gold },
      ].map(s=>(
        <div key={s.label} className="glass-card" style={{ padding:16, textAlign:"center" }}>
          <div style={{ fontFamily:font.mono, fontSize:10, color:C.slate, letterSpacing:1 }}>{s.label}</div>
          <div style={{ fontFamily:font.display, fontSize:24, fontWeight:700, color:s.color, marginTop:4 }}>{s.value}</div>
        </div>
      ))}
    </div>

    <div className="glass-card" style={{ padding:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.2fr 1fr 1fr .8fr 80px 80px", gap:8, padding:"8px 14px", borderBottom:`1px solid ${C.glassBorder}`, fontSize:10, color:C.slate, fontFamily:font.mono, letterSpacing:.8 }}>
        <span>CLAIM ID</span><span>PATIENT</span><span>FACILITY</span><span>SERVICE</span><span>AMOUNT</span><span>AI SCORE</span><span>STATUS</span>
      </div>
      {[
        { id:"CLM-44821", patient:"ID ***2214", facility:"Kenyatta NH", svc:"Outpatient", amt:"KES 4,500", ai:"99%", status:"Approved" },
        { id:"CLM-44822", patient:"ID ***8841", facility:"Aga Khan", svc:"Surgery", amt:"KES 120K", ai:"97%", status:"Approved" },
        { id:"CLM-44823", patient:"ID ***3391", facility:"Nakuru Cty", svc:"Lab Tests", amt:"KES 2,800", ai:"34%", status:"Flagged" },
        { id:"CLM-44824", patient:"ID ***7712", facility:"Kisumu NH", svc:"Maternal", amt:"KES 8,200", ai:"98%", status:"Approved" },
        { id:"CLM-44825", patient:"ID ***5501", facility:"Mombasa GH", svc:"Pharmacy", amt:"KES 1,400", ai:"77%", status:"Pending" },
        { id:"CLM-44826", patient:"ID ***9981", facility:"Eldoret Ref", svc:"Emergency", amt:"KES 35K", ai:"95%", status:"Approved" },
      ].map((row)=>(
        <div key={row.id} style={{ display:"grid", gridTemplateColumns:"1fr 1.2fr 1fr 1fr .8fr 80px 80px", gap:8, padding:"11px 14px", borderBottom:`1px solid ${C.glassBorder}`, fontSize:12, alignItems:"center" }}>
          <span style={{ fontFamily:font.mono, color:C.goldLt, fontSize:11 }}>{row.id}</span>
          <span style={{ color:C.slate }}>{row.patient}</span>
          <span>{row.facility}</span>
          <span style={{ color:C.slate }}>{row.svc}</span>
          <span style={{ fontFamily:font.mono }}>{row.amt}</span>
          <span style={{ fontFamily:font.mono, color:parseInt(row.ai)>80?C.emeraldLt:parseInt(row.ai)>50?C.goldLt:C.scarletLt }}>{row.ai}</span>
          <span className={`stat-badge ${row.status==="Approved"?"badge-green":row.status==="Pending"?"badge-gold":"badge-red"}`}>{row.status}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── FACILITIES ───────────────────────────────────────────────────────────────
const AdminFacilities = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:20 }} className="slide-up">
    <div style={{ fontFamily:font.display, fontWeight:700, fontSize:20 }}>SHA-Accredited Facilities</div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      {[
        { name:"Kenyatta National Hospital", level:"Level 6", county:"Nairobi", patients:"12,441", afyaToken:"Active", fhir:"✓" },
        { name:"Moi Teaching & Referral", level:"Level 6", county:"Uasin Gishu", patients:"8,204", afyaToken:"Active", fhir:"✓" },
        { name:"Coast General Hospital", level:"Level 5", county:"Mombasa", patients:"5,812", afyaToken:"Active", fhir:"✓" },
        { name:"Nakuru Level 5 Hospital", level:"Level 5", county:"Nakuru", patients:"4,150", afyaToken:"Active", fhir:"Pending" },
        { name:"Kisumu County Hospital", level:"Level 4", county:"Kisumu", patients:"3,280", afyaToken:"Active", fhir:"✓" },
        { name:"Machakos Level 5 Hospital", level:"Level 5", county:"Machakos", patients:"2,940", afyaToken:"Active", fhir:"Pending" },
      ].map(f=>(
        <div key={f.name} className="glass-card" style={{ padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <span className="stat-badge badge-green" style={{ fontSize:10 }}>{f.level}</span>
            <span className={`stat-badge ${f.fhir==="✓"?"badge-green":"badge-gold"}`} style={{fontSize:10}}>FHIR {f.fhir}</span>
          </div>
          <div style={{ fontWeight:600, marginBottom:4 }}>{f.name}</div>
          <div style={{ fontSize:11, color:C.slate, marginBottom:10 }}>{f.county} County</div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
            <span style={{ color:C.slate }}>Patients/mo</span>
            <span style={{ fontFamily:font.mono, color:C.emeraldLt }}>{f.patients}</span>
          </div>
          <div style={{ height:1, background:C.glassBorder, margin:"8px 0" }}/>
          <div style={{ display:"flex", gap:8, fontSize:11 }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:C.emeraldLt,marginTop:2 }}/>
            <span style={{ color:C.emeraldLt }}>AfyaToken Wallet Active</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── DHA COMPLIANCE ────────────────────────────────────────────────────────────
const AdminDHA = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:20 }} className="slide-up">
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontFamily:font.display, fontWeight:700, fontSize:20 }}>DHA Certification Dashboard</div>
        <div style={{ fontSize:12, color:C.slate }}>Digital Health Act No. 15 of 2023 · Regulation Compliance Tracker</div>
      </div>
      <div style={{ padding:"10px 20px", background:`linear-gradient(135deg,${C.emerald}22,${C.emeraldMid}22)`, border:`1px solid ${C.emerald}44`, borderRadius:12 }}>
        <div style={{ fontSize:10, color:C.slate, fontFamily:font.mono }}>CERT VALIDITY</div>
        <div style={{ fontFamily:font.display, fontSize:14, fontWeight:700, color:C.emeraldLt }}>Active · Expires Mar 2026</div>
      </div>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      {/* Certification Requirements */}
      <div className="glass-card" style={{ padding:20 }}>
        <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16, marginBottom:16 }}>Required Documentation</div>
        {[
          { doc:"Tax Compliance Certificate (KRA)", status:"Filed", date:"Jan 2025" },
          { doc:"ODPC Registration Certificate", status:"Filed", date:"Dec 2024" },
          { doc:"Data Protection Impact Assessment", status:"Filed", date:"Feb 2025" },
          { doc:"System Manual & Requirements Spec", status:"Filed", date:"Jan 2025" },
          { doc:"Self-attestation Report", status:"Filed", date:"Jan 2025" },
          { doc:"Security, Privacy & Confidentiality Policy", status:"Filed", date:"Jan 2025" },
          { doc:"System Backup & Recovery Policy", status:"Filed", date:"Jan 2025" },
          { doc:"Cybersecurity Assessment Report", status:"Due Apr 25", date:"Annual" },
          { doc:"Proof of Certification Fee Payment", status:"Filed", date:"Jan 2025" },
        ].map(d=>(
          <div key={d.doc} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.glassBorder}`, fontSize:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Icon name={d.status==="Filed"?"check":"alert"} size={14} color={d.status==="Filed"?C.emeraldLt:C.goldLt}/>
              <span style={{ color:d.status==="Filed"?C.white:C.goldLt }}>{d.doc}</span>
            </div>
            <span className={`stat-badge ${d.status==="Filed"?"badge-green":"badge-gold"}`}>{d.status}</span>
          </div>
        ))}
      </div>

      {/* Compliance Pillars */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {[
          { title:"Functionality & Data Quality", desc:"FHIR R4 compliant APIs, minimum dataset submission to DHA, comprehensive service costing for insurance", score:97, color:C.emeraldLt },
          { title:"Interoperability Framework", desc:"Connected to DHA Enterprise Service Bus, Client Registry, Facility Registry & Health Worker Registry", score:94, color:C.goldLt },
          { title:"Information Security & Privacy", desc:"End-to-end encryption, Kenya Data Protection Act compliant, ODPC registered, role-based access", score:98, color:C.emeraldLt },
          { title:"Reporting & Alerts", desc:"Automated reporting to SHA, CBK, and DHA dashboards. Real-time alert triggers for anomalies", score:92, color:C.gold },
        ].map(p=>(
          <div key={p.title} className="glass-card" style={{ padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div style={{ fontWeight:600, fontSize:13, flex:1, paddingRight:12 }}>{p.title}</div>
              <div style={{ fontFamily:font.mono, fontSize:20, fontWeight:700, color:p.color, flexShrink:0 }}>{p.score}%</div>
            </div>
            <div style={{ fontSize:11, color:C.slate, marginBottom:10 }}>{p.desc}</div>
            <div style={{ height:4, background:"rgba(255,255,255,.06)", borderRadius:2 }}>
              <div style={{ height:"100%", width:`${p.score}%`, background:p.color, borderRadius:2 }}/>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Integration Map */}
    <div className="glass-card" style={{ padding:20 }}>
      <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16, marginBottom:16 }}>DHA System Integration Map</div>
      <div style={{ display:"flex", justifyContent:"space-around", alignItems:"center", flexWrap:"wrap", gap:20 }}>
        {[
          { label:"DHA Enterprise\nService Bus", connected:true },
          { label:"SHA Insurance\nPortal", connected:true },
          { label:"Client\nRegistry", connected:true },
          { label:"Facility\nRegistry", connected:true },
          { label:"Health Worker\nRegistry", connected:true },
          { label:"CBK Payment\nRails", connected:true },
          { label:"KEMSA Supply\nChain", connected:false },
        ].map(s=>(
          <div key={s.label} style={{ textAlign:"center" }}>
            <div style={{
              width:56, height:56, borderRadius:"50%",
              background: s.connected ? `${C.emerald}22` : `${C.gold}22`,
              border: `2px solid ${s.connected?C.emeraldLt:C.goldLt}`,
              display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px",
            }}>
              {s.connected
                ? <Icon name="check" size={22} color={C.emeraldLt}/>
                : <Icon name="alert" size={22} color={C.goldLt}/>
              }
            </div>
            <div style={{ fontSize:10, color:s.connected?C.white:C.goldLt, textAlign:"center", whiteSpace:"pre-line", lineHeight:1.4 }}>{s.label}</div>
            <div style={{ fontSize:9, fontFamily:font.mono, color:s.connected?C.emeraldLt:C.goldLt, marginTop:4 }}>{s.connected?"LIVE":"Q3 2025"}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
const AdminSettings = () => (
  <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:700 }} className="slide-up">
    <div style={{ fontFamily:font.display, fontWeight:700, fontSize:20 }}>Platform Settings</div>
    {[
      { section:"Token Configuration", items:[
        { label:"AfyaToken Peg Ratio", value:"1 AfyaToken = KES 1" , type:"display" },
        { label:"Daily Contribution Limit", value:"KES 2,000", type:"display" },
        { label:"Emergency Fund Reserve %", value:"8%", type:"display" },
      ]},
      { section:"AI & Security", items:[
        { label:"Fraud Score Threshold (auto-block)", value:"< 40%", type:"display" },
        { label:"Model Retraining Schedule", value:"Every 30 days", type:"display" },
        { label:"Federated Learning Nodes", value:"12 County Clusters", type:"display" },
      ]},
      { section:"DHA Compliance", items:[
        { label:"FHIR Version", value:"R4", type:"display" },
        { label:"Data Retention Period", value:"7 years (per regulation)", type:"display" },
        { label:"ODPC Registration No.", value:"ODPC-2024-KE-00841", type:"display" },
      ]},
    ].map(grp=>(
      <div key={grp.section} className="glass-card" style={{ padding:20 }}>
        <div style={{ fontWeight:600, marginBottom:14, color:C.emeraldLt, fontFamily:font.mono, fontSize:11, letterSpacing:1, textTransform:"uppercase" }}>{grp.section}</div>
        {grp.items.map(item=>(
          <div key={item.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.glassBorder}`, fontSize:13 }}>
            <span style={{ color:C.slate }}>{item.label}</span>
            <span style={{ fontFamily:font.mono, color:C.white }}>{item.value}</span>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE CONSUMER APP
// ══════════════════════════════════════════════════════════════════════════════
const MOBILE_SCREENS = ["Home","Wallet","Contribute","Claims","Facilities","Profile"];
const BOTTOM_TABS = [
  { id:"Home",       icon:"home"     },
  { id:"Wallet",     icon:"wallet"   },
  { id:"Claims",     icon:"file"     },
  { id:"Facilities", icon:"hospital" },
  { id:"Profile",    icon:"user"     },
];

const MobileApp = () => {
  const [screen, setScreen] = useState("Home");
  const [contributed, setContributed] = useState(false);

  return (
    <div style={{
      width:375, height:812,
      background: C.obsidian,
      borderRadius:44,
      overflow:"hidden",
      border:`2px solid ${C.glassBorder}`,
      display:"flex", flexDirection:"column",
      position:"relative",
      boxShadow:`0 40px 80px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.1)`,
    }}>
      {/* Status Bar */}
      <div style={{ height:44, background:C.navy, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0 }}>
        <span style={{ fontFamily:font.mono, fontSize:11 }}>9:41</span>
        <div style={{ width:100, height:16, background:C.obsidian, borderRadius:8 }}/>
        <div style={{ display:"flex", gap:4 }}>
          <div style={{ width:4,height:8,background:C.white,borderRadius:1 }}/>
          <div style={{ width:4,height:12,background:C.white,borderRadius:1 }}/>
          <div style={{ width:4,height:8,background:C.slate,borderRadius:1 }}/>
          <div style={{ width:10,height:8,border:`1.5px solid ${C.white}`,borderRadius:2,marginLeft:4 }}>
            <div style={{ width:6,height:4,background:C.emeraldLt,borderRadius:1,margin:1 }}/>
          </div>
        </div>
      </div>

      {/* Screen Content */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        {screen==="Home"       && <MobileHome  setScreen={setScreen}/>}
        {screen==="Wallet"     && <MobileWallet/>}
        {screen==="Contribute" && <MobileContribute contributed={contributed} setContributed={setContributed}/>}
        {screen==="Claims"     && <MobileClaims/>}
        {screen==="Facilities" && <MobileFacilities/>}
        {screen==="Profile"    && <MobileProfile/>}
      </div>

      {/* Bottom Nav */}
      <div style={{
        height:80, background:C.navy, borderTop:`1px solid ${C.glassBorder}`,
        display:"flex", alignItems:"center", justifyContent:"space-around",
        paddingBottom:16, flexShrink:0,
      }}>
        {BOTTOM_TABS.map(t=>{
          const active = t.id===screen || (screen==="Contribute" && t.id==="Wallet");
          return (
            <button key={t.id} onClick={()=>setScreen(t.id)} style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:4,
              background:"transparent", border:"none", cursor:"pointer",
              color: active ? C.emeraldLt : C.slate,
              padding:"8px 12px", borderRadius:12,
              transition:"all .2s",
            }}>
              <Icon name={t.icon} size={22} color={active?C.emeraldLt:C.slate}/>
              <span style={{ fontSize:10, fontFamily:font.body, fontWeight:active?600:400 }}>{t.id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── MOBILE: HOME ─────────────────────────────────────────────────────────────
const MobileHome = ({ setScreen }) => (
  <div style={{ padding:"20px 20px 0" }} className="slide-up">
    {/* Header */}
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
      <div>
        <div style={{ fontSize:13, color:C.slate }}>Habari, Jane 👋</div>
        <div style={{ fontFamily:font.display, fontSize:20, fontWeight:700 }}>Afya Yako</div>
      </div>
      <div style={{ position:"relative" }}>
        <div style={{ width:40,height:40, borderRadius:"50%", background:`linear-gradient(135deg,${C.emerald},${C.navy})`, display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon name="bell" size={18} color="#fff"/>
        </div>
        <div style={{ position:"absolute", top:4, right:4, width:8,height:8, background:C.scarletLt, borderRadius:"50%", border:`2px solid ${C.obsidian}` }}/>
      </div>
    </div>

    {/* Balance Card */}
    <div style={{
      background:`linear-gradient(135deg, ${C.emerald}, ${C.navy})`,
      borderRadius:24, padding:24, marginBottom:16,
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:-20, right:-20, opacity:.08 }}>
        <TokenCoin size={140}/>
      </div>
      <div style={{ fontFamily:font.mono, fontSize:10, color:"rgba(255,255,255,.6)", letterSpacing:1.5, marginBottom:6 }}>YOUR AfyaToken WALLET</div>
      <div style={{ fontFamily:font.display, fontSize:36, fontWeight:900, color:C.white, lineHeight:1 }}>450 AfyaToken</div>
      <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginTop:4, marginBottom:20 }}>≈ KES 450,000 protected</div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={()=>setScreen("Contribute")} className="emerald-btn" style={{ flex:1, background:"rgba(255,255,255,.15)", backdropFilter:"blur(8px)" }}>+ Contribute</button>
        <button className="ghost-btn" style={{ flex:1, borderColor:"rgba(255,255,255,.2)", color:"rgba(255,255,255,.8)" }}>Withdraw</button>
      </div>
    </div>

    {/* Quick Stats */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
      {[
        { label:"Cover Level", value:"Primary + Emergency", color:C.emeraldLt },
        { label:"Streak", value:"47 Days 🔥", color:C.goldLt },
        { label:"Saved this year", value:"KES 16,500", color:C.gold },
        { label:"SHA Status", value:"Active ✓", color:C.emeraldLt },
      ].map(s=>(
        <div key={s.label} className="glass-card" style={{ padding:14 }}>
          <div style={{ fontSize:10, color:C.slate, fontFamily:font.mono, marginBottom:4 }}>{s.label}</div>
          <div style={{ fontSize:13, fontWeight:600, color:s.color }}>{s.value}</div>
        </div>
      ))}
    </div>

    {/* USSD Banner */}
    <div style={{ background:`${C.gold}15`, border:`1px solid ${C.gold}30`, borderRadius:14, padding:14, marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:36,height:36, background:`${C.gold}20`, borderRadius:10, display:"flex",alignItems:"center",justifyContent:"center", flexShrink:0 }}>
        <Icon name="phone" size={18} color={C.goldLt}/>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:C.goldLt }}>No internet? No problem.</div>
        <div style={{ fontSize:11, color:C.slate }}>Dial *384# for USSD access to your wallet</div>
      </div>
    </div>

    {/* Recent Activity */}
    <div style={{ marginBottom:16 }}>
      <div style={{ fontFamily:font.display, fontWeight:700, fontSize:16, marginBottom:12 }}>Recent Activity</div>
      {[
        { icon:"send", label:"Daily Contribution", amt:"-5 AfyaToken", time:"Today", color:C.scarletLt },
        { icon:"hospital", label:"Kenyatta NH — Outpatient", amt:"-120 AfyaToken", time:"Mar 5", color:C.scarletLt },
        { icon:"plus", label:"Gov't Match Bonus", amt:"+25 AfyaToken", time:"Mar 1", color:C.emeraldLt },
        { icon:"plus", label:"Monthly SHA Credit", amt:"+200 AfyaToken", time:"Feb 28", color:C.emeraldLt },
      ].map((tx,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.glassBorder}` }}>
          <div style={{ width:38,height:38, borderRadius:12, background:C.glass, border:`1px solid ${C.glassBorder}`, display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Icon name={tx.icon} size={16} color={tx.color}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:500 }}>{tx.label}</div>
            <div style={{ fontSize:11, color:C.slate }}>{tx.time}</div>
          </div>
          <div style={{ fontFamily:font.mono, fontSize:13, fontWeight:600, color:tx.color }}>{tx.amt}</div>
        </div>
      ))}
    </div>
  </div>
);

// ─── MOBILE: WALLET ───────────────────────────────────────────────────────────
const MobileWallet = () => (
  <div style={{ padding:20 }} className="slide-up">
    <div style={{ fontFamily:font.display, fontWeight:700, fontSize:22, marginBottom:20 }}>My Wallet</div>
    <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
      <TokenCoin size={100} animated/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
      {[
        { label:"Balance", value:"450 AfyaToken" },
        { label:"Locked Claims", value:"120 AfyaToken" },
        { label:"Earned Match", value:"75 AfyaToken" },
      ].map(s=>(
        <div key={s.label} className="glass-card" style={{ padding:12, textAlign:"center" }}>
          <div style={{ fontSize:9, color:C.slate, fontFamily:font.mono, marginBottom:4 }}>{s.label}</div>
          <div style={{ fontSize:13, fontWeight:700, color:C.goldLt }}>{s.value}</div>
        </div>
      ))}
    </div>
    <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
      <div style={{ fontWeight:600, marginBottom:12 }}>Blockchain Wallet ID</div>
      <div style={{ fontFamily:font.mono, fontSize:11, color:C.emeraldLt, wordBreak:"break-all", lineHeight:1.8 }}>0x4f3c...a8d2e</div>
      <div style={{ height:1, background:C.glassBorder, margin:"12px 0" }}/>
      <div style={{ fontFamily:font.mono, fontSize:10, color:C.slate }}>SHA MEMBER ID: SHA-KE-2024-8821</div>
      <div style={{ fontFamily:font.mono, fontSize:10, color:C.slate, marginTop:4 }}>COVER: PRIMARY + EMERGENCY + CHRONIC</div>
    </div>
    <div style={{ display:"flex", gap:10 }}>
      <button className="emerald-btn" style={{ flex:1 }}>Send AfyaToken</button>
      <button className="ghost-btn" style={{ flex:1 }}>Share QR</button>
    </div>
  </div>
);

// ─── MOBILE: CONTRIBUTE ───────────────────────────────────────────────────────
const MobileContribute = ({ contributed, setContributed }) => {
  const [amount, setAmount] = useState(50);
  return (
    <div style={{ padding:20 }} className="slide-up">
      <div style={{ fontFamily:font.display, fontWeight:700, fontSize:22, marginBottom:4 }}>Daily Contribution</div>
      <div style={{ fontSize:12, color:C.slate, marginBottom:24 }}>Small daily amounts = big health protection</div>

      {!contributed ? (
        <>
          <div className="glass-card" style={{ padding:20, marginBottom:16 }}>
            <div style={{ fontFamily:font.mono, fontSize:10, color:C.slate, marginBottom:4 }}>CONTRIBUTE TODAY</div>
            <div style={{ fontFamily:font.display, fontSize:48, fontWeight:900, color:C.goldLt, textAlign:"center", margin:"16px 0" }}>
              KES {amount*10}
            </div>
            <div style={{ fontSize:12, color:C.slate, textAlign:"center", marginBottom:16 }}>= {amount} AfyaToken tokens</div>
            <input type="range" min={5} max={200} value={amount} onChange={e=>setAmount(+e.target.value)}
              style={{ width:"100%", accentColor:C.emeraldLt }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.slate, marginTop:4 }}>
              <span>KES 50 min</span><span>KES 2,000 max</span>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[50,100,200,500].map(v=>(
              <button key={v} onClick={()=>setAmount(v)} className={amount===v?"emerald-btn":"ghost-btn"} style={{ padding:14, textAlign:"center" }}>
                KES {v*10}
              </button>
            ))}
          </div>
          <div style={{ background:`${C.emerald}15`, border:`1px solid ${C.emerald}30`, borderRadius:14, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:12, color:C.emeraldLt, fontWeight:600, marginBottom:4 }}>🎯 Gov't Match Active!</div>
            <div style={{ fontSize:11, color:C.slate }}>Contribute ≥ KES 500/day and get 10% government top-up for vulnerable households</div>
          </div>
          <button className="emerald-btn" style={{ width:"100%", padding:16, fontSize:15 }} onClick={()=>setContributed(true)}>
            Contribute via M-PESA
          </button>
        </>
      ) : (
        <div style={{ textAlign:"center", padding:"40px 20px" }} className="pop-in">
          <div style={{ width:80,height:80, borderRadius:"50%", background:`${C.emerald}22`, border:`2px solid ${C.emeraldLt}`, display:"flex",alignItems:"center",justifyContent:"center", margin:"0 auto 20px" }}>
            <Icon name="check" size={40} color={C.emeraldLt}/>
          </div>
          <div style={{ fontFamily:font.display, fontSize:24, fontWeight:700, marginBottom:8 }}>Contributed!</div>
          <div style={{ color:C.slate, marginBottom:8 }}>KES {amount*10} → {amount} AfyaToken minted to your wallet</div>
          <div style={{ fontFamily:font.mono, fontSize:10, color:C.emeraldLt, marginBottom:24 }}>TX: 0x7f2a...bc14 · Confirmed on chain</div>
          <button className="ghost-btn" style={{ width:"100%" }} onClick={()=>setContributed(false)}>Make another contribution</button>
        </div>
      )}
    </div>
  );
};

// ─── MOBILE: CLAIMS ───────────────────────────────────────────────────────────
const MobileClaims = () => (
  <div style={{ padding:20 }} className="slide-up">
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
      <div style={{ fontFamily:font.display, fontWeight:700, fontSize:22 }}>My Claims</div>
      <button className="emerald-btn" style={{ padding:"8px 14px" }}>+ New Claim</button>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 }}>
      {[
        { label:"Approved", value:"12", color:C.emeraldLt },
        { label:"Pending", value:"2", color:C.goldLt },
        { label:"Rejected", value:"0", color:C.scarletLt },
      ].map(s=>(
        <div key={s.label} className="glass-card" style={{ padding:12, textAlign:"center" }}>
          <div style={{ fontFamily:font.display, fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
          <div style={{ fontSize:10, color:C.slate, marginTop:2 }}>{s.label}</div>
        </div>
      ))}
    </div>

    {[
      { facility:"Kenyatta National Hospital", svc:"Outpatient Consultation", date:"Mar 5, 2025", amount:"120 AfyaToken", status:"Approved", ai:"Auto-verified" },
      { facility:"Pharmacy Plus Nairobi", svc:"Prescription Drugs", date:"Feb 22, 2025", amount:"45 AfyaToken", status:"Approved", ai:"Auto-verified" },
      { facility:"Kenyatta NH Lab", svc:"Blood Tests", date:"Feb 10, 2025", amount:"80 AfyaToken", status:"Pending", ai:"AI reviewing" },
    ].map((c,i)=>(
      <div key={i} className="glass-card" style={{ padding:16, marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ fontWeight:600, fontSize:13 }}>{c.facility}</div>
          <span className={`stat-badge ${c.status==="Approved"?"badge-green":"badge-gold"}`}>{c.status}</span>
        </div>
        <div style={{ fontSize:12, color:C.slate, marginBottom:8 }}>{c.svc} · {c.date}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:font.mono, color:C.goldLt, fontWeight:700 }}>{c.amount}</span>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <Icon name="cpu" size={12} color={c.status==="Approved"?C.emeraldLt:C.goldLt}/>
            <span style={{ fontSize:10, color:c.status==="Approved"?C.emeraldLt:C.goldLt }}>{c.ai}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── MOBILE: FACILITIES ───────────────────────────────────────────────────────
const MobileFacilities = () => (
  <div style={{ padding:20 }} className="slide-up">
    <div style={{ fontFamily:font.display, fontWeight:700, fontSize:22, marginBottom:4 }}>Find Care</div>
    <div style={{ fontSize:12, color:C.slate, marginBottom:16 }}>SHA-accredited facilities near you</div>
    <div style={{ background:C.glass, border:`1px solid ${C.glassBorder}`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
      <Icon name="globe" size={16} color={C.slate}/>
      <span style={{ fontSize:13, color:C.slate }}>Search by name or location...</span>
    </div>
    <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
      {["All","Hospitals","Clinics","Pharmacy","Lab","Dental"].map((f,i)=>(
        <button key={f} className={i===0?"emerald-btn":"ghost-btn"} style={{ whiteSpace:"nowrap", padding:"7px 14px", fontSize:11 }}>{f}</button>
      ))}
    </div>
    {[
      { name:"Kenyatta National Hospital", dist:"2.4 km", level:"Level 6", afyaToken:true, rating:"4.8" },
      { name:"MP Shah Hospital", dist:"3.1 km", level:"Level 5", afyaToken:true, rating:"4.7" },
      { name:"Nairobi Hospital", dist:"4.2 km", level:"Level 5", afyaToken:true, rating:"4.9" },
      { name:"Avenue Hospital", dist:"1.8 km", level:"Level 4", afyaToken:true, rating:"4.5" },
    ].map((f,i)=>(
      <div key={i} className="glass-card" style={{ padding:16, marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
          <div style={{ fontWeight:600, fontSize:13, flex:1 }}>{f.name}</div>
          <span style={{ fontFamily:font.mono, fontSize:11, color:C.goldLt }}>⭐ {f.rating}</span>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <span className="stat-badge badge-slate" style={{fontSize:10}}>{f.level}</span>
          <span className="stat-badge badge-green" style={{fontSize:10}}>AfyaToken Accepted</span>
          <span style={{ fontSize:11, color:C.slate }}>{f.dist} away</span>
        </div>
        <button className="emerald-btn" style={{ width:"100%", padding:10, fontSize:12 }}>Book Appointment</button>
      </div>
    ))}
  </div>
);

// ─── MOBILE: PROFILE ─────────────────────────────────────────────────────────
const MobileProfile = () => (
  <div style={{ padding:20 }} className="slide-up">
    <div style={{ textAlign:"center", marginBottom:24 }}>
      <div style={{ width:80,height:80, borderRadius:"50%", background:`linear-gradient(135deg,${C.emerald},${C.navy})`, display:"flex",alignItems:"center",justifyContent:"center", margin:"0 auto 12px" }}>
        <Icon name="user" size={36} color="#fff"/>
      </div>
      <div style={{ fontFamily:font.display, fontSize:20, fontWeight:700 }}>Jane Wanjiku</div>
      <div style={{ fontSize:12, color:C.slate }}>SHA Member · Nairobi County</div>
      <div className="glass-card" style={{ display:"inline-block", padding:"6px 16px", marginTop:10 }}>
        <span style={{ fontFamily:font.mono, fontSize:11, color:C.emeraldLt }}>SHA-KE-2024-8821</span>
      </div>
    </div>

    <div className="glass-card" style={{ padding:16, marginBottom:12 }}>
      <div style={{ fontWeight:600, marginBottom:10, color:C.emeraldLt, fontSize:11, fontFamily:font.mono, letterSpacing:1 }}>COVERAGE DETAILS</div>
      {[
        { label:"Plan", value:"SHA Standard" },
        { label:"Primary Healthcare Fund", value:"Active" },
        { label:"Emergency Fund", value:"Active" },
        { label:"SHIF Contributions", value:"KES 500/mo" },
        { label:"Dependants Covered", value:"3" },
      ].map(r=>(
        <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.glassBorder}`, fontSize:12 }}>
          <span style={{ color:C.slate }}>{r.label}</span>
          <span style={{ fontWeight:600 }}>{r.value}</span>
        </div>
      ))}
    </div>

    <div className="glass-card" style={{ padding:16, marginBottom:12 }}>
      <div style={{ fontWeight:600, marginBottom:10, color:C.gold, fontSize:11, fontFamily:font.mono, letterSpacing:1 }}>DATA & PRIVACY</div>
      {[
        { label:"Health Data Portability", icon:"eye" },
        { label:"Download My Records (FHIR)", icon:"file" },
        { label:"Data Consent Settings", icon:"lock" },
        { label:"ODPC Complaint Portal", icon:"shield" },
      ].map(r=>(
        <div key={r.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.glassBorder}`, cursor:"pointer" }}>
          <Icon name={r.icon} size={16} color={C.slate}/>
          <span style={{ fontSize:13, flex:1 }}>{r.label}</span>
          <Icon name="arrow" size={14} color={C.slate}/>
        </div>
      ))}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("split");

  return (
    <div style={{ minHeight:"100vh", background:C.obsidian, fontFamily:font.body, color:C.white }}>
      <style>{globalStyle}</style>

      {/* Top Control Bar */}
      <div style={{
        height:60, background:C.navy, borderBottom:`1px solid ${C.glassBorder}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 32px", position:"sticky", top:0, zIndex:100,
      }}>
        <Logo/>
        <div style={{ display:"flex", gap:8, background:C.glass, border:`1px solid ${C.glassBorder}`, borderRadius:12, padding:4 }}>
          {[["split","Both Views"],["admin","Admin Web"],["mobile","Consumer App"]].map(([v,label])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              padding:"6px 16px", borderRadius:9, border:"none", cursor:"pointer",
              background: view===v ? `linear-gradient(135deg,${C.emerald},${C.emeraldMid})` : "transparent",
              color: view===v ? C.white : C.slate,
              fontFamily:font.body, fontWeight:view===v?600:400, fontSize:12,
              transition:"all .2s",
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span className="stat-badge badge-green" style={{ fontSize:11 }}>DHA Certified</span>
          <span className="stat-badge badge-gold"  style={{ fontSize:11 }}>Blockchain Live</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div style={{
        background:`linear-gradient(135deg, ${C.navy} 0%, ${C.midnight} 50%, ${C.obsidian} 100%)`,
        padding:"32px 40px", borderBottom:`1px solid ${C.glassBorder}`,
      }}>
        <div style={{ maxWidth:900 }}>
          <div style={{ fontFamily:font.mono, fontSize:10, color:C.emeraldLt, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>
            SEABOARD TECHNOLOGIES · DEMO PROTOTYPE · FOR KENYA DIGITAL HEALTH AGENCY
          </div>
          <div style={{ fontFamily:font.display, fontSize:32, fontWeight:900, lineHeight:1.2, marginBottom:8 }}>
            AfyaToken (AfyaToken) Platform
          </div>
          <div style={{ fontSize:14, color:C.slate, maxWidth:620, lineHeight:1.7 }}>
            Blockchain-tokenized, AI-powered health financing for Kenya's informal sector. Purpose-bound, CBK-regulated, and fully DHA-certified per the Digital Health Act No. 15 of 2023.
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ padding:"32px 24px" }}>
        {view==="split" && (
          <div style={{ display:"flex", gap:32, alignItems:"flex-start", flexWrap:"wrap" }}>
            {/* Admin Web */}
            <div style={{ flex:1, minWidth:600 }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <Icon name="globe" size={18} color={C.emeraldLt}/>
                  <div style={{ fontFamily:font.display, fontSize:18, fontWeight:700 }}>Admin Web Dashboard</div>
                </div>
                <div style={{ fontSize:12, color:C.slate }}>For SHA, DHA, Ministry of Health, and Seaboard administrators</div>
              </div>
              <div style={{ height:700, borderRadius:16, overflow:"hidden", border:`1px solid ${C.glassBorder}` }}>
                <AdminDashboard/>
              </div>
            </div>
            {/* Mobile */}
            <div style={{ flexShrink:0 }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                  <Icon name="phone" size={18} color={C.goldLt}/>
                  <div style={{ fontFamily:font.display, fontSize:18, fontWeight:700 }}>Consumer Mobile App</div>
                </div>
                <div style={{ fontSize:12, color:C.slate }}>For citizens — boda riders, market traders, farmers</div>
              </div>
              <MobileApp/>
            </div>
          </div>
        )}
        {view==="admin" && (
          <div style={{ height:"calc(100vh - 220px)", borderRadius:16, overflow:"hidden", border:`1px solid ${C.glassBorder}` }}>
            <AdminDashboard/>
          </div>
        )}
        {view==="mobile" && (
          <div style={{ display:"flex", justifyContent:"center" }}>
            <MobileApp/>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"20px 40px", borderTop:`1px solid ${C.glassBorder}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:11, color:C.slate }}>
          © 2025 Seaboard Technologies · AfyaToken Platform v1.0 · All rights reserved
        </div>
        <div style={{ display:"flex", gap:16, fontSize:11, color:C.slate, fontFamily:font.mono }}>
          <span>Digital Health Act No. 15 of 2023</span>
          <span>·</span>
          <span>SHA Integration v2.1</span>
          <span>·</span>
          <span>FHIR R4 Compliant</span>
        </div>
      </div>
    </div>
  );
}
