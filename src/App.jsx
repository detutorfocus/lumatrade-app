import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart,
} from "recharts";
// ─── API BASE ─────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "https://api.lumafxt.com";
const WS  = API
  ? API.replace(/^http/, "ws")
  : `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

// ─── SECURE TOKEN MANAGEMENT ─────────────────────────────────
// Tokens live in memory first (XSS-resistant), sessionStorage as backup
// (cleared when browser tab closes), localStorage for convenience only.
let _memToken = null;

function getToken() {
  return _memToken || sessionStorage.getItem("luma_token") || localStorage.getItem("token") || null;
}
function setToken(t) {
  _memToken = t;
  sessionStorage.setItem("luma_token", t);
  localStorage.setItem("token", t);
}
function clearToken() {
  _memToken = null;
  sessionStorage.removeItem("luma_token");
  localStorage.removeItem("token");
}

function api(path, opts = {}) {
  const token = getToken();
  return fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json",
               ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  }).then(async r => {
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || err.message || "Request failed");
    }
    return r.json();
  });
}

// ─── THEME SYSTEM ─────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:      "#070c14",
    surface: "#0d1520",
    card:    "#111b2a",
    border:  "#1a2a3f",
    accent:  "#00d4ff",
    green:   "#00e5a0",
    red:     "#ff4466",
    amber:   "#ffb800",
    muted:   "#4a6080",
    text:    "#c8ddf0",
    white:   "#e8f4ff",
  },
  light: {
    bg:      "#f0f4f9",
    surface: "#ffffff",
    card:    "#ffffff",
    border:  "#ccdaeb",
    accent:  "#0096bb",
    green:   "#00995a",
    red:     "#d42255",
    amber:   "#c48800",
    muted:   "#7a9abf",
    text:    "#2a3d55",
    white:   "#1a2d45",
  },
};
const _savedTheme = typeof window !== "undefined"
  ? (localStorage.getItem("luma_theme") || "dark") : "dark";
let _activeTheme = _savedTheme === "light" ? "light" : "dark";
const T = { ...THEMES[_activeTheme] };

// ─────────────────────────────────────────────────────────────
//  ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]   = useState(null);
  const [page, setPage]   = useState("login");

  useEffect(() => {
    const token = getToken();
    if (token) {
      api("/api/auth/me").then(u => { setUser(u); setPage("dashboard"); }).catch(() => {});
      return;
    }
    // Read hash from URL — handles deep links from landing page
    // e.g. app.lumafxt.com/#/register-premium → opens premium registration
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    const validPages = ["login", "register", "register-free", "register-premium"];
    if (validPages.includes(hash)) {
      setPage(hash === "register" ? "register-free" : hash);
    }
    // Clear hash after reading so URL stays clean
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const logout = () => {
    clearToken();
    setUser(null); setPage("login");
  };

  if (!user) return <AuthScreen page={page} setPage={setPage} setUser={setUser} />;
  return <Dashboard user={user} logout={logout} />;
}

// ─────────────────────────────────────────────────────────────
//  AUTH SCREEN
// ─────────────────────────────────────────────────────────────
function AuthScreen({ page, setPage, setUser }) {
  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
                  alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        body { background: ${T.bg}; color: ${T.text}; }
        input { outline:none; }
        button { cursor:pointer; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:${T.surface}; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
      `}</style>
      <div style={{ width:"100%", maxWidth:480, padding:"0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontFamily:"'Syne', sans-serif", fontSize:28, fontWeight:800,
                        color:T.white, letterSpacing:"-0.5px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{verticalAlign:"middle",marginRight:4}}><polygon points="12,2 22,20 2,20" fill={T.accent} opacity="0.9"/><circle cx="12" cy="13" r="2.5" fill={T.accent}/></svg><span style={{ color:T.accent, fontFamily:"'Syne',sans-serif" }}>Luma</span>-FX
          </div>
          <div style={{ fontSize:11, color:T.muted, letterSpacing:"3px", marginTop:6 }}>
            INSTITUTIONAL TRADING PLATFORM
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display:"flex", gap:2, background:T.surface,
                      borderRadius:10, padding:4, marginBottom:24 }}>
          {["login","register-free","register-premium"].map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              flex:1, padding:"10px 0", fontSize:10, fontFamily:"inherit",
              background: page===p ? T.accent : "transparent",
              color: page===p ? T.bg : T.muted,
              border:"none", borderRadius:7, fontWeight:600,
              letterSpacing:"1px", textTransform:"uppercase", transition:"all .2s",
            }}>
              {p==="login" ? "Sign In" : p==="register-free" ? "Free" : "Premium"}
            </button>
          ))}
        </div>

        {page === "login"             && <LoginForm setUser={setUser} setPage={setPage} />}
        {page === "register-free"     && <RegisterFreeForm setPage={setPage} />}
        {page === "register-premium"  && <RegisterPremiumForm setPage={setPage} />}
      </div>
    </div>
  );
}

function LoginForm({ setUser, setPage }) {
  const [f, setF] = useState({ email:"", password:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

    // Add this state at the top with your other states
    const [authView, setAuthView] = useState('signin') // 'signin' | 'forgot' | 'reset'
    const [fpEmail, setFpEmail] = useState('')
    const [fpToken, setFpToken] = useState('')
    const [fpNewPassword, setFpNewPassword] = useState('')
    const [fpMessage, setFpMessage] = useState('')
    const [fpError, setFpError] = useState('')

    const handleForgotPassword = async () => {
    setFpError(''); setFpMessage('')
    try {
      const res = await api('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ({ email: fpEmail })
      })
      const data = await res.json()
      setFpMessage(data.message)
      setAuthView('reset')
    } catch {
      setFpError('Something went wrong. Try again.')
    }
    }

    const handleResetPassword = async () => {
    setFpError(''); setFpMessage('')
    if (!fpToken || !fpNewPassword) {
      setFpError('Both fields are required.'); return
    }
    try {
      const res = await api('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: ({ token: fpToken, new_password: fpNewPassword })
      })
      const data = await res.json()
      if (!res.ok) { setFpError(data.detail); return }
      setFpMessage(data.message)
      setTimeout(() => {
        setAuthView('signin')
        setFpToken(''); setFpNewPassword(''); setFpEmail('')
      }, 2000)
    } catch {
      setFpError('Something went wrong. Try again.')
    }
    }

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const res  = await fetch(`${API}/api/auth/login`, {
        method:"POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email, password: f.password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      setToken(data.access_token);
      const user = await api("/api/auth/me");
      setUser(user);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (authView === "forgot") return (
    <AuthCard title="Reset Password">
      <p style={{ fontSize:11, color:T.muted, marginBottom:16, lineHeight:1.6 }}>
        Enter your registered email — a 6-digit token will be sent to your Telegram.
      </p>
      <Field label="Email" value={fpEmail} onChange={v => setFpEmail(v)} type="email" />
      {fpError && <Err>{fpError}</Err>}
      {fpMessage && <div style={{ fontSize:11, color:T.green, marginBottom:10 }}>✓ {fpMessage}</div>}
      <PrimaryBtn onClick={handleForgotPassword}>Send Reset Token</PrimaryBtn>
      <div onClick={() => setAuthView("signin")}
        style={{ textAlign:"center", marginTop:14, fontSize:11, color:T.muted, cursor:"pointer" }}>
        ← Back to Sign In
      </div>
    </AuthCard>
  );

  if (authView === "reset") return (
    <AuthCard title="Enter New Password">
      <p style={{ fontSize:11, color:T.muted, marginBottom:16, lineHeight:1.6 }}>
        Check your Telegram for the 6-digit reset token.
      </p>
      <Field label="6-digit Token"  value={fpToken}       onChange={v => setFpToken(v)}       type="text" />
      <Field label="New Password"   value={fpNewPassword} onChange={v => setFpNewPassword(v)} type="password" />
      {fpError && <Err>{fpError}</Err>}
      {fpMessage && <div style={{ fontSize:11, color:T.green, marginBottom:10 }}>✓ {fpMessage}</div>}
      <PrimaryBtn onClick={handleResetPassword}>Reset Password</PrimaryBtn>
      <div onClick={() => setAuthView("forgot")}
        style={{ textAlign:"center", marginTop:14, fontSize:11, color:T.muted, cursor:"pointer" }}>
        ← Resend Token
      </div>
    </AuthCard>
  );

  return (
    <AuthCard title="Welcome back">
      <Field label="Email"    value={f.email}    onChange={v => setF({...f, email:v})}    type="email" />
      <Field label="Password" value={f.password} onChange={v => setF({...f, password:v})} type="password" />
      {err && <Err>{err}</Err>}
      <PrimaryBtn loading={loading} onClick={submit}>Sign In</PrimaryBtn>
      <div
        onClick={() => { setAuthView("forgot"); setFpError(""); setFpMessage(""); }}
        style={{ textAlign:"center", marginTop:14, fontSize:11,
                 color:T.accent, cursor:"pointer", textDecoration:"underline" }}>
        Forgot Password?
      </div>
    </AuthCard>
  );
}

function RegisterFreeForm({ setPage }) {
  const [f, setF]           = useState({ email:"", password:"", full_name:"", telegram_username:"" });
  const [err, setErr]       = useState("");
  const [ok, setOk]         = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showLegal, setShowLegal] = useState(null);

  const submit = async () => {
    if (!agreed) { setErr("Please accept the Terms & Conditions before registering."); return; }
    setLoading(true); setErr("");
    try {
      await api("/api/auth/register-free", { method:"POST", body:JSON.stringify(f) });
      setOk(true);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  if (ok) return <SuccessCard msg="Free account created! Sign in to continue." onOk={() => setPage("login")} />;
  return (
    <AuthCard title="Free Account" badge="Signals Only">
      {showLegal && <TermsModal type={showLegal} onClose={() => setShowLegal(null)} />}
      <FeatureList items={["Trade signals in Telegram group","Live market analysis","Signal history & chart"]} />
      <Field label="Full Name"        value={f.full_name}        onChange={v => setF({...f, full_name:v})} />
      <Field label="Email"            value={f.email}            onChange={v => setF({...f, email:v})} type="email" />
      <Field label="Password"         value={f.password}         onChange={v => setF({...f, password:v})} type="password" />
      <Field label="Telegram Username" value={f.telegram_username} onChange={v => setF({...f, telegram_username:v})} placeholder="@username" />
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", margin:"12px 0",
                     padding:"10px 12px", borderRadius:8, background:agreed?`${T.green}08`:T.surface,
                     border:`1px solid ${agreed?T.green+"40":T.border}` }}>
        <input type="checkbox" id="tc_free" checked={agreed} onChange={e => setAgreed(e.target.checked)}
          style={{ width:16, height:16, marginTop:1, cursor:"pointer", flexShrink:0 }} />
        <label htmlFor="tc_free" style={{ fontSize:10, color:T.text, lineHeight:1.5, cursor:"pointer" }}>
          I agree to the{" "}
          <span onClick={() => setShowLegal("terms")} style={{ color:T.accent, textDecoration:"underline", cursor:"pointer" }}>Terms & Conditions</span>
          {" "}and{" "}
          <span onClick={() => setShowLegal("privacy")} style={{ color:T.accent, textDecoration:"underline", cursor:"pointer" }}>Privacy Policy</span>
        </label>
      </div>
      {err && <Err>{err}</Err>}
      <PrimaryBtn loading={loading} onClick={submit}>Create Free Account</PrimaryBtn>
    </AuthCard>
  );
}

function RegisterPremiumForm({ setPage }) {
  const [f, setF] = useState({ email:"", password:"", full_name:"", telegram_username:"",
                                mt5_login:"", mt5_password:"", mt5_server:"" });
  const [err, setErr]       = useState("");
  const [ok, setOk]         = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showLegal, setShowLegal] = useState(null);

  const submit = async () => {
    if (!agreed) { setErr("Please accept the Terms & Conditions before registering."); return; }
    setLoading(true); setErr("");
    try {
      await api("/api/auth/register-premium", { method:"POST", body:JSON.stringify(f) });
      setOk(true);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  if (ok) return <SuccessCard msg="Premium account submitted! Pending admin approval after payment confirmation." onOk={() => setPage("login")} />;
  return (
    <AuthCard title="Premium Account" badge="Auto-Trade">
      <FeatureList items={["Trades auto-copied to your MT5","Place & close orders from the app","Advanced market analysis","Priority Telegram alerts"]} accent />
      <Field label="Full Name"         value={f.full_name}         onChange={v => setF({...f, full_name:v})} />
      <Field label="Email"             value={f.email}             onChange={v => setF({...f, email:v})} type="email" />
      <Field label="Password"          value={f.password}          onChange={v => setF({...f, password:v})} type="password" />
      <Field label="Telegram Username" value={f.telegram_username} onChange={v => setF({...f, telegram_username:v})} placeholder="@username" />
      <div style={{ margin:"16px 0 8px", fontSize:10, letterSpacing:"2px", color:T.accent }}>MT5 CREDENTIALS</div>
      <Field label="MT5 Login"         value={f.mt5_login}         onChange={v => setF({...f, mt5_login:v})} />
      <Field label="MT5 Password"      value={f.mt5_password}      onChange={v => setF({...f, mt5_password:v})} type="password" />
      <Field label="MT5 Server"        value={f.mt5_server}        onChange={v => setF({...f, mt5_server:v})} placeholder="e.g. Exness-MT5Trial9" />
      {showLegal && <TermsModal type={showLegal} onClose={() => setShowLegal(null)} />}
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", margin:"12px 0",
                     padding:"10px 12px", borderRadius:8, background:agreed?`${T.green}08`:T.surface,
                     border:`1px solid ${agreed?T.green+"40":T.border}` }}>
        <input type="checkbox" id="tc_prem" checked={agreed} onChange={e => setAgreed(e.target.checked)}
          style={{ width:16, height:16, marginTop:1, cursor:"pointer", flexShrink:0 }} />
        <label htmlFor="tc_prem" style={{ fontSize:10, color:T.text, lineHeight:1.5, cursor:"pointer" }}>
          I agree to the{" "}
          <span onClick={() => setShowLegal("terms")} style={{ color:T.accent, textDecoration:"underline", cursor:"pointer" }}>Terms & Conditions</span>
          {" "}and{" "}
          <span onClick={() => setShowLegal("privacy")} style={{ color:T.accent, textDecoration:"underline", cursor:"pointer" }}>Privacy Policy</span>
        </label>
      </div>
      {err && <Err>{err}</Err>}
      <PrimaryBtn loading={loading} onClick={submit}>Register & Submit for Approval</PrimaryBtn>
    </AuthCard>
  );
}

// ─────────────────────────────────────────────────────────────
//  DASHBOARD SHELL
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id:"overview",     label:"Overview",     icon:"◈" },
  { id:"chart",        label:"Live Chart",   icon:"◉" },
  { id:"signals",      label:"Signals",      icon:"⚡" },
  { id:"orders",       label:"Orders",       icon:"⊞" },
  { id:"performance",  label:"Performance",  icon:"📈" },
  { id:"analysis",     label:"Analysis",     icon:"◎" },
  { id:"admin",        label:"Admin",        icon:"⚙" },
];

function Dashboard({ user, logout }) {
  const [theme, setTheme] = useState(_activeTheme);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    _activeTheme = next;
    Object.assign(T, THEMES[next]);
    localStorage.setItem("luma_theme", next);
    setTheme(next);      // force re-render
  };

  const [tab,         setTab]         = useState("terminal");
  const [symbol,      setSymbol]      = useState("EURUSDm");
  const [tf,          setTf]          = useState("M5");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPaystack,    setShowPaystack]    = useState(false);
  const [userData,        setUserData]        = useState(user);

  const isPremium = userData.tier === "premium" && userData.is_approved;

  useEffect(() => {
    api("/api/auth/me").then(u => setUserData(u)).catch(() => {});
    // Load payment gateway public keys at runtime
    fetch("/api/config").then(r => r.json()).then(d => {
      if (d.paystack_public_key)    window.__PAYSTACK_PK__   = d.paystack_public_key;
      if (d.flutterwave_public_key) window.__FLW_PK__        = d.flutterwave_public_key;
      if (d.monnify_api_key)        window.__MONNIFY_API_KEY__= d.monnify_api_key;
      if (d.monnify_contract_code)  window.__MONNIFY_CONTRACT__= d.monnify_contract_code;
    }).catch(() => {});
    const id = setInterval(() => api("/api/auth/me").then(u => setUserData(u)).catch(() => {}), 300000);
    return () => clearInterval(id);
  }, []);

  const onPaymentSuccess = async () => {
    setShowPaystack(false);
    const u = await api("/api/auth/me").catch(() => userData);
    setUserData(u);
    alert("✅ Payment successful! Premium access activated.");
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'IBM Plex Mono',monospace", color:T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Syne:wght@600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${T.bg}; }
        button { cursor:pointer; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .terminal-grid { display:grid; grid-template-columns:1fr 300px; height:calc(100vh - 56px); overflow:hidden; }
        .right-panel { overflow-y:auto; display:flex; flex-direction:column; background:#0e1426; }
        .mobile-bottom-nav {
          display:none; position:fixed; bottom:0; left:0; right:0; height:60px;
          z-index:400; background:#0e1426; border-top:1px solid #1e2d50; align-items:stretch;
        }
        @media (max-width:768px) {
          .terminal-grid { grid-template-columns:1fr !important; height:auto !important; overflow:visible !important; }
          .right-panel { border-top:1px solid #1e2d50; }
          .intel-grid { grid-template-columns:1fr 1fr !important; }
          .sig-grid4 { grid-template-columns:1fr 1fr !important; }
          .topbar-ticks { display:none !important; }
          .topbar-nav { display:none !important; }
          .topbar-user { display:none !important; }
          .topbar-session span { display:none; }
          .topbar-session { padding:4px 8px !important; font-size:7px !important; }
          .topbar-sym span.sym-label { display:none; }
          .topbar-user-label { display:none !important; }
          .pulse-grid { grid-template-columns:1fr !important; }
          .perf-grid4 { grid-template-columns:1fr 1fr !important; }
          .orders-grid { grid-template-columns:1fr !important; }
          .admin-grid { grid-template-columns:1fr !important; }
          .mobile-bottom-nav { display:flex !important; }
          .page-content { padding-bottom:70px !important; }
        }
        @media (min-width:769px) { .mobile-bottom-nav { display:none !important; } }
        @media (max-width:480px) {
          .sig-grid4 { grid-template-columns:1fr 1fr !important; }
          .intel-grid { grid-template-columns:1fr !important; }
        }
      `}</style>
      {showPaystack && <PaystackModal user={userData} onSuccess={onPaymentSuccess} onClose={() => setShowPaystack(false)} />}
      {showEditProfile && <EditProfileModal user={userData} onClose={() => setShowEditProfile(false)} onSaved={() => api("/api/auth/me").then(setUserData).catch(()=>{})} />}
      <TopBar symbol={symbol} setSymbol={setSymbol} tf={tf} setTf={setTf}
              tab={tab} setTab={setTab} user={userData} logout={logout} isPremium={isPremium}
              onUpgrade={() => setShowPaystack(true)} theme={theme} toggleTheme={toggleTheme} />
      <div className="page-content" style={{ paddingTop:56 }}>
        {tab==="terminal"    && <TradingTerminal symbol={symbol} tf={tf} user={user} isPremium={isPremium} />}
        {tab==="signals"     && <SignalsPage isPremium={isPremium} symbol={symbol} />}
        {tab==="orders"      && isPremium && <Orders user={user} symbol={symbol} />}
        {tab==="performance" && <Performance />}
        {tab==="analysis"    && <Analysis symbol={symbol} isPremium={isPremium} />}
        {tab==="admin"       && user.is_admin && <AdminPanel user={user} />}
      <MobileBottomNav tab={tab} setTab={setTab} user={userData} isPremium={isPremium} onUpgrade={() => setShowPaystack(true)} logout={logout} onEditProfile={() => setShowEditProfile(true)} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MOBILE BOTTOM NAV
// ─────────────────────────────────────────────────────────────
function MobileBottomNav({ tab, setTab, user, isPremium, onUpgrade, logout, onEditProfile }) {
  const [showProfile,     setShowProfile]     = useState(false);

  // Always exactly 4 fixed nav buttons + 1 profile button
  const mainNav = [
    { id:"terminal",   icon:"◉",  label:"Terminal"  },
    { id:"signals",    icon:"⚡", label:"Signals"   },
    { id:"analysis",   icon:"◎",  label:"Analysis"  },
    { id:"performance",icon:"📈", label:"Stats"     },
  ];

  // Extra tabs accessible via Profile sheet
  const extraNav = [
    ...(isPremium     ? [{ id:"orders", icon:"⊞", label:"Orders"  }] : []),
    ...(user.is_admin ? [{ id:"admin",  icon:"⚙", label:"Admin"   }] : []),
  ];

  const days  = user?.subscription_days_left ?? null;
  const subColor = days === null ? T.muted : days <= 3 ? T.red : days <= 7 ? T.amber : T.green;

  return (
    <>
      {/* ── Profile slide-up sheet ── */}
      {showProfile && (
        <>
          <div onClick={() => setShowProfile(false)} style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:490,
          }} />
          <div style={{
            position:"fixed", bottom:60, left:0, right:0, zIndex:500,
            background:T.surface, borderTop:`1px solid ${T.border}`,
            borderRadius:"16px 16px 0 0",
            padding:"20px 20px 12px",
            animation:"fadeUp .2s ease",
          }}>
            {/* User info */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20,
                           paddingBottom:16, borderBottom:`1px solid ${T.border}` }}>
              <div style={{
                width:48, height:48, borderRadius:"50%",
                background:`linear-gradient(135deg, ${T.accent}40, ${T.green}40)`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, fontWeight:800, color:T.white, fontFamily:"'Syne',sans-serif",
                flexShrink:0,
              }}>
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.white,
                               overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user.full_name || user.email.split("@")[0]}
                </div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2,
                               overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user.email}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%",
                                 background:isPremium?T.green:T.amber,
                                 boxShadow:`0 0 5px ${isPremium?T.green:T.amber}` }} />
                  <span style={{ fontSize:9, color:isPremium?T.green:T.amber, fontWeight:700, letterSpacing:"1px" }}>
                    {isPremium ? "PREMIUM" : user.tier==="premium" ? "PENDING" : "FREE"}
                  </span>
                  {days !== null && (
                    <span style={{ fontSize:9, color:subColor, marginLeft:4 }}>
                      · {days <= 0 ? "EXPIRED" : `${days}d left`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Extra nav (Orders, Admin) */}
            {extraNav.length > 0 && (
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                {extraNav.map(n => (
                  <button key={n.id} onClick={() => { setTab(n.id); setShowProfile(false); }} style={{
                    flex:1, padding:"10px 0", borderRadius:8, fontFamily:"inherit",
                    fontSize:11, fontWeight:700,
                    background: tab===n.id ? `${T.accent}20` : T.card,
                    color: tab===n.id ? T.accent : T.text,
                    border:`1px solid ${tab===n.id ? T.accent+"40" : T.border}`,
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                  }}>
                    <span style={{ fontSize:18 }}>{n.icon}</span>
                    <span>{n.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Upgrade / Subscription */}
            {!isPremium ? (
              <button onClick={() => { onUpgrade(); setShowProfile(false); }} style={{
                width:"100%", padding:"13px", borderRadius:10, fontFamily:"inherit",
                fontSize:12, fontWeight:800, letterSpacing:"1px", border:"none",
                background:T.green, color:T.bg, marginBottom:10,
              }}>⬆  Upgrade to Premium — ₦15,255/mo</button>
            ) : days !== null && days <= 7 ? (
              <button onClick={() => { onUpgrade(); setShowProfile(false); }} style={{
                width:"100%", padding:"12px", borderRadius:10, fontFamily:"inherit",
                fontSize:12, fontWeight:800, border:"none", marginBottom:10,
                background:days<=3?T.red:T.amber, color:T.bg,
              }}>{days<=3?"⚠️ RENEW NOW":"↻ Renew Subscription"} — {days}d left</button>
            ) : null}

            {/* Edit Profile button */}
            <button onClick={() => { setShowProfile(false); onEditProfile && onEditProfile(); }} style={{
              width:"100%", padding:"10px", borderRadius:7, fontFamily:"inherit",
              fontSize:11, background:T.card, border:`1px solid ${T.border}`,
              color:T.text, marginBottom:8, cursor:"pointer",
            }}>✏️ Edit Profile & Account Settings</button>

            {/* Telegram username if set */}
            {user.telegram_username && (
              <div style={{ fontSize:11, color:T.muted, textAlign:"center", marginBottom:10 }}>
                📱 {user.telegram_username}
              </div>
            )}

            {/* Sign out */}
            <button onClick={logout} style={{
              width:"100%", padding:"11px", borderRadius:8, fontFamily:"inherit",
              fontSize:12, background:"transparent",
              border:`1px solid ${T.border}`, color:T.muted,
            }}>Sign Out</button>
          </div>
        </>
      )}

      {/* ── 4-button bottom bar + Profile ── */}
      <nav className="mobile-bottom-nav">
        {mainNav.map(n => (
          <button key={n.id} onClick={() => { setTab(n.id); setShowProfile(false); }} style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:3, fontFamily:"inherit",
            background:"transparent", border:"none",
            borderTop: tab===n.id ? `2px solid ${T.accent}` : "2px solid transparent",
            color: tab===n.id ? T.accent : T.muted,
          }}>
            <span style={{ fontSize:16 }}>{n.icon}</span>
            <span style={{ fontSize:8, fontWeight:tab===n.id?700:400 }}>{n.label}</span>
          </button>
        ))}
        {/* Profile button */}
        <button onClick={() => setShowProfile(p => !p)} style={{
          flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:3, fontFamily:"inherit",
          background:"transparent", border:"none",
          borderTop: showProfile ? `2px solid ${T.green}` : "2px solid transparent",
          color: showProfile ? T.green : T.muted,
          position:"relative",
        }}>
          <div style={{
            width:22, height:22, borderRadius:"50%",
            background:`linear-gradient(135deg, ${T.accent}50, ${T.green}50)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:800, color:T.white,
          }}>
            {(user.full_name || user.email).charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize:8, fontWeight:showProfile?700:400 }}>Profile</span>
          {/* Red dot for expiry warning */}
          {days !== null && days <= 3 && (
            <div style={{
              position:"absolute", top:4, right:"calc(50% - 14px)",
              width:7, height:7, borderRadius:"50%",
              background:T.red, border:`2px solid ${T.surface}`,
            }} />
          )}
        </button>
      </nav>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  TOP BAR
// ─────────────────────────────────────────────────────────────
function TopBar({ symbol, setSymbol, tf, setTf, tab, setTab, user, logout, isPremium, onUpgrade, theme, toggleTheme }) {
  const [tick, setTick]       = useState(null);
  const [session, setSession] = useState("OFF-PEAK");

  useEffect(() => {
    api(`/api/market/analysis/${symbol}?timeframe=M5`)
      .then(d => setSession(d.session?.replace(/_/g," ") || "OFF-PEAK")).catch(() => {});
  }, [symbol]);

  useEffect(() => {
    const load = () => api(`/api/market/tick/${symbol}`).then(setTick).catch(() => {});
    load(); const id = setInterval(load, 3000); return () => clearInterval(id);
  }, [symbol]);

  const isActive = session.includes("LONDON") || session.includes("NY") || session.includes("OVERLAP");

  const navItems = [
    { id:"terminal",    icon:"◉",  label:"Terminal"     },
    { id:"signals",     icon:"⚡", label:"Signals"      },
    ...(isPremium     ? [{ id:"orders",      icon:"⊞",  label:"Orders"       }] : []),
    { id:"performance", icon:"📈", label:"Performance"  },
    { id:"analysis",    icon:"◎",  label:"Analysis"     },
    ...(user.is_admin ? [{ id:"admin",       icon:"⚙",  label:"Admin"        }] : []),
  ];

  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, height:56, zIndex:300,
      background:T.surface, borderBottom:`1px solid ${T.border}`,
      display:"flex", alignItems:"center", gap:10, padding:"0 14px",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, marginRight:6, cursor:"pointer" }}
           onClick={() => window.open("https://lumafxt.com", "_blank")}>
        {/* Logo mark */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <polygon points="12,2 22,20 2,20" fill={T.accent} opacity="0.9"/>
          <polygon points="12,7 19,18 5,18" fill={T.bg} opacity="0.6"/>
          <circle cx="12" cy="13" r="2.5" fill={T.accent}/>
        </svg>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900, color:T.white, letterSpacing:"1px" }}>
          Luma<span style={{ color:T.accent }}>FX</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:2, background:T.bg, borderRadius:7, padding:3 }}>
        {["EURUSDm","XAUUSDm","BTCUSDm"].map(s => (
          <button key={s} onClick={() => setSymbol(s)} style={{
            padding:"4px 10px", borderRadius:5, fontSize:9, fontFamily:"inherit",
            background:symbol===s?T.accent:"transparent",
            color:symbol===s?T.bg:T.muted, border:"none", fontWeight:symbol===s?700:400,
          }}>{s.replace("m","")}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:2 }}>
        {["M5","M15","H1","H4"].map(t => (
          <button key={t} onClick={() => setTf(t)} style={{
            padding:"4px 8px", borderRadius:5, fontSize:9, fontFamily:"inherit",
            background:tf===t?`${T.accent}20`:"transparent",
            color:tf===t?T.accent:T.muted,
            border:tf===t?`1px solid ${T.accent}40`:"1px solid transparent", fontWeight:tf===t?700:400,
          }}>{t}</button>
        ))}
      </div>
      <div className="topbar-session" style={{
        padding:"4px 10px", borderRadius:20, fontSize:8, fontWeight:700, letterSpacing:"1px",
        background:isActive?`${T.green}15`:`${T.muted}15`,
        color:isActive?T.green:T.muted,
        border:`1px solid ${isActive?T.green:T.muted}33`,
        animation:isActive?"pulse 2s infinite":"none", flexShrink:0,
      }}>{isActive?"●":"○"} <span>{session}</span></div>
      <div className="topbar-ticks" style={{ flex:1, display:"flex", justifyContent:"center", gap:20 }}>
        {tick && <>
          <span style={{ fontSize:9, color:T.text }}>BID <span style={{ color:T.red, fontWeight:700 }}>{fmtPrice(symbol, tick.bid)}</span></span>
          <span style={{ fontSize:9, color:T.text }}>ASK <span style={{ color:T.green, fontWeight:700 }}>{fmtPrice(symbol, tick.ask)}</span></span>
          <span style={{ fontSize:9, color:T.text }}>SPR <span style={{ color:T.amber }}>{displaySpread(symbol, tick.spread)}</span></span>
        </>}
      </div>
      <div className="topbar-nav" style={{ display:"flex", gap:2 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} title={n.label} style={{
            padding:"6px 9px", borderRadius:6, fontSize:12,
            background:tab===n.id?`${T.accent}18`:"transparent",
            color:tab===n.id?T.accent:T.muted,
            border:tab===n.id?`1px solid ${T.accent}30`:"1px solid transparent",
          }}>{n.icon}</button>
        ))}
      </div>
      <div className="topbar-user" style={{ display:"flex", alignItems:"center", gap:7, marginLeft:4 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:isPremium?T.green:T.amber, boxShadow:`0 0 6px ${isPremium?T.green:T.amber}` }} />
        <span className="topbar-user-label" style={{ fontSize:9, color:T.muted, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {user.email.split("@")[0]}
        </span>
        {!isPremium && (
          <button onClick={onUpgrade} style={{
            padding:"4px 9px", borderRadius:5, fontSize:8, fontFamily:"inherit",
            background:`${T.green}20`, border:`1px solid ${T.green}40`, color:T.green, fontWeight:700,
          }}>⬆ PRO</button>
        )}
        {isPremium && <SubBadge user={user} onClick={onUpgrade} />}
        <button onClick={toggleTheme} title={theme==="dark"?"Switch to light mode":"Switch to dark mode"} style={{
          padding:"4px 8px", borderRadius:4, fontSize:11, background:"transparent",
          border:`1px solid ${T.border}`, color:T.muted, cursor:"pointer",
        }}>{theme==="dark"?"☀️":"🌙"}</button>
        <button onClick={logout} style={{
          padding:"4px 8px", borderRadius:4, fontSize:8, fontFamily:"inherit",
          background:"transparent", border:`1px solid ${T.border}`, color:T.muted, letterSpacing:"1px",
        }}>EXIT</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TRADING TERMINAL — image 2 layout
// ─────────────────────────────────────────────────────────────
function TradingTerminal({ symbol, tf, user, isPremium }) {
  const [candles,  setCandles]  = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [signal,   setSignal]   = useState(null);
  const [intelTab, setIntelTab] = useState("intelligence");
  const [placing,  setPlacing]  = useState(null);
  const [placeMsg, setPlaceMsg] = useState("");

  // Account info for overview
  const [acct, setAcct] = useState(null);
  const [autoTrade, setAutoTrade] = useState(false);
  const [atLoading, setAtLoading] = useState(false);
  const [atMsg, setAtMsg]         = useState("");

  useEffect(() => {
    // Clear immediately so old symbol data doesn't show while loading
    setCandles([]);
    setAnalysis(null);
    setSignal(null);

    const load = () => {
      api(`/api/market/ohlcv/${symbol}?timeframe=${tf}&bars=70`)
        .then(d => { if (d.bars) setCandles(d.bars.slice(-55)); })
        .catch(() => {});
      api(`/api/market/analysis/${symbol}?timeframe=${tf}`)
        .then(setAnalysis)
        .catch(() => {});
      api(`/api/signals?symbol=${symbol}&limit=1`)
        .then(d => { if (d.length) setSignal(d[0]); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [symbol, tf]);

  useEffect(() => {
    if (isPremium) {
      api("/api/account/info").then(setAcct).catch(() => {});
      api("/api/account/auto-trade").then(d => setAutoTrade(d.auto_trade)).catch(() => setAutoTrade(false));
    }
  }, [isPremium]);

  const toggleAutoTrade = async () => {
    if (atLoading) return; setAtLoading(true); setAtMsg("");
    try {
      const res = await api("/api/account/auto-trade", { method:"POST", body:JSON.stringify({ enabled:!autoTrade }) });
      setAutoTrade(res.auto_trade);
      setAtMsg(res.auto_trade ? "✅ Auto-trade enabled" : "🔴 Disabled");
    } catch { setAtMsg("❌ Failed"); }
    setAtLoading(false); setTimeout(() => setAtMsg(""), 4000);
  };

  // EMA50
  const closes = candles.map(c => c.close);
  const k50 = 2 / 51; let e50 = closes[0] || 0;
  const ema50s = closes.map(c => { e50 = e50 * (1 - k50) + c * k50; return e50; });

  const score = analysis?.score || 0;
  const cond  = analysis?.condition || "CAUTION";

  const executeOrder = async (dir) => {
    if (!isPremium || placing) return;
    setPlacing(dir); setPlaceMsg("");
    try {
      const tick = await api(`/api/market/tick/${symbol}`);
      const entry = dir === "BUY" ? tick.ask : tick.bid;
      const atr   = analysis?.atr || (
        symbol?.includes("BTC") ? 250 :
        symbol?.includes("XAU") ? 4.0 : 0.0018
      );
      const sl    = dir === "BUY" ? entry - atr * 1.5 : entry + atr * 1.5;
      const tp    = dir === "BUY" ? entry + atr * 3   : entry - atr * 3;
      const res = await api("/api/orders/place", { method:"POST", body:JSON.stringify({ symbol, direction:dir, lot:0.01, sl, tp }) });
      setPlaceMsg(`✅ ${dir} — Ticket #${res.ticket}`);
    } catch(e) { setPlaceMsg(`❌ ${e.message}`); }
    setPlacing(null); setTimeout(() => setPlaceMsg(""), 5000);
  };

  return (
    <div className="terminal-grid">
      {/* ═══ LEFT ═══ */}
      <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", borderRight:`1px solid ${T.border}` }}>

        {/* Account strip — premium only */}
        {isPremium && acct && (
          <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${T.border}`, background:T.surface, flexShrink:0 }}>
            {[
              { label:"BALANCE", value:`$${acct.balance?.toFixed(2)}`, color:T.white  },
              { label:"EQUITY",  value:`$${acct.equity?.toFixed(2)}`,  color:T.green  },
              { label:"MARGIN",  value:`$${acct.free_margin?.toFixed(2)}`, color:T.accent },
              { label:"P&L",     value:`$${acct.profit?.toFixed(2)}`,  color:acct.profit>=0?T.green:T.red },
            ].map((s,i) => (
              <div key={s.label} style={{ flex:1, padding:"8px 14px", borderRight:i<3?`1px solid ${T.border}`:"none" }}>
                <div style={{ fontSize:7, letterSpacing:"2px", color:T.muted, marginBottom:3 }}>{s.label}</div>
                <div style={{ fontFamily:"Syne,sans-serif", fontSize:14, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
            {/* Auto-trade toggle */}
            <div style={{ padding:"8px 14px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:8, color:autoTrade?T.green:T.muted }}>AUTO</div>
              <div onClick={toggleAutoTrade} style={{
                width:36, height:18, borderRadius:9, cursor:atLoading?"not-allowed":"pointer",
                background:autoTrade?T.green:T.muted, position:"relative", opacity:atLoading?0.5:1,
              }}>
                <div style={{ position:"absolute", top:3, left:autoTrade?18:3, width:12, height:12, borderRadius:"50%", background:T.white, transition:"left .2s" }} />
              </div>
              {atMsg && <span style={{ fontSize:8, color:atMsg.startsWith("✅")?T.green:T.amber }}>{atMsg}</span>}
            </div>
          </div>
        )}

        {/* Chart */}
        <div style={{ flex:1, overflow:"hidden" }}>
          <CandleChartWithZones candles={candles} ema50s={ema50s} signal={signal} symbol={symbol} tf={tf} />
        </div>

        {/* Intelligence / Alerts tabs */}
        <div style={{ height:180, borderTop:`1px solid ${T.border}`, background:T.surface, flexShrink:0 }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${T.border}` }}>
            {[["intelligence","◈  INTELLIGENCE"],["alerts","🔔  ALERTS"]].map(([id,label]) => (
              <button key={id} onClick={() => setIntelTab(id)} style={{
                padding:"8px 16px", fontSize:8, fontFamily:"inherit", fontWeight:700, letterSpacing:"1.5px",
                border:"none", background:intelTab===id?T.card:"transparent",
                color:intelTab===id?T.accent:T.muted,
                borderBottom:intelTab===id?`2px solid ${T.accent}`:"2px solid transparent",
              }}>{label}</button>
            ))}
          </div>
          {intelTab==="intelligence" && analysis && (
            <div className="intel-grid" style={{ padding:"12px 14px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              <IntelCell icon="↗" label="Trend" val={`${analysis.trend} (${analysis.strength})`}
                vColor={analysis.trend==="BULLISH"?T.green:analysis.trend==="BEARISH"?T.red:T.amber}
                tag={analysis.condition} tagColor={{GOOD:T.green,CAUTION:T.amber,AVOID:T.red}[analysis.condition]||T.muted} />
              <IntelCell icon="◎" label="RSI" val={`${analysis.rsi?.toFixed(0)} (${analysis.rsi_label})`} vColor={T.white}
                tag={analysis.session?.replace(/_/g," ").slice(0,16)} tagColor={T.accent} />
              <IntelCell icon="↕" label="Spread" val={displaySpread(symbol, analysis.spread_pips)}
                vColor={analysis.spread_ok?T.green:T.red}
                tag={analysis.spread_ok?"OK":"HIGH"} tagColor={analysis.spread_ok?T.green:T.red} />
            </div>
          )}
          {intelTab==="alerts" && <AlertsList signal={signal} analysis={analysis} />}
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="right-panel">
        <TradeSetupPanel signal={signal} isPremium={isPremium} symbol={symbol}
                         executeOrder={executeOrder} placing={placing} placeMsg={placeMsg} analysis={analysis} />
        <div style={{ height:1, background:T.border }} />
        <StrengthGauge score={score} condition={cond} />
        <div style={{ height:1, background:T.border }} />
        <MarketIntelPanel analysis={analysis} symbol={symbol} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SIGNALS PAGE
// ─────────────────────────────────────────────────────────────
function SignalsPage({ isPremium, symbol }) {
  const [signals,   setSignals]   = useState([]);
  const [allSignals,setAllSignals]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("ready");    // "ready" | "all"
  const [symFilter, setSymFilter] = useState("all");      // "all" | selected symbol

  const addSignal = (s, prev) => {
    const next = [s, ...prev.filter(x => x.id !== s.id)].slice(0, 50);
    return next;
  };

  // Re-fetch when symbol changes
  useEffect(() => {
    setLoading(true);
    api("/api/signals?limit=50").then(d => {
      setAllSignals(d);
      setSignals(d.filter(s => s.market_condition === "GOOD" && s.status === "active"));
      setLoading(false);
    }).catch(() => setLoading(false));
    try {
      const ws = new WebSocket(`${WS}/ws/signals`);
      ws.onmessage = e => {
        try {
          const s = JSON.parse(e.data);
          setAllSignals(prev => addSignal(s, prev));
          if (s.market_condition === "GOOD" && s.status === "active") {
            setSignals(prev => addSignal(s, prev));
          }
        } catch {}
      };
      ws.onerror = () => {};
      return () => ws.close();
    } catch {}
  }, []);

  // Apply both the ready/all filter AND the symbol filter
  const baseList = filter === "ready" ? signals : allSignals;
  const displayed = symFilter === "all"
    ? baseList
    : baseList.filter(s => s.symbol === symFilter);

  // Auto-set symFilter when parent symbol changes
  useEffect(() => {
    if (symbol) setSymFilter(symbol);
  }, [symbol]);

  if (loading) return <Spinner />;

  return (
    <div style={{ padding:"20px 24px", maxWidth:900, margin:"0 auto" }}>
      <MarketPulse />

      {/* Symbol filter tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:9, color:T.muted, letterSpacing:"1px", flexShrink:0 }}>PAIR:</span>
        {["all","EURUSDm","XAUUSDm","BTCUSDm"].map(s => {
          const count = (filter==="ready"?signals:allSignals).filter(x => s==="all"||x.symbol===s).length;
          return (
            <button key={s} onClick={() => setSymFilter(s)} style={{
              padding:"5px 12px", borderRadius:6, fontSize:9, fontFamily:"inherit",
              background: symFilter===s ? T.accent : T.surface,
              color: symFilter===s ? T.bg : T.muted,
              border:`1px solid ${symFilter===s ? T.accent : T.border}`,
              fontWeight: symFilter===s ? 700 : 400,
            }}>{s==="all" ? "All Pairs" : s.replace("m","")} {count > 0 ? `(${count})` : ""}</button>
          );
        })}
      </div>

      {/* Ready / All toggle */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
        <span style={{ fontSize:9, color:T.muted, letterSpacing:"1px" }}>STATUS:</span>
        {[
          { id:"ready", label:`✅ Ready to Trade (${signals.length})` },
          { id:"all",   label:`📋 All Signals (${allSignals.length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding:"5px 12px", borderRadius:6, fontSize:9, fontFamily:"inherit",
            background: filter===f.id ? T.green : T.surface,
            color: filter===f.id ? T.bg : T.muted,
            border:`1px solid ${filter===f.id ? T.green : T.border}`,
            fontWeight: filter===f.id ? 700 : 400,
          }}>{f.label}</button>
        ))}
        {filter==="ready" && displayed.length === 0 && (
          <span style={{ fontSize:9, color:T.amber }}>⏳ No ready signals for {symFilter==="all"?"any pair":symFilter.replace("m","")} right now. The engine is scanning...</span>
        )}
      </div>

      <div style={{ display:"grid", gap:10 }}>
        {displayed.length === 0 && filter === "all" && (
          <Card><Muted>No signals yet — engine running.</Muted></Card>
        )}
        {displayed.map(s => (
          <SignalCard key={s.id}
            sig={{...s, _isPremium: isPremium}}
            showExecute={s.market_condition === "GOOD" && s.status === "active"} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SPREAD NORMALIZER
//  Raw broker points ≠ pips. XAU/BTC have 2-digit pricing so
//  1 point ≠ 0.0001. Normalize per symbol type.
// ─────────────────────────────────────────────────────────────
function displaySpread(symbol, raw) {
  if (raw == null) return "N/A";
  const v = Number(raw);
  if (!isFinite(v) || v <= 0) return "N/A";

  if (symbol?.includes("BTC")) {
    // BTC spread is in broker points (e.g. 50 pts = $50 wide)
    // Values over 10,000 are clearly raw broker ticks, cap/normalise
    const pts = v > 10000 ? (v / 100).toFixed(0) : v.toFixed(0);
    return `${pts} pts`;
  }
  if (symbol?.includes("XAU")) {
    // Gold spread in points — broker returns e.g. 30 = $0.30/oz
    const pts = v > 1000 ? (v / 100).toFixed(1) : v.toFixed(1);
    return `${pts} pts`;
  }
  // Forex 5-digit: broker points → pips (÷10)
  // Guard against absurdly large values from broker returning ticks
  if (v > 1000) return `${(v / 10).toFixed(1)} pips`;
  if (v > 100)  return `${(v / 10).toFixed(1)} pips`;
  return `${v.toFixed(1)} pips`;
}


// Symbol-aware price formatter — BTC=0dp  XAU=2dp  forex=5dp
function fmtPrice(symbol, value) {
  if (value == null) return "—";
  const v = Number(value);
  if (symbol?.includes("BTC")) return v.toFixed(0);
  if (symbol?.includes("XAU")) return v.toFixed(2);
  return v.toFixed(5);
}
// ─────────────────────────────────────────────────────────────
//  TICKER BADGE
// ─────────────────────────────────────────────────────────────
function TickerBadge({ symbol }) {
  const [tick, setTick] = useState(null);
  useEffect(() => {
    const load = () => api(`/api/market/tick/${symbol}`).then(setTick).catch(() => {});
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [symbol]);

  if (!tick) return null;
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10,
                  padding:"10px 20px", display:"flex", gap:24, alignItems:"center" }}>
      <Stat label="BID" value={fmtPrice(symbol, tick.bid)} color={T.red} />
      <Stat label="ASK" value={fmtPrice(symbol, tick.ask)} color={T.green} />
      <Stat label="SPREAD" value={displaySpread(symbol, tick.spread)} color={T.amber} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  OVERVIEW
// ─────────────────────────────────────────────────────────────
function Overview({ user, symbol, isPremium }) {
  const [acct, setAcct]           = useState(null);
  const [analysis, setAnal]       = useState(null);
  const [signals, setSigs]        = useState([]);
  const [autoTrade, setAutoTrade] = useState(false);
  const [atLoading, setAtLoading] = useState(false);
  const [atMsg, setAtMsg]         = useState("");

  useEffect(() => {
    if (isPremium) {
      api("/api/account/info").then(setAcct).catch(() => {});
      // Fetch auto-trade status from server, not stale user object
      api("/api/account/auto-trade")
        .then(d => setAutoTrade(d.auto_trade))
        .catch(() => setAutoTrade(user.auto_trade || false));
    }
    api(`/api/market/analysis/${symbol}`).then(setAnal).catch(() => {});
    api("/api/signals?limit=5").then(setSigs).catch(() => {});
  }, [symbol, isPremium]);

  const toggleAutoTrade = async () => {
    if (atLoading) return;
    setAtLoading(true);
    setAtMsg("");
    try {
      const res = await api("/api/account/auto-trade", {
        method: "POST",
        body:   JSON.stringify({ enabled: !autoTrade }),
      });
      setAutoTrade(res.auto_trade);
      setAtMsg(res.auto_trade ? "✅ Auto-trade enabled" : "🔴 Auto-trade disabled");
    } catch (e) {
      setAtMsg("❌ Failed to update — check backend");
    }
    setAtLoading(false);
    setTimeout(() => setAtMsg(""), 4000);
  };

  return (
    <div>
      {/* Auto-trade toggle — approved premium only */}
      {isPremium && (
        <div style={{
          marginBottom:20, padding:"16px 20px",
          background: autoTrade ? `${T.green}12` : T.surface,
          border:`1px solid ${autoTrade ? T.green : T.border}`,
          borderRadius:12, display:"flex", alignItems:"center",
          justifyContent:"space-between", gap:16,
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:600,
                          color: autoTrade ? T.green : T.white, marginBottom:4 }}>
              {autoTrade ? "🤖 Auto-Trade ENABLED" : "⏸ Auto-Trade DISABLED"}
            </div>
            <div style={{ fontSize:10, color:T.muted, lineHeight:1.6 }}>
              {autoTrade
                ? "Signals are being automatically executed on your MT5 account."
                : "You receive signal alerts only. Toggle to auto-execute trades on your MT5."}
            </div>
            {atMsg && (
              <div style={{ fontSize:10, marginTop:6,
                color: atMsg.startsWith("✅") ? T.green
                     : atMsg.startsWith("🔴") ? T.amber : T.red }}>
                {atMsg}
              </div>
            )}
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div
              onClick={toggleAutoTrade}
              style={{
                width:52, height:28, borderRadius:14,
                cursor: atLoading ? "not-allowed" : "pointer",
                background: autoTrade ? T.green : T.muted,
                position:"relative", transition:"background .25s",
                opacity: atLoading ? 0.5 : 1,
              }}
            >
              <div style={{
                position:"absolute", top:4,
                left: autoTrade ? 28 : 4,
                width:20, height:20, borderRadius:"50%",
                background:T.white, transition:"left .25s",
                boxShadow:"0 1px 4px rgba(0,0,0,0.4)",
              }} />
            </div>
            <div style={{ fontSize:8, letterSpacing:"1px",
                          color: autoTrade ? T.green : T.muted }}>
              {atLoading ? "SAVING..." : autoTrade ? "ON" : "OFF"}
            </div>
          </div>
        </div>
      )}

      {/* Account row (premium only) */}
      {isPremium && acct && (
        <div className="grid-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"BALANCE",     value:`$${acct.balance?.toFixed(2)}`,      color:T.white  },
            { label:"EQUITY",      value:`$${acct.equity?.toFixed(2)}`,       color:T.green  },
            { label:"FREE MARGIN", value:`$${acct.free_margin?.toFixed(2)}`,  color:T.accent },
            { label:"PROFIT",      value:`$${acct.profit?.toFixed(2)}`,       color: acct.profit >= 0 ? T.green : T.red },
          ].map(s => (
            <Card key={s.label}>
              <div style={{ fontSize:9, letterSpacing:"2px", color:T.muted, marginBottom:8 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:600, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Market condition */}
        {analysis && <MarketConditionCard analysis={analysis} />}

        {/* Recent signals */}
        <Card title="RECENT SIGNALS">
          {signals.length === 0 && <Muted>No signals yet.</Muted>}
          {signals.map(s => <SignalRow key={s.id} sig={s} />)}
        </Card>
      </div>

      {/* Upgrade prompt for free users */}
      {!isPremium && (
        <div style={{ marginTop:16, background: `linear-gradient(135deg, ${T.accent}18, ${T.green}12)`,
                      border:`1px solid ${T.accent}44`, borderRadius:12, padding:24 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, color:T.white, fontWeight:700, marginBottom:8 }}>
            🚀 Upgrade to Premium
          </div>
          <p style={{ fontSize:12, color:T.text, lineHeight:1.7, marginBottom:0 }}>
            Get trades automatically copied to your MT5 account in real time.
            Place and close orders directly from this dashboard.
            {user.tier==="premium" && !user.is_approved &&
              " Your account is pending admin approval after payment confirmation."}
          </p>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
//  STRENGTH GAUGE — SVG speedometer
// ─────────────────────────────────────────────────────────────
function StrengthGauge({ score = 0, condition = "CAUTION" }) {
  const cx = 100, cy = 90, r = 65;
  const toRad = deg => (deg * Math.PI) / 180;
  const arcPath = (s, e, color, sw = 9) => {
    const sr = toRad(s), er = toRad(e);
    const x1=cx+r*Math.cos(sr),y1=cy+r*Math.sin(sr),x2=cx+r*Math.cos(er),y2=cy+r*Math.sin(er);
    const large = Math.abs(e-s)>180?1:0;
    return <path key={color+s} d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"/>;
  };
  const minA=-210,maxA=-30;
  const needleDeg = minA + (Math.min(score,100)/100)*(maxA-minA);
  const nr = toRad(needleDeg);
  const nx = cx+(r-12)*Math.cos(nr), ny = cy+(r-12)*Math.sin(nr);
  const label = score>=75?"GREAT TIME TO TRADE":score>=50?"OKAY SETUP":score>=30?"RISKY, BE CAREFUL":"STAY OUT";
  const gColor = score>=75?T.green:score>=50?T.amber:T.red;
  return (
    <div style={{ textAlign:"center", padding:"14px 14px 10px" }}>
      <div style={{ fontSize:8, letterSpacing:"2px", color:T.muted, marginBottom:6 }}>INTELLIGENCE</div>
      <svg width={200} height={115} style={{ display:"block", margin:"0 auto" }}>
        {arcPath(-210,-90,T.red)} {arcPath(-90,-60,T.amber)} {arcPath(-60,-30,T.green)}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={T.white} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={6} fill={T.card} stroke={T.white} strokeWidth={2}/>
        <text x={cx} y={cy+22} textAnchor="middle" fill={gColor} fontSize={22} fontWeight="800" fontFamily="Syne,sans-serif">{score}</text>
        <text x={cx} y={cy+34} textAnchor="middle" fill={T.muted} fontSize={7} letterSpacing="1">{label}</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CANDLESTICK CHART WITH BUY/SELL ZONES + EMA50 + S/R
// ─────────────────────────────────────────────────────────────
function CandleChartWithZones({ candles, ema50s, signal, symbol, tf }) {
  if (!candles.length) return (
    <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:T.muted, fontSize:11 }}>
      Loading chart...
    </div>
  );
  const allH=candles.map(c=>c.high), allL=candles.map(c=>c.low);
  const minP=Math.min(...allL)*0.9998, maxP=Math.max(...allH)*1.0002;
  const pR=maxP-minP, N=candles.length, cW=10, gap=3;
  const totalW=N*(cW+gap), H=320, PAD={t:16,b:28,l:6,r:66};
  const chartW=Math.max(totalW+PAD.r,480);
  const px=i=>PAD.l+i*(cW+gap)+cW/2;
  const py=p=>PAD.t+((maxP-p)/pR)*(H-PAD.t-PAD.b);
  const yTicks=Array.from({length:6},(_,i)=>minP+(pR*i)/5);
  const sH=[],sL=[];
  for(let i=2;i<candles.length-2;i++){
    if(candles[i].high>candles[i-1].high&&candles[i].high>candles[i+1].high&&candles[i].high>candles[i-2].high&&candles[i].high>candles[i+2].high) sH.push(candles[i].high);
    if(candles[i].low<candles[i-1].low&&candles[i].low<candles[i+1].low&&candles[i].low<candles[i-2].low&&candles[i].low<candles[i+2].low) sL.push(candles[i].low);
  }
  const recentH=sH.slice(-1)[0], recentL=sL.slice(-1)[0];
  const sigBuy=signal?.direction==="BUY", sigSell=signal?.direction==="SELL";
  const ztPx=signal?.entry?py(signal.entry):null, zbPx=signal?.sl?py(signal.sl):null;
  const digits=symbol?.includes("BTC")?0:symbol?.includes("XAU")?2:5;
  const fmt=v=>v?.toFixed(digits);
  return (
    <div style={{ width:"100%", height:"100%", overflowX:"auto", overflowY:"hidden", background:T.bg }}>
      <svg width={chartW} height={H} style={{ display:"block" }}>
        <rect width={chartW} height={H} fill={T.bg}/>
        {yTicks.map((v,i)=>{const y=py(v);return(
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={chartW-4} y2={y} stroke={T.border} strokeWidth={0.5} strokeDasharray="4 6" opacity={0.5}/>
            <text x={chartW-2} y={y+3.5} fill={T.muted} fontSize={7.5} textAnchor="end">{fmt(v)}</text>
          </g>
        );})}
        {recentH&&<><line x1={PAD.l} y1={py(recentH)} x2={chartW-4} y2={py(recentH)} stroke={T.red} strokeWidth={0.8} strokeDasharray="8 5" opacity={0.4}/><text x={chartW-2} y={py(recentH)-2} fill={T.red} fontSize={7} textAnchor="end">R</text></>}
        {recentL&&<><line x1={PAD.l} y1={py(recentL)} x2={chartW-4} y2={py(recentL)} stroke={T.green} strokeWidth={0.8} strokeDasharray="8 5" opacity={0.4}/><text x={chartW-2} y={py(recentL)-2} fill={T.green} fontSize={7} textAnchor="end">S</text></>}
        {(sigBuy||sigSell)&&ztPx!==null&&zbPx!==null&&(
          <g>
            <rect x={PAD.l} y={Math.min(ztPx,zbPx)} width={chartW-PAD.l-4} height={Math.abs(zbPx-ztPx)} fill={sigBuy?`${T.green}12`:`${T.red}12`}/>
            <rect x={PAD.l} y={Math.min(ztPx,zbPx)} width={chartW-PAD.l-4} height={Math.abs(zbPx-ztPx)} fill="none" stroke={sigBuy?T.green:T.red} strokeWidth={1} strokeDasharray="6 4" opacity={0.45}/>
            <text x={PAD.l+10} y={Math.max(ztPx,zbPx)-6} fill={sigBuy?T.green:T.red} fontSize={9} fontWeight="700">{sigBuy?"BUY ZONE":"SELL ZONE"}</text>
          </g>
        )}
        {signal?.entry&&<><line x1={PAD.l} y1={py(signal.entry)} x2={chartW-4} y2={py(signal.entry)} stroke={T.amber} strokeWidth={1.5} strokeDasharray="10 4"/><text x={PAD.l+8} y={py(signal.entry)-4} fill={T.amber} fontSize={8} fontWeight="700">ENTRY {fmt(signal.entry)}</text></>}
        {ema50s.length>1&&<polyline points={ema50s.map((v,i)=>`${px(i)},${py(v)}`).join(" ")} fill="none" stroke={T.amber} strokeWidth={1.3} opacity={0.75}/>}
        {candles.map((d,i)=>{
          const bull=d.close>=d.open, col=bull?T.green:T.red;
          const bT=py(Math.max(d.open,d.close)), bB=py(Math.min(d.open,d.close));
          const bH=Math.max(bB-bT,1), wX=px(i);
          const sweep=(d.high-d.low)>0&&Math.abs(d.close-d.open)>0&&((d.high-d.low)/Math.abs(d.close-d.open))>3;
          return(<g key={i}>
            <line x1={wX} y1={py(d.high)} x2={wX} y2={py(d.low)} stroke={col} strokeWidth={1} opacity={0.8}/>
            <rect x={px(i)-cW/2} y={bT} width={cW} height={bH} fill={bull?`${T.green}cc`:`${T.red}cc`} stroke={col} strokeWidth={0.5}/>
            {sweep&&<text x={wX-4} y={py(bull?d.low:d.high)+(bull?12:-4)} fill={T.amber} fontSize={8}>⚡</text>}
          </g>);
        })}
        {candles.filter((_,i)=>i%10===0).map((d,ii)=>{
          const orig=ii*10, label=typeof d.time==="string"?d.time.slice(11,16):"";
          return<text key={ii} x={px(orig)} y={H-8} fill={T.muted} fontSize={7} textAnchor="middle">{label}</text>;
        })}
        <text x={PAD.l+6} y={PAD.t+10} fill={T.amber} fontSize={7} opacity={0.8}>EMA 50</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TRADE SETUP PANEL (right column)
// ─────────────────────────────────────────────────────────────
function TradeSetupPanel({ signal: signalProp, isPremium, symbol: symbolProp, analysis: analysisProp }) {
  const [localSym,      setLocalSym]      = useState(symbolProp || "EURUSDm");
  const [localSignal,   setLocalSignal]   = useState(null);
  const [localAnalysis, setLocalAnalysis] = useState(null);
  const [liveTick,      setLiveTick]      = useState(null);    // ← live prices
  const [loadingSig,    setLoadingSig]    = useState(false);
  const [execMsg,       setExecMsg]       = useState("");
  const [execPlacing,   setExecPlacing]   = useState(null);

  // ── Sync symbol from parent ──────────────────────────────
  useEffect(() => { setLocalSym(symbolProp); }, [symbolProp]);

  // ── On symbol change: clear everything, then fetch ───────
  useEffect(() => {
    setLocalSignal(null);
    setLocalAnalysis(null);
    setLiveTick(null);
    setLoadingSig(true);

    Promise.allSettled([
      api(`/api/signals?symbol=${localSym}&limit=1`),
      api(`/api/market/analysis/${localSym}?timeframe=M5`),
      api(`/api/market/tick/${localSym}`),
    ]).then(([sR, aR, tR]) => {
      // ── CRITICAL: only accept signal if its symbol matches selected symbol ──
      if (sR.status === "fulfilled" && sR.value?.length) {
        const sig = sR.value[0];
        if (sig.symbol === localSym) setLocalSignal(sig);
        else setLocalSignal(null);  // reject wrong-symbol signal
      } else {
        setLocalSignal(null);
      }
      if (aR.status === "fulfilled" && aR.value) setLocalAnalysis(aR.value);
      if (tR.status === "fulfilled" && tR.value) setLiveTick(tR.value);
      setLoadingSig(false);
    });
  }, [localSym]);

  // ── Poll live tick every 3s ──────────────────────────────
  useEffect(() => {
    const load = () => {
      api(`/api/market/tick/${localSym}`).then(setLiveTick).catch(() => {});
    };
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [localSym]);

  // ── Symbol-aware price formatting ────────────────────────
  const digits  = localSym?.includes("BTC") ? 0 : localSym?.includes("XAU") ? 2 : 5;
  const fmt     = v => (v != null ? Number(v).toFixed(digits) : "—");

  // ── Derived values ───────────────────────────────────────
  const atr     = localAnalysis?.atr || (localSym?.includes("BTC") ? 250 : localSym?.includes("XAU") ? 4.0 : 0.0018);
  const signal  = localSignal;
  const analysis= localAnalysis;
  const symbol  = localSym;

  // ── Signal freshness check ────────────────────────────────
  // A signal older than 4 hours is stale — market may have reversed
  const STALE_MS   = 30 * 60 * 1000;   // 30 min — M5 signals expire fast
  const sigAge     = signal?.created_at ? Date.now() - new Date(signal.created_at + "Z").getTime() : Infinity;
  const isStale    = sigAge > STALE_MS;
  const sigAgeHrs  = Math.floor(sigAge / 3600000);
  const sigAgeMins = Math.floor((sigAge % 3600000) / 60000);
  const sigAgeStr  = sigAge < 3600000 ? `${sigAgeMins}m ago` : `${sigAgeHrs}h ${sigAgeMins}m ago`;

  // ── Direction — from signal only if fresh ─────────────────
  const rawDirection = signal?.direction || null;
  const direction    = rawDirection && !isStale ? rawDirection : null;
  const isBuy        = direction === "BUY";

  // ── Conflict detection: signal direction vs live trend ────
  // If signal says BUY but market is now BEARISH (or vice versa), warn the user
  const liveTrend    = analysis?.trend;   // "BULLISH" | "BEARISH" | "NEUTRAL"
  const conflict     = direction && liveTrend && liveTrend !== "NEUTRAL" &&
    ((isBuy  && liveTrend === "BEARISH") ||
     (!isBuy && liveTrend === "BULLISH"));

  // ── Live price levels ─────────────────────────────────────
  // Always use live tick — NEVER stored DB prices
  const liveEntry = liveTick ? (isBuy ? liveTick.ask : liveTick.bid) : null;
  const liveSL    = liveEntry != null ? (isBuy ? liveEntry - atr * 1.5 : liveEntry + atr * 1.5) : null;
  const liveTP    = liveEntry != null ? (isBuy ? liveEntry + atr * 3   : liveEntry - atr * 3  ) : null;

  // ── Auto-alert when conditions turn GOOD ─────────────────
  // If live analysis shows GOOD condition and no recent signal exists,
  // ping the backend so it fires the signal to Telegram + DB.
  const [lastAlertSym, setLastAlertSym] = useState(null);
  useEffect(() => {
    const isGood = localAnalysis?.condition === "GOOD" && localAnalysis?.spread_ok;
    const notAlerted = lastAlertSym !== localSym;
    if (isGood && notAlerted && !loadingSig) {
      setLastAlertSym(localSym);
      // Ask backend to process this symbol immediately — it will save signal + fire Telegram
      api(`/api/signals/trigger/${localSym}`, { method:"POST" }).catch(() => {});
      // Refresh signals
      api(`/api/signals?symbol=${localSym}&limit=1`).then(d => {
        if (d.length && d[0].symbol === localSym) setLocalSignal(d[0]);
      }).catch(() => {});
    }
    // Reset when conditions drop below GOOD so next GOOD triggers again
    if (!isGood && lastAlertSym === localSym) {
      setLastAlertSym(null);
    }
  }, [localAnalysis?.condition, localSym]);

  // ── Spread guard ─────────────────────────────────────────
  // Reject if broker spread is too wide — thresholds per symbol
  const rawSpread     = liveTick?.spread || 0;
  const spreadTooHigh = localSym?.includes("BTC")
    ? rawSpread > 5000          // BTC: > ~$50 spread
    : localSym?.includes("XAU")
    ? rawSpread > 300           // XAU: > 3.00 pts
    : rawSpread > 50;           // Forex: > 5.0 pips

  // ── Price drift guard ────────────────────────────────────
  // If price has moved more than 1×ATR away from signal entry in the WRONG direction,
  // the signal is no longer valid (market has run away from the setup)
  const sigEntry     = signal?.entry;
  const priceDrift   = liveTick && sigEntry
    ? (isBuy
        ? sigEntry - liveTick.bid    // BUY: price dropped below entry = bad
        : liveTick.ask - sigEntry)   // SELL: price rose above entry = bad
    : 0;
  const driftTooFar  = priceDrift > atr * 0.8;  // price moved > 80% of ATR against signal

  // ── Final condition — overrides stored DB value if market is bad now ──
  const baseCond     = (!isStale && signal?.market_condition) || analysis?.condition || "CAUTION";
  const cond = spreadTooHigh
    ? "AVOID"   // spread override — always wins
    : driftTooFar
    ? "AVOID"   // price has moved too far — entry no longer valid
    : conflict
    ? "CAUTION" // direction conflict — downgrade from GOOD to CAUTION
    : baseCond;

  // ── Readable status label ─────────────────────────────────
  const conf   = signal?.bos_confirmed ? "A green candle appeared at a key support level"
               : signal?.ob_confirmed  ? "Price broke out of its overnight range"
               : "Price pulled back to a key level";
  const sColor = cond==="GOOD" ? T.green : cond==="CAUTION" ? T.amber : T.red;
  const sLabel = spreadTooHigh
    ? "🔴 Broker fee too high right now — wait before trading"
    : driftTooFar
    ? `⚠️ Price moved too far ${isBuy?"below":"above"} entry — signal no longer valid`
    : conflict
    ? `⚠️ Signal says ${direction} but market is moving the other way — skip this`
    : cond==="GOOD"
    ? "✅ Good time to trade!"
    : cond==="CAUTION"
    ? "⏳ Not ready yet — keep watching"
    : "🚫 Don't trade now";

  // ── Execution ─────────────────────────────────────────────
  const doExecute = async (dir) => {
    if (!isPremium || execPlacing) return;
    setExecPlacing(dir); setExecMsg("");
    try {
      // Always fetch a fresh tick right before placing the order
      const tick  = await api(`/api/market/tick/${symbol}`);
      const entry = dir === "BUY" ? tick.ask : tick.bid;
      const sl    = dir === "BUY" ? entry - atr * 1.5 : entry + atr * 1.5;
      const tp    = dir === "BUY" ? entry + atr * 3   : entry - atr * 3;
      await api("/api/orders/place", {
        method: "POST",
        body:   JSON.stringify({ symbol, direction:dir, lot:0.01, sl, tp }),
      });
      setExecMsg(`✅ Done! Your ${dir} trade on ${symbol} was placed.`);
    } catch(e) {
      const m = e.message || "";
      setExecMsg(
        m.toLowerCase().includes("margin") || m.toLowerCase().includes("insufficient")
          ? "❌ Not enough funds in your account. Please top up your MT5."
          : m.toLowerCase().includes("closed")
          ? "❌ Market is closed now. Best time: 2–5 PM Nigeria time."
          : `❌ Trade failed: ${m}`
      );
    }
    setExecPlacing(null);
    setTimeout(() => setExecMsg(""), 5000);
  };

  return (
    <div style={{ padding:"14px 14px 10px", borderBottom:`1px solid ${T.border}` }}>

      {/* ── Header + Symbol selector ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:8, letterSpacing:"2px", color:T.muted }}>TRADE SETUP</div>
        <div style={{ display:"flex", gap:2, background:T.bg, borderRadius:5, padding:2 }}>
          {["EURUSDm","XAUUSDm","BTCUSDm"].map(s => (
            <button key={s} onClick={() => setLocalSym(s)} style={{
              padding:"3px 8px", borderRadius:4, fontSize:8, fontFamily:"inherit",
              background:localSym===s?T.accent:"transparent",
              color:localSym===s?T.bg:T.muted, border:"none", fontWeight:localSym===s?700:400,
              transition:"all .15s",
            }}>{s.replace("m","")}</button>
          ))}
        </div>
      </div>

      {/* ── Live price strip — always shows real-time data ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:14 }}>
        {[
          { label:"BID",    val:liveTick ? fmt(liveTick.bid)  : "—", color:T.red   },
          { label:"ASK",    val:liveTick ? fmt(liveTick.ask)  : "—", color:T.green },
          { label:"SPREAD", val:liveTick ? displaySpread(symbol, liveTick.spread) : "—", color:spreadTooHigh ? T.red : T.green },
        ].map(r => (
          <div key={r.label} style={{ background:T.bg, borderRadius:6, padding:"7px 8px",
                                       border:`1px solid ${T.border}`, textAlign:"center" }}>
            <div style={{ fontSize:7, color:T.muted, marginBottom:3, letterSpacing:"1px" }}>{r.label}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:800, color:r.color }}>
              {loadingSig && !liveTick ? "…" : r.val}
            </div>
          </div>
        ))}
      </div>

      {/* ── No signal state ── */}
      {loadingSig && !liveTick && (
        <div style={{ textAlign:"center", padding:"14px 0", color:T.muted, fontSize:10 }}>
          Loading {localSym} data...
        </div>
      )}

      {/* ── Spread too high banner ── */}
      {spreadTooHigh && liveTick && (
        <div style={{ padding:"10px 12px", borderRadius:8, background:`${T.red}12`,
                       border:`1px solid ${T.red}40`, marginBottom:12 }}>
          <div style={{ fontSize:11, color:T.red, fontWeight:700, marginBottom:3 }}>
            🔴 Broker fee (spread) is too high right now
          </div>
          <div style={{ fontSize:9, color:T.muted, lineHeight:1.6 }}>
            Current spread: <strong style={{ color:T.red }}>{displaySpread(symbol, rawSpread)}</strong>.
            This means you start every trade at a big loss just from the fee.
            Wait for the spread to drop before entering any trade.
            Usually improves after a few minutes.
          </div>
        </div>
      )}

      {/* ── STALE SIGNAL BANNER ── */}
      {signal && isStale && (
        <div style={{ padding:"10px 12px", borderRadius:8, background:`${T.amber}12`,
                       border:`1px solid ${T.amber}40`, marginBottom:12 }}>
          <div style={{ fontSize:10, color:T.amber, fontWeight:700, marginBottom:3 }}>
            ⚠️ Signal is {sigAgeStr} old — may be outdated
          </div>
          <div style={{ fontSize:9, color:T.muted, lineHeight:1.5 }}>
            The market may have changed direction. No setup is showing below because of this.
            The engine will generate a new signal when conditions are right.
          </div>
        </div>
      )}

      {/* ── PRICE DRIFT WARNING: price moved too far from signal entry ── */}
      {driftTooFar && direction && !spreadTooHigh && (
        <div style={{ padding:"10px 12px", borderRadius:8, background:`${T.red}10`,
                       border:`1px solid ${T.red}40`, marginBottom:12 }}>
          <div style={{ fontSize:10, color:T.red, fontWeight:700, marginBottom:4 }}>
            ⚠️ Signal is no longer valid — price moved away
          </div>
          <div style={{ fontSize:9, color:T.muted, lineHeight:1.5 }}>
            {isBuy
              ? "The BUY signal fired, but the price has since dropped too far. Entering now puts you in a bad position from the start. Wait for a new signal."
              : "The SELL signal fired, but the price has since risen too far. Entering now puts you in a bad position from the start. Wait for a new signal."}
          </div>
          <div style={{ marginTop:6, fontSize:9, color:T.amber, fontWeight:700 }}>
            💡 Rule: If you missed the entry, let it go. A new setup will come.
          </div>
        </div>
      )}

      {/* ── CONFLICT WARNING: signal disagrees with current trend ── */}
      {conflict && direction && !driftTooFar && (
        <div style={{ padding:"10px 12px", borderRadius:8, background:`${T.red}10`,
                       border:`1px solid ${T.red}40`, marginBottom:12 }}>
          <div style={{ fontSize:10, color:T.red, fontWeight:700, marginBottom:4 }}>
            ⚠️ Signal says {direction} but market is currently trending {liveTrend === "BULLISH" ? "UP 📈" : "DOWN 📉"}
          </div>
          <div style={{ fontSize:9, color:T.muted, lineHeight:1.5 }}>
            {isBuy
              ? "The BUY signal was generated but the market is now falling. This is risky — wait for the engine to confirm or skip this trade."
              : "The SELL signal was generated but the market is now rising. This is risky — wait for the engine to confirm or skip this trade."}
          </div>
          <div style={{ marginTop:8, fontSize:9, color:T.amber, fontWeight:700 }}>
            💡 Tip: When in doubt, sit out. Missing a trade is better than losing money.
          </div>
        </div>
      )}

      {/* ── Signal section — only when direction is fresh ── */}
      {!loadingSig && direction && liveEntry !== null && (
        <>
          {/* Direction badge */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color:T.text }}>Signal Direction</div>
              <div style={{ fontSize:8, color:T.muted, marginTop:1 }}>Signal age: {sigAgeStr}</div>
            </div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900,
                           color:conflict ? T.amber : isBuy ? T.green : T.red }}>
              {isBuy ? "↗" : "↘"} {direction} {conflict ? "⚠️" : isBuy ? "↗" : "↘"}
            </span>
          </div>

          {/* Live price levels */}
          {[
            { label:"Entry (live)",  val:fmt(liveEntry), color:T.white, note:"Current market price — updates every 3s" },
            { label:"Stop Loss",     val:fmt(liveSL),    color:T.red,   note:"Your maximum loss on this trade" },
            { label:"Take Profit",   val:fmt(liveTP),    color:T.green, note:"Target profit — 2× your risk" },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
                                           alignItems:"center", padding:"8px 0",
                                           borderBottom:`1px solid ${T.border}40` }}>
              <div>
                <div style={{ fontSize:10, color:T.text }}>{row.label}</div>
                <div style={{ fontSize:8, color:T.muted, marginTop:1 }}>{row.note}</div>
              </div>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700,
                             color:row.color }}>{row.val}</span>
            </div>
          ))}

          <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0",
                         borderBottom:`1px solid ${T.border}40` }}>
            <span style={{ fontSize:10, color:T.text }}>Risk : Reward</span>
            <span style={{ fontSize:10, color:T.accent, fontWeight:700 }}>→ 1 : 2.0 &nbsp;(for every ₦1 risked, target ₦2 profit)</span>
          </div>

          <div style={{ margin:"10px 0 8px" }}>
            <div style={{ fontSize:8, letterSpacing:"1.5px", color:T.accent, marginBottom:6 }}>WHY THIS SIGNAL?</div>
            {[conf, "Best time to trade: 2 PM – 5 PM Nigeria time"].map((c,i) => (
              <div key={i} style={{ display:"flex", gap:7, fontSize:9, color:T.text, marginBottom:4 }}>
                <span style={{ color:T.green }}>✓</span>{c}
              </div>
            ))}
          </div>

          <div style={{ padding:"7px 10px", borderRadius:6, background:`${sColor}10`,
                         border:`1px solid ${sColor}30`, marginBottom:10 }}>
            <div style={{ fontSize:9, color:sColor, fontWeight:700 }}>Status: {sLabel}</div>
          </div>
        </>
      )}

      {/* ── No signal (stale or none) ── */}
      {!loadingSig && !direction && liveTick && (
        <div style={{ padding:"12px 10px", borderRadius:8, background:T.bg,
                       border:`1px solid ${T.border}`, textAlign:"center", marginBottom:12 }}>
          <div style={{ fontSize:22, marginBottom:6 }}>🔍</div>
          <div style={{ fontSize:11, color:T.white, fontWeight:600, marginBottom:4 }}>
            No fresh signal for {localSym.replace("m","")} right now
          </div>
          <div style={{ fontSize:10, color:T.muted, lineHeight:1.6 }}>
            The engine is scanning live charts.<br/>
            Best signals appear between{" "}
            <strong style={{ color:T.accent }}>2 PM – 5 PM Nigeria time</strong>
          </div>
        </div>
      )}

      {/* ── Execute buttons — smart highlighting ── */}
      {/* The button matching the signal direction is bold/active.
          The opposite direction is dimmed to prevent accidental wrong trades. */}
      <div style={{ display:"grid", gap:7 }}>
        {/* BUY button */}
        <button
          onClick={() => doExecute("BUY")}
          disabled={!isPremium || !!execPlacing || spreadTooHigh || driftTooFar || (!!direction && !isBuy)}
          title={spreadTooHigh ? "Spread too high — wait" : driftTooFar ? "Price moved too far from signal" : direction && !isBuy ? "Signal says SELL — BUY goes against signal" : ""}
          style={{
            width:"100%", padding:"12px", borderRadius:8, fontFamily:"inherit", fontSize:11,
            fontWeight:900, letterSpacing:"2px", border:"none",
            background: direction && !isBuy
              ? `${T.border}`                         // dimmed — wrong direction
              : isPremium ? T.green : `${T.green}30`,
            color: direction && !isBuy
              ? T.muted
              : isPremium ? T.bg : `${T.green}60`,
            opacity: execPlacing ? 0.6 : 1,
            cursor: (!isPremium || (direction && !isBuy)) ? "not-allowed" : "pointer",
          }}>
          {execPlacing === "BUY" ? "PLACING ORDER..." : direction && !isBuy ? "BUY (not recommended)" : "EXECUTE BUY"}
        </button>

        {/* SELL button */}
        <button
          onClick={() => doExecute("SELL")}
          disabled={!isPremium || !!execPlacing || spreadTooHigh || driftTooFar || (!!direction && isBuy)}
          title={spreadTooHigh ? "Spread too high — wait" : driftTooFar ? "Price moved too far from signal" : direction && isBuy ? "Signal says BUY — SELL goes against signal" : ""}
          style={{
            width:"100%", padding:"12px", borderRadius:8, fontFamily:"inherit", fontSize:11,
            fontWeight:900, letterSpacing:"2px", border:"none",
            background: direction && isBuy
              ? `${T.border}`                         // dimmed — wrong direction
              : isPremium ? T.red : `${T.red}30`,
            color: direction && isBuy
              ? T.muted
              : isPremium ? T.white : `${T.red}60`,
            opacity: execPlacing ? 0.6 : 1,
            cursor: (!isPremium || (direction && isBuy)) ? "not-allowed" : "pointer",
          }}>
          {execPlacing === "SELL" ? "PLACING ORDER..." : direction && isBuy ? "SELL (not recommended)" : "EXECUTE SELL"}
        </button>

        {!isPremium && (
          <div style={{ fontSize:9, color:T.muted, textAlign:"center", lineHeight:1.6,
                         padding:"8px", borderRadius:6, background:T.bg,
                         border:`1px solid ${T.border}` }}>
            🔒 You need a Premium plan to place trades.<br/>
            <span style={{ color:T.green }}>Tap ⬆ PRO to subscribe.</span>
          </div>
        )}
        {execMsg && (
          <div style={{ fontSize:10, color:execMsg.startsWith("✅")?T.green:T.red,
                         textAlign:"center", padding:"6px", borderRadius:6,
                         background:execMsg.startsWith("✅")?`${T.green}10`:`${T.red}10` }}>
            {execMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MARKET INTELLIGENCE PANEL
// ─────────────────────────────────────────────────────────────
function MarketIntelPanel({ analysis, symbol }) {
  if (!analysis) return null;
  const tColor=analysis.trend==="BULLISH"?T.green:analysis.trend==="BEARISH"?T.red:T.amber;
  return (
    <div style={{ padding:"12px 14px" }}>
      <div style={{ fontSize:8, letterSpacing:"2px", color:T.muted, marginBottom:10 }}>MARKET INTELLIGENCE</div>
      {[
        {label:"Direction",val:analysis.trend==="BULLISH"?"📈 Trending UP":analysis.trend==="BEARISH"?"📉 Trending DOWN":"↔️ No trend",c:tColor},
        {label:"Momentum",val:analysis.rsi_label==="NEUTRAL"?"Balanced ✅":"Stretched ⚠️",c:analysis.rsi_label==="NEUTRAL"?T.green:T.amber},
        {label:"Activity",val:analysis.volatility==="NORMAL"?"Normal 🟢":analysis.volatility==="HIGH"?"High / Risky 🔴":"Slow 🟡",c:T.white},
        {label:"Time",val:analysis.session?.includes("LONDON")||analysis.session?.includes("NY")?"🔥 Active hours":"😴 Quiet hours",c:analysis.session?.includes("LONDON")||analysis.session?.includes("NY")?T.green:T.muted},
        {label:"Avg Move",val:analysis.atr?.toFixed(analysis.symbol?.includes("BTC")?0:symbol?.includes("XAU")?2:5)||"—",c:T.white},
        {label:"Broker Fee",val:displaySpread(symbol,analysis.spread_pips),c:analysis.spread_ok?T.green:T.red},
      ].map(r=>(
        <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T.border}30` }}>
          <span style={{ fontSize:9, color:T.muted }}>{r.label}</span>
          <span style={{ fontSize:9, color:r.c, fontWeight:600 }}>{r.val}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ALERTS LIST
// ─────────────────────────────────────────────────────────────
function AlertsList({ signal, analysis }) {
  const alerts = [];
  if (analysis) {
    const cond = analysis.condition;
    if (cond==="AVOID")   alerts.push({icon:"🚫",col:T.red,  msg:"⛔ Don't trade right now — the market is moving too fast or conditions are bad. Wait."});
    if (cond==="GOOD")    alerts.push({icon:"✅",col:T.green, msg:"✅ Good conditions! The price has pulled back to a key level. Watch for a confirmation candle to enter."});
    if (cond==="CAUTION") alerts.push({icon:"⚠️",col:T.amber,msg:"⚠️ Almost ready — keep watching. Wait for a clear signal before entering."});
    if (!analysis.spread_ok) alerts.push({icon:"🔴",col:T.red,msg:"🔴 The broker's fee (spread) is too high right now. Wait a few minutes for it to drop before trading."});
    if (signal?.direction==="BUY")  alerts.push({icon:"⚡",col:T.green,msg:"⚡ A BUY setup is forming. Price touched a support level. Wait for a green candle (hammer or engulfing) to confirm."});
    if (signal?.direction==="SELL") alerts.push({icon:"⚡",col:T.red,  msg:"⚡ A SELL setup is forming. Price touched a resistance level. Wait for a red candle (shooting star) to confirm."});
    alerts.push({icon:"💡",col:T.accent,msg:"💡 How it works: We look for the trend on the 1-hour chart, wait for price to pull back, then enter when a signal candle appears."});
    alerts.push({icon:"🕐",col:T.muted, msg:"⏰ Best trading time: 2:00 PM – 5:00 PM Nigeria time (WAT). This is when the market is most active."});
  } else {
    alerts.push({icon:"⏳",col:T.muted,msg:"Loading market information, please wait a moment..."});
  }
  return (
    <div style={{ padding:"10px 14px", overflowY:"auto", maxHeight:115 }}>
      {alerts.map((a,i)=>(
        <div key={i} style={{ display:"flex", gap:7, padding:"4px 0", borderBottom:`1px solid ${T.border}30` }}>
          <span style={{ fontSize:10, flexShrink:0 }}>{a.icon}</span>
          <span style={{ fontSize:9, color:a.col, lineHeight:1.4 }}>{a.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  INTEL CELL (bottom intelligence bar)
// ─────────────────────────────────────────────────────────────
function IntelCell({ icon, label, val, vColor, tag, tagColor }) {
  const tc = tagColor || T.muted;
  return (
    <div style={{ padding:"9px 11px", background:T.card, borderRadius:8, border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:8, color:T.muted, marginBottom:4 }}>{icon} {label}</div>
      <div style={{ fontSize:11, color:vColor||T.white, fontWeight:700, marginBottom:4 }}>{val}</div>
      {tag&&<span style={{ fontSize:7.5, color:tc, background:`${tc}18`, padding:"2px 7px", borderRadius:10, border:`1px solid ${tc}30` }}>{tag}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LIVE CHART — Candlestick + Pattern Analysis
// ─────────────────────────────────────────────────────────────
function LiveChart({ symbol }) {
  const [candles,  setCandles]  = useState([]);
  const [tf,       setTf]       = useState("M5");
  const [patterns, setPatterns] = useState([]);
  const [showEMA,  setShowEMA]  = useState(true);
  const [showSR,   setShowSR]   = useState(true);

  useEffect(() => {
    const load = () => api(`/api/market/ohlcv/${symbol}?timeframe=${tf}&bars=80`)
      .then(d => {
        if (d.bars) {
          const bars = d.bars.slice(-60);
          setCandles(bars);
          setPatterns(detectPatterns(bars));
        }
      }).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [symbol, tf]);

  // ── Pattern detection ──────────────────────────────────────
  function detectPatterns(bars) {
    if (bars.length < 10) return [];
    const found = [];
    const closes = bars.map(b => b.close);
    const highs  = bars.map(b => b.high);
    const lows   = bars.map(b => b.low);

    // EMA 20
    let ema20 = closes[0];
    const ema20s = closes.map(c => { ema20 = ema20 * 0.9048 + c * 0.0952; return ema20; });

    // Trend
    const last = closes.length - 1;
    const trend = ema20s[last] > ema20s[last - 10] ? "UPTREND" : "DOWNTREND";
    found.push({ type: trend, color: trend === "UPTREND" ? T.green : T.red,
                 desc: trend === "UPTREND" ? "EMA trending up — bias LONG" : "EMA trending down — bias SHORT" });

    // Swing High / Low
    for (let i = 2; i < bars.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] &&
          highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        found.push({ type:"SWING HIGH", color:T.red,
                     desc:`Swing High at ${highs[i].toFixed(5)} — resistance zone`, idx:i });
      }
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] &&
          lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        found.push({ type:"SWING LOW", color:T.green,
                     desc:`Swing Low at ${lows[i].toFixed(5)} — support zone`, idx:i });
      }
    }

    // Engulfing
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i-1], curr = bars[i];
      const prevBull = prev.close > prev.open, currBull = curr.close > curr.open;
      if (!prevBull && currBull && curr.open < prev.close && curr.close > prev.open)
        found.push({ type:"BULLISH ENGULFING", color:T.green,
                     desc:"Bullish engulfing — potential reversal UP", idx:i });
      if (prevBull && !currBull && curr.open > prev.close && curr.close < prev.open)
        found.push({ type:"BEARISH ENGULFING", color:T.red,
                     desc:"Bearish engulfing — potential reversal DOWN", idx:i });
    }

    // Doji
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const body = Math.abs(b.close - b.open);
      const range = b.high - b.low;
      if (range > 0 && body / range < 0.1)
        found.push({ type:"DOJI", color:T.amber,
                     desc:`Doji at bar ${i} — indecision, watch for breakout`, idx:i });
    }

    return found.slice(0, 8); // Cap at 8 patterns
  }

  // ── Candlestick SVG renderer ───────────────────────────────
  function CandlestickChart({ data }) {
    if (!data.length) return <div style={{ height:360, display:"flex", alignItems:"center",
                                           justifyContent:"center", color:T.muted }}>Loading...</div>;

    const W = "100%", H = 360;
    const PAD = { top:20, right:60, bottom:30, left:10 };
    const allHighs  = data.map(d => d.high);
    const allLows   = data.map(d => d.low);
    const allCloses = data.map(d => d.close);
    const minP = Math.min(...allLows)  * 0.9999;
    const maxP = Math.max(...allHighs) * 1.0001;
    const priceRange = maxP - minP;

    // EMA 20
    let e = allCloses[0];
    const emas = allCloses.map(c => { e = e * 0.9048 + c * 0.0952; return e; });

    const N = data.length;
    const candleW = 12;
    const totalW  = N * (candleW + 3);

    const px = (i) => i * (candleW + 3) + candleW / 2;
    const py = (price, h) => PAD.top + ((maxP - price) / priceRange) * (h - PAD.top - PAD.bottom);

    // Y-axis ticks
    const yTicks = 5;
    const yTickVals = Array.from({ length: yTicks }, (_, i) =>
      minP + (priceRange * i) / (yTicks - 1)
    );

    return (
      <div style={{ overflowX:"auto", overflowY:"hidden", width:"100%" }}>
        <svg width={Math.max(totalW, 600)} height={H} style={{ display:"block" }}>
          {/* Grid lines */}
          {yTickVals.map((v, i) => {
            const y = py(v, H);
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={totalW} y2={y}
                      stroke={T.border} strokeWidth={0.5} strokeDasharray="4 4" />
                <text x={Math.max(totalW, 600) - 5} y={y + 4}
                      fill={T.muted} fontSize={8} textAnchor="end">{fmtPrice(symbol, v)}</text>
              </g>
            );
          })}

          {/* Support/Resistance lines */}
          {showSR && patterns.filter(p => p.idx !== undefined).map((p, i) => {
            const barPrice = p.type.includes("HIGH")
              ? data[p.idx]?.high : data[p.idx]?.low;
            if (!barPrice) return null;
            const y = py(barPrice, H);
            return (
              <line key={`sr-${i}`} x1={0} y1={y} x2={Math.max(totalW, 600)} y2={y}
                    stroke={p.color} strokeWidth={0.8} strokeDasharray="6 3"
                    opacity={0.5} />
            );
          })}

          {/* EMA line */}
          {showEMA && emas.length > 1 && (
            <polyline
              points={emas.map((v, i) => `${px(i)},${py(v, H)}`).join(" ")}
              fill="none" stroke={T.amber} strokeWidth={1.5} opacity={0.8}
            />
          )}

          {/* Candlesticks */}
          {data.map((d, i) => {
            const isBull = d.close >= d.open;
            const color  = isBull ? T.green : T.red;
            const bodyTop    = py(Math.max(d.open, d.close), H);
            const bodyBot    = py(Math.min(d.open, d.close), H);
            const bodyHeight = Math.max(bodyBot - bodyTop, 1);
            const wickX      = px(i);

            // Pattern marker
            const hasPat = patterns.find(p => p.idx === i &&
              (p.type.includes("ENGULFING") || p.type === "DOJI"));

            return (
              <g key={i}>
                {/* Wick */}
                <line x1={wickX} y1={py(d.high, H)} x2={wickX} y2={py(d.low, H)}
                      stroke={color} strokeWidth={1} />
                {/* Body */}
                <rect
                  x={px(i) - candleW / 2}
                  y={bodyTop}
                  width={candleW}
                  height={bodyHeight}
                  fill={isBull ? `${T.green}cc` : `${T.red}cc`}
                  stroke={color}
                  strokeWidth={0.5}
                />
                {/* Pattern dot */}
                {hasPat && (
                  <circle cx={wickX} cy={py(d.high, H) - 6} r={3}
                          fill={hasPat.color} opacity={0.9} />
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.filter((_, i) => i % 10 === 0).map((d, i) => {
            const origIdx = i * 10;
            const label = typeof d.time === "string" ? d.time.slice(11, 16) : String(d.time).slice(0, 5);
            return (
              <text key={i} x={px(origIdx)} y={H - 8}
                    fill={T.muted} fontSize={8} textAnchor="middle">{label}</text>
            );
          })}
        </svg>
      </div>
    );
  }

  const last = candles[candles.length - 1];
  const dir  = last ? last.close >= last.open : true;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:4 }}>
          {["M1","M5","M15","M30","H1","H4"].map(t => (
            <button key={t} onClick={() => setTf(t)} style={{
              padding:"6px 12px", borderRadius:6, fontSize:10, fontFamily:"inherit",
              background: tf===t ? T.accent : T.surface,
              color: tf===t ? T.bg : T.muted, border:`1px solid ${T.border}`,
              fontWeight:tf===t?700:400,
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
          <button onClick={() => setShowEMA(!showEMA)} style={{
            padding:"6px 12px", borderRadius:6, fontSize:9, fontFamily:"inherit",
            background: showEMA ? `${T.amber}22` : T.surface,
            color: showEMA ? T.amber : T.muted, border:`1px solid ${showEMA ? T.amber : T.border}`,
          }}>EMA 20</button>
          <button onClick={() => setShowSR(!showSR)} style={{
            padding:"6px 12px", borderRadius:6, fontSize:9, fontFamily:"inherit",
            background: showSR ? `${T.accent}22` : T.surface,
            color: showSR ? T.accent : T.muted, border:`1px solid ${showSR ? T.accent : T.border}`,
          }}>S/R LEVELS</button>
        </div>
      </div>

      {/* Candlestick chart */}
      <Card style={{ padding:"16px 12px" }}>
        <div style={{ marginBottom:8, fontSize:10, color:T.muted }}>
          {symbol} · {tf} · {candles.length} candles
        </div>
        <CandlestickChart data={candles} />
      </Card>

      {/* OHLC summary */}
      {last && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginTop:12 }}>
          {[
            { l:"OPEN",  v:fmtPrice(symbol, last.open)                     },
            { l:"HIGH",  v:fmtPrice(symbol, last.high),  c:T.green          },
            { l:"LOW",   v:fmtPrice(symbol, last.low),   c:T.red            },
            { l:"CLOSE", v:fmtPrice(symbol, last.close), c:dir?T.green:T.red },
            { l:"VOL",   v:last.volume                        },
          ].map(s => (
            <Card key={s.l} style={{ padding:"10px 12px" }}>
              <div style={{ fontSize:8, color:T.muted, letterSpacing:"1px" }}>{s.l}</div>
              <div style={{ fontSize:12, fontWeight:600, color:s.c||T.white, marginTop:3 }}>{s.v}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Pattern Analysis */}
      {patterns.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:9, letterSpacing:"2px", color:T.muted, marginBottom:10 }}>
            DETECTED PATTERNS
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:8 }}>
            {patterns.map((p, i) => (
              <div key={i} style={{
                padding:"10px 14px", borderRadius:8,
                background:`${p.color}10`, border:`1px solid ${p.color}30`,
                display:"flex", gap:10, alignItems:"flex-start",
              }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:p.color,
                               marginTop:4, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:9, fontWeight:700, color:p.color,
                                 letterSpacing:"1px", marginBottom:3 }}>{p.type}</div>
                  <div style={{ fontSize:10, color:T.text, lineHeight:1.5 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MARKET PULSE — smart alert banner (WAIT / READY / ENTER / NO TRADE)
//  Polls /api/market/analysis for each symbol every 30s and derives
//  a stage from the condition + trend fields.
// ─────────────────────────────────────────────────────────────
function MarketPulse() {
  const [pulse, setPulse] = useState({});

  const load = () => {
    ["EURUSDm","XAUUSDm","BTCUSDm"].forEach(s => {
      api(`/api/market/analysis/${s}?timeframe=M5`)
        .then(d => setPulse(p => ({...p, [s]: d})))
        .catch(() => {});
    });
  };

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  function getStage(s, d) {
    if (!d) return { stage:"LOADING", color:T.muted, msg:"Fetching data...", icon:"⏳" };
    const cond  = d.condition;
    const trend = d.trend;
    if (cond === "AVOID")
      return { stage:"STAY OUT", color:T.red,   icon:"🚫", msg:"Market is too risky right now. Do not trade." };
    if (cond === "GOOD" && trend !== "NEUTRAL")
      return { stage:"TRADE READY", color:T.green, icon:"✅", msg:`${trend==="BULLISH"?"Prices trending UP":"Prices trending DOWN"} — a setup is forming. Watch for the signal candle.` };
    if (cond === "CAUTION")
      return { stage:"ALMOST", color:T.amber, icon:"🔔", msg:"Getting close to a trade setup. Keep watching — don't enter yet." };
    return   { stage:"WAITING", color:T.accent, icon:"⏳", msg:"No setup yet. Check back at 2–5 PM Nigeria time." };
  }

  return (
    <div className="pulse-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
      {["EURUSDm","XAUUSDm","BTCUSDm"].map(s => {
        const d = pulse[s];
        const { stage, color, icon, msg } = getStage(s, d);
        return (
          <div key={s} style={{ background:`${color}10`, border:`1px solid ${color}30`,
                                 borderRadius:10, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:T.white }}>{s}</span>
              <span style={{ fontSize:9, fontWeight:700, color,
                              background:`${color}22`, padding:"3px 8px",
                              borderRadius:10, letterSpacing:"1px" }}>
                {icon} {stage}
              </span>
            </div>
            <div style={{ fontSize:10, color:T.muted, lineHeight:1.5, marginBottom:8 }}>{msg}</div>
            {d && (
              <div style={{ display:"flex", gap:12, fontSize:9, flexWrap:"wrap" }}>
                <span style={{ color: d.trend==="BULLISH"?T.green:d.trend==="BEARISH"?T.red:T.muted }}>
                  {d.trend}
                </span>
                <span style={{ color:T.muted }}>{d.session?.replace(/_/g," ")}</span>
                <span style={{ color:T.muted }}>ATR: {d.atr?.toFixed(5)}</span>
                <span style={{ color: d.spread_ok?T.green:T.red }}>
                  Spread: {displaySpread(s, d.spread_pips)}
                </span>
              </div>
            )}
            {/* Support / Resistance from swing highs/lows in analysis */}
            {d?.swing_high && d?.swing_low && (
              <div style={{ marginTop:8, display:"flex", gap:12, fontSize:9 }}>
                <span style={{ color:T.red }}>R: {d.swing_high?.toFixed(5)}</span>
                <span style={{ color:T.green }}>S: {d.swing_low?.toFixed(5)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SIGNALS
// ─────────────────────────────────────────────────────────────
function Signals() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/signals?limit=30")
      .then(d => { setSignals(d); setLoading(false); })
      .catch(() => setLoading(false));

    // Live signal WS — WS is derived from window.location when API="" so this now works
    try {
      const ws = new WebSocket(`${WS}/ws/signals`);
      ws.onmessage = e => {
        try {
          const sig = JSON.parse(e.data);
          setSignals(prev => [sig, ...prev.slice(0,29)]);
        } catch {}
      };
      ws.onerror = () => {};   // suppress console noise if WS not available
      return () => ws.close();
    } catch {}
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <MarketPulse />
      <div style={{ display:"grid", gap:10 }}>
        {signals.length === 0 && (
          <Card>
            <Muted>No signals yet. The engine broadcasts here in real time.</Muted>
          </Card>
        )}
        {signals.map(sig => <SignalCard key={sig.id} sig={{...sig, _isPremium:isPremium}} />)}
      </div>
    </div>
  );
}

function SignalCard({ sig, showExecute = false }) {
  const isBuy     = sig.direction === "BUY";
  const cond      = sig.market_condition || "CAUTION";
  const advice    = sig.condition_notes  || "";
  const strategy  = sig.bos_confirmed ? "EMA-Pullback (M5)" : sig.ob_confirmed ? "London-Breakout (M15)" : "Signal";
  const condColor = { GOOD:T.green, CAUTION:T.amber, AVOID:T.red }[cond] || T.muted;
  const execColor = cond === "GOOD" ? T.green : cond === "CAUTION" ? T.amber : T.red;
  const execBadge = cond === "GOOD" ? "✅ Ready to Trade" : cond === "CAUTION" ? "⏳ Keep Watching" : "🚫 Skip This";

  // Symbol-aware decimal precision for price display
  const sym    = sig.symbol || "";
  const digits = sym.includes("BTC") ? 0 : sym.includes("XAU") ? 2 : 5;
  const fmt    = v => (v != null ? Number(v).toFixed(digits) : "—");

  // Only show the execute button for the signal direction (not both)
  const canExec = showExecute && sig._isPremium;

  return (
    <div style={{
      background: cond === "GOOD" ? `linear-gradient(135deg, ${T.card}, rgba(0,230,118,0.04))` : T.card,
      border: `1px solid ${cond === "GOOD" ? T.green + "40" : T.border}`,
      borderRadius:12, padding:18, animation:"fadeIn .25s ease",
    }}>
      {/* Header */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
        <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:T.white }}>
          #{sig.id} · {sig.symbol}
        </span>
        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                       background:isBuy?`${T.green}20`:`${T.red}20`,
                       color:isBuy?T.green:T.red, border:`1px solid ${isBuy?T.green:T.red}40` }}>
          {isBuy ? "▲" : "▼"} {sig.direction}
        </span>
        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:9,
                       background:`${T.accent}10`, color:T.accent, border:`1px solid ${T.accent}25` }}>
          {strategy}
        </span>
        <span style={{ marginLeft:"auto", padding:"4px 10px", borderRadius:20, fontSize:9, fontWeight:700,
                       background:`${execColor}15`, color:execColor, border:`1px solid ${execColor}35` }}>
          {execBadge}
        </span>
      </div>

      {/* Price levels — use symbol-aware formatting */}
      <div className="sig-grid4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
        {[
          { label:isBuy?"BUY ZONE":"SELL ZONE", val:fmt(sig.sl),    c:isBuy?T.green:T.red },
          { label:"ENTRY",                       val:fmt(sig.entry), c:T.white             },
          { label:"STOP LOSS",                   val:fmt(sig.sl),    c:T.red               },
          { label:"TAKE PROFIT",                 val:fmt(sig.tp),    c:T.green             },
        ].map(r => (
          <div key={r.label} style={{ background:T.surface, borderRadius:7, padding:"9px 10px", border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:7, letterSpacing:"1px", color:T.muted, marginBottom:4 }}>{r.label}</div>
            <div style={{ fontSize:11, fontWeight:700, color:r.c }}>{r.val}</div>
          </div>
        ))}
      </div>

      {/* R:R + ATR row */}
      <div style={{ display:"flex", gap:16, marginBottom:10, fontSize:10 }}>
        <span style={{ color:T.muted }}>R:R <span style={{ color:T.accent, fontWeight:700 }}>1:{sig.rr_ratio||"2.0"}</span></span>
        {sig.atr_value && <span style={{ color:T.muted }}>ATR <span style={{ color:T.white }}>{Number(sig.atr_value).toFixed(digits === 0 ? 0 : digits === 2 ? 2 : 5)}</span></span>}
      </div>

      {advice && (
        <div style={{ fontSize:9, color:T.muted, lineHeight:1.5, padding:"7px 10px",
                      borderLeft:`2px solid ${condColor}`, background:`${condColor}06`,
                      borderRadius:"0 6px 6px 0", marginBottom:10 }}>{advice}</div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom: canExec ? 10 : 0,
                    fontSize:9, color:T.muted }}>
        <span>{sig.created_at?.slice(0,16).replace("T"," ")} UTC</span>
        <span style={{ color:sig.status==="active"?T.green:T.muted }}>{sig.status?.toUpperCase()}</span>
      </div>

      {/* Quick execute — only for GOOD signals */}
      {canExec && (
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:10 }}>
          <div style={{ fontSize:9, color:T.green, marginBottom:6, fontWeight:700 }}>👆 Tap the button below to place this trade on your MT5 account:</div>
          <QuickTrade
            symbol={sig.symbol}
            entry={sig.entry}
            sl={sig.sl}
            tp={sig.tp}
            isPremium={true}
            compact
          />
        </div>
      )}
      {!canExec && cond === "GOOD" && !sig._isPremium && (
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:8,
                      fontSize:9, color:T.muted, textAlign:"center", lineHeight:1.5 }}>
          🔒 This trade is ready but you need a Premium plan to execute it.<br/>
          <span style={{ color:T.green }}>Tap ⬆ PRO to subscribe and start trading.</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ORDERS (premium)
// ─────────────────────────────────────────────────────────────
function Orders({ user, symbol }) {
  const [positions, setPositions] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [form, setForm]           = useState({ symbol, direction:"BUY", lot:0.01, sl:"", tp:"" });
  const [placing, setPlacing]     = useState(false);
  const [msg, setMsg]             = useState("");
  const [tab, setTab]             = useState("open");

  const load = () => {
    api("/api/orders").then(d => setPositions(d.positions || [])).catch(() => {});
    api("/api/orders/history").then(setHistory).catch(() => {});
  };
  useEffect(() => { load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);

  const place = async () => {
    setPlacing(true); setMsg("");
    try {
      const res = await api("/api/orders/place", {
        method:"POST",
        body: JSON.stringify({ ...form, lot: parseFloat(form.lot),
                               sl: form.sl ? parseFloat(form.sl) : 0,
                               tp: form.tp ? parseFloat(form.tp) : 0 })
      });
      setMsg(`✅ Order placed. Ticket: #${res.ticket}`);
      load();
    } catch(e) { setMsg(`❌ ${e.message}`); }
    setPlacing(false);
  };

  const close = async (ticket) => {
    try {
      const res = await api(`/api/orders/close/${ticket}`, { method:"POST" });
      setMsg(`✅ Closed. P&L: $${res.profit?.toFixed(2)}`);
      load();
    } catch(e) { setMsg(`❌ ${e.message}`); }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:16, alignItems:"start" }}>
      {/* Place order panel */}
      <Card title="PLACE ORDER">
        <div style={{ marginBottom:12 }}>
          {["BUY","SELL"].map(d => (
            <button key={d} onClick={() => setForm({...form, direction:d})} style={{
              width:"50%", padding:"10px", fontFamily:"inherit", fontSize:11, fontWeight:700,
              background: form.direction===d ? (d==="BUY"?T.green:T.red) : T.surface,
              color: form.direction===d ? T.bg : T.muted,
              border:`1px solid ${T.border}`,
              borderRadius: d==="BUY" ? "8px 0 0 8px" : "0 8px 8px 0",
            }}>{d}</button>
          ))}
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontSize:9, letterSpacing:"2px",
                          color:T.muted, marginBottom:5 }}>SYMBOL</label>
          <select value={form.symbol} onChange={e => setForm({...form, symbol:e.target.value})}
            style={{ width:"100%", padding:"10px 14px", background:T.surface,
                     border:`1px solid ${T.border}`, borderRadius:8,
                     color:T.white, fontSize:12, fontFamily:"'IBM Plex Mono',monospace",
                     outline:"none", cursor:"pointer", appearance:"none",
                     backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a6080' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                     backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }}
            onFocus={e => e.target.style.borderColor=T.accent}
            onBlur={e  => e.target.style.borderColor=T.border}>
            {["EURUSDm","XAUUSDm","BTCUSDm"].map(s => (
              <option key={s} value={s} style={{ background:T.surface }}>{s}</option>
            ))}
          </select>
        </div>
        <Field label="Lot Size" value={form.lot} onChange={v => setForm({...form, lot:v})} type="number" />
        <Field label="Stop Loss (optional)"   value={form.sl} onChange={v => setForm({...form, sl:v})} type="number" placeholder="0.00000" />
        <Field label="Take Profit (optional)"  value={form.tp} onChange={v => setForm({...form, tp:v})} type="number" placeholder="0.00000" />

        {msg && <div style={{ fontSize:11, marginBottom:10,
                              color: msg.startsWith("✅")?T.green:T.red }}>{msg}</div>}

        <PrimaryBtn loading={placing} onClick={place}
          style={{ background: form.direction==="BUY" ? T.green : T.red, color:T.bg }}>
          {form.direction} {form.symbol}
        </PrimaryBtn>
      </Card>

      {/* Positions + history */}
      <div>
        <div style={{ display:"flex", gap:4, marginBottom:12 }}>
          {["open","history"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:"7px 18px", borderRadius:6, fontSize:10, fontFamily:"inherit",
              background: tab===t ? T.accent : T.surface,
              color: tab===t ? T.bg : T.muted, border:`1px solid ${T.border}`,
              fontWeight:tab===t?700:400,
            }}>{t === "open" ? `Open (${positions.length})` : "History"}</button>
          ))}
        </div>

        {tab === "open" && (
          positions.length === 0
            ? <Card><Muted>No open positions.</Muted></Card>
            : positions.map(p => <PositionCard key={p.ticket} p={p} onClose={() => close(p.ticket)} />)
        )}

        {tab === "history" && (
          history.length === 0
            ? <Card><Muted>No trade history.</Muted></Card>
            : <div style={{ display:"grid", gap:8 }}>
                {history.map(o => <HistoryRow key={o.id} o={o} />)}
              </div>
        )}
      </div>
    </div>
  );
}

function PositionCard({ p, onClose }) {
  const profit = p.profit || 0;
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10,
                  padding:16, marginBottom:8, display:"flex", alignItems:"center", gap:16 }}>
      <div style={{ flex:1, display:"flex", gap:20, flexWrap:"wrap" }}>
        <LabelVal label="TICKET" value={`#${p.ticket}`} />
        <LabelVal label="SYMBOL" value={p.symbol} color={T.white} />
        <LabelVal label="TYPE"   value={p.type}   color={p.type==="BUY"?T.green:T.red} />
        <LabelVal label="VOL"    value={p.volume} />
        <LabelVal label="OPEN"   value={fmtPrice(p.symbol, p.open_price)} />
        <LabelVal label="SL"     value={fmtPrice(p.symbol, p.sl)} color={T.red} />
        <LabelVal label="TP"     value={fmtPrice(p.symbol, p.tp)} color={T.green} />
        <LabelVal label="P&L"    value={`$${profit.toFixed(2)}`}
                  color={profit >= 0 ? T.green : T.red} />
      </div>
      <button onClick={onClose} style={{
        padding:"8px 16px", borderRadius:6, background:`${T.red}22`,
        border:`1px solid ${T.red}44`, color:T.red,
        fontSize:10, fontFamily:"inherit", fontWeight:700,
      }}>CLOSE</button>
    </div>
  );
}

function HistoryRow({ o }) {
  const profit = o.profit || 0;
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8,
                  padding:"12px 16px", display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
      <LabelVal label="TICKET"  value={o.mt5_ticket ? `#${o.mt5_ticket}` : `ID${o.id}`} />
      <LabelVal label="SYMBOL"  value={o.symbol} color={T.white} />
      <LabelVal label="DIR"     value={o.direction} color={o.direction==="BUY"?T.green:T.red} />
      <LabelVal label="LOT"     value={o.lot_size} />
      <LabelVal label="ENTRY"   value={fmtPrice(o.symbol, o.entry_price)} />
      <LabelVal label="CLOSE"   value={fmtPrice(o.symbol, o.close_price)} />
      <LabelVal label="P&L"     value={`$${profit.toFixed(2)}`}
                color={profit>=0?T.green:T.red} />
      <LabelVal label="SOURCE"  value={o.source?.toUpperCase()} color={T.muted} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ANALYSIS
// ─────────────────────────────────────────────────────────────
function Analysis({ symbol, isPremium }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [tf, setTf]         = useState("M5");

  const load = () => {
    setLoading(true);
    api(`/api/market/analysis/${symbol}?timeframe=${tf}`)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [symbol, tf]);

  if (loading && !data) return <Spinner />;
  if (!data) return <Card><Muted>Could not load analysis.</Muted></Card>;

  const condColor = { GOOD:T.green, CAUTION:T.amber, AVOID:T.red }[data.condition] || T.muted;
  const condEmoji = { GOOD:"✅", CAUTION:"⚠️", AVOID:"🚫" }[data.condition] || "";
  const condLabel = { GOOD:"Good to Trade", CAUTION:"Not Quite Ready", AVOID:"Avoid Trading Now" }[data.condition] || data.condition;

  const scores = [
    { label:"Session",    score: data.session?.includes("LONDON")||data.session?.includes("NY") ? 35 : 15 },
    { label:"Trend",      score: data.strength==="STRONG"?25:data.strength==="MODERATE"?18:8 },
    { label:"Volatility", score: data.volatility==="NORMAL"?20:data.volatility==="HIGH"?10:5 },
    { label:"Spread",     score: data.spread_ok ? 10 : 0 },
    { label:"RSI",        score: data.rsi_label==="NEUTRAL" ? 10 : 3 },
  ];

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["M5","M15","H1","H4","D1"].map(t => (
          <button key={t} onClick={() => setTf(t)} style={{
            padding:"6px 14px", borderRadius:6, fontSize:10, fontFamily:"inherit",
            background: tf===t ? T.accent : T.surface,
            color: tf===t ? T.bg : T.muted, border:`1px solid ${T.border}`,
          }}>{t}</button>
        ))}
        <button onClick={load} style={{
          padding:"6px 14px", borderRadius:6, fontSize:10, fontFamily:"inherit",
          background:T.surface, color:T.text, border:`1px solid ${T.border}`,
        }}>↻ Refresh</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Condition */}
        <Card>
          <div style={{ textAlign:"center", padding:"12px 0" }}>
            <div style={{ fontSize:42, marginBottom:8 }}>{condEmoji}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:condColor }}>
              {condLabel}
            </div>
            <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>{symbol} · {tf}</div>
            <div style={{ fontSize:32, fontWeight:700, color:T.white,
                          fontFamily:"'Syne',sans-serif", marginTop:16 }}>
              {data.score}<span style={{ fontSize:16, color:T.muted }}>/100</span>
            </div>
            <div style={{ fontSize:10, color:T.muted }}>Overall Trade Score</div>
          </div>

          {/* Score bar */}
          <div style={{ marginTop:16, background:T.surface, borderRadius:20, height:8 }}>
            <div style={{ width:`${data.score}%`, height:"100%", borderRadius:20,
                          background: `linear-gradient(90deg, ${T.accent}, ${condColor})`,
                          transition:"width 1s ease" }} />
          </div>
        </Card>

        {/* Metrics */}
        <Card title="MARKET METRICS">
          {[
            { l:"Trend",      v:data.trend==="BULLISH"?"📈 Going UP":data.trend==="BEARISH"?"📉 Going DOWN":"↔️ No clear direction",  c: data.trend==="BULLISH"?T.green:data.trend==="BEARISH"?T.red:T.amber },
            { l:"Volatility", v:data.volatility==="NORMAL"?"🟢 Normal (good)":data.volatility==="HIGH"?"🔴 High (risky)":"🟡 Low (slow market)", c: data.volatility==="NORMAL"?T.green:data.volatility==="HIGH"?T.red:T.amber },
            { l:"Session",    v:data.session?.includes("LONDON")||data.session?.includes("NY")?"🔥 Active trading hours":"😴 Quiet period",  c:data.session?.includes("LONDON")||data.session?.includes("NY")?T.green:T.muted },
            { l:"RSI",        v:data.rsi_label==="NEUTRAL"?"✅ Balanced":"⚠️ Stretched",   c: data.rsi_label==="NEUTRAL"?T.green:T.amber },
            { l:"Broker Fee", v:data.spread_ok?"✅ Low fee (good to trade)":"🔴 High fee — wait a moment", c: data.spread_ok?T.green:T.red },
            { l:"Avg Move",   v:data.atr?.toFixed(data.symbol?.includes("BTC")?0:data.symbol?.includes("XAU")?2:5),  c:T.white },
          ].map(m => (
            <div key={m.l} style={{ display:"flex", justifyContent:"space-between",
                                    padding:"9px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:11, color:T.muted }}>{m.l}</span>
              <span style={{ fontSize:11, color:m.c, fontWeight:600 }}>{m.v}</span>
            </div>
          ))}
        </Card>

        {/* Sub-score breakdown */}
        <Card title="SCORE BREAKDOWN">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scores} margin={{ top:0, right:0, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="label" tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,35]}  tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`,
                                       borderRadius:6, fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }} />
              <Bar dataKey="score" fill={T.accent} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Advice */}
        <Card title="WHAT SHOULD I DO?">
          <div style={{ background: data.condition==="AVOID"?`${T.red}10`:
                                    data.condition==="CAUTION"?`${T.amber}10`:`${T.green}10`,
                        borderRadius:8, padding:16, border:`1px solid ${condColor}30` }}>
            <p style={{ fontSize:12, color:T.text, lineHeight:1.8, margin:0 }}>
              {data.advice?.split("|").map((line, i) => (
                <span key={i} style={{ display:"block", marginBottom:4 }}>{line.trim()}</span>
              ))}
            </p>
          </div>
          <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
            <div style={{ fontSize:8, letterSpacing:"2px", color:T.muted, marginBottom:8 }}>QUICK EXECUTE</div>
            <QuickTrade symbol={symbol} isPremium={isPremium} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PERFORMANCE TRACKER
// ─────────────────────────────────────────────────────────────
function Performance() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState("overview"); // overview | equity | daily | breakdown

  useEffect(() => {
    api("/api/performance")
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data)   return <Card><Muted>Could not load performance data.</Muted></Card>;

  if (data.total_trades === 0) return (
    <Card>
      <div style={{ textAlign:"center", padding:"40px 0" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
        <div style={{ fontSize:13, color:T.muted, lineHeight:1.8 }}>
          No closed trades yet.<br/>
          Performance stats will appear here once you have completed trades.
        </div>
      </div>
    </Card>
  );

  const profitColor = data.total_profit >= 0 ? T.green : T.red;

  return (
    <div>
      {/* ── Sub-nav ── */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[
          ["overview",  "📊 Overview"],
          ["equity",    "📈 Equity Curve"],
          ["daily",     "📅 Daily P&L"],
          ["breakdown", "🔍 Breakdown"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            padding:"8px 18px", borderRadius:6, fontSize:11, fontFamily:"inherit",
            background: view===id ? T.accent : T.surface,
            color: view===id ? T.bg : T.muted,
            border:`1px solid ${T.border}`, fontWeight: view===id ? 700 : 400,
          }}>{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {view === "overview" && (
        <div>
          {/* Key metrics grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
            {[
              { label:"TOTAL P&L",      value:`$${data.total_profit}`,    color:profitColor },
              { label:"WIN RATE",        value:`${data.win_rate}%`,        color: data.win_rate >= 50 ? T.green : T.red },
              { label:"TOTAL TRADES",   value:data.total_trades,           color:T.white  },
              { label:"PROFIT FACTOR",  value:data.profit_factor,          color: data.profit_factor >= 1 ? T.green : T.red },
            ].map(s => (
              <Card key={s.label} style={{ padding:"16px 20px" }}>
                <div style={{ fontSize:8, color:T.muted, letterSpacing:"2px", marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:700, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
              </Card>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"WINS",           value:data.wins,               color:T.green  },
              { label:"LOSSES",         value:data.losses,             color:T.red    },
              { label:"AVG WIN",        value:`$${data.avg_profit}`,   color:T.green  },
              { label:"AVG LOSS",       value:`$${data.avg_loss}`,     color:T.red    },
              { label:"BEST TRADE",     value:`$${data.best_trade}`,   color:T.green  },
              { label:"WORST TRADE",    value:`$${data.worst_trade}`,  color:T.red    },
              { label:"MAX DRAWDOWN",   value:`$${data.max_drawdown}`, color:T.amber  },
              { label:"AVG R:R",        value:`1:${data.avg_rr}`,      color:T.accent },
            ].map(s => (
              <Card key={s.label} style={{ padding:"12px 16px" }}>
                <div style={{ fontSize:8, color:T.muted, letterSpacing:"1px", marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:700, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Win rate visual bar */}
          <Card title="WIN / LOSS RATIO">
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <span style={{ fontSize:11, color:T.green, minWidth:40 }}>{data.wins}W</span>
              <div style={{ flex:1, height:12, background:T.surface, borderRadius:6, overflow:"hidden" }}>
                <div style={{
                  width:`${data.win_rate}%`, height:"100%",
                  background:`linear-gradient(90deg, ${T.green}, ${T.accent})`,
                  borderRadius:6, transition:"width 1s ease",
                }} />
              </div>
              <span style={{ fontSize:11, color:T.red, minWidth:40, textAlign:"right" }}>{data.losses}L</span>
            </div>
            <div style={{ textAlign:"center", fontSize:12, color:T.muted }}>
              {data.win_rate}% win rate across {data.total_trades} trades
            </div>
          </Card>
        </div>
      )}

      {/* ── EQUITY CURVE ── */}
      {view === "equity" && (
        <div>
          <Card title="EQUITY CURVE" style={{ marginBottom:16 }}>
            {data.equity_curve.length < 2
              ? <Muted>Not enough data to plot equity curve.</Muted>
              : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.equity_curve}
                             margin={{ top:10, right:20, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.green} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={T.green} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="date" tick={{ fill:T.muted, fontSize:9 }}
                           tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill:T.muted, fontSize:9 }} tickLine={false}
                           axisLine={false} width={60}
                           tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background:T.card, border:`1px solid ${T.border}`,
                                      borderRadius:8, fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}
                      formatter={v => [`$${v}`, "Equity"]}
                    />
                    <Area type="monotone" dataKey="equity" stroke={T.green} strokeWidth={2}
                          fill="url(#equityGrad)" dot={false}
                          activeDot={{ r:4, fill:T.green }} />
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </Card>

          <Card title="DRAWDOWN">
            {data.drawdown_series.length < 2
              ? <Muted>Not enough data.</Muted>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.drawdown_series}
                             margin={{ top:10, right:20, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.red} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={T.red} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="date" tick={{ fill:T.muted, fontSize:9 }}
                           tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill:T.muted, fontSize:9 }} tickLine={false}
                           axisLine={false} width={60}
                           tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background:T.card, border:`1px solid ${T.border}`,
                                      borderRadius:8, fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}
                      formatter={v => [`$${v}`, "Drawdown"]}
                    />
                    <Area type="monotone" dataKey="drawdown" stroke={T.red} strokeWidth={2}
                          fill="url(#ddGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </Card>
        </div>
      )}

      {/* ── DAILY P&L ── */}
      {view === "daily" && (
        <Card title="DAILY P&L">
          {data.daily_pnl.length === 0
            ? <Muted>No daily data yet.</Muted>
            : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.daily_pnl}
                            margin={{ top:10, right:20, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="date" tick={{ fill:T.muted, fontSize:9 }}
                           tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill:T.muted, fontSize:9 }} tickLine={false}
                           axisLine={false} width={60} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background:T.card, border:`1px solid ${T.border}`,
                                      borderRadius:8, fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}
                      formatter={v => [`$${v}`, "P&L"]}
                    />
                    <ReferenceLine y={0} stroke={T.muted} strokeDasharray="4 4" />
                    <Bar dataKey="pnl" radius={[4,4,0,0]}
                         fill={T.green}
                         label={false}>
                      {data.daily_pnl.map((entry, i) => (
                        <rect key={i} fill={entry.pnl >= 0 ? T.green : T.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Daily table */}
                <div style={{ marginTop:16, maxHeight:240, overflowY:"auto" }}>
                  {[...data.daily_pnl].reverse().map((d, i) => (
                    <div key={i} style={{
                      display:"flex", justifyContent:"space-between",
                      padding:"8px 0", borderBottom:`1px solid ${T.border}`,
                      fontSize:11,
                    }}>
                      <span style={{ color:T.muted }}>{d.date}</span>
                      <span style={{ color: d.pnl >= 0 ? T.green : T.red, fontWeight:600 }}>
                        {d.pnl >= 0 ? "+" : ""}${d.pnl}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </Card>
      )}

      {/* ── BREAKDOWN ── */}
      {view === "breakdown" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

          {/* By Symbol */}
          <Card title="BY SYMBOL">
            {data.by_symbol.map((s, i) => (
              <div key={i} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                               fontSize:11, marginBottom:5 }}>
                  <span style={{ color:T.white, fontWeight:600 }}>{s.symbol}</span>
                  <span style={{ color: s.profit >= 0 ? T.green : T.red }}>
                    {s.profit >= 0 ? "+" : ""}${s.profit}
                  </span>
                </div>
                <div style={{ display:"flex", gap:12, fontSize:10, color:T.muted, marginBottom:5 }}>
                  <span>{s.trades} trades</span>
                  <span style={{ color: s.win_rate >= 50 ? T.green : T.red }}>
                    {s.win_rate}% WR
                  </span>
                </div>
                <div style={{ height:5, background:T.surface, borderRadius:3 }}>
                  <div style={{
                    width:`${s.win_rate}%`, height:"100%", borderRadius:3,
                    background:`linear-gradient(90deg, ${T.accent}, ${T.green})`,
                  }} />
                </div>
              </div>
            ))}
          </Card>

          {/* By Strategy */}
          <Card title="BY STRATEGY">
            {data.by_strategy.map((s, i) => (
              <div key={i} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                               fontSize:11, marginBottom:5 }}>
                  <span style={{ color:T.white, fontWeight:600 }}>
                    {s.strategy === "auto" ? "🤖 Auto" : s.strategy === "manual" ? "✋ Manual" : s.strategy}
                  </span>
                  <span style={{ color: s.profit >= 0 ? T.green : T.red }}>
                    {s.profit >= 0 ? "+" : ""}${s.profit}
                  </span>
                </div>
                <div style={{ display:"flex", gap:12, fontSize:10, color:T.muted, marginBottom:5 }}>
                  <span>{s.trades} trades</span>
                  <span style={{ color: s.win_rate >= 50 ? T.green : T.red }}>
                    {s.win_rate}% WR
                  </span>
                </div>
                <div style={{ height:5, background:T.surface, borderRadius:3 }}>
                  <div style={{
                    width:`${s.win_rate}%`, height:"100%", borderRadius:3,
                    background:`linear-gradient(90deg, ${T.amber}, ${T.accent})`,
                  }} />
                </div>
              </div>
            ))}
          </Card>

          {/* By Direction */}
          <Card title="BUY vs SELL">
            {data.by_direction.map((d, i) => {
              const color = d.direction === "BUY" ? T.green : T.red;
              return (
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                 fontSize:11, marginBottom:5 }}>
                    <span style={{ color, fontWeight:700 }}>
                      {d.direction === "BUY" ? "🟢" : "🔴"} {d.direction}
                    </span>
                    <span style={{ color: d.profit >= 0 ? T.green : T.red }}>
                      {d.profit >= 0 ? "+" : ""}${d.profit}
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:12, fontSize:10, color:T.muted, marginBottom:5 }}>
                    <span>{d.trades} trades</span>
                    <span style={{ color: d.win_rate >= 50 ? T.green : T.red }}>
                      {d.win_rate}% WR
                    </span>
                  </div>
                  <div style={{ height:5, background:T.surface, borderRadius:3 }}>
                    <div style={{
                      width:`${d.win_rate}%`, height:"100%", borderRadius:3,
                      background:color,
                    }} />
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Summary card */}
          <Card title="SUMMARY">
            {[
              { label:"Total Profit",   value:`$${data.total_profit}`,   color:profitColor },
              { label:"Profit Factor",  value:data.profit_factor,         color: data.profit_factor >= 1 ? T.green : T.red },
              { label:"Max Drawdown",   value:`$${data.max_drawdown}`,    color:T.amber  },
              { label:"Avg Win",        value:`$${data.avg_profit}`,      color:T.green  },
              { label:"Avg Loss",       value:`$${data.avg_loss}`,        color:T.red    },
              { label:"Avg R:R",        value:`1:${data.avg_rr}`,         color:T.accent },
            ].map((m, i) => (
              <div key={i} style={{
                display:"flex", justifyContent:"space-between",
                padding:"9px 0", borderBottom:`1px solid ${T.border}`, fontSize:11,
              }}>
                <span style={{ color:T.muted }}>{m.label}</span>
                <span style={{ color:m.color, fontWeight:600 }}>{m.value}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ADMIN PANEL
// ─────────────────────────────────────────────────────────────
function AdminPanel({ user: adminUser }) {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [adminTab,   setAdminTab]   = useState("users");
  const [subUsers,   setSubUsers]   = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const loadSubscriptions = () => {
    setSubLoading(true);
    api("/api/admin/subscriptions").then(d => { setSubUsers(d); setSubLoading(false); }).catch(() => setSubLoading(false));
  };
  const [tgTarget,   setTgTarget]   = useState(null);
  const [tgMsg,      setTgMsg]      = useState("");
  const [tgSending,  setTgSending]  = useState(false);
  const [tgResult,   setTgResult]   = useState("");

  // ── Quantitative Calculator State ──
  const [calc, setCalc] = useState({
    strategy:"S1", symbol:"EURUSDm", direction:"BUY",
    entry:"", asianHigh:"", asianLow:"", accountBal:"",
  });
  const [calcResult,  setCalcResult]  = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcLive,    setCalcLive]    = useState(null);

  const loadUsers = () => {
    setLoading(true);
    api("/api/admin/users")
      .then(d => { setUsers(d); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { loadUsers(); loadSubscriptions(); }, []);

  const approve = async (userId) => {
    try { await api(`/api/admin/approve/${userId}`, { method:"POST" }); loadUsers(); }
    catch(e) { alert("Error: " + e.message); }
  };

  const reject = async (userId) => {
    if (!confirm("Revoke this user?")) return;
    try { await api(`/api/admin/reject/${userId}`, { method:"POST" }); loadUsers(); }
    catch(e) { alert("Error: " + e.message); }
  };

  const sendTelegram = async () => {
    if (!tgMsg.trim()) return;
    setTgSending(true); setTgResult("");
    try {
      await api(`/api/admin/telegram/${tgTarget.id}`, {
        method:"POST", body: JSON.stringify({ message: tgMsg })
      });
      setTgResult("✅ Sent!"); setTgMsg("");
    } catch(e) { setTgResult("❌ Failed: " + e.message); }
    setTgSending(false);
  };

  // ── Calculator live fetch ──
  const fetchCalcLive = async (sym = calc.symbol) => {
    setCalcLoading(true);
    try {
      const [analysis, tick, acct] = await Promise.allSettled([
        api(`/api/market/analysis/${sym}?timeframe=M5`),
        api(`/api/market/tick/${sym}`),
        api("/api/account/info"),
      ]);
      const atr     = analysis.status === "fulfilled" ? analysis.value?.atr : null;
      const bid     = tick.status     === "fulfilled" ? tick.value?.bid     : null;
      const ask     = tick.status     === "fulfilled" ? tick.value?.ask     : null;
      const spread  = tick.status     === "fulfilled" ? tick.value?.spread  : null;
      const balance = acct.status     === "fulfilled" ? acct.value?.balance : null;
      setCalcLive({ atr, bid, ask, spread });
      const entryVal = calc.direction === "BUY" ? ask : bid;
      setCalc(c => ({
        ...c, symbol: sym,
        entry:      entryVal ? fmtPrice(sym, entryVal) : c.entry,
        accountBal: balance  ? balance.toFixed(2)  : c.accountBal,
      }));
    } catch {}
    setCalcLoading(false);
  };

  const runCalc = () => {
    const entry = parseFloat(calc.entry);
    const dir   = calc.direction === "BUY" ? 1 : -1;
    const bal   = parseFloat(calc.accountBal) || 1000;
    let sl, slDist, rangeSize;

    if (calc.strategy === "S1") {
      const atrV = calcLive?.atr;
      if (!entry || !atrV) return;
      slDist = atrV * 1.5;
      sl     = entry - dir * slDist;
    } else {
      const aHigh = parseFloat(calc.asianHigh);
      const aLow  = parseFloat(calc.asianLow);
      if (!entry || !aHigh || !aLow) return;
      rangeSize = aHigh - aLow;
      sl        = calc.direction === "BUY" ? aLow : aHigh;
      slDist    = Math.abs(entry - sl);
    }
    if (!entry || slDist <= 0) return;

    const tp1    = entry + dir * slDist * 1;
    const tp2    = entry + dir * slDist * 2;
    const tp3    = entry + dir * slDist * 3;
    const slPips = slDist / 0.0001;
    const lot    = Math.max(0.01, Math.min(100, parseFloat(((bal * 0.01) / (slPips * 10)).toFixed(2))));

    setCalcResult({
      sl: sl.toFixed(5), slDist: slDist.toFixed(5), slPips: slPips.toFixed(1),
      tp1: tp1.toFixed(5), tp2: tp2.toFixed(5), tp3: tp3.toFixed(5),
      lot, riskAmt: (bal * 0.01).toFixed(2),
      rangeSize: rangeSize ? rangeSize.toFixed(5) : null,
    });
  };

  const tierColor = (t, approved) => {
    if (t === "premium" && approved)  return T.green;
    if (t === "premium" && !approved) return T.amber;
    return T.accent;   // FREE users get accent (cyan) — clearly visible
  };

  const [userFilter, setUserFilter] = useState("all"); // "all" | "free" | "premium"

  const filteredUsers = users.filter(u => {
    if (userFilter === "free")    return u.tier === "free";
    if (userFilter === "premium") return u.tier === "premium";
    return true;
  });

  const freeCount    = users.filter(u => u.tier === "free").length;
  const premCount    = users.filter(u => u.tier === "premium").length;
  const pendingCount = users.filter(u => u.tier === "premium" && !u.is_approved).length;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20 }}>
        {[["users","👥 Users"],["subscriptions","💳 Subscriptions"],["calc","🧮 Calculator"]].map(([id, label]) => (
          <button key={id} onClick={() => setAdminTab(id)} style={{
            padding:"8px 20px", borderRadius:6, fontSize:11, fontFamily:"inherit",
            background: adminTab===id ? T.accent : T.surface,
            color: adminTab===id ? T.bg : T.muted,
            border:`1px solid ${T.border}`, fontWeight: adminTab===id ? 700 : 400,
          }}>{label}</button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {adminTab === "users" && (
        <div>
          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
            {[
              { label:"TOTAL USERS",    value:users.length,  color:T.white  },
              { label:"FREE",           value:freeCount,     color:T.accent },
              { label:"PREMIUM ACTIVE", value:premCount - pendingCount, color:T.green },
              { label:"PENDING",        value:pendingCount,  color:T.amber  },
            ].map(s => (
              <div key={s.label} style={{ background:T.card, border:`1px solid ${T.border}`,
                                          borderRadius:8, padding:"12px 16px" }}>
                <div style={{ fontSize:8, color:T.muted, letterSpacing:"1px", marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color,
                               fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            {[["all","All Users"], ["free","Free Only"], ["premium","Premium Only"]].map(([v, label]) => (
              <button key={v} onClick={() => setUserFilter(v)} style={{
                padding:"6px 16px", borderRadius:6, fontSize:10, fontFamily:"inherit",
                background: userFilter===v ? T.surface : "transparent",
                color: userFilter===v ? T.white : T.muted,
                border:`1px solid ${userFilter===v ? T.border : "transparent"}`,
                fontWeight: userFilter===v ? 600 : 400,
              }}>{label} {v==="all" ? `(${users.length})` : v==="free" ? `(${freeCount})` : `(${premCount})`}</button>
            ))}
            <button onClick={loadUsers} style={{
              marginLeft:"auto", padding:"6px 14px", borderRadius:6, fontSize:9,
              fontFamily:"inherit", background:`${T.accent}18`,
              border:`1px solid ${T.accent}44`, color:T.accent,
            }}>↻ Refresh</button>
          </div>

          {loading && <Spinner />}
          {!loading && filteredUsers.length === 0 && <Card><Muted>No users found.</Muted></Card>}
          {!loading && filteredUsers.map(u => (
            <div key={u.id} style={{
              background:T.card, border:`1px solid ${T.border}`,
              borderRadius:10, padding:16, marginBottom:10,
              display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
            }}>
              {/* Tier colour strip on left */}
              <div style={{ width:3, alignSelf:"stretch", borderRadius:4,
                             background:tierColor(u.tier, u.is_approved), flexShrink:0 }} />

              {/* User info */}
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.white, marginBottom:3 }}>
                  {u.full_name || <span style={{ color:T.muted, fontStyle:"italic" }}>No name set</span>}
                  {u.is_admin && (
                    <span style={{ marginLeft:8, fontSize:9, color:T.accent,
                      background:`${T.accent}22`, padding:"2px 6px", borderRadius:10 }}>ADMIN</span>
                  )}
                </div>
                <div style={{ fontSize:11, color:T.muted }}>{u.email}</div>
                {u.telegram_username && (
                  <div style={{ fontSize:11, color:T.accent, marginTop:2 }}>
                    📱 {u.telegram_username}
                  </div>
                )}
                {!u.telegram_username && (
                  <div style={{ fontSize:10, color:T.muted, marginTop:2, fontStyle:"italic" }}>
                    No Telegram linked
                  </div>
                )}
                {u.mt5_login && (
                  <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>
                    MT5: {u.mt5_login} @ {u.mt5_server}
                  </div>
                )}
                {u.tier === "premium" && u.is_approved && (
                  <div style={{ marginTop:4, fontSize:9,
                                color: u.auto_trade ? T.green : T.muted }}>
                    {u.auto_trade ? "🤖 Auto-trade ON" : "⏸ Auto-trade OFF"}
                  </div>
                )}
              </div>

              {/* Tier badge */}
              <div style={{ textAlign:"center", minWidth:90 }}>
                <span style={{
                  padding:"5px 14px", borderRadius:20, fontSize:10, fontWeight:700,
                  background:`${tierColor(u.tier, u.is_approved)}22`,
                  color: tierColor(u.tier, u.is_approved),
                  border:`1px solid ${tierColor(u.tier, u.is_approved)}44`,
                  display:"inline-block",
                }}>
                  {u.tier?.toUpperCase()}
                  {u.tier==="premium" && !u.is_approved && " · PENDING"}
                  {u.tier==="premium" &&  u.is_approved && " · ACTIVE"}
                </span>
                <div style={{ fontSize:9, color:T.muted, marginTop:4 }}>
                  Joined: {u.created_at?.slice(0,10)}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                {u.tier === "premium" && !u.is_approved && (
                  <button onClick={() => approve(u.id)} style={{
                    padding:"7px 14px", borderRadius:6, fontSize:10, fontFamily:"inherit",
                    background:`${T.green}22`, border:`1px solid ${T.green}44`,
                    color:T.green, fontWeight:700, cursor:"pointer",
                  }}>✓ Approve</button>
                )}
                {u.tier === "premium" && u.is_approved && (
                  <button onClick={() => reject(u.id)} style={{
                    padding:"7px 14px", borderRadius:6, fontSize:10, fontFamily:"inherit",
                    background:`${T.red}22`, border:`1px solid ${T.red}44`,
                    color:T.red, fontWeight:700, cursor:"pointer",
                  }}>✕ Revoke</button>
                )}
                {/* Telegram button — show for anyone with chat ID */}
                {u.telegram_chat_id ? (
                  <button onClick={() => { setTgTarget(u); setTgResult(""); setTgMsg(""); }} style={{
                    padding:"7px 14px", borderRadius:6, fontSize:10, fontFamily:"inherit",
                    background:`${T.accent}22`, border:`1px solid ${T.accent}44`,
                    color:T.accent, fontWeight:700, cursor:"pointer",
                  }}>✉ Message</button>
                ) : (
                  <span style={{ fontSize:9, color:T.muted, fontStyle:"italic" }}>
                    No chat ID
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Telegram Modal */}
          {tgTarget && (
            <div style={{
              position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
              display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000,
            }}>
              <div style={{ background:T.card, border:`1px solid ${T.border}`,
                            borderRadius:14, padding:28, width:420 }}>
                <div style={{ fontSize:13, color:T.white, fontWeight:600, marginBottom:4 }}>
                  Send Telegram to {tgTarget.full_name}
                </div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:16 }}>
                  {tgTarget.telegram_username}
                </div>
                <textarea
                  value={tgMsg} onChange={e => setTgMsg(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`,
                            borderRadius:8, padding:"10px 14px", color:T.white,
                            fontSize:12, fontFamily:"'IBM Plex Mono',monospace",
                            resize:"vertical", outline:"none" }}
                />
                {tgResult && (
                  <div style={{ fontSize:11, marginTop:8,
                                color: tgResult.startsWith("✅") ? T.green : T.red }}>
                    {tgResult}
                  </div>
                )}
                <div style={{ display:"flex", gap:8, marginTop:12 }}>
                  <PrimaryBtn loading={tgSending} onClick={sendTelegram}>Send</PrimaryBtn>
                  <button onClick={() => setTgTarget(null)} style={{
                    flex:1, padding:"13px", borderRadius:8, fontFamily:"inherit",
                    background:"transparent", border:`1px solid ${T.border}`,
                    color:T.muted, fontSize:12, cursor:"pointer",
                  }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CALCULATOR TAB ── */}
      {adminTab === "subscriptions" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:9, letterSpacing:"2px", color:T.muted }}>PREMIUM SUBSCRIPTIONS</div>
            <button onClick={loadSubscriptions} style={{ padding:"5px 12px", borderRadius:5, fontSize:9,
              fontFamily:"inherit", background:`${T.accent}18`, border:`1px solid ${T.accent}40`, color:T.accent }}>
              ↻ Refresh
            </button>
          </div>
          {!subLoading && (() => {
            const active   = subUsers.filter(u => (u.days_left||0)>3).length;
            const expiring = subUsers.filter(u => (u.days_left||0)<=3 && (u.days_left||0)>0).length;
            const expired  = subUsers.filter(u => (u.days_left||0)<=0).length;
            return (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                {[{l:"ACTIVE",v:active,c:T.green},{l:"EXPIRING SOON",v:expiring,c:T.amber},{l:"EXPIRED",v:expired,c:T.red}].map(s=>(
                  <div key={s.l} style={{ background:T.card, border:`1px solid ${s.c}40`, borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ fontSize:8, color:T.muted, marginBottom:4 }}>{s.l}</div>
                    <div style={{ fontFamily:"Syne,sans-serif", fontSize:22, fontWeight:800, color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          {subLoading && <Spinner />}
          {!subLoading && subUsers.map(u => {
            const days = u.days_left ?? 0;
            const urgent = days<=3 && days>0, exp = days<=0;
            const col = exp?T.red:urgent?T.amber:T.green;
            return (
              <div key={u.id} style={{ background:T.card, border:`1px solid ${exp?T.red:urgent?T.amber:T.border}`,
                borderRadius:10, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:T.white }}>{u.full_name||u.email}</div>
                  <div style={{ fontSize:9, color:T.muted }}>{u.email}</div>
                  {u.subscription_expires_at && <div style={{ fontSize:9, color:T.muted, marginTop:2 }}>Expires: {u.subscription_expires_at?.slice(0,10)}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:800, color:col }}>{exp?"EXPIRED":`${days}d`}</div>
                  <div style={{ fontSize:8, color:T.muted }}>{exp?"expired":urgent?"⚠️ expiring soon":"remaining"}</div>
                </div>
                {urgent && (
                  <div style={{ width:"100%", fontSize:9, color:T.amber, background:`${T.amber}10`, borderRadius:5, padding:"6px 10px",
                    border:`1px solid ${T.amber}30`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span>Expires in {days} day{days!==1?"s":""}. Send reminder?</span>
                    <button onClick={async()=>{try{await api(`/api/admin/notify-expiry/${u.id}`,{method:"POST"});alert("✅ Sent!");}catch(e){alert("❌ "+e.message);}}} style={{
                      padding:"3px 10px", borderRadius:4, fontSize:8, background:`${T.amber}20`,
                      border:`1px solid ${T.amber}40`, color:T.amber, fontFamily:"inherit", fontWeight:700, cursor:"pointer" }}>Send</button>
                  </div>
                )}
                {exp && (
                  <div style={{ width:"100%", fontSize:9, color:T.red, background:`${T.red}10`, borderRadius:5, padding:"6px 10px",
                    border:`1px solid ${T.red}30`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span>Subscription expired. Revoke?</span>
                    <button onClick={async()=>{try{await api(`/api/admin/reject/${u.id}`,{method:"POST"});loadSubscriptions();}catch(e){alert("❌ "+e.message);}}} style={{
                      padding:"3px 10px", borderRadius:4, fontSize:8, background:`${T.red}20`,
                      border:`1px solid ${T.red}40`, color:T.red, fontFamily:"inherit", fontWeight:700, cursor:"pointer" }}>Revoke</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {adminTab === "calc" && (
        <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:16, alignItems:"start" }}>
          <div>
            <Card title="QUANTITATIVE TRADE CALCULATOR">
              {/* Strategy */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, letterSpacing:"2px", color:T.muted, marginBottom:8 }}>STRATEGY</div>
                <div style={{ display:"flex" }}>
                  {[["S1","EMA SWEEP (M5)"],["S2","LONDON BREAKOUT (M15)"]].map(([id, label], i) => (
                    <button key={id}
                      onClick={() => { setCalc({...calc, strategy:id}); setCalcResult(null); }}
                      style={{
                        flex:1, padding:"10px 6px", fontFamily:"inherit", fontSize:9,
                        fontWeight:700, letterSpacing:"1px",
                        background: calc.strategy===id ? T.accent : T.surface,
                        color: calc.strategy===id ? T.bg : T.muted,
                        border:`1px solid ${T.border}`,
                        borderRadius: i===0 ? "8px 0 0 8px" : "0 8px 8px 0",
                      }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Symbol */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:9, letterSpacing:"2px",
                                color:T.muted, marginBottom:5 }}>SYMBOL</label>
                <select value={calc.symbol}
                  onChange={e => { setCalc({...calc, symbol:e.target.value}); setCalcResult(null); }}
                  style={{ width:"100%", padding:"10px 14px", background:T.surface,
                           border:`1px solid ${T.border}`, borderRadius:8,
                           color:T.white, fontSize:12, fontFamily:"'IBM Plex Mono',monospace",
                           outline:"none", cursor:"pointer", appearance:"none",
                           backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a6080' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                           backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }}
                  onFocus={e => e.target.style.borderColor=T.accent}
                  onBlur={e  => e.target.style.borderColor=T.border}>
                  {["EURUSDm","XAUUSDm","BTCUSDm"].map(s => (
                    <option key={s} value={s} style={{ background:T.surface }}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Live data strip */}
              <div style={{ marginBottom:16, padding:"10px 14px", background:T.bg,
                            borderRadius:8, border:`1px solid ${T.border}`,
                            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:16 }}>
                  {[
                    { label:"ATR(14)", value: calcLive?.atr    ? calcLive.atr.toFixed(5)  : "—", color:T.white },
                    { label:"BID",     value: calcLive?.bid    ? fmtPrice(calc.symbol, calcLive.bid)  : "—", color:T.red   },
                    { label:"ASK",     value: calcLive?.ask    ? fmtPrice(calc.symbol, calcLive.ask)  : "—", color:T.green },
                    { label:"SPREAD",  value: calcLive?.spread ? `${calcLive.spread}p`    : "—", color:T.amber },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize:8, color:T.muted, letterSpacing:"1px" }}>{m.label}</div>
                      <div style={{ fontSize:11, color:m.color, fontWeight:600 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => fetchCalcLive(calc.symbol)} disabled={calcLoading} style={{
                  padding:"6px 14px", borderRadius:6, fontSize:9, fontFamily:"inherit",
                  background: calcLoading ? T.surface : `${T.accent}22`,
                  border:`1px solid ${T.accent}44`, color:T.accent, fontWeight:700,
                }}>{calcLoading ? "..." : "↻ LIVE"}</button>
              </div>

              {/* Direction */}
              <div style={{ marginBottom:14 }}>
                {["BUY","SELL"].map(d => (
                  <button key={d} onClick={() => setCalc({...calc, direction:d})} style={{
                    width:"50%", padding:"10px", fontFamily:"inherit", fontSize:11, fontWeight:700,
                    background: calc.direction===d ? (d==="BUY"?T.green:T.red) : T.surface,
                    color: calc.direction===d ? T.bg : T.muted,
                    border:`1px solid ${T.border}`,
                    borderRadius: d==="BUY" ? "8px 0 0 8px" : "0 8px 8px 0",
                  }}>{d}</button>
                ))}
              </div>

              <Field label="Entry Price (auto-filled from live tick)"
                     value={calc.entry} onChange={v => setCalc({...calc, entry:v})} type="number" />

              {calc.strategy === "S1" ? (
                <div style={{ padding:"10px 14px", background:T.bg, borderRadius:8,
                              border:`1px solid ${T.border}`, marginBottom:14,
                              fontSize:10, color:T.muted, lineHeight:1.7 }}>
                  🔹 <span style={{ color:T.accent }}>SL auto-calculated</span> from live ATR<br/>
                  SL = Entry ± <span style={{ color:T.white }}>1.5 × ATR</span> &nbsp;|&nbsp; TP = SL × 1 / 2 / 3
                </div>
              ) : (
                <>
                  <div style={{ margin:"4px 0 8px", fontSize:9, letterSpacing:"2px", color:T.accent }}>
                    ASIAN SESSION RANGE
                  </div>
                  <Field label="Asian High" value={calc.asianHigh}
                         onChange={v => setCalc({...calc, asianHigh:v})} type="number" />
                  <Field label="Asian Low"  value={calc.asianLow}
                         onChange={v => setCalc({...calc, asianLow:v})}  type="number" />
                  <div style={{ padding:"10px 14px", background:T.bg, borderRadius:8,
                                border:`1px solid ${T.border}`, marginBottom:14,
                                fontSize:10, color:T.muted, lineHeight:1.7 }}>
                    🔹 SL = opposite range boundary<br/>
                    TP = Entry ± <span style={{ color:T.white }}>1× / 2× / 3× range size</span>
                  </div>
                </>
              )}

              <Field label="Account Balance ($) — for lot sizing"
                     value={calc.accountBal} onChange={v => setCalc({...calc, accountBal:v})} type="number" />
              <PrimaryBtn onClick={runCalc}>⚡ CALCULATE</PrimaryBtn>
            </Card>
          </div>

          {/* Results */}
          <div>
            {!calcResult && (
              <Card>
                <div style={{ textAlign:"center", padding:"32px 0" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>🧮</div>
                  <div style={{ fontSize:12, color:T.muted, lineHeight:1.8 }}>
                    Click <span style={{ color:T.accent }}>↻ LIVE</span> to auto-fill entry,
                    then <span style={{ color:T.accent }}>⚡ CALCULATE</span>.
                  </div>
                </div>
              </Card>
            )}
            {calcResult && (() => {
              const stratLabel = calc.strategy === "S1" ? "EMA SWEEP" : "LONDON BREAKOUT";
              return (
                <div>
                  <div style={{ background:`${T.accent}12`, border:`1px solid ${T.accent}30`,
                                borderRadius:10, padding:"14px 20px", marginBottom:14,
                                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:9, color:T.muted, letterSpacing:"2px" }}>
                        STRATEGY · SYMBOL · DIRECTION
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.white, marginTop:4 }}>
                        <span style={{ color:T.accent }}>{stratLabel}</span>
                        &nbsp;·&nbsp;{calc.symbol}&nbsp;·&nbsp;
                        <span style={{ color: calc.direction==="BUY" ? T.green : T.red }}>
                          {calc.direction}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px" }}>ENTRY</div>
                      <div style={{ fontSize:18, fontWeight:700, color:T.white,
                                    fontFamily:"'Syne',sans-serif" }}>{calc.entry}</div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                    {[
                      { label:"STOP LOSS",         value:calcResult.sl,      color:T.red    },
                      { label:"SL DISTANCE (PIPS)", value:`${calcResult.slDist} (${calcResult.slPips}p)`, color:T.amber },
                      { label:"LOT SIZE (1% RISK)", value:calcResult.lot,     color:T.accent },
                    ].map(m => (
                      <div key={m.label} style={{ background:T.card, border:`1px solid ${T.border}`,
                                                  borderRadius:8, padding:"12px 14px" }}>
                        <div style={{ fontSize:8, color:T.muted, letterSpacing:"1px", marginBottom:6 }}>
                          {m.label}
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:m.color,
                                      fontFamily:"'Syne',sans-serif" }}>{m.value}</div>
                        {m.label === "STOP LOSS" && (
                          <button onClick={() => navigator.clipboard.writeText(calcResult.sl)}
                            style={{ marginTop:6, padding:"3px 8px", borderRadius:4, fontSize:8,
                                     background:`${T.red}22`, border:`1px solid ${T.red}44`,
                                     color:T.red, fontFamily:"inherit", cursor:"pointer" }}>Copy</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ padding:"10px 16px", background:T.surface, borderRadius:8,
                                border:`1px solid ${T.border}`, marginBottom:14,
                                fontSize:10, color:T.muted, lineHeight:1.8 }}>
                    Risk: <span style={{ color:T.white }}>${calcResult.riskAmt}</span>
                    &nbsp;(1% of ${parseFloat(calc.accountBal||0).toFixed(2)})
                    {calcResult.rangeSize && (
                      <> &nbsp;·&nbsp; Range: <span style={{ color:T.white }}>{calcResult.rangeSize}</span></>
                    )}
                    {calcLive?.atr && calc.strategy==="S1" && (
                      <> &nbsp;·&nbsp; ATR: <span style={{ color:T.white }}>{calcLive.atr.toFixed(5)}</span></>
                    )}
                  </div>

                  {[
                    { label:"TP 1  ·  1:1 R:R", value:calcResult.tp1, color:T.green  },
                    { label:"TP 2  ·  1:2 R:R", value:calcResult.tp2, color:T.accent },
                    { label:"TP 3  ·  1:3 R:R", value:calcResult.tp3, color:T.amber  },
                  ].map((tp, i) => (
                    <div key={i} style={{
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"16px 18px", marginBottom:10, borderRadius:10,
                      background:`${tp.color}10`, border:`1px solid ${tp.color}30`,
                    }}>
                      <div>
                        <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px", marginBottom:5 }}>
                          {tp.label}
                        </div>
                        <div style={{ fontSize:24, fontWeight:700, color:tp.color,
                                      fontFamily:"'Syne',sans-serif" }}>{tp.value}</div>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(tp.value)}
                        style={{ padding:"7px 14px", borderRadius:6, fontSize:9,
                                 background:`${tp.color}22`, border:`1px solid ${tp.color}44`,
                                 color:tp.color, fontFamily:"inherit", cursor:"pointer", fontWeight:700 }}>
                        COPY
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────

function Card({ children, title, style = {} }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:20, ...style }}>
      {title && <div style={{ fontSize:9, letterSpacing:"2px", color:T.muted, marginBottom:16 }}>{title}</div>}
      {children}
    </div>
  );
}

function MarketConditionCard({ analysis }) {
  const c = analysis.condition;
  const color = { GOOD:T.green, CAUTION:T.amber, AVOID:T.red }[c] || T.muted;
  return (
    <Card title="MARKET CONDITION">
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ fontSize:32, fontFamily:"'Syne',sans-serif", fontWeight:800, color }}>
          {c}
        </div>
        <div style={{ fontSize:28, fontFamily:"'Syne',sans-serif", color:T.white }}>
          {analysis.score}<span style={{ fontSize:12, color:T.muted }}>/100</span>
        </div>
      </div>
      <div style={{ height:5, background:T.surface, borderRadius:10, marginBottom:12 }}>
        <div style={{ width:`${analysis.score}%`, height:"100%", borderRadius:10,
                      background:`linear-gradient(90deg, ${T.accent}, ${color})` }} />
      </div>
      <div style={{ fontSize:11, color:T.muted, lineHeight:1.6 }}>
        {analysis.trend} · {analysis.session?.replace(/_/g," ")} · Spread: {analysis.spread_pips?.toFixed(1)}p
      </div>
    </Card>
  );
}

function SignalRow({ sig }) {
  const isBuy = sig.direction === "BUY";
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ width:6, height:6, borderRadius:"50%",
                       background: isBuy?T.green:T.red, display:"inline-block" }} />
        <span style={{ fontSize:11, color:T.white }}>{sig.symbol}</span>
        <span style={{ fontSize:10, color: isBuy?T.green:T.red }}>{sig.direction}</span>
      </div>
      <span style={{ fontSize:10, color:T.muted }}>{fmtPrice(sig.symbol, sig.entry)}</span>
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:9, letterSpacing:"2px",
                      color:T.muted, marginBottom:5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
             placeholder={placeholder}
             style={{ width:"100%", padding:"10px 14px", background:T.surface,
                      border:`1px solid ${T.border}`, borderRadius:8,
                      color:T.white, fontSize:12, fontFamily:"'IBM Plex Mono',monospace",
                      transition:"border .2s" }}
             onFocus={e => e.target.style.borderColor=T.accent}
             onBlur={e  => e.target.style.borderColor=T.border} />
    </div>
  );
}

function PrimaryBtn({ children, onClick, loading, style={} }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width:"100%", padding:"13px", borderRadius:8, fontFamily:"inherit",
      background: loading ? T.muted : T.accent, color: T.bg,
      fontSize:12, fontWeight:700, border:"none", letterSpacing:"1px",
      transition:"opacity .2s", opacity: loading ? 0.7 : 1,
      ...style,
    }}>{loading ? "PROCESSING..." : children}</button>
  );
}

function AuthCard({ children, title, badge }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:14, padding:28 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:T.white }}>
          {title}
        </div>
        {badge && (
          <span style={{ padding:"4px 10px", borderRadius:20, fontSize:9,
                         background:`${T.accent}22`, color:T.accent,
                         border:`1px solid ${T.accent}44`, letterSpacing:"1px" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SuccessCard({ msg, onOk }) {
  return (
    <div style={{ background:`${T.green}12`, border:`1px solid ${T.green}44`,
                  borderRadius:14, padding:32, textAlign:"center" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
      <p style={{ fontSize:12, color:T.text, lineHeight:1.7, marginBottom:20 }}>{msg}</p>
      <PrimaryBtn onClick={onOk}>Continue to Sign In</PrimaryBtn>
    </div>
  );
}

function FeatureList({ items, accent }) {
  return (
    <div style={{ background:T.bg, borderRadius:8, padding:"12px 14px", marginBottom:16 }}>
      {items.map(it => (
        <div key={it} style={{ display:"flex", gap:8, alignItems:"center",
                               fontSize:11, color:T.text, padding:"4px 0" }}>
          <span style={{ color: accent ? T.accent : T.green }}>✓</span> {it}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize:9, letterSpacing:"1px", color:T.muted, marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color: color||T.white }}>{value}</div>
    </div>
  );
}

function LabelVal({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px" }}>{label}</div>
      <div style={{ fontSize:11, fontWeight:600, color: color||T.text, marginTop:2 }}>{value}</div>
    </div>
  );
}

function Err({ children }) {
  return <div style={{ fontSize:11, color:T.red, marginBottom:10 }}>{children}</div>;
}

function Muted({ children }) {
  return <div style={{ fontSize:12, color:T.muted, padding:"8px 0" }}>{children}</div>;
}


// ─────────────────────────────────────────────────────────────
//  QUICK TRADE BUTTON
// ─────────────────────────────────────────────────────────────
function QuickTrade({ symbol, entry, sl, tp, isPremium, compact = false }) {
  const [placing, setPlacing] = useState(null);
  const [msg, setMsg]         = useState("");
  const execute = async (dir) => {
    if (!isPremium || placing) return;
    setPlacing(dir); setMsg("");
    try {
      const tick = await api(`/api/market/tick/${symbol}`);
      const px   = dir === "BUY" ? tick.ask : tick.bid;

      // Symbol-aware ATR fallback — spread * 80 is wrong for XAU/BTC
      // Fetch live ATR from analysis; fall back to sensible per-symbol defaults
      let atr;
      try {
        const anlData = await api(`/api/market/analysis/${symbol}?timeframe=M5`);
        atr = anlData?.atr;
      } catch {}
      if (!atr || atr <= 0) {
        atr = symbol?.includes("BTC") ? 250 :
              symbol?.includes("XAU") ? 4.0 : 0.0018;
      }

      const slVal = sl  !== undefined && sl  !== null ? sl  : (dir==="BUY" ? px - atr*1.5 : px + atr*1.5);
      const tpVal = tp  !== undefined && tp  !== null ? tp  : (dir==="BUY" ? px + atr*3   : px - atr*3);

      await api("/api/orders/place", { method:"POST",
        body: JSON.stringify({ symbol, direction:dir, lot:0.01, sl:slVal, tp:tpVal }) });
      setMsg(`✅ Done! Your ${dir} trade on ${symbol} was placed successfully.`);
    } catch(e) {
      const errText = e.message?.includes("insufficient")||e.message?.toLowerCase().includes("margin")
        ? "❌ Not enough balance in your MT5 account. Please deposit funds."
        : e.message?.includes("market closed")||e.message?.toLowerCase().includes("closed")
        ? "❌ Market is closed right now. Try again during active hours (2–5 PM WAT)."
        : e.message?.includes("connection")||e.message?.toLowerCase().includes("connect")
        ? "❌ Can't reach your MT5. Check your internet and MT5 server connection."
        : `❌ Couldn't place trade: ${e.message}`;
      setMsg(errText);
    }
    setPlacing(null); setTimeout(() => setMsg(""), 5000);
  };
  if (!isPremium) return (
    <div style={{ fontSize:8, color:T.muted, textAlign:"center", padding:"7px",
                  border:`1px solid ${T.border}`, borderRadius:6, marginTop:6 }}>
      🔒 Premium required to execute
    </div>
  );
  const pad = compact ? "7px 10px" : "10px 14px";
  const fz  = compact ? 9 : 11;
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => execute("BUY")} disabled={!!placing} style={{
          flex:1, padding:pad, borderRadius:7, fontFamily:"inherit",
          fontSize:fz, fontWeight:800, letterSpacing:"1.5px", border:"none",
          background:placing?`${T.green}50`:T.green, color:T.bg, cursor:"pointer",
        }}>{placing==="BUY"?"BUYING...":"BUY"}</button>
        <button onClick={() => execute("SELL")} disabled={!!placing} style={{
          flex:1, padding:pad, borderRadius:7, fontFamily:"inherit",
          fontSize:fz, fontWeight:800, letterSpacing:"1.5px", border:"none",
          background:placing?`${T.red}50`:T.red, color:T.white, cursor:"pointer",
        }}>{placing==="SELL"?"SELLING...":"SELL"}</button>
      </div>
      {msg && <div style={{ fontSize:9, marginTop:6, textAlign:"center",
                             color:msg.startsWith("✅")?T.green:T.red }}>{msg}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PAYMENT MODAL  — Paystack | Flutterwave | Bank Transfer
//  Amount: NGN 15,500 / month (~$10)
//
//  .env keys needed:
//    VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
//    VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx
//    PAYSTACK_SECRET_KEY=sk_live_xxxxx
//    FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
// ─────────────────────────────────────────────────────────────
const AMOUNT_NGN  = 15500;   // NGN 15,500 (~$10)
const AMOUNT_KOBO = AMOUNT_NGN * 100;  // Paystack uses kobo

function PaystackModal({ user, onSuccess, onClose }) {
  const [gateway,  setGateway]  = useState("paystack");  // "paystack" | "flutterwave" | "monnify" | "bank"
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [copied,   setCopied]   = useState(false);
  const [proofRef, setProofRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const ref = `LUMA-${user.id}-${Date.now()}`;

  // ── Paystack ────────────────────────────────────────────
  const payViaPaystack = () => {
    const pk = window.__PAYSTACK_PK__ || "";
    if (!pk) { setError("Paystack not configured. Please try Flutterwave or Bank Transfer."); return; }
    setLoading(true); setError("");
    const launch = () => {
      window.PaystackPop.setup({
        key: pk, email: user.email, amount: AMOUNT_KOBO, currency: "NGN",
        ref, metadata: { user_id: user.id, plan: "premium_monthly" },
        onClose: () => setLoading(false),
        callback: async (res) => {
          setLoading(false);
          try {
            await api("/api/payments/verify", { method:"POST",
              body: JSON.stringify({ reference: res.reference, gateway: "paystack" }) });
            onSuccess();
          } catch(e) { setError(`Payment received (ref: ${res.reference}) but verification failed. Contact support.`); }
        },
      }).openIframe();
    };
    if (window.PaystackPop) { launch(); return; }
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = launch;
    s.onerror = () => { setError("Could not load Paystack. Try Flutterwave or Bank Transfer."); setLoading(false); };
    document.head.appendChild(s);
  };

  // ── Flutterwave ─────────────────────────────────────────
  const payViaFlutterwave = () => {
    const pk = window.__FLW_PK__ || "";
    if (!pk) { setError("Flutterwave not configured. Please try Bank Transfer."); return; }
    setLoading(true); setError("");
    const launch = () => {
      window.FlutterwaveCheckout({
        public_key: pk,
        tx_ref:     ref,
        amount:     AMOUNT_NGN,
        currency:   "NGN",
        customer: { email: user.email, name: user.full_name || user.email },
        customizations: { title:"LumaTrade-FX Premium", description:"30-day premium subscription", logo:"https://lumafxt.com/favicon.ico" },
        meta: { user_id: user.id, plan: "premium_monthly" },
        callback: async (res) => {
          setLoading(false);
          if (res.status === "successful" || res.status === "completed") {
            try {
              await api("/api/payments/verify", { method:"POST",
                body: JSON.stringify({ reference: res.transaction_id?.toString() || res.tx_ref, gateway: "flutterwave" }) });
              onSuccess();
            } catch(e) { setError(`Payment received (txn: ${res.transaction_id}) but verification failed. Contact support.`); }
          } else { setError("Payment was not completed. Please try again."); }
        },
        onclose: () => setLoading(false),
      });
    };
    if (window.FlutterwaveCheckout) { launch(); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.onload = launch;
    s.onerror = () => { setError("Could not load Flutterwave. Please try Bank Transfer."); setLoading(false); };
    document.head.appendChild(s);
  };

  // ── Monnify ─────────────────────────────────────────────
  const payViaMonnify = () => {
    const apiKey  = window.__MONNIFY_API_KEY__ || "";
    const contract= window.__MONNIFY_CONTRACT__ || "";
    if (!apiKey || !contract) {
      setError("Monnify not configured. Please try Paystack or Bank Transfer.");
      return;
    }
    setLoading(true); setError("");
    const launch = () => {
      window.MonnifySDK.initialize({
        amount:            AMOUNT_NGN,
        currency:          "NGN",
        reference:         ref,
        customerFullName:  user.full_name || user.email,
        customerEmail:     user.email,
        apiKey,
        contractCode:      contract,
        paymentDescription:"LumaTrade-FX Premium — 30 days",
        isTestMode:        false,
        metadata: { user_id: String(user.id) },
        paymentMethods:    ["CARD","ACCOUNT_TRANSFER","USSD","PHONE_NUMBER"],
        onLoadStart:  () => {},
        onLoadComplete: () => {},
        onComplete: async (res) => {
          setLoading(false);
          if (res.status === "SUCCESS" || res.status === "PAID") {
            try {
              await api("/api/payments/verify", { method:"POST",
                body: JSON.stringify({ reference: res.transactionReference || ref, gateway: "monnify" }) });
              onSuccess();
            } catch(e) {
              setError(`Payment received (ref: ${res.transactionReference}) but verification failed. Contact support.`);
            }
          } else {
            setError("Payment was not completed. Please try again.");
          }
        },
        onClose: () => setLoading(false),
      });
    };
    if (window.MonnifySDK) { launch(); return; }
    const s = document.createElement("script");
    s.src = "https://sdk.monnify.com/plugin/monnify.js";
    s.onload = launch;
    s.onerror = () => {
      setError("Could not load Monnify. Please try Paystack or Bank Transfer.");
      setLoading(false);
    };
    document.head.appendChild(s);
  };

  // ── Bank Transfer submission ─────────────────────────────
  const submitBankTransfer = async () => {
    if (!proofRef.trim()) { setError("Please enter your payment reference or last 6 digits of the transfer."); return; }
    setSubmitting(true); setError("");
    try {
      await api("/api/payments/bank-transfer", { method:"POST",
        body: JSON.stringify({ user_id: user.id, ref: proofRef.trim(), amount: AMOUNT_NGN }) });
      onSuccess();
    } catch(e) { setError("Submission failed. Please contact support@lumafxt.com with your transfer details."); }
    setSubmitting(false);
  };

  const copyAcct = (text) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const gateways = [
    { id:"paystack",    label:"Paystack",    emoji:"💳", sub:"Cards, USSD, Bank" },
    { id:"flutterwave", label:"Flutterwave", emoji:"🦋", sub:"Cards, Mobile Money" },
    { id:"monnify",     label:"Monnify",     emoji:"🔵", sub:"Card, Transfer, USSD" },
    { id:"bank",        label:"Bank Transfer",emoji:"🏦", sub:"Direct OPay Transfer" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)",
                  display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000,
                  padding:"0 16px", overflowY:"auto" }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16,
                    padding:24, width:400, maxWidth:"100%", margin:"20px 0" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:900, color:T.white }}>
              <span style={{ color:T.accent }}>◆</span> Premium Subscription
            </div>
            <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>30 days · Auto signals · ₦{AMOUNT_NGN.toLocaleString()} (~$10)</div>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:T.muted, fontSize:18, cursor:"pointer" }}>✕</button>
        </div>

        {/* Plan summary */}
        <div style={{ background:T.surface, borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
          {[["Amount","₦" + AMOUNT_NGN.toLocaleString() + " / month"],["Duration","30 days from payment"],["Account",user.email]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0",
                                   borderBottom:`1px solid ${T.border}30`, fontSize:10 }}>
              <span style={{ color:T.muted }}>{l}</span>
              <span style={{ color:T.white, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Gateway selector */}
        <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px", marginBottom:8 }}>CHOOSE PAYMENT METHOD</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6, marginBottom:16 }}>
          {gateways.map(g => (
            <button key={g.id} onClick={() => { setGateway(g.id); setError(""); }} style={{
              padding:"10px 6px", borderRadius:8, fontFamily:"inherit",
              background: gateway===g.id ? `${T.accent}20` : T.surface,
              border:`1px solid ${gateway===g.id ? T.accent : T.border}`,
              color: gateway===g.id ? T.accent : T.text,
              textAlign:"center",
            }}>
              <div style={{ fontSize:18, marginBottom:3 }}>{g.emoji}</div>
              <div style={{ fontSize:9, fontWeight:700 }}>{g.label}</div>
              <div style={{ fontSize:7.5, color:T.muted, marginTop:1 }}>{g.sub}</div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize:9, color:T.red, padding:"8px 12px", background:`${T.red}10`,
                         borderRadius:6, marginBottom:12, lineHeight:1.5 }}>{error}</div>
        )}

        {/* ── Paystack / Flutterwave / Monnify ── */}
        {(gateway === "paystack" || gateway === "flutterwave" || gateway === "monnify") && (
          <button
            onClick={gateway === "paystack" ? payViaPaystack : gateway === "flutterwave" ? payViaFlutterwave : payViaMonnify}
            disabled={loading}
            style={{
              width:"100%", padding:"14px", borderRadius:10, fontFamily:"inherit", fontSize:13,
              fontWeight:900, letterSpacing:"1px", border:"none",
              background:loading ? T.muted : T.green, color:T.bg, cursor:"pointer",
            }}>
            {loading
              ? "Opening payment..."
              : `💳  PAY ₦${AMOUNT_NGN.toLocaleString()} via ${
                  gateway === "paystack" ? "Paystack" :
                  gateway === "flutterwave" ? "Flutterwave" : "Monnify"
                }`
            }
          </button>
        )}

        {/* ── Bank Transfer ── */}
        {gateway === "bank" && (
          <div>
            <div style={{ background:T.surface, borderRadius:8, padding:"14px", marginBottom:12 }}>
              <div style={{ fontSize:9, color:T.accent, letterSpacing:"1px", marginBottom:8 }}>TRANSFER DETAILS</div>
              {[
                ["Bank",       "OPay"],
                ["Account No.", "9110183013"],
                ["Name",       "Dianabasi Daniel"],
                ["Amount",     `₦${AMOUNT_NGN.toLocaleString()}`],
              ].map(([l,v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0",
                                       borderBottom:`1px solid ${T.border}30`, fontSize:11 }}>
                  <span style={{ color:T.muted, fontSize:10 }}>{l}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:T.white, fontWeight:700 }}>{v}</span>
                    {(l==="Account No."||l==="Amount") && (
                      <button onClick={() => copyAcct(v)} style={{
                        padding:"2px 7px", borderRadius:4, fontSize:8,
                        background:`${T.accent}18`, border:`1px solid ${T.accent}30`,
                        color:T.accent, cursor:"pointer", fontFamily:"inherit",
                      }}>{copied?"Copied!":"Copy"}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:9, color:T.amber, lineHeight:1.6, marginBottom:12,
                           padding:"8px 10px", background:`${T.amber}10`, borderRadius:6 }}>
              ⚠️ After transferring, enter your transaction reference below. Your account will be activated within 1–2 hours after confirmation.
            </div>
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:9, color:T.muted, marginBottom:4 }}>TRANSACTION REFERENCE / LAST 6 DIGITS</div>
              <input
                value={proofRef}
                onChange={e => setProofRef(e.target.value)}
                placeholder="e.g. TXN123456 or 451829"
                style={{
                  width:"100%", padding:"10px 12px", borderRadius:7,
                  background:T.surface, border:`1px solid ${T.border}`,
                  color:T.white, fontFamily:"inherit", fontSize:11,
                  outline:"none",
                }}
              />
            </div>
            <button onClick={submitBankTransfer} disabled={submitting} style={{
              width:"100%", padding:"13px", borderRadius:10, fontFamily:"inherit", fontSize:12,
              fontWeight:800, border:"none", background:submitting?T.muted:T.accent,
              color:T.bg, cursor:"pointer",
            }}>{submitting ? "Submitting..." : "✅  I've Made the Transfer"}</button>
          </div>
        )}

        <div style={{ marginTop:10, fontSize:8, color:T.muted, textAlign:"center", lineHeight:1.6 }}>
          By paying you agree to our <a href="https://lumafxt.com/#/terms" style={{ color:T.accent }}>Terms</a> &amp; <a href="https://lumafxt.com/#/privacy" style={{ color:T.accent }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SUBSCRIPTION BADGE
// ─────────────────────────────────────────────────────────────
function SubBadge({ user, onClick }) {
  const days = user?.subscription_days_left ?? null;
  if (days === null || days === undefined) return null;
  const urgent = days<=3 && days>0, expired = days<=0;
  const color  = expired?T.red:urgent?T.amber:T.green;
  return (
    <div onClick={onClick} title="Click to renew" style={{
      padding:"3px 9px", borderRadius:20, fontSize:8, fontWeight:700, flexShrink:0,
      background:`${color}18`, color, border:`1px solid ${color}33`, cursor:"pointer",
      animation:urgent?"pulse 1.5s infinite":"none",
    }}>
      {(urgent||expired)?"⚠️ ":"💳 "}{expired?"EXPIRED":`${days}d`}
    </div>
  );
}

// Aliases used in RightPanel Calculator
function GField(props) { return <Field {...props} />; }
function GPrimaryBtn(props) { return <PrimaryBtn {...props} />; }


// ─────────────────────────────────────────────────────────────
//  EDIT PROFILE MODAL
//  Demo ↔ Real account switch + MT5 credentials + name/telegram
// ─────────────────────────────────────────────────────────────
function EditProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name:          user.full_name || "",
    telegram_username:  user.telegram_username || "",
    mt5_login:          user.mt5_login || "",
    mt5_password:       "",
    mt5_server:         user.mt5_server || "Exness-MT5Trial9",
    account_type:       user.account_type || "demo",  // "demo" | "real"
  });
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [showPass, setShowPass] = useState(false);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      await api("/api/profile/update", {
        method: "POST",
        body: JSON.stringify({
          full_name:         form.full_name,
          telegram_username: form.telegram_username,
          mt5_login:         form.mt5_login ? parseInt(form.mt5_login) : null,
          mt5_password:      form.mt5_password || undefined,
          mt5_server:        form.mt5_server,
          account_type:      form.account_type,
        }),
      });
      setMsg("✅ Profile saved!");
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch(e) {
      setMsg(`❌ ${e.message || "Save failed. Try again."}`);
    }
    setSaving(false);
  };

  const servers = [
    "Exness-MT5Trial9",
    "Exness-MT5Real7",
    "Exness-MT5Real8",
    "ICMarkets-MT5Demo04",
    "ICMarkets-MT5Live19",
    "XM-MT5Live3",
    "FBS-MT5Real",
    "HFM-MT5Live3",
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  zIndex:2000, padding:"16px", overflowY:"auto" }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16,
                    padding:24, width:400, maxWidth:"100%", margin:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:900, color:T.white }}>
            ✏️ Edit Profile
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:T.muted, fontSize:18, cursor:"pointer" }}>✕</button>
        </div>

        {/* Account type toggle */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px", marginBottom:8 }}>ACCOUNT TYPE</div>
          <div style={{ display:"flex", gap:8 }}>
            {[["demo","🧪 Demo Account","Practice with virtual money"],["real","💰 Real Account","Live trading with real money"]].map(([val,label,sub])=>(
              <button key={val} onClick={() => setForm({...form, account_type:val})} style={{
                flex:1, padding:"10px 8px", borderRadius:8, fontFamily:"inherit",
                background:form.account_type===val ? (val==="real"?`${T.green}20`:`${T.accent}20`) : T.surface,
                border:`1px solid ${form.account_type===val ? (val==="real"?T.green:T.accent) : T.border}`,
                color:form.account_type===val ? (val==="real"?T.green:T.accent) : T.muted,
                textAlign:"center",
              }}>
                <div style={{ fontSize:11, fontWeight:700 }}>{label}</div>
                <div style={{ fontSize:8, opacity:0.7, marginTop:2 }}>{sub}</div>
              </button>
            ))}
          </div>
          {form.account_type === "real" && (
            <div style={{ marginTop:8, padding:"8px 10px", borderRadius:6,
                           background:`${T.amber}10`, border:`1px solid ${T.amber}30`,
                           fontSize:9, color:T.amber, lineHeight:1.5 }}>
              ⚠️ Real account mode will execute trades with real money. Make sure your MT5 credentials below are for your live account.
            </div>
          )}
        </div>

        {/* Personal info */}
        <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px", marginBottom:8 }}>PERSONAL INFO</div>
        {[
          {label:"Full Name",          key:"full_name",         type:"text",     placeholder:"Your full name"},
          {label:"Telegram Username",  key:"telegram_username", type:"text",     placeholder:"@yourusername"},
        ].map(f => (
          <div key={f.key} style={{ marginBottom:10 }}>
            <div style={{ fontSize:9, color:T.muted, marginBottom:4 }}>{f.label}</div>
            <input
              type={f.type} value={form[f.key]}
              onChange={e => setForm({...form, [f.key]: e.target.value})}
              placeholder={f.placeholder}
              style={{ width:"100%", padding:"9px 12px", borderRadius:7,
                        background:T.surface, border:`1px solid ${T.border}`,
                        color:T.white, fontFamily:"inherit", fontSize:11, outline:"none" }}
            />
          </div>
        ))}

        {/* MT5 credentials */}
        <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px", marginBottom:8, marginTop:4 }}>
          MT5 ACCOUNT ({form.account_type === "real" ? "LIVE" : "DEMO"})
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:9, color:T.muted, marginBottom:4 }}>MT5 Login (Account Number)</div>
          <input type="number" value={form.mt5_login}
            onChange={e => setForm({...form, mt5_login:e.target.value})}
            placeholder="e.g. 12345678"
            style={{ width:"100%", padding:"9px 12px", borderRadius:7,
                      background:T.surface, border:`1px solid ${T.border}`,
                      color:T.white, fontFamily:"inherit", fontSize:11, outline:"none" }}
          />
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:9, color:T.muted, marginBottom:4 }}>MT5 Password (leave blank to keep current)</div>
          <div style={{ position:"relative" }}>
            <input type={showPass?"text":"password"} value={form.mt5_password}
              onChange={e => setForm({...form, mt5_password:e.target.value})}
              placeholder="New password (optional)"
              style={{ width:"100%", padding:"9px 36px 9px 12px", borderRadius:7,
                        background:T.surface, border:`1px solid ${T.border}`,
                        color:T.white, fontFamily:"inherit", fontSize:11, outline:"none" }}
            />
            <button onClick={() => setShowPass(p=>!p)} style={{
              position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
              background:"transparent", border:"none", color:T.muted, cursor:"pointer", fontSize:12,
            }}>{showPass?"🙈":"👁"}</button>
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:9, color:T.muted, marginBottom:4 }}>MT5 Server</div>
          <select value={form.mt5_server}
            onChange={e => setForm({...form, mt5_server:e.target.value})}
            style={{ width:"100%", padding:"9px 12px", borderRadius:7,
                      background:T.surface, border:`1px solid ${T.border}`,
                      color:T.white, fontFamily:"inherit", fontSize:11, outline:"none" }}>
            {servers.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="custom">Custom server...</option>
          </select>
          {form.mt5_server === "custom" && (
            <input type="text" placeholder="Type server name exactly"
              onChange={e => setForm({...form, mt5_server:e.target.value})}
              style={{ width:"100%", marginTop:6, padding:"9px 12px", borderRadius:7,
                        background:T.surface, border:`1px solid ${T.border}`,
                        color:T.white, fontFamily:"inherit", fontSize:11, outline:"none" }}
            />
          )}
        </div>

        {msg && (
          <div style={{ fontSize:10, color:msg.startsWith("✅")?T.green:T.red, marginBottom:12,
                         padding:"8px 12px", background:msg.startsWith("✅")?`${T.green}10`:`${T.red}10`,
                         borderRadius:6 }}>{msg}</div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <button onClick={onClose} style={{
            padding:"12px", borderRadius:8, fontFamily:"inherit", fontSize:11,
            background:"transparent", border:`1px solid ${T.border}`, color:T.muted, cursor:"pointer",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding:"12px", borderRadius:8, fontFamily:"inherit", fontSize:11, fontWeight:800,
            border:"none", background:saving?T.muted:T.accent, color:T.bg, cursor:"pointer",
          }}>{saving?"Saving...":"💾 Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
//  TERMS & CONDITIONS / PRIVACY POLICY MODAL
// ─────────────────────────────────────────────────────────────
const PRIVACY_TEXT = `
<h3 style="color:#00d4ff;margin-bottom:8px">Privacy Policy</h3>
<p style="opacity:0.6;font-size:10px;margin-bottom:12px">Effective Date: March 28, 2026</p>
<p><strong>1. Introduction</strong><br>LumaTrade-FX operates the algorithmic trading signal platform at lumafxt.com. By registering, you consent to the practices described here.</p>
<p><strong>2. Information We Collect</strong><br>
• Full name and email address upon registration<br>
• Payment information (processed via Paystack/Flutterwave — we do not store card details)<br>
• IP address, browser type, device information, and login timestamps<br>
• Dashboard usage data and WebSocket connection logs
</p>
<p><strong>3. How We Use Your Information</strong><br>To authenticate your account, deliver signals, process payments, send expiry notifications, and improve the platform. We do not sell or trade your data to third parties for marketing.</p>
<p><strong>4. Data Security</strong><br>Data is stored on a secured VPS with HTTPS/SSL. Passwords are bcrypt-hashed. MT5 credentials are AES-256 encrypted.</p>
<p><strong>5. Third-Party Services</strong><br>Paystack, Flutterwave, Telegram Bot API, MetaTrader 5 / Exness. We are not responsible for their privacy practices.</p>
<p><strong>6. Your Rights</strong><br>You may request access, correction, or deletion of your data. Contact: support@lumafxt.com</p>
<p><strong>7. Cookies</strong><br>We use minimal cookies for authentication only. No tracking or advertising cookies.</p>
<p><strong>8. Contact</strong><br>support@lumafxt.com · https://lumafxt.com</p>
`;

const TERMS_TEXT = `
<h3 style="color:#00d4ff;margin-bottom:8px">Terms &amp; Conditions</h3>
<p style="opacity:0.6;font-size:10px;margin-bottom:12px">Effective Date: March 28, 2026</p>
<p><strong>1. Acceptance</strong><br>By accessing LumaTrade-FX at lumafxt.com, you agree to these Terms. Discontinue use if you disagree.</p>
<p><strong>2. Service Description</strong><br>LumaTrade-FX is an algorithmic trading signal platform using Smart Money Concepts strategies.<br>
• <strong>Free Tier:</strong> Basic signal access and market data<br>
• <strong>Premium Tier:</strong> Full real-time signals and auto-copy at ₦15,500/month
</p>
<p><strong>3. Financial Disclaimer</strong><br>⚠️ <strong>IMPORTANT:</strong> Trading forex involves substantial risk of loss and is not suitable for all investors. LumaTrade-FX provides signals for informational purposes only — nothing constitutes financial advice. Past performance does not guarantee future results. You are solely responsible for your trading decisions. LumaTrade-FX shall not be liable for any financial losses.</p>
<p><strong>4. Account Registration</strong><br>You must provide accurate information and maintain credential confidentiality. We reserve the right to suspend accounts that violate these requirements.</p>
<p><strong>5. Subscriptions & Payments</strong><br>Premium subscriptions are billed at ₦15,500/month. Non-refundable once activated. You will be notified 3 days before expiry. Failure to renew causes automatic downgrade to Free tier.</p>
<p><strong>6. Prohibited Activities</strong><br>You agree not to reproduce/resell signals, scrape the platform, reverse-engineer systems, or share Premium credentials.</p>
<p><strong>7. Intellectual Property</strong><br>All content, algorithms, signal logic, and branding are the exclusive property of LumaTrade-FX.</p>
<p><strong>8. Limitation of Liability</strong><br>LumaTrade-FX shall not be liable for trading losses, platform downtime, data errors, or unauthorized account access to the fullest extent permitted by law.</p>
<p><strong>9. Governing Law</strong><br>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
<p><strong>10. Contact</strong><br>support@lumafxt.com · https://lumafxt.com</p>
`;

function TermsModal({ type = "terms", onClose }) {
  const isTerms = type === "terms";
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  zIndex:3000, padding:"16px" }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
                    width:520, maxWidth:"100%", maxHeight:"85vh",
                    display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                       padding:"16px 20px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:900, color:T.white }}>
            📄 {isTerms ? "Terms & Conditions" : "Privacy Policy"}
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
                                              color:T.muted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        {/* Scrollable content */}
        <div style={{ overflowY:"auto", padding:"16px 20px", fontSize:11, color:T.text, lineHeight:1.7 }}
          dangerouslySetInnerHTML={{ __html: isTerms ? TERMS_TEXT : PRIVACY_TEXT }} />
        {/* Footer */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, flexShrink:0 }}>
          <button onClick={onClose} style={{
            width:"100%", padding:"11px", borderRadius:8, fontFamily:"inherit",
            fontSize:11, fontWeight:700, background:T.accent, color:T.bg, border:"none", cursor:"pointer",
          }}>I Understand — Close</button>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign:"center", padding:40, color:T.muted, fontSize:11 }}>
      Loading...
    </div>
  );
}
