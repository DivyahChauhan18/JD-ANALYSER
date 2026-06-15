import { useState, useEffect, useRef } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   JD ANALYZER — Document Forensics
   
   World: A forensic examiner holds documents under UV light.
   Evidence room. Manila folders. Red evidence tape.
   Someone is looking for what's wrong before it costs you.
   
   Palette:
   - #0C0A08  aged paper void — not blue-black, not pure black
   - #F5F0E8  warm document ink — never pure white
   - #C8392B  evidence red — the ONE accent, earned by meaning
   - #1A1614  surface — dark walnut
   - #252018  raised — lifted off the desk
   - #8B7355  manila — mid-tone, warm, paper-world
   
   Typography:
   - Playfair Display 700 italic — display/headlines only
     Used with restraint. The instrument has authority.
   - DM Mono — all data, scores, labels, codes
   - Inter — body prose, readable at 13px
   
   Signature element: Forensic scan
   When JD is pasted (large paste detected), a sharp
   evidence-red line sweeps the full textarea over 1.8s.
   As it passes, bias words get amber "evidence highlight"
   marks. The sweep IS the detection — motion = meaning.
   
   On results: each dimension card has a left "evidence tape"
   border (2px red) that animates from height 0 to full on mount.
   Not decorative — it marks the card as examined.
   
   Emil Kowalski checks:
   - Every animation earns its place
   - Springs > linears everywhere
   - Press states scale(0.97), spring back
   - Score circle: spring dashoffset, one moment, weighted
   - Stagger rows: 30ms, communicates structure not decoration
   - Reactive headline: content responds to user state
   - Zero scattered ambient effects
═══════════════════════════════════════════════════════════ */

const C = {
  void:        "#0C0A08",
  base:        "#110E0A",
  surface:     "#1A1614",
  raised:      "#252018",
  high:        "#2E2820",
  evidence:    "#C8392B",
  evidenceMid: "rgba(200,57,43,0.50)",
  evidenceDim: "rgba(200,57,43,0.25)",
  evidencePale:"rgba(200,57,43,0.08)",
  evidenceGlow:"rgba(200,57,43,0.15)",
  manila:      "#8B7355",
  manilaMid:   "rgba(139,115,85,0.40)",
  manilaFaint: "rgba(139,115,85,0.15)",
  border:      "rgba(139,115,85,0.12)",
  borderMid:   "rgba(139,115,85,0.22)",
  borderHigh:  "rgba(139,115,85,0.40)",
  ink:         "#F5F0E8",
  inkMid:      "rgba(245,240,232,0.62)",
  inkDim:      "rgba(245,240,232,0.38)",
  inkFaint:    "rgba(245,240,232,0.15)",
  green:       "#2D7D46",
  greenPale:   "rgba(45,125,70,0.10)",
  greenBorder: "rgba(45,125,70,0.25)",
  red:         "#C8392B",
  redPale:     "rgba(200,57,43,0.10)",
  redBorder:   "rgba(200,57,43,0.25)",
  amber:       "#B8860B",
  amberPale:   "rgba(184,134,11,0.12)",
  amberBorder: "rgba(184,134,11,0.25)",
  violet:      "#6D3A8C",
  violetPale:  "rgba(109,58,140,0.10)",
  violetBorder:"rgba(109,58,140,0.25)",
  display: "'Playfair Display', Georgia, serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'DM Mono', 'IBM Plex Mono', monospace",
};

const SP = {
  snap:   { type:"spring", stiffness:500, damping:32 },
  arrive: { type:"spring", stiffness:340, damping:28 },
  press:  { type:"spring", stiffness:600, damping:36, mass:0.8 },
  score:  { type:"spring", stiffness:140, damping:22, mass:1.6 },
  tape:   { type:"spring", stiffness:200, damping:28, mass:1 },
};

/* ── Helpers ── */
function scoreColor(s) { return s>=75?C.green:s>=50?C.amber:C.red; }
function scorePale(s)  { return s>=75?C.greenPale:s>=50?C.amberPale:C.redPale; }
function scoreBorder(s){ return s>=75?C.greenBorder:s>=50?C.amberBorder:C.redBorder; }
function scoreWord(s)  { return s>=75?"Strong":s>=50?"Moderate":"Weak"; }
function scoreNote(s)  {
  if(s>=75)return "Well-structured, inclusive, and searchable. Ready to post.";
  if(s>=50)return "Functional but improvable. Address flagged issues before posting.";
  return "Significant revision needed. Do not post in current form.";
}

/* ── PDF extraction ── */
async function extractPDF(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = async e => {
      try {
        const lib = window.pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const pdf = await lib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
          let text = "";
          for (let i=1;i<=pdf.numPages;i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(x=>x.str).join(" ") + "\n";
          }
          resolve(text.trim());
        } else {
          const r2=new FileReader();r2.onload=te=>resolve(te.target.result||"");r2.readAsText(file);
        }
      } catch { const r2=new FileReader();r2.onload=te=>resolve(te.target.result||"");r2.readAsText(file); }
    };
    r.readAsArrayBuffer(file);
  });
}

const BIAS_WORDS = [
  "rockstar","ninja","wizard","guru","hustler","hungry","aggressive",
  "young","energetic","digital native","male","female","manpower",
  "go-getter","superhero","killer","dominate","crush it","killing it",
  "work hard play hard","culture fit","must be available","no excuses"
];

function detectBias(text) {
  const lower = text.toLowerCase();
  return BIAS_WORDS.filter(w => lower.includes(w));
}

function wordCount(text) {
  return text.trim()===""?0:text.trim().split(/\s+/).length;
}

/* ═══════════════════════════════════════════════════
   FORENSIC SCORE BAR
   The horizontal bar that springs to verdict.
   Playfair Display for the score number — authority.
═══════════════════════════════════════════════════ */
function ScoreBar({ score }) {
  const col = scoreColor(score);
  const pale = scorePale(score);
  const bord = scoreBorder(score);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:C.mono, fontSize:9, color:C.manila, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>
            Overall score
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <motion.span
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.35, duration:0.25 }}
              style={{ fontFamily:C.display, fontSize:48, fontWeight:700, fontStyle:"italic", color:col, letterSpacing:"-2px", lineHeight:1 }}>
              {score}
            </motion.span>
            <span style={{ fontFamily:C.mono, fontSize:13, color:C.inkDim, marginBottom:6 }}>/100</span>
          </div>
        </div>
        <motion.div
          initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
          transition={{ ...SP.arrive, delay:0.5 }}
          style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:3,
            background:pale, border:`1px solid ${bord}` }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:col }}/>
          <span style={{ fontFamily:C.mono, fontSize:10, color:col, fontWeight:600, letterSpacing:"0.1em" }}>
            {scoreWord(score)}
          </span>
        </motion.div>
      </div>

      {/* The bar — springs to verdict */}
      <div style={{ height:2, background:C.raised, borderRadius:1, overflow:"hidden", marginBottom:10 }}>
        <motion.div initial={{ width:0 }} animate={{ width:`${score}%` }} transition={SP.score}
          style={{ height:"100%", background:col, borderRadius:1, boxShadow:`0 0 8px ${col}50` }}/>
      </div>

      <p style={{ fontFamily:C.body, fontSize:13, color:C.inkDim, lineHeight:1.6, margin:0 }}>
        {scoreNote(score)}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SCORE RING — small circular score for sub-sections
═══════════════════════════════════════════════════ */
function ScoreRing({ score }) {
  const col = scoreColor(score);
  const r = 22, circ = 2*Math.PI*r;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ position:"relative", width:56, height:56, flexShrink:0 }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke={C.raised} strokeWidth="3"/>
          <motion.circle cx="28" cy="28" r={r} fill="none" stroke={col} strokeWidth="3"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset:circ }}
            animate={{ strokeDashoffset:circ*(1-score/100) }}
            transform="rotate(-90 28 28)"
            transition={{ ...SP.score, delay:0.1 }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:C.mono, fontSize:12, fontWeight:600, color:col }}>{score}</span>
        </div>
      </div>
      <div>
        <div style={{ fontFamily:C.mono, fontSize:11, fontWeight:600, color:col, marginBottom:4 }}>{scoreWord(score)}</div>
        <div style={{ fontFamily:C.body, fontSize:12, color:C.inkDim, lineHeight:1.55, maxWidth:240 }}>{scoreNote(score)}</div>
      </div>
    </div>
  );
}

/* ── Finding row ── */
function Row({ text, type, index=0 }) {
  const col = type==="match"?C.green:type==="missing"?C.red:C.manila;
  return (
    <motion.div
      initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
      transition={{ ...SP.arrive, delay:index*0.03 }}
      style={{ display:"flex", gap:12, padding:"11px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:4, height:4, borderRadius:"50%", background:col, marginTop:10, flexShrink:0 }}/>
      <p style={{ fontFamily:C.body, fontSize:13, fontWeight:500, lineHeight:1.7,
        color:type==="missing"?C.ink:C.inkMid, margin:0 }}>{text}</p>
    </motion.div>
  );
}

/* ── Chip ── */
function Chip({ children, type }) {
  const map = {
    match:   { bg:C.greenPale,  color:C.green,  border:`1px solid ${C.greenBorder}` },
    missing: { bg:C.redPale,    color:C.red,    border:`1px solid ${C.redBorder}` },
    neutral: { bg:C.raised,     color:C.inkMid, border:`1px solid ${C.border}` },
  };
  const s = map[type]||map.neutral;
  return (
    <span style={{ display:"inline-block", background:s.bg, color:s.color, border:s.border,
      borderRadius:3, fontSize:11, padding:"4px 10px", margin:"3px 4px 3px 0",
      fontFamily:C.mono, fontWeight:500, letterSpacing:"0.03em" }}>
      {children}
    </span>
  );
}

/* ── Mono label ── */
function L({ children }) {
  return (
    <span style={{ fontFamily:C.mono, fontSize:11, fontWeight:600, color:C.inkMid,
      letterSpacing:"0.1em", textTransform:"uppercase" }}>
      {children}
    </span>
  );
}

/* ── Card sub-section ── */
function CardSection({ label, color, children }) {
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <div style={{ width:2, height:10, borderRadius:1, background:color, flexShrink:0 }}/>
        <span style={{ fontFamily:C.mono, fontSize:9, fontWeight:700, color:color, letterSpacing:"0.14em", textTransform:"uppercase" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ── Upload button ── */
function UploadBtn({ filename, onFile }) {
  return (
    <motion.label
      whileHover={{ scale:1.01 }} whileTap={{ scale:0.97, transition:SP.press }}
      style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:C.mono, fontSize:10,
        letterSpacing:"0.08em", color:filename?C.green:C.inkDim, cursor:"pointer",
        border:`1px solid ${filename?C.greenBorder:C.border}`, padding:"6px 12px", borderRadius:4,
        background:filename?C.greenPale:"transparent", transition:"all 120ms ease" }}>
      {filename ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M6 8V2M3 5l3-3 3 3M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {filename ? filename.slice(0,20) : "Upload PDF"}
      <input type="file" accept=".pdf,.txt" style={{ display:"none" }} onChange={e=>e.target.files[0]&&onFile(e.target.files[0])}/>
    </motion.label>
  );
}

/* ═══════════════════════════════════════════════════════
   JD FIELD — the forensic scan lives here
   
   Signature element: when a large paste is detected,
   a sharp evidence-red sweep line runs top→bottom over
   1.8 seconds. As it travels, bias words below it get
   amber highlight marks. The motion IS the analysis —
   the tool is examining your document in real time.
   
   On focus: a quieter, slower amber pulse (not the red
   sweep) — signals the field is active, ready to receive.
═══════════════════════════════════════════════════════ */
function JDField({ value, onChange, placeholder, minHeight=220 }) {
  const [focused, setFocused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [scanDone, setScanDone] = useState(false);
  const prevLenRef = useRef(0);
  const scanRef = useRef(null);

  const words = wordCount(value);
  const biasFlags = detectBias(value);
  const fillPct = Math.min((words/150)*100, 100);
  const fillColor = fillPct<33?C.red:fillPct<66?C.amber:C.green;
  const isReady = words >= 50;

  // Forensic scan on large paste
  useEffect(() => {
    const newLen = value.length;
    if (newLen > prevLenRef.current + 80) {
      setScanDone(false);
      setScanning(true);
      setScanPct(0);
      let start = null;
      const DURATION = 1800;
      const tick = ts => {
        if (!start) start = ts;
        const p = Math.min((ts-start)/DURATION, 1);
        setScanPct(p*100);
        if (p < 1) { scanRef.current = requestAnimationFrame(tick); }
        else { setScanning(false); setScanDone(true); setScanPct(0); }
      };
      if (scanRef.current) cancelAnimationFrame(scanRef.current);
      scanRef.current = requestAnimationFrame(tick);
    }
    prevLenRef.current = newLen;
    return () => { if (scanRef.current) cancelAnimationFrame(scanRef.current); };
  }, [value]);

  return (
    <div>
      {/* Bias highlight layer — shown after scan completes */}
      <div style={{ position:"relative" }}>
        {/* Bias word highlights as overlay */}
        {scanDone && value && biasFlags.length > 0 && (
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            padding:"16px 18px", fontFamily:C.mono, fontSize:13, fontWeight:500,
            lineHeight:1.8, whiteSpace:"pre-wrap", wordBreak:"break-word",
            color:"transparent", zIndex:1, borderRadius:8 }}>
            {value.split(new RegExp(
              `(${biasFlags.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})`, "gi"
            )).map((part, i) => {
              const isFlag = biasFlags.some(w=>part.toLowerCase()===w.toLowerCase());
              return isFlag
                ? <mark key={i} style={{ background:"rgba(184,134,11,0.35)", color:"transparent",
                    borderRadius:2, transition:"background 300ms ease" }}>{part}</mark>
                : <span key={i}>{part}</span>;
            })}
          </div>
        )}

        <motion.div
          animate={{
            borderColor: scanning ? C.evidence : focused ? C.borderHigh : C.border,
            boxShadow: scanning
              ? `0 0 0 1px ${C.evidence}40, 0 0 20px ${C.evidenceGlow}`
              : focused
              ? `0 0 0 1px ${C.borderMid}`
              : "none",
          }}
          transition={{ duration:0.2 }}
          style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden",
            background:C.surface, position:"relative" }}>

          <textarea value={value} onChange={onChange} placeholder={placeholder}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            style={{ width:"100%", background:"transparent", border:"none", outline:"none",
              fontFamily:C.mono, fontSize:13, fontWeight:500, color:C.ink,
              padding:"16px 18px", resize:"vertical", lineHeight:1.8,
              minHeight, caretColor:C.evidence, boxSizing:"border-box",
              position:"relative", zIndex:2 }}/>

          {/* FORENSIC SCAN LINE — the signature element */}
          {scanning && (
            <>
              {/* Main sweep — sharp, evidence red */}
              <div style={{ position:"absolute", left:0, right:0, top:`${scanPct}%`,
                height:2, pointerEvents:"none", zIndex:4,
                background:`linear-gradient(90deg, transparent 0%, ${C.evidence} 20%, ${C.evidence}FF 50%, ${C.evidence} 80%, transparent 100%)`,
                boxShadow:`0 0 12px ${C.evidence}, 0 0 4px ${C.evidence}` }}/>
              {/* Glow halo around sweep */}
              <div style={{ position:"absolute", left:0, right:0, top:`calc(${scanPct}% - 8px)`,
                height:18, pointerEvents:"none", zIndex:3,
                background:`linear-gradient(180deg, transparent, rgba(200,57,43,0.06) 50%, transparent)` }}/>
              {/* Examined area tint — above the sweep line */}
              <div style={{ position:"absolute", left:0, right:0, top:0, height:`${scanPct}%`,
                pointerEvents:"none", zIndex:2,
                background:"rgba(200,57,43,0.03)" }}/>
            </>
          )}

          {/* Ambient focus glow — quieter, amber, slow pulse */}
          {focused && !scanning && (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:[0.4, 0.8, 0.4] }}
              transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
              style={{ position:"absolute", left:0, right:0, top:0, height:1,
                background:`linear-gradient(90deg, transparent, ${C.manila}60, transparent)`,
                pointerEvents:"none", zIndex:3 }}/>
          )}
        </motion.div>
      </div>

      {/* Word count bar + live stats */}
      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1, height:1, background:C.raised, borderRadius:1, overflow:"hidden" }}>
          <motion.div animate={{ width:`${fillPct}%`, background:fillColor }}
            transition={{ duration:0.4, ease:"easeOut" }}
            style={{ height:"100%", borderRadius:1 }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ fontFamily:C.mono, fontSize:10, color:C.inkDim }}>
            {words} <span style={{ color:C.inkFaint }}>words</span>
          </span>
          {biasFlags.length > 0 && (
            <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ fontFamily:C.mono, fontSize:10, color:C.amber, display:"flex", alignItems:"center", gap:4 }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M4 1L7 7H1L4 1Z" stroke={C.amber} strokeWidth="1" strokeLinejoin="round"/>
              </svg>
              {biasFlags.length} flag{biasFlags.length>1?"s":""}
            </motion.span>
          )}
          {isReady && biasFlags.length === 0 && (
            <span style={{ fontFamily:C.mono, fontSize:10, color:C.green, display:"flex", alignItems:"center", gap:4 }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4l2 2 4-4" stroke={C.green} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Ready
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Resume field — simpler, no scan ── */
function ResumeField({ value, onChange, placeholder, minHeight=160 }) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      animate={{ borderColor:focused?C.borderHigh:C.border, boxShadow:focused?`0 0 0 1px ${C.borderMid}`:"none" }}
      transition={{ duration:0.15 }}
      style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden",
        background:C.surface, position:"relative" }}>
      <textarea value={value} onChange={onChange} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ width:"100%", background:"transparent", border:"none", outline:"none",
          fontFamily:C.mono, fontSize:13, fontWeight:500, color:C.ink,
          padding:"16px 18px", resize:"vertical", lineHeight:1.8,
          minHeight, caretColor:C.manila, boxSizing:"border-box" }}/>
      {focused && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:[0.3, 0.7, 0.3] }}
          transition={{ duration:2.5, repeat:Infinity, ease:"easeInOut" }}
          style={{ position:"absolute", left:0, right:0, top:0, height:1,
            background:`linear-gradient(90deg, transparent, ${C.manila}50, transparent)`,
            pointerEvents:"none" }}/>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   DIMENSION CARD
   
   Evidence tape: a 2px evidence-red left border that
   spring-animates its height from 0 to 100% on mount.
   Not decorative — marks the card as examined/filed.
   Each card has its own accent color for the icon/label,
   but the tape is always evidence red: the examiner's mark.
═══════════════════════════════════════════════════════ */
const DIMENSIONS = [
  {
    id:"structure", label:"Structure",
    color:"#2E86AB", pale:"rgba(46,134,171,0.10)", border:"rgba(46,134,171,0.22)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="14" height="2.5" rx="1" fill="#2E86AB" opacity="0.9"/>
        <rect x="1" y="6.5" width="9" height="2.5" rx="1" fill="#2E86AB" opacity="0.6"/>
        <rect x="1" y="11" width="11" height="2.5" rx="1" fill="#2E86AB" opacity="0.75"/>
      </svg>
    ),
  },
  {
    id:"bias", label:"Bias",
    color:"#C8392B", pale:"rgba(200,57,43,0.10)", border:"rgba(200,57,43,0.22)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 13H2L8 2Z" stroke="#C8392B" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 6v3.5M8 11.5v.5" stroke="#C8392B" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id:"keywords", label:"Keywords",
    color:"#2D7D46", pale:"rgba(45,125,70,0.10)", border:"rgba(45,125,70,0.22)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 8h4M10 8h4M8 2v4M8 10v4" stroke="#2D7D46" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8" cy="8" r="2" stroke="#2D7D46" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id:"salary", label:"Salary",
    color:"#B8860B", pale:"rgba(184,134,11,0.10)", border:"rgba(184,134,11,0.25)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="#B8860B" strokeWidth="1.5"/>
        <path d="M8 4.5v7M6 6.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5S9 8 8 8s-2 .7-2 1.5S7 11 8 11s2-.7 2-1.5" stroke="#B8860B" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function DimensionCard({ dim, result, expanded, setExpanded, mountDelay=0 }) {
  const isExpanded = expanded===dim.id;
  const r = result;

  let summary = "";
  let content = null;

  if (dim.id==="structure") {
    const missing = r.structure.missingSections.length;
    summary = missing===0?"All sections present":`${missing} section${missing>1?"s":""} missing`;
    content = (
      <>
        <CardSection label="Missing" color={C.red}>
          {r.structure.missingSections.length===0
            ? <p style={{ fontFamily:C.body, fontSize:13, color:C.green, margin:0 }}>All key sections present.</p>
            : r.structure.missingSections.map((s,i)=><Row key={i} text={s} type="missing" index={i}/>)}
        </CardSection>
        <CardSection label="Present" color={C.green}>
          {r.structure.presentSections.map((s,i)=><Row key={i} text={s} type="match" index={i}/>)}
        </CardSection>
        <CardSection label="Suggestions" color={C.amber}>
          {r.structure.suggestions.map((s,i)=><Row key={i} text={s} type="neutral" index={i}/>)}
        </CardSection>
      </>
    );
  }

  if (dim.id==="bias") {
    const flagged = r.bias.flaggedPhrases.length;
    summary = flagged===0?"No biased language":`${flagged} phrase${flagged>1?"s":""} flagged`;
    content = (
      <>
        <div style={{ paddingBottom:16, marginBottom:4, borderBottom:`1px solid ${C.border}` }}>
          <ScoreRing score={r.bias.inclusivityScore}/>
        </div>
        <CardSection label="Flagged phrases" color={C.red}>
          {flagged===0
            ? <p style={{ fontFamily:C.body, fontSize:13, color:C.green, margin:"8px 0 0" }}>No biased language detected.</p>
            : <div style={{ paddingTop:4 }}>{r.bias.flaggedPhrases.map((p,i)=><Chip key={i} type="missing">{p}</Chip>)}</div>}
        </CardSection>
        <CardSection label="Improvements" color={C.amber}>
          {r.bias.improvements.map((s,i)=><Row key={i} text={s} type="neutral" index={i}/>)}
        </CardSection>
      </>
    );
  }

  if (dim.id==="keywords") {
    const missing = r.keywords.missing.length;
    const strong = r.keywords.strong.length;
    summary = `${strong} strong · ${missing} missing`;
    content = (
      <>
        <CardSection label="Strong" color={C.green}>
          <div style={{ paddingTop:4 }}>{r.keywords.strong.map((k,i)=><Chip key={i} type="match">{k}</Chip>)}</div>
        </CardSection>
        <CardSection label="Missing" color={C.red}>
          <div style={{ paddingTop:4 }}>{r.keywords.missing.map((k,i)=><Chip key={i} type="missing">{k}</Chip>)}</div>
        </CardSection>
        <CardSection label="SEO tips" color={C.amber}>
          {r.keywords.seoTips.map((s,i)=><Row key={i} text={s} type="neutral" index={i}/>)}
        </CardSection>
      </>
    );
  }

  if (dim.id==="salary") {
    summary = r.salary.transparent?"Salary disclosed":"No salary range";
    content = (
      <>
        <div style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:16, marginBottom:4, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ width:32, height:32, borderRadius:5, background:r.salary.transparent?C.greenPale:C.redPale,
            border:`1px solid ${r.salary.transparent?C.greenBorder:C.redBorder}`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {r.salary.transparent
              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/></svg>}
          </div>
          <span style={{ fontFamily:C.body, fontSize:14, fontWeight:500, color:r.salary.transparent?C.green:C.red }}>
            {r.salary.transparent?"Salary disclosed":"No salary range"}
          </span>
        </div>
        <CardSection label="Observation" color={C.amber}>
          <Row text={r.salary.observation} type="neutral" index={0}/>
        </CardSection>
        <CardSection label="Recommendation" color={C.manila}>
          <Row text={r.salary.recommendation} type="neutral" index={0}/>
        </CardSection>
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      transition={{ ...SP.arrive, delay:mountDelay }}
      style={{ border:`1px solid ${isExpanded?dim.border:C.border}`, borderRadius:8,
        overflow:"hidden", background:C.surface, position:"relative",
        transition:"border-color 200ms ease" }}>

      {/* EVIDENCE TAPE — left border that springs to full height */}
      <motion.div
        initial={{ height:0 }} animate={{ height:"100%" }}
        transition={{ ...SP.tape, delay:mountDelay + 0.1 }}
        style={{ position:"absolute", left:0, top:0, width:2,
          background:C.evidence, borderRadius:"0 1px 1px 0", zIndex:10 }}/>

      {/* Card header */}
      <div onClick={()=>setExpanded(isExpanded?null:dim.id)}
        style={{ padding:"16px 18px 16px 22px", display:"flex", alignItems:"center",
          justifyContent:"space-between", cursor:"pointer",
          borderBottom:isExpanded?`1px solid ${C.border}`:"none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:6, background:dim.pale,
            border:`1px solid ${dim.border}`, display:"flex", alignItems:"center",
            justifyContent:"center", flexShrink:0 }}>
            {dim.icon}
          </div>
          <div>
            <div style={{ fontFamily:C.mono, fontSize:9, fontWeight:700, color:dim.color,
              letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:3 }}>{dim.label}</div>
            <div style={{ fontFamily:C.body, fontSize:12, color:C.inkMid }}>{summary}</div>
          </div>
        </div>
        <motion.div animate={{ rotate:isExpanded?180:0 }} transition={SP.snap} style={{ color:C.inkDim, flexShrink:0 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.22, ease:[0.16,1,0.3,1] }}
            style={{ overflow:"hidden" }}>
            <div style={{ padding:"16px 18px 20px 22px" }}>{content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
export default function JDAnalyzer() {
  const [jd, setJd]           = useState("");
  const [resume, setResume]   = useState("");
  const [jdFile, setJdFile]   = useState("");
  const [resFile, setResFile] = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError]     = useState("");
  const [step, setStep]       = useState("input");

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => { window.pdfjsLib = window["pdfjs-dist/build/pdf"]; };
    document.head.appendChild(s);
  }, []);

  async function handleFile(file, setter, nameSetter) {
    const t = file.type==="application/pdf" ? await extractPDF(file) : await file.text();
    if (t) { setter(t); nameSetter(file.name); }
  }

  async function analyze() {
    if (!jd.trim()) return;
    setLoading(true); setResult(null); setError("");
    const hasResume = resume.trim().length > 0;
    const clean = t => {
      let out = "";
      for (let i=0;i<t.length;i++){const c=t.charCodeAt(i);if(c>=32&&c<=126)out+=t[i];else if(c===10||c===13||c===9)out+=" ";}
      return out.replace(/([A-Z]) ([A-Z]) ([A-Z])/g,"$1$2$3").replace(/\s{3,}/g," ").trim().slice(0,6000);
    };
    const prompt = `You are an expert HR analyst. Analyze the following and return ONLY a JSON object.
CRITICAL: Your response must be valid JSON only. No markdown. No backticks. No explanation. Start with { and end with }.
JOB DESCRIPTION:\n${clean(jd)}${hasResume?`\nRESUME:\n${clean(resume)}`:""}
Return this exact JSON:
{"overallScore":72,"structure":{"missingSections":["Benefits"],"presentSections":["Role overview","Responsibilities"],"suggestions":["Add team size context"]},"bias":{"flaggedPhrases":["rockstar","ninja"],"inclusivityScore":65,"improvements":["Replace rockstar with high-performing"]},"keywords":{"strong":["talent acquisition","onboarding"],"missing":["ATS","HRBP","OKR"],"seoTips":["Add seniority level to title"]},"salary":{"transparent":false,"observation":"No salary range disclosed","recommendation":"Add a salary band to increase applicant quality"}${hasResume?`,"resumeMatch":{"matchScore":58,"strengths":["Strong coordination experience"],"gaps":["No ATS experience"],"verdict":"Transferable skills present but lacks direct HR ops background"}`:""}}`

    try {
      const res = await fetch("/api/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1500,messages:[{role:"user",content:prompt}]}),
      });
      if (!res.ok){setError(`HTTP ${res.status}`);setLoading(false);return;}
      const data = await res.json();
      const raw = data.content?.map(i=>i.text||"").join("")||"";
      const stripped = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      const match = stripped.match(/\{[\s\S]*\}/);
      if (!match){setError("Could not parse response. Please try again.");setLoading(false);return;}
      let parsed=null;
      try{parsed=JSON.parse(match[0]);}catch{}
      if(!parsed){try{let s2="";for(let i=0;i<match[0].length;i++){const c=match[0].charCodeAt(i);if(c>=32||c===10||c===13||c===9)s2+=match[0][i];}parsed=JSON.parse(s2);}catch{}}
      if(!parsed){setError("Parse error. Please try again.");setLoading(false);return;}
      setResult(parsed); setExpanded(null); setStep("results");
    } catch(e){setError(e.message);}
    setLoading(false);
  }

  const words = wordCount(jd);
  const biasFlags = detectBias(jd);

  /* Reactive headline */
  const headline = jd.trim()===""
    ? <>Most JDs fail<br/><em>before anyone applies.</em></>
    : words < 30
    ? <>Keep going —<br/><em style={{ color:C.manila }}>reading your JD.</em></>
    : biasFlags.length > 0
    ? <><em style={{ color:C.evidence }}>{biasFlags.length} flag{biasFlags.length>1?"s":""} found</em><br/>in your JD.</>
    : words >= 50
    ? <>Your JD looks<br/><em style={{ color:C.green }}>ready to examine.</em></>
    : <>Most JDs fail<br/><em>before anyone applies.</em></>;

  const subline = jd.trim()===""
    ? "Bias, keyword gaps, and missing sections cost you candidates before the process begins. Paste yours to find out."
    : biasFlags.length>0
    ? `Detected: ${biasFlags.slice(0,3).join(", ")}${biasFlags.length>3?` and ${biasFlags.length-3} more`:""}.  Run analysis for the full picture.`
    : "Looking clean so far. Run analysis for the full forensic breakdown.";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=DM+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        body{background:${C.void};}
        ::selection{background:rgba(200,57,43,0.20);color:${C.ink};}
        ::placeholder{color:${C.inkFaint};font-family:'DM Mono',monospace;font-size:12px;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${C.raised};border-radius:2px;}
        input[type=file]{display:none;}
        button,label{cursor:pointer;}
        @media(prefers-reduced-motion:reduce){
          *{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}
        }
      `}</style>

      <div style={{ minHeight:"100vh", background:C.void, color:C.ink, fontFamily:C.body }}>

        {/* HEADER */}
        <header style={{ position:"sticky", top:0, zIndex:200, height:52,
          background:`rgba(12,10,8,0.94)`, backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px" }}>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Loupe/magnifier icon — forensics, not a document icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="6" stroke={C.evidence} strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="2.5" stroke={C.evidence} strokeWidth="1" opacity="0.5"/>
              <path d="M13.5 13.5L17.5 17.5" stroke={C.evidence} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily:C.display, fontSize:15, fontWeight:700, fontStyle:"italic",
              color:C.ink, letterSpacing:"-0.3px" }}>JD Analyzer</span>
            <span style={{ fontFamily:C.mono, fontSize:9, color:C.inkFaint, letterSpacing:"0.1em" }}>by Divyah</span>
          </div>

          {step==="results" && (
            <motion.button whileTap={{ scale:0.97, transition:SP.press }}
              onClick={()=>{setStep("input");setResult(null);setError("");setExpanded(null);}}
              style={{ fontFamily:C.mono, fontSize:10, color:C.inkDim, background:"transparent",
                border:`1px solid ${C.border}`, padding:"6px 14px", borderRadius:4,
                letterSpacing:"0.08em", transition:"all 120ms ease" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderMid;e.currentTarget.style.color=C.ink;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}>
              ← New analysis
            </motion.button>
          )}

          {/* File indicator top right */}
          <div style={{ fontFamily:C.mono, fontSize:9, color:C.inkFaint, letterSpacing:"0.1em", textAlign:"right", lineHeight:1.6 }}>
            DOCUMENT<br/>FORENSICS
          </div>
        </header>

        <AnimatePresence mode="wait">

          {/* ══ INPUT ══ */}
          {step==="input" && (
            <motion.div key="input"
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
              transition={{ duration:0.18, ease:[0.16,1,0.3,1] }}
              style={{ maxWidth:680, margin:"0 auto", padding:"56px 24px 100px" }}>

              {/* Hero — Playfair italic as thesis */}
              <motion.div
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                transition={{ ...SP.arrive, delay:0.04 }}
                style={{ marginBottom:52 }}>
                <div style={{ fontFamily:C.mono, fontSize:9, color:C.evidence, letterSpacing:"0.18em",
                  textTransform:"uppercase", marginBottom:12 }}>
                  HR Intelligence · Document Forensics
                </div>
                <motion.h1
                  style={{ fontFamily:C.display, fontWeight:700, fontStyle:"italic",
                    fontSize:"clamp(36px,5vw,54px)", color:C.ink,
                    letterSpacing:"-1px", lineHeight:1.1, margin:"0 0 16px" }}>
                  {headline}
                </motion.h1>
                <p style={{ fontFamily:C.body, fontSize:14, color:C.inkMid, lineHeight:1.75, maxWidth:"52ch" }}>
                  {subline}
                </p>
              </motion.div>

              {/* Fields */}
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                transition={{ ...SP.arrive, delay:0.12 }}
                style={{ display:"flex", flexDirection:"column", gap:20 }}>

                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <L>Job Description <span style={{ color:C.evidence }}>*</span></L>
                    <UploadBtn filename={jdFile} onFile={f=>handleFile(f,setJd,setJdFile)}/>
                  </div>
                  <JDField value={jd} onChange={e=>{setJd(e.target.value);setJdFile("");}}
                    placeholder="Paste the full job description — the scan begins on paste..." minHeight={220}/>
                </div>

                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <L>Resume</L>
                      <span style={{ fontFamily:C.mono, fontSize:9, color:C.inkFaint, letterSpacing:"0.08em" }}>optional</span>
                    </div>
                    <UploadBtn filename={resFile} onFile={f=>handleFile(f,setResume,setResFile)}/>
                  </div>
                  <ResumeField value={resume} onChange={e=>{setResume(e.target.value);setResFile("");}}
                    placeholder="Paste your resume to enable match scoring..." minHeight={150}/>
                </div>

                {error && (
                  <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={SP.arrive}
                    style={{ background:C.redPale, border:`1px solid ${C.redBorder}`, borderRadius:6,
                      padding:"10px 14px", fontSize:12, color:C.red, fontFamily:C.mono }}>
                    {error}
                  </motion.div>
                )}

                <div>
                  <motion.button
                    whileTap={!jd.trim()||loading?{}:{scale:0.97,transition:SP.press}}
                    whileHover={!jd.trim()||loading?{}:{scale:1.01,transition:SP.snap}}
                    onClick={analyze} disabled={!jd.trim()||loading}
                    style={{ height:48, paddingLeft:32, paddingRight:32,
                      background:!jd.trim()||loading?C.raised:C.evidence,
                      border:"none", borderRadius:6, color:!jd.trim()||loading?C.inkDim:C.ink,
                      fontFamily:C.body, fontSize:14, fontWeight:600, cursor:!jd.trim()||loading?"not-allowed":"pointer",
                      display:"inline-flex", alignItems:"center", gap:10,
                      boxShadow:!jd.trim()||loading?"none":`0 0 24px rgba(200,57,43,0.30)`,
                      letterSpacing:"-0.1px" }}>
                    {loading ? (
                      <>
                        <motion.div animate={{ rotate:360 }} transition={{ duration:0.8,repeat:Infinity,ease:"linear" }}
                          style={{ width:14, height:14, border:`2px solid ${C.inkFaint}`, borderTopColor:C.ink, borderRadius:"50%" }}/>
                        Examining…
                      </>
                    ) : "Run forensic analysis →"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ RESULTS ══ */}
          {step==="results" && result && (
            <motion.div key="results"
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
              transition={{ duration:0.2, ease:[0.16,1,0.3,1] }}
              style={{ maxWidth:820, margin:"0 auto", padding:"40px 24px 100px" }}>

              {/* Score block — Playfair italic score number */}
              <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={SP.arrive}
                style={{ padding:"28px 32px", border:`1px solid ${C.border}`, borderRadius:8,
                  background:C.surface, marginBottom:20, position:"relative", overflow:"hidden" }}>
                {/* Evidence tape on score block too */}
                <motion.div initial={{ height:0 }} animate={{ height:"100%" }}
                  transition={{ ...SP.tape, delay:0.1 }}
                  style={{ position:"absolute", left:0, top:0, width:2, background:C.evidence, borderRadius:"0 1px 1px 0" }}/>
                <div style={{ paddingLeft:10 }}>
                  <ScoreBar score={result.overallScore}/>
                </div>
              </motion.div>

              {/* 2×2 dimension grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                {DIMENSIONS.map((dim,i) => (
                  <DimensionCard key={dim.id} dim={dim} result={result}
                    expanded={expanded} setExpanded={setExpanded} mountDelay={i*0.06}/>
                ))}
              </div>

              {/* Resume match — full width */}
              {result.resumeMatch && (
                <motion.div
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  transition={{ ...SP.arrive, delay:0.28 }}
                  style={{ border:`1px solid ${expanded==="match"?C.violetBorder:C.border}`,
                    borderRadius:8, overflow:"hidden", background:C.surface, position:"relative",
                    transition:"border-color 200ms ease" }}>
                  <motion.div initial={{ height:0 }} animate={{ height:"100%" }}
                    transition={{ ...SP.tape, delay:0.32 }}
                    style={{ position:"absolute", left:0, top:0, width:2, background:C.evidence }}/>
                  <div onClick={()=>setExpanded(expanded==="match"?null:"match")}
                    style={{ padding:"16px 18px 16px 22px", display:"flex", alignItems:"center",
                      justifyContent:"space-between", cursor:"pointer",
                      borderBottom:expanded==="match"?`1px solid ${C.border}`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:6, background:C.violetPale,
                        border:`1px solid ${C.violetBorder}`, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4h8M2 8h6M2 12h7" stroke="#6D3A8C" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="12" cy="9" r="3" stroke="#6D3A8C" strokeWidth="1.5"/>
                          <path d="M14.5 11.5l1.5 1.5" stroke="#6D3A8C" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontFamily:C.mono, fontSize:9, fontWeight:700, color:C.violet,
                          letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:3 }}>Resume Match</div>
                        <div style={{ fontFamily:C.body, fontSize:12, color:C.inkMid }}>
                          {result.resumeMatch.matchScore}/100 match score
                        </div>
                      </div>
                    </div>
                    <motion.div animate={{ rotate:expanded==="match"?180:0 }} transition={SP.snap} style={{ color:C.inkDim }}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {expanded==="match" && (
                      <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }}
                        exit={{ height:0, opacity:0 }} transition={{ duration:0.22, ease:[0.16,1,0.3,1] }}
                        style={{ overflow:"hidden" }}>
                        <div style={{ padding:"16px 18px 20px 22px" }}>
                          <div style={{ paddingBottom:16, marginBottom:4, borderBottom:`1px solid ${C.border}` }}>
                            <ScoreRing score={result.resumeMatch.matchScore}/>
                            <p style={{ fontFamily:C.body, fontSize:13, color:C.inkDim, lineHeight:1.7, margin:"12px 0 0" }}>
                              {result.resumeMatch.verdict}
                            </p>
                          </div>
                          <CardSection label="Strengths" color={C.green}>
                            {result.resumeMatch.strengths.map((s,i)=><Row key={i} text={s} type="match" index={i}/>)}
                          </CardSection>
                          <CardSection label="Gaps" color={C.red}>
                            {result.resumeMatch.gaps.map((s,i)=><Row key={i} text={s} type="missing" index={i}/>)}
                          </CardSection>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}