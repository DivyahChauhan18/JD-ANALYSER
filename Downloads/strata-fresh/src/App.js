import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── TOKENS ──
const C = {
  base:        "#0A0E1A",
  surface:     "#111827",
  surfaceMid:  "#1A2235",
  surfaceHigh: "#1E2A3A",
  border:      "rgba(184,169,154,0.13)",
  borderMid:   "rgba(184,169,154,0.24)",
  borderHigh:  "rgba(184,169,154,0.42)",
  ink:         "#FFFFFF",
  inkOff:      "rgba(255,255,255,0.90)",
  inkMid:      "rgba(255,255,255,0.60)",
  inkDim:      "rgba(255,255,255,0.35)",
  inkFaint:    "rgba(255,255,255,0.16)",
  beige:       "#B8A99A",
  beigeLight:  "#D4C9BC",
  beigeDark:   "#8A7B6E",
  beigeFaint:  "rgba(184,169,154,0.10)",
  beigeMid:    "rgba(184,169,154,0.22)",
  beigeTrace:  "rgba(184,169,154,0.06)",
  risk:        "#6B8CAE",
  riskDim:     "rgba(107,140,174,0.12)",
  riskBorder:  "rgba(107,140,174,0.28)",
  go:          "#7BA591",
  goDim:       "rgba(123,165,145,0.12)",
  goBorder:    "rgba(123,165,145,0.28)",
  serif:       "'DM Serif Display', Georgia, serif",
  mono:        "'IBM Plex Mono', monospace",
};

const SP = {
  snap:   { type:"spring", stiffness:500, damping:32 },
  arrive: { type:"spring", stiffness:360, damping:28, mass:1 },
  press:  { type:"spring", stiffness:600, damping:36, mass:0.8 },
  gentle: { type:"spring", stiffness:260, damping:28, mass:1.2 },
  page:   { type:"spring", stiffness:280, damping:32, mass:1 },
};

const INDUSTRIES = [
  "Technology / SaaS","Manufacturing","Financial Services","Healthcare",
  "Retail / E-commerce","Professional Services","Education",
  "Logistics / Supply Chain","Media / Creative","FMCG","Real Estate","Other",
];
const STAGES = [
  "Scaling fast (>30% YoY growth)","Stable growth (10–30% YoY)",
  "Steady state","Restructuring / Cost optimisation","Post-acquisition integration",
];
const STRATA_COLORS = [
  "#B8A99A","#9A8B7C","#D4C9BC","#7A6B5E","#C8BAA8","#8A7B6E","#E0D4C4","#6E5F52",
];

// ── ANIMATED S LOGO ──
function SLogo({ size = "nav" }) {
  const isNav = size === "nav";
  const w = isNav ? 28 : 52;
  const h = isNav ? 28 : 52;
  const bh = isNav ? 6 : 11;
  const bw = isNav ? 19 : 36;
  const gap = isNav ? 11 : 20;
  const r = isNav ? 1 : 2;

  const barStyle = (top, fromLeft, delay) => ({
    position:"absolute", height:bh, width:bw, borderRadius:r,
    background:C.beige,
    top, [fromLeft?"left":"right"]: 0,
    opacity: fromLeft ? (top === 0 ? 0.95 : 0.4) : 0.68,
    animation:`${fromLeft?"sfLeft":"sfRight"} 2.4s cubic-bezier(0.4,0,0.2,1) ${delay}s infinite`,
  });

  return (
    <div style={{ position:"relative", width:w, height:h, overflow:"hidden", flexShrink:0 }}>
      <div style={barStyle(0, true, 0)} />
      <div style={barStyle(gap, false, 0.18)} />
      <div style={barStyle(gap * 2, true, 0.36)} />
    </div>
  );
}

// ── STRATA LINE ──
function StrataLine({ departments, headcount, fullWidth = false }) {
  const valid = departments.filter(d => d.name && parseInt(d.count) > 0);
  const total = valid.reduce((s,d) => s + parseInt(d.count), 0);
  return (
    <div style={{ width:"100%" }}>
      <div style={{ display:"flex", gap:2, height: fullWidth ? 4 : 3, width:"100%" }}>
        {valid.length === 0 ? (
          <motion.div
            style={{ flex:1, background:C.beigeDark||"#6B5D52", borderRadius:1, opacity:0.35 }}
            animate={{ opacity:[0.25,0.55,0.25] }}
            transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
          />
        ) : valid.map((d,i) => {
          const pct = (parseInt(d.count)/total)*100;
          return (
            <motion.div key={d.id}
              initial={{ width:0, opacity:0 }}
              animate={{ width:`${pct}%`, opacity:1 }}
              transition={{ ...SP.gentle, delay: i*0.06 }}
              style={{
                height:"100%", background:STRATA_COLORS[i%STRATA_COLORS.length],
                borderRadius:1, minWidth:3, flexShrink:0,
              }}
              whileHover={{ scaleY:2.5, originY:1 }}
              title={`${d.name}: ${parseInt(d.count).toLocaleString()}`}
            />
          );
        })}
      </div>
      {!fullWidth && (
        <div style={{ marginTop:5, fontFamily:C.mono, fontSize:10, color:C.inkDim, letterSpacing:"0.06em" }}>
          {valid.length === 0
            ? headcount ? `${parseInt(headcount).toLocaleString()} people · add departments to map` : "Enter data to map composition"
            : `${valid.length} dept${valid.length>1?"s":""} · ${total.toLocaleString()} mapped`}
        </div>
      )}
    </div>
  );
}

// ── NAV BAR ──
function NavBar({ screen, setScreen, hasData }) {
  const tabs = [
    { id:"overview", label:"Overview" },
    { id:"entry",    label:"Data Entry" },
    { id:"briefing", label:"Briefing",  locked: !hasData },
  ];
  return (
    <motion.nav
      initial={{ opacity:0, y:-10 }}
      animate={{ opacity:1, y:0 }}
      transition={{ ...SP.arrive, delay:0.05 }}
      style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        background:"rgba(10,14,26,0.92)", backdropFilter:"blur(24px)",
        borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 48px", height:64,
      }}
    >
      {/* Wordmark */}
      <div style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
        onClick={() => setScreen("overview")}>
        <SLogo size="nav" />
        <div>
          <div style={{ fontFamily:C.mono, fontSize:17, fontWeight:600, letterSpacing:"0.2em", color:C.ink, textTransform:"uppercase", lineHeight:1 }}>
            Strata
          </div>
          <div style={{ fontFamily:C.mono, fontSize:10, color:C.beige, letterSpacing:"0.12em", marginTop:2 }}>
            by Divyah
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        {tabs.map(tab => (
          <motion.button key={tab.id}
            onClick={() => !tab.locked && setScreen(tab.id)}
            whileTap={tab.locked ? {} : { scale:0.96, transition:SP.press }}
            style={{
              background: screen === tab.id ? C.beigeFaint : "transparent",
              border: screen === tab.id ? `1px solid ${C.borderMid}` : "1px solid transparent",
              borderRadius:4, color: tab.locked ? C.inkFaint : screen === tab.id ? C.beigeLight : C.inkMid,
              fontFamily:C.mono, fontSize:11, fontWeight:500,
              letterSpacing:"0.12em", textTransform:"uppercase",
              padding:"8px 18px", cursor: tab.locked ? "not-allowed" : "pointer",
              transition:"all 0.18s ease",
            }}
            onMouseEnter={e => { if (!tab.locked && screen !== tab.id) e.currentTarget.style.color = C.inkOff; }}
            onMouseLeave={e => { if (!tab.locked && screen !== tab.id) e.currentTarget.style.color = C.inkMid; }}
          >
            {tab.label}
            {tab.locked && <span style={{ marginLeft:6, fontSize:9, opacity:0.5 }}>—</span>}
          </motion.button>
        ))}
      </div>

      {/* Tone toggle */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontFamily:C.mono, fontSize:10, color:C.inkDim, letterSpacing:"0.1em" }}>TONE</span>
        <div id="tone-display" style={{ fontFamily:C.mono, fontSize:11, color:C.beige, letterSpacing:"0.1em", minWidth:56, textAlign:"right" }}/>
      </div>
    </motion.nav>
  );
}

// ── INPUT COMPONENTS ──
function Inp({ type="text", placeholder, value, onChange, min, max, step }) {
  const [f,setF] = useState(false);
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      min={min} max={max} step={step}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{
        background: f ? "rgba(184,169,154,0.07)" : "rgba(255,255,255,0.03)",
        border:`1px solid ${f ? C.beige : C.border}`,
        borderRadius:4, color:C.ink, fontFamily:C.mono, fontSize:14,
        padding:"11px 14px", width:"100%", outline:"none",
        transition:"all 0.18s ease", appearance:"none", WebkitAppearance:"none",
      }}
    />
  );
}

function Sel({ value, onChange, children }) {
  const [f,setF] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <select value={value} onChange={onChange}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{
          background: f ? "rgba(184,169,154,0.07)" : "rgba(255,255,255,0.03)",
          border:`1px solid ${f ? C.beige : C.border}`,
          borderRadius:4, color: value ? C.ink : C.inkDim,
          fontFamily:C.mono, fontSize:14, padding:"11px 36px 11px 14px",
          width:"100%", outline:"none", cursor:"pointer",
          appearance:"none", WebkitAppearance:"none", transition:"all 0.18s ease",
        }}>
        {children}
      </select>
      <div style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:C.beige, pointerEvents:"none", fontSize:10 }}>▾</div>
    </div>
  );
}

function Textarea({ placeholder, value, onChange }) {
  const [f,setF] = useState(false);
  return (
    <textarea placeholder={placeholder} value={value} onChange={onChange}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{
        background: f ? "rgba(184,169,154,0.07)" : "rgba(255,255,255,0.03)",
        border:`1px solid ${f ? C.beige : C.border}`,
        borderRadius:4, color:C.ink, fontFamily:C.mono, fontSize:13,
        padding:"11px 14px", width:"100%", outline:"none", resize:"vertical",
        minHeight:76, lineHeight:1.7, transition:"all 0.18s ease",
      }}
    />
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
      <div style={{ fontFamily:C.mono, fontSize:11, fontWeight:500, letterSpacing:"0.14em", textTransform:"uppercase", color:C.inkMid }}>{children}</div>
      {hint && <div style={{ fontFamily:C.mono, fontSize:10, color:C.inkFaint }}>{hint}</div>}
    </div>
  );
}

function SectionBlock({ label }) {
  return (
    <div style={{
      background:C.beige, borderRadius:3, padding:"5px 14px",
      fontFamily:C.mono, fontSize:10, fontWeight:600,
      letterSpacing:"0.22em", textTransform:"uppercase",
      color:C.base, display:"inline-block", marginBottom:20,
    }}>{label}</div>
  );
}

// ── PULSE NUMBER ──
function PulseNumber({ value, large = false }) {
  const [disp, setDisp] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const target = parseInt(value)||0;
    const from = prev.current; prev.current = target;
    if (from === target) return;
    const dur = 800, start = performance.now();
    const go = now => {
      const p = Math.min((now-start)/dur,1);
      const e = 1-Math.pow(1-p,3);
      setDisp(Math.round(from+(target-from)*e));
      if (p<1) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  },[value]);
  if (!value) return null;
  return (
    <motion.span
      animate={{ scale:[1,1.018,1] }}
      transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
      style={{
        fontFamily:C.mono, fontWeight:300,
        fontSize: large ? 88 : 48,
        color: large ? C.beige : "rgba(184,169,154,0.35)",
        lineHeight:1, letterSpacing:"-0.03em", display:"block",
      }}
    >{disp.toLocaleString()}</motion.span>
  );
}

// ── OUTPUT SECTION ──
function OutSection({ children, delay=0 }) {
  return (
    <motion.div
      initial={{ opacity:0, y:16 }}
      animate={{ opacity:1, y:0 }}
      transition={{ ...SP.arrive, delay }}
      style={{ marginBottom:60 }}
    >
      {children}
    </motion.div>
  );
}

function OutMarker({ label, critical, positive }) {
  const col = critical ? C.risk : positive ? C.go : C.beige;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
      <div style={{ fontFamily:C.mono, fontSize:10, fontWeight:600, letterSpacing:"0.24em", textTransform:"uppercase", color:col, flexShrink:0 }}>{label}</div>
      <motion.div initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ duration:0.45, ease:"easeOut", delay:0.1 }}
        style={{ flex:1, height:1, background:`linear-gradient(90deg,${col}55,transparent)`, transformOrigin:"left" }}/>
    </div>
  );
}

function PlaybookCard({ what, why, how, index }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.div
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ ...SP.arrive, delay:index*0.12 }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: hov ? "rgba(184,169,154,0.08)" : "rgba(184,169,154,0.04)",
        border:`1px solid ${hov ? C.borderMid : C.border}`,
        borderLeft:`3px solid ${C.beige}`,
        borderRadius:4, padding:"24px 24px 20px",
        marginBottom:12, transition:"all 0.2s ease",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div style={{ fontFamily:C.serif, fontSize:20, color:C.ink, marginBottom:10, lineHeight:1.3 }}>{what}</div>
      <div style={{ fontFamily:C.mono, fontSize:13, color:C.inkMid, lineHeight:1.8, marginBottom:16 }}>{why}</div>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, fontFamily:C.mono, fontSize:12, color:C.beigeLight, lineHeight:1.65 }}>
        <span style={{ color:C.inkDim, fontSize:10, letterSpacing:"0.16em", marginRight:8 }}>FIRST STEP —</span>
        {how}
      </div>
    </motion.div>
  );
}

// ── DATA CALLOUT CARD (beige block) ──
function DataCallout({ label, value, sub }) {
  return (
    <div style={{
      background:C.beigeFaint, border:`1px solid ${C.beigeMid}`,
      borderRadius:4, padding:"16px 20px",
    }}>
      <div style={{ fontFamily:C.mono, fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:C.beige, marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:C.serif, fontSize:28, color:C.beigeLight, lineHeight:1.1, marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontFamily:C.mono, fontSize:11, color:C.inkDim }}>{sub}</div>}
    </div>
  );
}

// ── MAIN ──
export default function Strata() {
  const [screen, setScreen] = useState("overview");
  const [tone, setTone] = useState("board");
  const [deptCounter, setDeptCounter] = useState(3);
  const [departments, setDepartments] = useState([
    { id:1, name:"", count:"" },
    { id:2, name:"", count:"" },
  ]);
  const [form, setForm] = useState({
    headcount:"", attrition:"", voluntary:"", involuntary:"",
    tenure:"", recentHires:"", openRoles:"",
    managers:"", ics:"", industry:"", stage:"",
    upcoming:"", additional:"",
  });
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const outputTopRef = useRef(null);

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  // keep tone display in nav in sync
  useEffect(() => {
    const el = document.getElementById("tone-display");
    if (el) el.textContent = tone === "board" ? "BOARD" : "INTERNAL";
  }, [tone]);

  function addDept() {
    setDepartments(d=>[...d,{id:deptCounter,name:"",count:""}]);
    setDeptCounter(c=>c+1);
  }
  function removeDept(id) { setDepartments(d=>d.filter(x=>x.id!==id)); }
  function updateDept(id,field,value) { setDepartments(d=>d.map(x=>x.id===id?{...x,[field]:value}:x)); }

  const buildPrompt = useCallback(() => {
    const toneInstr = tone==="board"
      ? "Write formally in third-person. Suitable for a board deck. Precise, no fluff. Refer to 'the organisation'."
      : "Write warmly in first-person plural. For an internal HR leadership meeting. Use 'we' and 'our'.";
    const valid = departments.filter(d=>d.name&&parseInt(d.count)>0);
    const deptText = valid.length>0 ? valid.map(d=>`${d.name}: ${d.count}`).join(", ") : "Not specified";
    const mRatio = form.managers&&form.ics ? `1:${Math.round(parseInt(form.ics)/parseInt(form.managers))}` : "Not provided";
    return `You are a senior People Analytics advisor writing a workforce intelligence briefing. ${toneInstr}

DATA:
- Headcount: ${form.headcount||"N/A"}
- Attrition: ${form.attrition?form.attrition+"%":"N/A"} (Voluntary: ${form.voluntary?form.voluntary+"%":"N/A"}, Involuntary: ${form.involuntary?form.involuntary+"%":"N/A"})
- Avg tenure: ${form.tenure?form.tenure+" yrs":"N/A"}
- Hires last 6mo: ${form.recentHires||"N/A"}, Open roles: ${form.openRoles||"N/A"}
- Manager:IC ratio: ${mRatio}
- Industry: ${form.industry||"N/A"}, Stage: ${form.stage||"N/A"}
- Departments: ${deptText}
- Upcoming: ${form.upcoming||"None"}
- Additional: ${form.additional||"None"}

Output EXACTLY these six sections with these markers. Be sharp — infer, don't just restate numbers.

---REAL_STORY---
One paragraph, 3-5 sentences. Most critical signal right now. No preamble.

---SNAPSHOT---
2-3 paragraphs. What does this workforce actually look like?

---RISKS---
2-3 paragraphs. What is the data quietly saying? What could go wrong?

---MOMENTUM---
1-2 paragraphs. What is working? Be honest if nothing is.

---FORWARD---
2 paragraphs. If nothing changes in 6 months, what happens?

---PLAYBOOK---
Exactly 3 recommendations:
WHAT: [action]
WHY: [2-3 sentences tied to their data]
HOW: [one concrete first step this week]`;
  },[form,departments,tone]);

  async function generate() {
    if (!form.headcount) return;
    setLoading(true); setError(""); setOutput(null);
    try {
      const res = await fetch("/api/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":process.env.REACT_APP_API_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1500,
          messages:[{role:"user",content:buildPrompt()}],
        }),
      });
      if (!res.ok){setError(`Error ${res.status}`);setLoading(false);return;}
      const data = await res.json();
      const text = data.content?.map(b=>b.text||"").join("")||"";
      const parsed = parseOutput(text);
      setOutput(parsed);
      setScreen("briefing");
      setTimeout(()=>outputTopRef.current?.scrollIntoView({behavior:"smooth"}),100);
    } catch(e){setError(e.message);}
    setLoading(false);
  }

  function parseOutput(text) {
    const extract=(s,e)=>{
      const si=text.indexOf(`---${s}---`); if(si===-1)return"";
      const from=si+`---${s}---`.length;
      if(!e)return text.slice(from).trim();
      const ei=text.indexOf(`---${e}---`,from);
      return ei===-1?text.slice(from).trim():text.slice(from,ei).trim();
    };
    const prose=raw=>raw.split("\n\n").filter(p=>p.trim()&&!p.startsWith("---")).map(p=>p.trim());
    const pbRaw=extract("PLAYBOOK",null);
    const playbooks=[];
    pbRaw.split(/WHAT:/i).filter(b=>b.trim()).forEach(block=>{
      const what=block.match(/^([^\n]+)/)?.[1]?.trim()||"";
      const why=block.match(/WHY:\s*([^]*?)(?=HOW:|$)/i)?.[1]?.trim()||"";
      const how=block.match(/HOW:\s*([^]*?)(?=WHAT:|$)/i)?.[1]?.trim()||"";
      if(what) playbooks.push({what,why,how});
    });
    return {
      realStory:prose(extract("REAL_STORY","SNAPSHOT")),
      snapshot:prose(extract("SNAPSHOT","RISKS")),
      risks:prose(extract("RISKS","MOMENTUM")),
      momentum:prose(extract("MOMENTUM","FORWARD")),
      forward:prose(extract("FORWARD","PLAYBOOK")),
      playbooks, tone,
      headcount:form.headcount, attrition:form.attrition,
      tenure:form.tenure, openRoles:form.openRoles,
    };
  }

  const pageWrap = {
    hidden:{opacity:0,y:18},
    show:{opacity:1,y:0,transition:{...SP.page,staggerChildren:0.07}},
    exit:{opacity:0,y:-12,transition:{duration:0.18}},
  };
  const item = {
    hidden:{opacity:0,y:14},
    show:{opacity:1,y:0,transition:SP.arrive},
  };

  const proseStyle = {
    fontFamily: tone==="board" ? C.serif : C.mono,
    fontStyle: tone==="board" ? "italic" : "normal",
    fontSize: tone==="board" ? 18 : 14,
    color:C.inkOff, lineHeight:1.88,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
        ::placeholder{color:rgba(255,255,255,0.18)!important;}
        ::selection{background:rgba(184,169,154,0.18);color:#D4C9BC;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(184,169,154,0.18);border-radius:2px;}
        select option{background:#111827;color:#fff;}
        input:focus,select:focus,textarea:focus{outline:none;}
        @keyframes sfLeft{
          0%{transform:translateX(-115%);opacity:0;}
          18%{transform:translateX(0);opacity:1;}
          70%{transform:translateX(0);opacity:1;}
          85%{transform:translateX(0);opacity:0;}
          100%{transform:translateX(-115%);opacity:0;}
        }
        @keyframes sfRight{
          0%{transform:translateX(115%);opacity:0;}
          18%{transform:translateX(0);opacity:1;}
          70%{transform:translateX(0);opacity:1;}
          85%{transform:translateX(0);opacity:0;}
          100%{transform:translateX(115%);opacity:0;}
        }
        @media(prefers-reduced-motion:reduce){
          *{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}
        }
      `}</style>

      <div style={{ minHeight:"100vh", background:C.base, fontFamily:C.mono, color:C.ink }}>

        <NavBar screen={screen} setScreen={setScreen} hasData={!!output} />

        {/* ── SCREENS ── */}
        <AnimatePresence mode="wait">

          {/* ════ OVERVIEW ════ */}
          {screen==="overview" && (
            <motion.div key="overview"
              variants={pageWrap} initial="hidden" animate="show" exit="exit"
              style={{ minHeight:"100vh", paddingTop:64, display:"flex", flexDirection:"column" }}
            >
              {/* Hero */}
              <div style={{
                flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                padding:"80px 48px", textAlign:"center",
              }}>
                {/* Large animated logo */}
                <motion.div variants={item} style={{ marginBottom:40 }}>
                  <div style={{ position:"relative", width:80, height:80, overflow:"hidden", margin:"0 auto" }}>
                    {[
                      {top:8,fromLeft:true,delay:0,op:0.95},
                      {top:34,fromLeft:false,delay:0.18,op:0.65},
                      {top:60,fromLeft:true,delay:0.36,op:0.38},
                    ].map((b,i)=>(
                      <div key={i} style={{
                        position:"absolute", height:16, width:56, borderRadius:3,
                        background:C.beige, top:b.top,
                        [b.fromLeft?"left":"right"]:0,
                        opacity:b.op,
                        animation:`${b.fromLeft?"sfLeft":"sfRight"} 2.4s cubic-bezier(0.4,0,0.2,1) ${b.delay}s infinite`,
                      }}/>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={item}>
                  <h1 style={{
                    fontFamily:C.serif, fontSize:72, fontWeight:400,
                    color:C.ink, lineHeight:1.05, letterSpacing:"-2px",
                    marginBottom:6,
                  }}>Strata</h1>
                  <div style={{
                    fontFamily:C.mono, fontSize:13, color:C.beige,
                    letterSpacing:"0.22em", textTransform:"uppercase", marginBottom:32,
                  }}>Workforce Intelligence</div>
                </motion.div>

                <motion.div variants={item} style={{
                  fontFamily:C.mono, fontSize:15, color:C.inkMid,
                  lineHeight:1.85, maxWidth:480, marginBottom:52,
                }}>
                  Paste your workforce data. Get a board-ready narrative briefing — not a dashboard, not charts. Something worth reading in a leadership meeting.
                </motion.div>

                {/* Live headcount display if entered */}
                {form.headcount && (
                  <motion.div variants={item} style={{ marginBottom:40, textAlign:"center" }}>
                    <PulseNumber value={form.headcount} large />
                    <div style={{ fontFamily:C.mono, fontSize:12, color:C.inkDim, letterSpacing:"0.18em", marginTop:8 }}>PEOPLE IN YOUR WORKFORCE</div>
                  </motion.div>
                )}

                {/* Strata line full width */}
                <motion.div variants={item} style={{ width:"100%", maxWidth:640, marginBottom:52 }}>
                  <StrataLine departments={departments} headcount={form.headcount} fullWidth />
                </motion.div>

                {/* What you get */}
                <motion.div variants={item} style={{
                  display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:52,
                }}>
                  {["The Real Story","Risk Signals","Momentum Indicators","Forward Look","Strategic Playbook"].map((l,i)=>(
                    <div key={i} style={{
                      background:C.beigeFaint, border:`1px solid ${C.beigeMid}`,
                      borderRadius:3, padding:"7px 16px",
                      fontFamily:C.mono, fontSize:11, color:C.beige, letterSpacing:"0.1em",
                    }}>{l}</div>
                  ))}
                </motion.div>

                <motion.div variants={item} style={{ display:"flex", gap:14 }}>
                  <motion.button
                    whileHover={{ scale:1.02, transition:SP.snap }}
                    whileTap={{ scale:0.97, transition:SP.press }}
                    onClick={()=>setScreen("entry")}
                    style={{
                      background:C.beige, border:"none", borderRadius:4,
                      color:C.base, fontFamily:C.mono, fontWeight:600,
                      fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase",
                      padding:"15px 36px", cursor:"pointer",
                    }}
                  >Enter Data →</motion.button>
                  {output && (
                    <motion.button
                      whileHover={{ scale:1.02, transition:SP.snap }}
                      whileTap={{ scale:0.97, transition:SP.press }}
                      onClick={()=>setScreen("briefing")}
                      style={{
                        background:"transparent", border:`1px solid ${C.borderMid}`,
                        borderRadius:4, color:C.inkMid, fontFamily:C.mono,
                        fontSize:12, letterSpacing:"0.2em", textTransform:"uppercase",
                        padding:"15px 36px", cursor:"pointer",
                      }}
                    >View Briefing →</motion.button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ════ DATA ENTRY ════ */}
          {screen==="entry" && (
            <motion.div key="entry"
              variants={pageWrap} initial="hidden" animate="show" exit="exit"
              style={{ minHeight:"100vh", paddingTop:64 }}
            >
              <div style={{ maxWidth:760, margin:"0 auto", padding:"56px 40px 100px" }}>

                {/* Page header */}
                <motion.div variants={item} style={{ marginBottom:56 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ height:1, width:32, background:C.beige }}/>
                    <span style={{ fontFamily:C.mono, fontSize:10, color:C.beige, letterSpacing:"0.22em", textTransform:"uppercase" }}>Step 01 — Data Entry</span>
                  </div>
                  <h2 style={{ fontFamily:C.serif, fontSize:48, fontWeight:400, color:C.ink, letterSpacing:"-1.5px", marginBottom:10 }}>
                    Tell us about<br/><span style={{ color:C.beige }}>your workforce.</span>
                  </h2>
                  <p style={{ fontFamily:C.mono, fontSize:13, color:C.inkMid, lineHeight:1.8 }}>
                    The more you provide, the sharper the briefing.
                  </p>
                </motion.div>

                {/* Live composition bar */}
                <motion.div variants={item} style={{
                  background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:6, padding:"20px 24px", marginBottom:40,
                }}>
                  <div style={{ fontFamily:C.mono, fontSize:10, color:C.beige, letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:12 }}>Live Workforce Composition</div>
                  <StrataLine departments={departments} headcount={form.headcount} />
                </motion.div>

                {/* ── CORE METRICS ── */}
                <motion.div variants={item} style={{ marginBottom:48 }}>
                  <SectionBlock label="Core Metrics" />
                  <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                    <div>
                      <FieldLabel>Total Headcount</FieldLabel>
                      <Inp type="number" placeholder="e.g. 340" value={form.headcount} onChange={set("headcount")} min="1"/>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <div><FieldLabel>Overall Attrition %</FieldLabel><Inp type="number" placeholder="e.g. 18" value={form.attrition} onChange={set("attrition")} min="0" max="100"/></div>
                      <div><FieldLabel>Average Tenure (yrs)</FieldLabel><Inp type="number" placeholder="e.g. 2.4" value={form.tenure} onChange={set("tenure")} min="0" step="0.1"/></div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <div><FieldLabel>Voluntary Attrition %</FieldLabel><Inp type="number" placeholder="e.g. 12" value={form.voluntary} onChange={set("voluntary")} min="0" max="100"/></div>
                      <div><FieldLabel>Involuntary Attrition %</FieldLabel><Inp type="number" placeholder="e.g. 6" value={form.involuntary} onChange={set("involuntary")} min="0" max="100"/></div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <div><FieldLabel>Hires (last 6 months)</FieldLabel><Inp type="number" placeholder="e.g. 42" value={form.recentHires} onChange={set("recentHires")} min="0"/></div>
                      <div><FieldLabel>Open Vacancies</FieldLabel><Inp type="number" placeholder="e.g. 17" value={form.openRoles} onChange={set("openRoles")} min="0"/></div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                      <div><FieldLabel>Managers</FieldLabel><Inp type="number" placeholder="e.g. 28" value={form.managers} onChange={set("managers")} min="0"/></div>
                      <div><FieldLabel>Individual Contributors</FieldLabel><Inp type="number" placeholder="e.g. 312" value={form.ics} onChange={set("ics")} min="0"/></div>
                    </div>
                  </div>
                </motion.div>

                {/* ── ORGANISATION ── */}
                <motion.div variants={item} style={{ marginBottom:48 }}>
                  <SectionBlock label="Organisation" />
                  <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                    <div>
                      <FieldLabel>Industry / Sector</FieldLabel>
                      <Sel value={form.industry} onChange={set("industry")}>
                        <option value="">Select industry</option>
                        {INDUSTRIES.map(i=><option key={i} value={i}>{i}</option>)}
                      </Sel>
                    </div>
                    <div>
                      <FieldLabel>Growth Stage</FieldLabel>
                      <Sel value={form.stage} onChange={set("stage")}>
                        <option value="">Select stage</option>
                        {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                      </Sel>
                    </div>
                  </div>
                </motion.div>

                {/* ── DEPARTMENTS ── */}
                <motion.div variants={item} style={{ marginBottom:48 }}>
                  <SectionBlock label="Department Breakdown" />
                  <AnimatePresence>
                    {departments.map(dept=>(
                      <motion.div key={dept.id}
                        initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,height:0}}
                        transition={SP.arrive}
                        style={{ display:"grid", gridTemplateColumns:"1fr 100px 32px", gap:10, marginBottom:10, alignItems:"center" }}
                      >
                        <Inp placeholder="Department name" value={dept.name} onChange={e=>updateDept(dept.id,"name",e.target.value)}/>
                        <Inp type="number" placeholder="Count" value={dept.count} onChange={e=>updateDept(dept.id,"count",e.target.value)} min="0"/>
                        <motion.button whileTap={{scale:0.92,transition:SP.press}} onClick={()=>removeDept(dept.id)}
                          style={{
                            background:"transparent", border:`1px solid ${C.border}`,
                            borderRadius:4, color:C.inkDim, height:40, width:32,
                            cursor:"pointer", fontSize:15, display:"flex",
                            alignItems:"center", justifyContent:"center", transition:"all 0.15s ease",
                          }}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.risk;e.currentTarget.style.color=C.risk;}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}
                        >×</motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <motion.button whileTap={{scale:0.98,transition:SP.press}} onClick={addDept}
                    style={{
                      background:"transparent", border:`1px dashed ${C.beigeMid}`,
                      borderRadius:4, color:C.inkDim, fontFamily:C.mono,
                      fontSize:11, letterSpacing:"0.1em", padding:"10px 16px",
                      cursor:"pointer", width:"100%", textAlign:"left", marginTop:4,
                      transition:"all 0.15s ease",
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.beige;e.currentTarget.style.color=C.beigeLight;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.beigeMid;e.currentTarget.style.color=C.inkDim;}}
                  >+ Add department</motion.button>
                </motion.div>

                {/* ── CONTEXT ── */}
                <motion.div variants={item} style={{ marginBottom:48 }}>
                  <SectionBlock label="Forward Context" />
                  <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                    <div>
                      <FieldLabel hint="optional">Upcoming Changes</FieldLabel>
                      <Textarea placeholder="Restructure, hiring freeze, new office, merger..." value={form.upcoming} onChange={set("upcoming")}/>
                    </div>
                    <div>
                      <FieldLabel hint="optional">Anything else leadership should know</FieldLabel>
                      <Textarea placeholder="Cultural concerns, retention initiatives, market pressures..." value={form.additional} onChange={set("additional")}/>
                    </div>
                  </div>
                </motion.div>

                {/* ── TONE + GENERATE ── */}
                <motion.div variants={item}>
                  {/* Tone toggle */}
                  <div style={{
                    background:C.surface, border:`1px solid ${C.border}`,
                    borderRadius:6, padding:"20px 24px", marginBottom:20,
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                  }}>
                    <div>
                      <div style={{ fontFamily:C.mono, fontSize:11, fontWeight:500, letterSpacing:"0.14em", textTransform:"uppercase", color:C.inkMid, marginBottom:4 }}>Output Tone</div>
                      <div style={{ fontFamily:C.mono, fontSize:12, color:C.inkDim }}>
                        {tone==="board" ? "Formal · third-person · board presentation" : "Warm · first-person plural · internal team"}
                      </div>
                    </div>
                    <div style={{ display:"flex", background:C.surfaceMid, borderRadius:4, border:`1px solid ${C.border}`, overflow:"hidden" }}>
                      {["board","internal"].map(t=>(
                        <motion.button key={t}
                          onClick={()=>setTone(t)}
                          whileTap={{scale:0.96,transition:SP.press}}
                          style={{
                            background: tone===t ? C.beige : "transparent",
                            border:"none", color: tone===t ? C.base : C.inkDim,
                            fontFamily:C.mono, fontSize:11, fontWeight:600,
                            letterSpacing:"0.14em", textTransform:"uppercase",
                            padding:"10px 22px", cursor:"pointer",
                            transition:"all 0.2s ease",
                          }}
                        >{t}</motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error&&(
                      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        style={{ background:C.riskDim, border:`1px solid ${C.riskBorder}`, borderRadius:4, padding:"12px 16px", fontFamily:C.mono, fontSize:12, color:C.risk, marginBottom:16 }}>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generate */}
                  <motion.button
                    whileHover={!form.headcount||loading ? {} : {scale:1.01,transition:SP.snap}}
                    whileTap={!form.headcount||loading ? {} : {scale:0.98,transition:SP.press}}
                    onClick={generate}
                    disabled={!form.headcount||loading}
                    style={{
                      background: !form.headcount||loading ? "rgba(184,169,154,0.08)" : C.beige,
                      border:`1px solid ${!form.headcount||loading ? C.border : "transparent"}`,
                      borderRadius:4, color: !form.headcount||loading ? C.inkDim : C.base,
                      fontFamily:C.mono, fontWeight:600, fontSize:13,
                      letterSpacing:"0.2em", textTransform:"uppercase",
                      padding:"17px", width:"100%", cursor:!form.headcount||loading?"not-allowed":"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:12,
                      transition:"all 0.2s ease",
                    }}
                  >
                    {loading ? (
                      <>
                        <motion.div animate={{rotate:360}} transition={{duration:0.9,repeat:Infinity,ease:"linear"}}
                          style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(10,14,26,0.25)",borderTopColor:C.base }}/>
                        Generating Briefing
                      </>
                    ) : "Generate Briefing →"}
                  </motion.button>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* ════ BRIEFING ════ */}
          {screen==="briefing" && output && (
            <motion.div key="briefing"
              variants={pageWrap} initial="hidden" animate="show" exit="exit"
              style={{ minHeight:"100vh", paddingTop:64 }}
            >
              <div style={{ maxWidth:720, margin:"0 auto", padding:"56px 40px 120px" }} ref={outputTopRef}>

                {/* Page header */}
                <motion.div variants={item} style={{ marginBottom:52 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ height:1, width:32, background:C.beige }}/>
                    <span style={{ fontFamily:C.mono, fontSize:10, color:C.beige, letterSpacing:"0.22em", textTransform:"uppercase" }}>
                      {output.tone==="board" ? "Board Briefing" : "Internal Update"} · Strata
                    </span>
                  </div>
                  <h2 style={{ fontFamily:C.serif, fontSize:48, fontWeight:400, color:C.ink, letterSpacing:"-1.5px", marginBottom:24 }}>
                    Workforce<br/><span style={{ color:C.beige }}>Intelligence Briefing</span>
                  </h2>

                  {/* Data callout cards */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                    {output.headcount && <DataCallout label="Headcount" value={parseInt(output.headcount).toLocaleString()} />}
                    {output.attrition && <DataCallout label="Attrition" value={`${output.attrition}%`} />}
                    {output.tenure && <DataCallout label="Avg Tenure" value={`${output.tenure}y`} />}
                    {output.openRoles && <DataCallout label="Open Roles" value={output.openRoles} />}
                  </div>
                </motion.div>

                {/* THE REAL STORY */}
                <OutSection delay={0.08}>
                  <OutMarker label="The Real Story" critical />
                  <div style={{ fontFamily:C.serif, fontSize:24, lineHeight:1.5, color:C.ink, fontWeight:400 }}>
                    {output.realStory.map((p,i)=><p key={i} style={{marginBottom:i<output.realStory.length-1?14:0}}>{p}</p>)}
                  </div>
                </OutSection>

                {/* SNAPSHOT */}
                <OutSection delay={0.16}>
                  <OutMarker label="Workforce Snapshot" />
                  <div style={proseStyle}>
                    {output.snapshot.map((p,i)=><p key={i} style={{marginBottom:i<output.snapshot.length-1?16:0}}>{p}</p>)}
                  </div>
                </OutSection>

                {/* RISKS */}
                <OutSection delay={0.22}>
                  <OutMarker label="Risk Signals" critical />
                  <div style={proseStyle}>
                    {output.risks.map((p,i)=><p key={i} style={{marginBottom:i<output.risks.length-1?16:0}}>{p}</p>)}
                  </div>
                </OutSection>

                {/* MOMENTUM */}
                <OutSection delay={0.28}>
                  <OutMarker label="Momentum Indicators" positive />
                  <div style={proseStyle}>
                    {output.momentum.map((p,i)=><p key={i} style={{marginBottom:i<output.momentum.length-1?16:0}}>{p}</p>)}
                  </div>
                </OutSection>

                {/* FORWARD */}
                <OutSection delay={0.33}>
                  <OutMarker label="Forward Look" />
                  <div style={proseStyle}>
                    {output.forward.map((p,i)=><p key={i} style={{marginBottom:i<output.forward.length-1?16:0}}>{p}</p>)}
                  </div>
                </OutSection>

                {/* PLAYBOOK */}
                <OutSection delay={0.38}>
                  <OutMarker label="Strategic Playbook" />
                  {output.playbooks.map((pb,i)=><PlaybookCard key={i} index={i} {...pb}/>)}
                </OutSection>

                {/* Footer actions */}
                <motion.div variants={item} style={{ display:"flex", gap:14, paddingTop:20, borderTop:`1px solid ${C.border}` }}>
                  <motion.button whileTap={{scale:0.97,transition:SP.press}} onClick={generate}
                    style={{
                      background:C.beige, border:"none", borderRadius:4,
                      color:C.base, fontFamily:C.mono, fontWeight:600,
                      fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase",
                      padding:"12px 24px", cursor:"pointer",
                    }}>Regenerate →</motion.button>
                  <motion.button whileTap={{scale:0.97,transition:SP.press}} onClick={()=>setScreen("entry")}
                    style={{
                      background:"transparent", border:`1px solid ${C.border}`,
                      borderRadius:4, color:C.inkDim, fontFamily:C.mono,
                      fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase",
                      padding:"12px 24px", cursor:"pointer",
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderMid;e.currentTarget.style.color=C.inkMid;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}
                  >← Edit Data</motion.button>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* Briefing locked state */}
          {screen==="briefing" && !output && (
            <motion.div key="briefing-empty"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{
                minHeight:"100vh", paddingTop:64,
                display:"flex", alignItems:"center", justifyContent:"center",
                flexDirection:"column", gap:20,
              }}>
              <div style={{ fontFamily:C.serif, fontSize:32, color:C.inkDim }}>No briefing yet.</div>
              <motion.button whileTap={{scale:0.97}} onClick={()=>setScreen("entry")}
                style={{
                  background:C.beige, border:"none", borderRadius:4,
                  color:C.base, fontFamily:C.mono, fontWeight:600,
                  fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase",
                  padding:"12px 28px", cursor:"pointer",
                }}>Enter Data →</motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}
