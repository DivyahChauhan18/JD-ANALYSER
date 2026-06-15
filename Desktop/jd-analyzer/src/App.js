import { useState, useEffect, useRef } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   JD ANALYZER — Ancient Forest Observatory
   
   World: A botanist's field notes. Pressed specimens between
   glass slides. Bioluminescent moss in a deep forest.
   The JD is a specimen being examined under candlelight.
   What's wrong reveals itself under the right light.
   
   Palette:
   - #030A05  forest void — deep green-black
   - #071410  undergrowth surface
   - #0E1F10  raised moss panel
   - #142818  high panel
   - #00C853  electric emerald — the ONE hot accent
   - #B8960C  ancient gold — secondary warm
   - #4CAF50  forest green — mid tone
   - #1B5E20  deep canopy — muted green
   - #E8F5E9  pale leaf — warm ink
   
   Typography (kept from forensics):
   - Playfair Display 700 italic — display/headlines
   - DM Mono — data, scores, labels
   - Inter — body prose
   
   Signature element: MYCELIUM ROOT NETWORK CANVAS
   Thin glowing lines spread slowly from the bottom like
   fungal root systems. They pulse electric emerald when
   the forensic scan fires. Ambient — always growing.
   GPU canvas, composited layer behind everything.
   
   Secondary: SPORE ENTRANCES
   Elements don't slide in — they materialise like spores
   settling from above. scale(0.95) + opacity:0, spring up.
   
   Evidence tape → Vine tape: 2px emerald left border,
   springs from height 0 to full. Marks the card as
   examined by the forest, not the courtroom.
   
   Scan sweep: bioluminescent green instead of evidence red.
   The forest examines the document, not a detective.
   
   Motion constraints:
   - GPU only: transform + opacity. Zero layout props.
   - Interruptible: all springs, no CSS keyframe locks
   - prefers-reduced-motion: canvas hidden, all transitions off
   - One signature per screen: root network on input,
     nothing else ambient on results screen
   - Every animation earns its place
═══════════════════════════════════════════════════════════ */

const C = {
  void:          "#030A05",
  base:          "#071410",
  surface:       "#0E1F10",
  raised:        "#142818",
  high:          "#1A3320",
  emerald:       "#00C853",
  emeraldBright: "#00E676",
  emeraldDeep:   "#00952C",
  emeraldGlow:   "rgba(0,200,83,0.28)",
  emeraldTrace:  "rgba(0,200,83,0.10)",
  emeraldFaint:  "rgba(0,200,83,0.04)",
  gold:          "#B8960C",
  goldBright:    "#D4AC0D",
  goldGlow:      "rgba(184,150,12,0.25)",
  goldTrace:     "rgba(184,150,12,0.10)",
  goldFaint:     "rgba(184,150,12,0.05)",
  forest:        "#4CAF50",
  canopy:        "#1B5E20",
  glass:         "rgba(0,200,83,0.03)",
  glassMid:      "rgba(0,200,83,0.06)",
  border:        "rgba(0,200,83,0.14)",
  borderMid:     "rgba(0,200,83,0.26)",
  borderHigh:    "rgba(0,200,83,0.50)",
  ink:           "#E8F5E9",
  inkOff:        "rgba(232,245,233,0.90)",
  inkMid:        "rgba(232,245,233,0.60)",
  inkDim:        "rgba(232,245,233,0.36)",
  inkFaint:      "rgba(232,245,233,0.14)",
  inkTrace:      "rgba(232,245,233,0.06)",
  // Semantic — forest-toned
  good:          "#00C853",
  goodPale:      "rgba(0,200,83,0.10)",
  goodBorder:    "rgba(0,200,83,0.25)",
  warn:          "#B8960C",
  warnPale:      "rgba(184,150,12,0.10)",
  warnBorder:    "rgba(184,150,12,0.25)",
  bad:           "#D32F2F",
  badPale:       "rgba(211,47,47,0.10)",
  badBorder:     "rgba(211,47,47,0.25)",
  violet:        "#7B1FA2",
  violetPale:    "rgba(123,31,162,0.10)",
  violetBorder:  "rgba(123,31,162,0.25)",
  display:       "'Playfair Display', Georgia, serif",
  body:          "'Inter', system-ui, sans-serif",
  mono:          "'DM Mono', 'IBM Plex Mono', monospace",
};

const SP = {
  snap:   { type:"spring", stiffness:500, damping:32 },
  arrive: { type:"spring", stiffness:340, damping:28 },
  press:  { type:"spring", stiffness:600, damping:36, mass:0.8 },
  score:  { type:"spring", stiffness:140, damping:22, mass:1.6 },
  vine:   { type:"spring", stiffness:200, damping:28, mass:1 },
  spore:  { type:"spring", stiffness:300, damping:26, mass:1.2 },
};

/* ── Helpers ── */
function scoreColor(s) { return s>=75?C.good:s>=50?C.warn:C.bad; }
function scorePale(s)  { return s>=75?C.goodPale:s>=50?C.warnPale:C.badPale; }
function scoreBorder(s){ return s>=75?C.goodBorder:s>=50?C.warnBorder:C.badBorder; }
function scoreWord(s)  { return s>=75?"Thriving":s>=50?"Growing":"Wilting"; }
function scoreNote(s)  {
  if(s>=75) return "Well-structured, inclusive, and searchable. Ready to post.";
  if(s>=50) return "Functional but improvable. Address flagged issues before posting.";
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
  return BIAS_WORDS.filter(w => text.toLowerCase().includes(w));
}
function wordCount(text) {
  return text.trim()===""?0:text.trim().split(/\s+/).length;
}

/* ══════════════════════════════════════════════════════════
   MYCELIUM ROOT NETWORK — signature element
   
   Thin bioluminescent lines spread from the bottom of
   the canvas upward, branching like fungal mycelium.
   Always growing slowly. On pulseRef.current() call:
   a wave of brightness sweeps the network.
   
   Algorithm:
   - N root nodes start at the bottom edge
   - Each grows upward at a random angle, branching
     at random intervals
   - Lines fade at the tips — like real mycelium
   - Opacity oscillates slowly — bioluminescent breathing
   - On pulse: all lines briefly max brightness
   
   GPU canvas: transform + opacity only in JS.
   Never touches layout properties.
══════════════════════════════════════════════════════════ */
function MyceliumCanvas({ pulseRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const nodesRef = useRef([]);
  const pulseIntensityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
    };

    function initNodes() {
      const W = canvas.width, H = canvas.height;
      nodesRef.current = [];
      // Seed 12 root nodes along the bottom
      for (let i = 0; i < 12; i++) {
        const x = (W / 12) * i + (Math.random() * W / 12);
        growBranch(x, H, -Math.PI/2 + (Math.random()-0.5)*0.8, 0, 6);
      }
    }

    function growBranch(x, y, angle, depth, maxDepth) {
      if (depth >= maxDepth) return;
      const len = Math.random() * 80 + 40 - depth * 12;
      const segments = Math.floor(len / 8);
      const branch = { points:[], opacity: Math.random() * 0.4 + 0.1, phase: Math.random()*Math.PI*2, speed: Math.random()*0.008+0.003 };
      let cx = x, cy = y;
      let a = angle;
      for (let s = 0; s <= segments; s++) {
        a += (Math.random()-0.5) * 0.25;
        cx += Math.cos(a) * 8;
        cy += Math.sin(a) * 8;
        branch.points.push({ x:cx, y:cy, t:s/segments });
      }
      nodesRef.current.push(branch);
      // Branch: 20% chance at each segment
      if (depth < maxDepth - 1 && branch.points.length > 3) {
        const bi = Math.floor(branch.points.length * (0.4 + Math.random()*0.4));
        const bp = branch.points[bi];
        if (Math.random() > 0.5) {
          growBranch(bp.x, bp.y, a + 0.6 + Math.random()*0.4, depth+1, maxDepth);
        }
        if (Math.random() > 0.7) {
          growBranch(bp.x, bp.y, a - 0.6 - Math.random()*0.4, depth+1, maxDepth);
        }
      }
    }

    if (pulseRef) {
      pulseRef.current = () => { pulseIntensityRef.current = 1; };
    }

    let t = 0;
    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Decay pulse
      if (pulseIntensityRef.current > 0) {
        pulseIntensityRef.current = Math.max(0, pulseIntensityRef.current - 0.025);
      }

      nodesRef.current.forEach(branch => {
        branch.phase += branch.speed;
        const breathe = 0.5 + 0.5 * Math.sin(branch.phase);
        const pulse = pulseIntensityRef.current;
        const baseAlpha = branch.opacity * (0.5 + 0.5 * breathe);
        const finalAlpha = Math.min(1, baseAlpha + pulse * 0.6);

        if (branch.points.length < 2) return;
        for (let i = 0; i < branch.points.length - 1; i++) {
          const p1 = branch.points[i];
          const p2 = branch.points[i+1];
          // Fade toward tips
          const tipFade = 1 - p1.t * 0.7;
          const alpha = finalAlpha * tipFade;
          if (alpha < 0.01) continue;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          // Pulse makes lines brighter and slightly wider
          const width = (0.6 + pulse * 1.2) * tipFade;
          ctx.lineWidth = width;
          ctx.strokeStyle = pulse > 0.3
            ? `rgba(0,230,118,${alpha})`   // emeraldBright on pulse
            : `rgba(0,200,83,${alpha})`;   // emerald normally
          ctx.stroke();

          // Glow on pulse
          if (pulse > 0.2 && i % 3 === 0) {
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, 2 * pulse, 0, Math.PI*2);
            ctx.fillStyle = `rgba(0,230,118,${alpha * pulse * 0.5})`;
            ctx.fill();
          }
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [pulseRef]);

  return (
    <canvas ref={canvasRef}
      style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, opacity:0.75 }}/>
  );
}

/* ══════════════════════════════════════════════════════════
   SCORE BAR — forest-toned
══════════════════════════════════════════════════════════ */
function ScoreBar({ score }) {
  const col = scoreColor(score);
  const pale = scorePale(score);
  const bord = scoreBorder(score);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:C.mono, fontSize:9, color:C.gold, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>
            Specimen score
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <motion.span
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              transition={{ delay:0.35, duration:0.25 }}
              style={{ fontFamily:C.display, fontSize:48, fontWeight:700, fontStyle:"italic",
                color:col, letterSpacing:"-2px", lineHeight:1 }}>
              {score}
            </motion.span>
            <span style={{ fontFamily:C.mono, fontSize:13, color:C.inkDim, marginBottom:6 }}>/100</span>
          </div>
        </div>
        <motion.div
          initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
          transition={{ ...SP.arrive, delay:0.5 }}
          style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px",
            borderRadius:3, background:pale, border:`1px solid ${bord}` }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:col }}/>
          <span style={{ fontFamily:C.mono, fontSize:10, color:col, fontWeight:600, letterSpacing:"0.1em" }}>
            {scoreWord(score)}
          </span>
        </motion.div>
      </div>
      <div style={{ height:2, background:C.raised, borderRadius:1, overflow:"hidden", marginBottom:10 }}>
        <motion.div initial={{ scaleX:0 }} animate={{ scaleX:score/100 }}
          transition={SP.score}
          style={{ height:"100%", background:col, borderRadius:1,
            boxShadow:`0 0 8px ${col}60`, originX:0, transformBox:"fill-box" }}/>
      </div>
      <p style={{ fontFamily:C.body, fontSize:13, color:C.inkDim, lineHeight:1.6, margin:0 }}>
        {scoreNote(score)}
      </p>
    </div>
  );
}

/* ── Score Ring ── */
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

/* ── Row — spore entrance ── */
function Row({ text, type, index=0 }) {
  const col = type==="match"?C.good:type==="missing"?C.bad:C.gold;
  return (
    <motion.div
      initial={{ opacity:0, scale:0.97, y:-4 }}
      animate={{ opacity:1, scale:1, y:0 }}
      transition={{ ...SP.spore, delay:index*0.03 }}
      style={{ display:"flex", gap:12, padding:"11px 0", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:4, height:4, borderRadius:"50%", background:col,
        marginTop:10, flexShrink:0, boxShadow:`0 0 4px ${col}80` }}/>
      <p style={{ fontFamily:C.body, fontSize:13, fontWeight:500, lineHeight:1.7,
        color:type==="missing"?C.ink:C.inkMid, margin:0 }}>{text}</p>
    </motion.div>
  );
}

/* ── Chip ── */
function Chip({ children, type }) {
  const map = {
    match:   { bg:C.goodPale,  color:C.good,  border:`1px solid ${C.goodBorder}` },
    missing: { bg:C.badPale,   color:C.bad,   border:`1px solid ${C.badBorder}` },
    neutral: { bg:C.raised,    color:C.inkMid,border:`1px solid ${C.border}` },
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

function L({ children }) {
  return (
    <span style={{ fontFamily:C.mono, fontSize:11, fontWeight:600, color:C.inkMid,
      letterSpacing:"0.1em", textTransform:"uppercase" }}>
      {children}
    </span>
  );
}

function CardSection({ label, color, children }) {
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <div style={{ width:2, height:10, borderRadius:1, background:color, flexShrink:0 }}/>
        <span style={{ fontFamily:C.mono, fontSize:9, fontWeight:700, color:color,
          letterSpacing:"0.14em", textTransform:"uppercase" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function UploadBtn({ filename, onFile }) {
  return (
    <motion.label
      whileHover={{ scale:1.01 }} whileTap={{ scale:0.97, transition:SP.press }}
      style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:C.mono, fontSize:10,
        letterSpacing:"0.08em", color:filename?C.good:C.inkDim, cursor:"pointer",
        border:`1px solid ${filename?C.goodBorder:C.border}`, padding:"6px 12px", borderRadius:4,
        background:filename?C.goodPale:"transparent", transition:"all 120ms ease" }}>
      {filename ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke={C.good} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M6 8V2M3 5l3-3 3 3M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {filename ? filename.slice(0,20) : "Upload PDF"}
      <input type="file" accept=".pdf,.txt" style={{ display:"none" }}
        onChange={e=>e.target.files[0]&&onFile(e.target.files[0])}/>
    </motion.label>
  );
}

/* ══════════════════════════════════════════════════════════
   JD FIELD — bioluminescent scan
   
   Signature: on large paste, a bright emerald sweep line
   runs top→bottom over 1.8s. As it passes, bias words
   get gold highlights. Scan triggers mycelium pulse.
   On focus: slow emerald pulse at the top — field is alive.
══════════════════════════════════════════════════════════ */
function JDField({ value, onChange, placeholder, minHeight=220, onScan }) {
  const [focused, setFocused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [scanDone, setScanDone] = useState(false);
  const prevLenRef = useRef(0);
  const scanRef = useRef(null);

  const words = wordCount(value);
  const biasFlags = detectBias(value);
  const fillPct = Math.min((words/150)*100, 100);
  const fillColor = fillPct<33?C.bad:fillPct<66?C.warn:C.good;
  const isReady = words >= 50;

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
        else {
          setScanning(false); setScanDone(true); setScanPct(0);
          onScan && onScan(); // pulse the mycelium
        }
      };
      if (scanRef.current) cancelAnimationFrame(scanRef.current);
      scanRef.current = requestAnimationFrame(tick);
    }
    prevLenRef.current = newLen;
    return () => { if (scanRef.current) cancelAnimationFrame(scanRef.current); };
  }, [value, onScan]);

  return (
    <div>
      <div style={{ position:"relative" }}>
        {/* Bias gold highlights after scan */}
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
                ? <mark key={i} style={{ background:"rgba(184,150,12,0.35)", color:"transparent",
                    borderRadius:2 }}>{part}</mark>
                : <span key={i}>{part}</span>;
            })}
          </div>
        )}

        <motion.div
          animate={{
            borderColor: scanning ? C.emerald : focused ? C.borderHigh : C.border,
          }}
          transition={{ duration:0.2 }}
          style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden",
            background:C.surface, position:"relative" }}>

          <textarea value={value} onChange={onChange} placeholder={placeholder}
            onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
            style={{ width:"100%", background:"transparent", border:"none", outline:"none",
              fontFamily:C.mono, fontSize:13, fontWeight:500, color:C.ink,
              padding:"16px 18px", resize:"vertical", lineHeight:1.8,
              minHeight, caretColor:C.emerald, boxSizing:"border-box",
              position:"relative", zIndex:2 }}/>

          {/* BIOLUMINESCENT SCAN SWEEP */}
          {scanning && (
            <>
              <div style={{ position:"absolute", left:0, right:0, top:`${scanPct}%`,
                height:2, pointerEvents:"none", zIndex:4,
                background:`linear-gradient(90deg, transparent 0%, ${C.emerald} 20%, ${C.emeraldBright} 50%, ${C.emerald} 80%, transparent 100%)`,
                boxShadow:`0 0 14px ${C.emerald}, 0 0 5px ${C.emeraldBright}` }}/>
              <div style={{ position:"absolute", left:0, right:0, top:`calc(${scanPct}% - 10px)`,
                height:22, pointerEvents:"none", zIndex:3,
                background:`linear-gradient(180deg, transparent, rgba(0,200,83,0.07) 50%, transparent)` }}/>
              <div style={{ position:"absolute", left:0, right:0, top:0, height:`${scanPct}%`,
                pointerEvents:"none", zIndex:2,
                background:"rgba(0,200,83,0.025)" }}/>
            </>
          )}

          {/* Focus pulse — bioluminescent breathing */}
          {focused && !scanning && (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:[0.3, 0.7, 0.3] }}
              transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }}
              style={{ position:"absolute", left:0, right:0, top:0, height:1,
                background:`linear-gradient(90deg, transparent, ${C.emerald}70, transparent)`,
                pointerEvents:"none", zIndex:3 }}/>
          )}
        </motion.div>
      </div>

      {/* Word count + stats */}
      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ flex:1, height:1, background:C.raised, borderRadius:1, overflow:"hidden" }}>
          <motion.div animate={{ scaleX:fillPct/100 }} transition={{ duration:0.4, ease:"easeOut" }}
            style={{ height:"100%", background:fillColor, borderRadius:1, originX:0, transformBox:"fill-box" }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ fontFamily:C.mono, fontSize:10, color:C.inkDim }}>
            {words} <span style={{ color:C.inkFaint }}>words</span>
          </span>
          {biasFlags.length > 0 && (
            <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ fontFamily:C.mono, fontSize:10, color:C.warn,
                display:"flex", alignItems:"center", gap:4 }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M4 1L7 7H1L4 1Z" stroke={C.warn} strokeWidth="1" strokeLinejoin="round"/>
              </svg>
              {biasFlags.length} flag{biasFlags.length>1?"s":""}
            </motion.span>
          )}
          {isReady && biasFlags.length === 0 && (
            <span style={{ fontFamily:C.mono, fontSize:10, color:C.good,
              display:"flex", alignItems:"center", gap:4 }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4l2 2 4-4" stroke={C.good} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Specimen ready
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Resume field ── */
function ResumeField({ value, onChange, placeholder, minHeight=160 }) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      animate={{ borderColor:focused?C.borderHigh:C.border }}
      transition={{ duration:0.15 }}
      style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden",
        background:C.surface, position:"relative" }}>
      <textarea value={value} onChange={onChange} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ width:"100%", background:"transparent", border:"none", outline:"none",
          fontFamily:C.mono, fontSize:13, fontWeight:500, color:C.ink,
          padding:"16px 18px", resize:"vertical", lineHeight:1.8,
          minHeight, caretColor:C.gold, boxSizing:"border-box" }}/>
      {focused && (
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:[0.25, 0.6, 0.25] }}
          transition={{ duration:2.5, repeat:Infinity, ease:"easeInOut" }}
          style={{ position:"absolute", left:0, right:0, top:0, height:1,
            background:`linear-gradient(90deg, transparent, ${C.gold}60, transparent)`,
            pointerEvents:"none" }}/>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   DIMENSION CARD
   Vine tape: 2px emerald left border, springs height 0→100%.
   Marks the card as examined by the forest.
══════════════════════════════════════════════════════════ */
const DIMENSIONS = [
  {
    id:"structure", label:"Structure",
    color:"#00897B", pale:"rgba(0,137,123,0.10)", border:"rgba(0,137,123,0.22)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="14" height="2.5" rx="1" fill="#00897B" opacity="0.9"/>
        <rect x="1" y="6.5" width="9" height="2.5" rx="1" fill="#00897B" opacity="0.6"/>
        <rect x="1" y="11" width="11" height="2.5" rx="1" fill="#00897B" opacity="0.75"/>
      </svg>
    ),
  },
  {
    id:"bias", label:"Bias",
    color:"#D32F2F", pale:"rgba(211,47,47,0.10)", border:"rgba(211,47,47,0.22)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 13H2L8 2Z" stroke="#D32F2F" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M8 6v3.5M8 11.5v.5" stroke="#D32F2F" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id:"keywords", label:"Keywords",
    color:"#00C853", pale:"rgba(0,200,83,0.10)", border:"rgba(0,200,83,0.22)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 8h4M10 8h4M8 2v4M8 10v4" stroke="#00C853" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8" cy="8" r="2" stroke="#00C853" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id:"salary", label:"Salary",
    color:"#B8960C", pale:"rgba(184,150,12,0.10)", border:"rgba(184,150,12,0.25)",
    icon:(
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="#B8960C" strokeWidth="1.5"/>
        <path d="M8 4.5v7M6 6.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5S9 8 8 8s-2 .7-2 1.5S7 11 8 11s2-.7 2-1.5"
          stroke="#B8960C" strokeWidth="1.3" strokeLinecap="round"/>
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
        <CardSection label="Missing" color={C.bad}>
          {r.structure.missingSections.length===0
            ?<p style={{ fontFamily:C.body, fontSize:13, color:C.good, margin:0 }}>All key sections present.</p>
            :r.structure.missingSections.map((s,i)=><Row key={i} text={s} type="missing" index={i}/>)}
        </CardSection>
        <CardSection label="Present" color={C.good}>
          {r.structure.presentSections.map((s,i)=><Row key={i} text={s} type="match" index={i}/>)}
        </CardSection>
        <CardSection label="Suggestions" color={C.warn}>
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
        <CardSection label="Flagged phrases" color={C.bad}>
          {flagged===0
            ?<p style={{ fontFamily:C.body, fontSize:13, color:C.good, margin:"8px 0 0" }}>No biased language detected.</p>
            :<div style={{ paddingTop:4 }}>{r.bias.flaggedPhrases.map((p,i)=><Chip key={i} type="missing">{p}</Chip>)}</div>}
        </CardSection>
        <CardSection label="Improvements" color={C.warn}>
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
        <CardSection label="Strong" color={C.good}>
          <div style={{ paddingTop:4 }}>{r.keywords.strong.map((k,i)=><Chip key={i} type="match">{k}</Chip>)}</div>
        </CardSection>
        <CardSection label="Missing" color={C.bad}>
          <div style={{ paddingTop:4 }}>{r.keywords.missing.map((k,i)=><Chip key={i} type="missing">{k}</Chip>)}</div>
        </CardSection>
        <CardSection label="SEO tips" color={C.warn}>
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
          <div style={{ width:32, height:32, borderRadius:5,
            background:r.salary.transparent?C.goodPale:C.badPale,
            border:`1px solid ${r.salary.transparent?C.goodBorder:C.badBorder}`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {r.salary.transparent
              ?<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke={C.good} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              :<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke={C.bad} strokeWidth="1.5" strokeLinecap="round"/></svg>}
          </div>
          <span style={{ fontFamily:C.body, fontSize:14, fontWeight:500, color:r.salary.transparent?C.good:C.bad }}>
            {r.salary.transparent?"Salary disclosed":"No salary range"}
          </span>
        </div>
        <CardSection label="Observation" color={C.warn}>
          <Row text={r.salary.observation} type="neutral" index={0}/>
        </CardSection>
        <CardSection label="Recommendation" color={C.gold}>
          <Row text={r.salary.recommendation} type="neutral" index={0}/>
        </CardSection>
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity:0, scale:0.96, y:-8 }}
      animate={{ opacity:1, scale:1, y:0 }}
      transition={{ ...SP.spore, delay:mountDelay }}
      style={{ border:`1px solid ${isExpanded?dim.border:C.border}`, borderRadius:8,
        overflow:"hidden", background:C.surface, position:"relative",
        transition:"border-color 200ms ease" }}>

      {/* VINE TAPE — emerald left border springs to full height */}
      <motion.div
        initial={{ scaleY:0 }} animate={{ scaleY:1 }}
        transition={{ ...SP.vine, delay:mountDelay + 0.1 }}
        style={{ position:"absolute", left:0, top:0, width:2, height:"100%",
          background:`linear-gradient(180deg, ${C.emerald}, ${C.emeraldDeep})`,
          borderRadius:"0 1px 1px 0", zIndex:10, originY:0, transformBox:"fill-box" }}/>

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
        <motion.div animate={{ rotate:isExpanded?180:0 }} transition={SP.snap} style={{ color:C.inkDim }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>

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

/* ══════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════ */
export default function JDAnalyzer() {
  const [jd, setJd]             = useState("");
  const [resume, setResume]     = useState("");
  const [jdFile, setJdFile]     = useState("");
  const [resFile, setResFile]   = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError]       = useState("");
  const [step, setStep]         = useState("input");
  const myceliumPulseRef        = useRef(null);

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
      let out="";
      for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);if(c>=32&&c<=126)out+=t[i];else if(c===10||c===13||c===9)out+=" ";}
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
      if(!res.ok){setError(`HTTP ${res.status}`);setLoading(false);return;}
      const data = await res.json();
      const raw = data.content?.map(i=>i.text||"").join("")||"";
      const stripped = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      const match = stripped.match(/\{[\s\S]*\}/);
      if(!match){setError("Could not parse response.");setLoading(false);return;}
      let parsed=null;
      try{parsed=JSON.parse(match[0]);}catch{}
      if(!parsed){try{let s2="";for(let i=0;i<match[0].length;i++){const c=match[0].charCodeAt(i);if(c>=32||c===10||c===13||c===9)s2+=match[0][i];}parsed=JSON.parse(s2);}catch{}}
      if(!parsed){setError("Parse error. Please try again.");setLoading(false);return;}
      setResult(parsed); setExpanded(null); setStep("results");
      // Pulse mycelium on results
      myceliumPulseRef.current && myceliumPulseRef.current();
    } catch(e){setError(e.message);}
    setLoading(false);
  }

  const words = wordCount(jd);
  const biasFlags = detectBias(jd);

  const headline = jd.trim()===""
    ? <>Most JDs fail<br/><em>before anyone applies.</em></>
    : words < 30
    ? <>Keep going —<br/><em style={{ color:C.gold }}>reading your specimen.</em></>
    : biasFlags.length > 0
    ? <><em style={{ color:C.bad }}>{biasFlags.length} flag{biasFlags.length>1?"s":""} detected</em><br/>in your JD.</>
    : words >= 50
    ? <>Your JD looks<br/><em style={{ color:C.emerald }}>ready to examine.</em></>
    : <>Most JDs fail<br/><em>before anyone applies.</em></>;

  const subline = jd.trim()===""
    ? "Bias, keyword gaps, and missing sections cost you candidates. Drop your specimen to find out."
    : biasFlags.length>0
    ? `Detected: ${biasFlags.slice(0,3).join(", ")}${biasFlags.length>3?` and ${biasFlags.length-3} more`:""}.`
    : "Looking clean. Run analysis for the full examination.";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700&family=DM+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        body{background:${C.void};}
        ::selection{background:rgba(0,200,83,0.18);color:${C.emerald};}
        ::placeholder{color:${C.inkFaint};font-family:'DM Mono',monospace;font-size:12px;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${C.raised};border-radius:2px;}
        input[type=file]{display:none;}
        @media(prefers-reduced-motion:reduce){
          *{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}
          canvas{display:none;}
        }
      `}</style>

      {/* MYCELIUM ROOT NETWORK — signature element */}
      <MyceliumCanvas pulseRef={myceliumPulseRef}/>

      <div style={{ minHeight:"100vh", background:"transparent", color:C.ink,
        fontFamily:C.body, position:"relative", zIndex:1 }}>

        {/* HEADER */}
        <header style={{ position:"sticky", top:0, zIndex:200, height:52,
          background:`rgba(3,10,5,0.92)`, backdropFilter:"blur(20px)",
          borderBottom:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px" }}>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Leaf loupe — forest forensics */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke={C.emerald} strokeWidth="1.5"/>
              <path d="M12.5 12.5L16.5 16.5" stroke={C.emerald} strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 8 Q8 5 10 8 Q8 11 6 8Z" fill={C.emerald} opacity="0.4"/>
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
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.emerald;e.currentTarget.style.color=C.emerald;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}>
              ← New specimen
            </motion.button>
          )}

          <div style={{ fontFamily:C.mono, fontSize:9, color:C.inkFaint, letterSpacing:"0.1em",
            textAlign:"right", lineHeight:1.6 }}>
            FOREST<br/>FORENSICS
          </div>
        </header>

        <AnimatePresence mode="wait">

          {/* ══ INPUT ══ */}
          {step==="input" && (
            <motion.div key="input"
              initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:0.98 }}
              transition={{ duration:0.2, ease:[0.16,1,0.3,1] }}
              style={{ maxWidth:680, margin:"0 auto", padding:"56px 24px 100px" }}>

              {/* Hero */}
              <motion.div
                initial={{ opacity:0, scale:0.96, y:-8 }}
                animate={{ opacity:1, scale:1, y:0 }}
                transition={{ ...SP.spore, delay:0.05 }}
                style={{ marginBottom:52 }}>
                <div style={{ fontFamily:C.mono, fontSize:9, color:C.emerald,
                  letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:12 }}>
                  Forest Forensics · Specimen Analysis
                </div>
                <motion.h1
                  style={{ fontFamily:C.display, fontWeight:700, fontStyle:"italic",
                    fontSize:"clamp(36px,5vw,52px)", color:C.ink,
                    letterSpacing:"-1px", lineHeight:1.1, margin:"0 0 16px" }}>
                  {headline}
                </motion.h1>
                <p style={{ fontFamily:C.body, fontSize:14, color:C.inkMid, lineHeight:1.75, maxWidth:"52ch" }}>
                  {subline}
                </p>
              </motion.div>

              {/* Fields — spore entrance */}
              <motion.div
                initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                transition={{ ...SP.spore, delay:0.12 }}
                style={{ display:"flex", flexDirection:"column", gap:20 }}>

                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <L>Job Description <span style={{ color:C.bad }}>*</span></L>
                    <UploadBtn filename={jdFile} onFile={f=>handleFile(f,setJd,setJdFile)}/>
                  </div>
                  <JDField value={jd} onChange={e=>{setJd(e.target.value);setJdFile("");}}
                    placeholder="Paste the specimen — the forest scan begins on paste..."
                    minHeight={220}
                    onScan={()=>myceliumPulseRef.current&&myceliumPulseRef.current()}/>
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
                  <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
                    transition={SP.arrive}
                    style={{ background:C.badPale, border:`1px solid ${C.badBorder}`, borderRadius:6,
                      padding:"10px 14px", fontSize:12, color:C.bad, fontFamily:C.mono }}>
                    {error}
                  </motion.div>
                )}

                <div>
                  <motion.button
                    whileTap={!jd.trim()||loading?{}:{scale:0.97,transition:SP.press}}
                    whileHover={!jd.trim()||loading?{}:{scale:1.01,transition:SP.snap}}
                    onClick={analyze} disabled={!jd.trim()||loading}
                    animate={jd.trim()&&!loading?{
                      boxShadow:[`0 0 16px ${C.emeraldGlow}`,`0 0 32px ${C.emeraldGlow}`,`0 0 16px ${C.emeraldGlow}`]
                    }:{ boxShadow:"none" }}
                    transition={{ boxShadow:{ duration:2.5, repeat:Infinity, ease:"easeInOut" } }}
                    style={{ height:50, paddingLeft:36, paddingRight:36,
                      background:!jd.trim()||loading?C.raised:C.emerald,
                      border:"none", borderRadius:6,
                      color:!jd.trim()||loading?C.inkDim:C.void,
                      fontFamily:C.body, fontSize:14, fontWeight:600,
                      cursor:!jd.trim()||loading?"not-allowed":"pointer",
                      display:"inline-flex", alignItems:"center", gap:10,
                      letterSpacing:"-0.1px" }}>
                    {loading ? (
                      <>
                        <motion.div animate={{ rotate:360 }}
                          transition={{ duration:0.9,repeat:Infinity,ease:"linear" }}
                          style={{ width:14, height:14, border:`2px solid ${C.inkFaint}`,
                            borderTopColor:C.ink, borderRadius:"50%" }}/>
                        Examining specimen…
                      </>
                    ) : "Examine specimen →"}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ RESULTS ══ */}
          {step==="results" && result && (
            <motion.div key="results"
              initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0 }}
              transition={{ duration:0.2, ease:[0.16,1,0.3,1] }}
              style={{ maxWidth:820, margin:"0 auto", padding:"40px 24px 100px" }}>

              {/* Score block */}
              <motion.div
                initial={{ opacity:0, scale:0.96, y:-8 }}
                animate={{ opacity:1, scale:1, y:0 }}
                transition={SP.spore}
                style={{ padding:"28px 32px", border:`1px solid ${C.border}`, borderRadius:8,
                  background:C.surface, marginBottom:20, position:"relative", overflow:"hidden" }}>
                {/* Vine tape on score block */}
                <motion.div
                  initial={{ scaleY:0 }} animate={{ scaleY:1 }}
                  transition={{ ...SP.vine, delay:0.1 }}
                  style={{ position:"absolute", left:0, top:0, width:2, height:"100%",
                    background:`linear-gradient(180deg,${C.emerald},${C.emeraldDeep})`,
                    borderRadius:"0 1px 1px 0", originY:0, transformBox:"fill-box" }}/>
                <div style={{ paddingLeft:10 }}>
                  <ScoreBar score={result.overallScore}/>
                </div>
              </motion.div>

              {/* 2×2 grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                {DIMENSIONS.map((dim,i) => (
                  <DimensionCard key={dim.id} dim={dim} result={result}
                    expanded={expanded} setExpanded={setExpanded} mountDelay={i*0.07}/>
                ))}
              </div>

              {/* Resume match */}
              {result.resumeMatch && (
                <motion.div
                  initial={{ opacity:0, scale:0.96, y:-8 }}
                  animate={{ opacity:1, scale:1, y:0 }}
                  transition={{ ...SP.spore, delay:0.3 }}
                  style={{ border:`1px solid ${expanded==="match"?C.violetBorder:C.border}`,
                    borderRadius:8, overflow:"hidden", background:C.surface, position:"relative",
                    transition:"border-color 200ms ease" }}>
                  <motion.div initial={{ scaleY:0 }} animate={{ scaleY:1 }}
                    transition={{ ...SP.vine, delay:0.35 }}
                    style={{ position:"absolute", left:0, top:0, width:2, height:"100%",
                      background:`linear-gradient(180deg,${C.emerald},${C.emeraldDeep})`,
                      originY:0, transformBox:"fill-box" }}/>
                  <div onClick={()=>setExpanded(expanded==="match"?null:"match")}
                    style={{ padding:"16px 18px 16px 22px", display:"flex", alignItems:"center",
                      justifyContent:"space-between", cursor:"pointer",
                      borderBottom:expanded==="match"?`1px solid ${C.border}`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:6, background:C.violetPale,
                        border:`1px solid ${C.violetBorder}`, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4h8M2 8h6M2 12h7" stroke="#7B1FA2" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="12" cy="9" r="3" stroke="#7B1FA2" strokeWidth="1.5"/>
                          <path d="M14.5 11.5l1.5 1.5" stroke="#7B1FA2" strokeWidth="1.5" strokeLinecap="round"/>
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
                    <motion.div animate={{ rotate:expanded==="match"?180:0 }} transition={SP.snap}
                      style={{ color:C.inkDim }}>
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
                          <CardSection label="Strengths" color={C.good}>
                            {result.resumeMatch.strengths.map((s,i)=><Row key={i} text={s} type="match" index={i}/>)}
                          </CardSection>
                          <CardSection label="Gaps" color={C.bad}>
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