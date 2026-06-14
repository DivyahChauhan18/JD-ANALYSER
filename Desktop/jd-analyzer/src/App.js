import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   JD ANALYZER , Information First
   
   Scene: Recruiter, 9am, five JDs to check before standup.
   Needs data fast. No ceremony.
   
   Zinc-950 dark base. Electric blue #2563EB as restrained
   accent , used ONLY on the score bar and active states.
   Zero decoration. Every element justifies its existence.
   
   Impeccable checks:
   - No side-stripe borders. Sections separated by rules only.
   - No nested cards. No cards at all.
   - No gradient text.
   - No glassmorphism.
   - Tinted neutrals throughout. Never pure #000 or #fff.
   
   Taste Skill checks:
   - Geist + Geist Mono. No Inter. No serif.
   - DESIGN_VARIANCE 7: asymmetric split on results.
   - MOTION_INTENSITY 4: spring score bar, stagger lists.
   - VISUAL_DENSITY 6: daily app mode.
   - No emoji as structural icons.
   - No centered hero.
   - No 3-column card grid.
   
   Emil Kowalski motion:
   - Score bar: spring once on mount. That is the moment.
   - Tab underline: layoutId shared element.
   - Finding rows: stagger 30ms. Communicates structure.
   - Button press: scale(0.97). Tactile.
   - Nothing else animates.
═══════════════════════════════════════════════════════════ */

const C = {
  // Zinc-950 base , warm-tinted near-black, never pure #000
  bg:          "#09090B",
  surface:     "#0F0F12",
  raised:      "#18181C",
  high:        "#222228",

  // Borders
  border:      "rgba(255,255,255,0.08)",
  borderMid:   "rgba(255,255,255,0.13)",
  borderHigh:  "rgba(255,255,255,0.22)",

  // Text , warm off-white, never pure #fff
  ink:         "#FAFAF9",
  inkMid:      "rgba(250,250,249,0.62)",
  inkDim:      "rgba(250,250,249,0.38)",
  inkFaint:    "rgba(250,250,249,0.16)",

  // Electric blue , the ONE accent. Restrained.
  blue:        "#2563EB",
  blueMid:     "#1D4ED8",
  bluePale:    "rgba(37,99,235,0.12)",
  blueTrace:   "rgba(37,99,235,0.07)",

  // Semantic , used only in data, never decoration
  green:       "#16A34A",
  greenPale:   "rgba(22,163,74,0.10)",
  red:         "#DC2626",
  redPale:     "rgba(220,38,38,0.10)",
  amber:       "#D97706",
  amberPale:   "rgba(217,119,6,0.10)",

  // Typography
  sans:  "'Geist', system-ui, sans-serif",
  mono:  "'Geist Mono', monospace",
};

/* ── Spring configs ── */
const SP = {
  snap:   { type:"spring", stiffness:500, damping:32 },
  arrive: { type:"spring", stiffness:340, damping:28 },
  press:  { type:"spring", stiffness:600, damping:36, mass:0.8 },
  // Score bar , heavier, communicates weight of the verdict
  score:  { type:"spring", stiffness:160, damping:24, mass:1.4 },
};

/* ── Helpers ── */
function scoreColor(s)  { return s>=75 ? C.green  : s>=50 ? C.amber  : C.red; }
function scorePale(s)   { return s>=75 ? C.greenPale : s>=50 ? C.amberPale : C.redPale; }
function scoreWord(s)   { return s>=75 ? "Strong"   : s>=50 ? "Moderate" : "Weak"; }
function scoreNote(s)   {
  if (s>=75) return "Well-structured, inclusive, and searchable. Ready to post.";
  if (s>=50) return "Functional but improvable. Address flagged issues before posting.";
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
          for (let i=1; i<=pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(x=>x.str).join(" ") + "\n";
          }
          resolve(text.trim());
        } else {
          const r2 = new FileReader(); r2.onload = te => resolve(te.target.result||""); r2.readAsText(file);
        }
      } catch { const r2 = new FileReader(); r2.onload = te => resolve(te.target.result||""); r2.readAsText(file); }
    };
    r.readAsArrayBuffer(file);
  });
}

/* ═══════════════════════════════════════════
   SCORE BAR , the signature element
   
   A horizontal bar that springs to the score
   percentage. One motion. The number snaps to
   the right end of the fill. Everything else
   on the page is instant.
   
   Emil: "should this animate?" YES.
   It communicates the verdict arriving.
   It would feel wrong if it just appeared.
═══════════════════════════════════════════ */
function ScoreBar({ score }) {
  const col = scoreColor(score);
  const pale = scorePale(score);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
        <span style={{ fontFamily:C.mono, fontSize:10, color:C.inkDim, letterSpacing:"0.1em", textTransform:"uppercase" }}>Overall score</span>
        <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
          <motion.span
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.4, duration:0.2 }}
            style={{ fontFamily:C.mono, fontSize:28, fontWeight:600, color:col, letterSpacing:"-1px", lineHeight:1 }}
          >{score}</motion.span>
          <span style={{ fontFamily:C.mono, fontSize:12, color:C.inkDim }}>/100</span>
        </div>
      </div>
      {/* The bar */}
      <div style={{ height:3, background:C.raised, borderRadius:2, overflow:"hidden", marginBottom:12 }}>
        <motion.div
          initial={{ width:0 }}
          animate={{ width:`${score}%` }}
          transition={SP.score}
          style={{ height:"100%", background:col, borderRadius:2 }}
        />
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <motion.div
          initial={{ scale:0.8, opacity:0 }}
          animate={{ scale:1, opacity:1 }}
          transition={{ ...SP.arrive, delay:0.5 }}
          style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px", borderRadius:4, background:pale, border:`1px solid ${col}30` }}
        >
          <div style={{ width:5, height:5, borderRadius:"50%", background:col }}/>
          <span style={{ fontFamily:C.mono, fontSize:10, color:col, fontWeight:600, letterSpacing:"0.08em" }}>{scoreWord(score)}</span>
        </motion.div>
        <span style={{ fontFamily:C.sans, fontSize:12, color:C.inkDim, lineHeight:1.5 }}>{scoreNote(score)}</span>
      </div>
    </div>
  );
}

/* ── Inline label ── */
function L({ children }) {
  return <span style={{ fontFamily:C.mono, fontSize:12, fontWeight:600, color:C.inkMid, letterSpacing:"0.08em", textTransform:"uppercase" }}>{children}</span>;
}

/* ── Finding row , staggered on mount ── */
function Row({ text, type, index=0 }) {
  const col = type==="match" ? C.green : type==="missing" ? C.red : C.inkDim;
  return (
    <motion.div
      initial={{ opacity:0, x:-4 }}
      animate={{ opacity:1, x:0 }}
      transition={{ ...SP.arrive, delay:index*0.03 }}
      style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.border}` }}
    >
      <div style={{ width:5, height:5, borderRadius:"50%", background:col, marginTop:9, flexShrink:0 }}/>
      <p style={{ fontFamily:C.sans, fontSize:14, fontWeight:500, lineHeight:1.7, color:type==="missing"?C.ink:type==="match"?C.inkMid:C.inkMid, margin:0 }}>{text}</p>
    </motion.div>
  );
}

/* ── Chip ── */
function Chip({ children, type }) {
  const map = {
    match:   { bg:C.greenPale, color:C.green, border:`1px solid rgba(22,163,74,0.25)` },
    missing: { bg:C.redPale,   color:C.red,   border:`1px solid rgba(220,38,38,0.25)` },
    neutral: { bg:C.raised,    color:C.inkMid,border:`1px solid ${C.border}` },
  };
  const s = map[type]||map.neutral;
  return (
    <span style={{ display:"inline-block", background:s.bg, color:s.color, border:s.border, borderRadius:4, fontSize:11, padding:"4px 10px", margin:"3px 4px 3px 0", fontFamily:C.mono, fontWeight:500 }}>
      {children}
    </span>
  );
}

/* ── Textarea with scan line on focus (restored) ── */
function Field({ value, onChange, placeholder, minHeight=200 }) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      animate={{ borderColor: focused ? C.blue : C.border, boxShadow: focused ? `0 0 0 3px ${C.blueTrace}` : "none" }}
      transition={{ duration:0.14 }}
      style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", background:C.surface, position:"relative" }}
    >
      <textarea value={value} onChange={onChange} placeholder={placeholder}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        style={{ width:"100%", background:"transparent", border:"none", outline:"none", fontFamily:C.mono, fontSize:13, fontWeight:500, color:C.ink, padding:"16px 18px", resize:"vertical", lineHeight:1.8, minHeight, caretColor:C.blue, boxSizing:"border-box" }}
      />
      {focused && (
        <div style={{ position:"absolute", left:0, right:0, top:0, height:2, background:`linear-gradient(90deg, transparent, ${C.blue}, transparent)`, animation:"scanLine 2s ease-in-out infinite", pointerEvents:"none" }}/>
      )}
    </motion.div>
  );
}

/* ── Upload button , SVG icon, no emoji ── */
function UploadBtn({ filename, onFile }) {
  return (
    <motion.label
      whileHover={{ scale:1.01 }} whileTap={{ scale:0.97, transition:SP.press }}
      style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:C.mono, fontSize:10, letterSpacing:"0.08em", color:filename?C.green:C.inkDim, cursor:"pointer", border:`1px solid ${filename?C.green+"40":C.border}`, padding:"6px 12px", borderRadius:6, background:filename?C.greenPale:"transparent", transition:"all 120ms ease" }}>
      {filename ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 8V2M3 5l3-3 3 3M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
      {filename ? filename.slice(0,20) : "Upload PDF"}
      <input type="file" accept=".pdf,.txt" style={{ display:"none" }} onChange={e=>e.target.files[0]&&onFile(e.target.files[0])}/>
    </motion.label>
  );
}

/* ── Score mini circle for bias/match tabs ── */
function ScoreMini({ score }) {
  const col = scoreColor(score);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ position:"relative", width:56, height:56, flexShrink:0 }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke={C.raised} strokeWidth="3"/>
          <motion.circle cx="28" cy="28" r="22" fill="none" stroke={col} strokeWidth="3"
            strokeLinecap="round" strokeDasharray={`${2*Math.PI*22}`}
            initial={{ strokeDashoffset:`${2*Math.PI*22}` }}
            animate={{ strokeDashoffset:`${2*Math.PI*22*(1-score/100)}` }}
            transform="rotate(-90 28 28)"
            transition={{ ...SP.score, delay:0.1 }}
          />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:C.mono, fontSize:13, fontWeight:600, color:col }}>{score}</span>
        </div>
      </div>
      <div>
        <div style={{ fontFamily:C.mono, fontSize:12, fontWeight:600, color:col, marginBottom:3 }}>{scoreWord(score)}</div>
        <div style={{ fontFamily:C.sans, fontSize:12, color:C.inkDim, lineHeight:1.5, maxWidth:260 }}>{scoreNote(score)}</div>
      </div>
    </div>
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
  const [tab, setTab]         = useState("structure");
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
      let result = "";
      for (let i = 0; i < t.length; i++) {
        const code = t.charCodeAt(i);
        if (code >= 32 && code <= 126) result += t[i];
        else if (code === 10 || code === 13 || code === 9) result += " ";
      }
      return result
        .replace(/([A-Z]) ([A-Z]) ([A-Z])/g, "$1$2$3")
        .replace(/\s{3,}/g, " ")
        .trim()
        .slice(0, 6000);
    };
    const prompt = `You are an expert HR analyst. Analyze the following and return ONLY a JSON object.
CRITICAL: Your response must be valid JSON only. No markdown. No backticks. No explanation. Start with { and end with }.
Do not include any resume or JD text in your response. Only include your analysis.

JOB DESCRIPTION:
${clean(jd)}
${hasResume ? `RESUME:\n${clean(resume)}` : ""}

Return this exact JSON structure with your analysis filled in:
{"overallScore":72,"structure":{"missingSections":["Benefits"],"presentSections":["Role overview","Responsibilities"],"suggestions":["Add team size context"]},"bias":{"flaggedPhrases":["rockstar","ninja"],"inclusivityScore":65,"improvements":["Replace rockstar with high-performing"]},"keywords":{"strong":["talent acquisition","onboarding"],"missing":["ATS","HRBP","OKR"],"seoTips":["Add seniority level to title"]},"salary":{"transparent":false,"observation":"No salary range disclosed","recommendation":"Add a salary band to increase applicant quality"}${hasResume ? `,"resumeMatch":{"matchScore":58,"strengths":["Strong coordination experience"],"gaps":["No ATS experience"],"verdict":"Transferable skills present but lacks direct HR ops background"}` : ""}}`

    try {
      const res = await fetch("/api/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":process.env.REACT_APP_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1500, messages:[{role:"user",content:prompt}] }),
      });
      if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return; }
      const data = await res.json();
      const raw = data.content?.map(i=>i.text||"").join("")||"";
      // Strip markdown fences if present
      const stripped = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      const match = stripped.match(/\{[\s\S]*\}/);
      if (!match) { setError("Could not parse response. Please try again."); setLoading(false); return; }
      let parsed = null;
      // Try 1: direct parse
      try { parsed = JSON.parse(match[0]); } catch {}
      // Try 2: strip non-printable chars using charCodeAt
      if (!parsed) {
        try {
          let safe2 = "";
          for (let i = 0; i < match[0].length; i++) {
            const code = match[0].charCodeAt(i);
            if (code >= 32 || code === 10 || code === 13 || code === 9) safe2 += match[0][i];
          }
          parsed = JSON.parse(safe2);
        } catch {}
      }
      // Try 3: normalize quotes and whitespace
      if (!parsed) {
        try {
          let safe3 = "";
          for (let i = 0; i < match[0].length; i++) {
            const code = match[0].charCodeAt(i);
            if (code >= 32) safe3 += match[0][i];
            else if (code === 10 || code === 9) safe3 += " ";
          }
          safe3 = safe3
            .replace(/\u2018|\u2019/g, "'")
            .replace(/\u201C|\u201D/g, '"');
          parsed = JSON.parse(safe3);
        } catch {}
      }
      if (!parsed) { setError("Parse error. Please try again , avoid pasting PDFs with unusual characters."); setLoading(false); return; }
      setResult(parsed);
      setTab("structure");
      setStep("results");
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  const tabs = [
    { id:"structure", label:"Structure" },
    { id:"bias",      label:"Bias" },
    { id:"keywords",  label:"Keywords" },
    { id:"salary",    label:"Salary" },
    ...(result?.resumeMatch ? [{ id:"match", label:"Resume Match" }] : []),
  ];

  function renderTab() {
    if (!result) return null;
    const r = result;
    const stagger = (items, type) => items.map((s,i) => <Row key={i} text={s} type={type} index={i}/>);

    switch(tab) {
      case "structure": return (
        <motion.div key="structure" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}>
          <Section label="Missing sections" accent={C.red}>
            {r.structure.missingSections.length===0
              ? <p style={{ fontFamily:C.sans, fontSize:13, color:C.green, margin:0 }}>All key sections present.</p>
              : stagger(r.structure.missingSections, "missing")}
          </Section>
          <Section label="Present sections" accent={C.green}>
            {stagger(r.structure.presentSections, "match")}
          </Section>
          <Section label="Suggestions" accent={C.amber}>
            {stagger(r.structure.suggestions, "neutral")}
          </Section>
        </motion.div>
      );
      case "bias": return (
        <motion.div key="bias" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}>
          <Section label="Inclusivity score" accent={scoreColor(r.bias.inclusivityScore)}>
            <div style={{ paddingBottom:4 }}><ScoreMini score={r.bias.inclusivityScore}/></div>
          </Section>
          <Section label="Flagged phrases" accent={C.red}>
            {r.bias.flaggedPhrases.length===0
              ? <p style={{ fontFamily:C.sans, fontSize:13, color:C.green, margin:0 }}>No biased language detected.</p>
              : <div>{r.bias.flaggedPhrases.map((p,i)=><Chip key={i} type="missing">{p}</Chip>)}</div>}
          </Section>
          <Section label="Improvements" accent={C.amber}>
            {stagger(r.bias.improvements, "neutral")}
          </Section>
        </motion.div>
      );
      case "keywords": return (
        <motion.div key="keywords" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}>
          <Section label="Strong keywords" accent={C.green}>
            <div>{r.keywords.strong.map((k,i)=><Chip key={i} type="match">{k}</Chip>)}</div>
          </Section>
          <Section label="Missing keywords" accent={C.red}>
            <div>{r.keywords.missing.map((k,i)=><Chip key={i} type="missing">{k}</Chip>)}</div>
          </Section>
          <Section label="SEO tips" accent={C.amber}>
            {stagger(r.keywords.seoTips, "neutral")}
          </Section>
        </motion.div>
      );
      case "salary": return (
        <motion.div key="salary" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}>
          <Section label="Transparency" accent={r.salary.transparent?C.green:C.red}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0" }}>
              <div style={{ width:32, height:32, borderRadius:6, background:r.salary.transparent?C.greenPale:C.redPale, border:`1px solid ${r.salary.transparent?C.green+"40":C.red+"40"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {r.salary.transparent
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/></svg>
                }
              </div>
              <span style={{ fontFamily:C.sans, fontSize:14, fontWeight:500, color:r.salary.transparent?C.green:C.red }}>
                {r.salary.transparent ? "Salary disclosed" : "No salary range"}
              </span>
            </div>
          </Section>
          <Section label="Observation" accent={C.amber}>
            <Row text={r.salary.observation} type="neutral" index={0}/>
          </Section>
          <Section label="Recommendation" accent={C.blue}>
            <Row text={r.salary.recommendation} type="neutral" index={0}/>
          </Section>
        </motion.div>
      );
      case "match": return r.resumeMatch ? (
        <motion.div key="match" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.12 }}>
          <Section label="Match score" accent={scoreColor(r.resumeMatch.matchScore)}>
            <div style={{ paddingBottom:4 }}><ScoreMini score={r.resumeMatch.matchScore}/></div>
            <p style={{ fontFamily:C.sans, fontSize:13, color:C.inkDim, lineHeight:1.7, margin:"12px 0 0" }}>{r.resumeMatch.verdict}</p>
          </Section>
          <Section label="Strengths" accent={C.green}>
            {stagger(r.resumeMatch.strengths, "match")}
          </Section>
          <Section label="Gaps" accent={C.red}>
            {stagger(r.resumeMatch.gaps, "missing")}
          </Section>
        </motion.div>
      ) : null;
      default: return null;
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        body{background:${C.bg};}
        ::selection{background:${C.bluePale};color:${C.blue};}
        ::placeholder{color:${C.inkFaint};font-family:'Geist Mono',monospace;font-size:12px;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:${C.raised};border-radius:2px;}
        input[type=file]{display:none;}
        button,label{cursor:pointer;}
        @keyframes scanLine{0%{top:0;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:100%;opacity:0}}
        @media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
      `}</style>

      <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans }}>

        {/* HEADER , minimal bar */}
        <header style={{ position:"sticky", top:0, zIndex:200, height:52, background:`${C.bg}F0`, backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:22, height:22, borderRadius:5, background:C.blue, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="2" rx="1" fill="white" opacity="0.9"/>
                <rect x="1" y="5" width="7" height="2" rx="1" fill="white" opacity="0.6"/>
                <rect x="1" y="9" width="9" height="2" rx="1" fill="white" opacity="0.75"/>
              </svg>
            </div>
            <span style={{ fontFamily:C.sans, fontSize:14, fontWeight:600, color:C.ink, letterSpacing:"-0.3px" }}>JD Analyzer</span>
            <span style={{ fontFamily:C.mono, fontSize:9, color:C.inkFaint, letterSpacing:"0.1em" }}>by Divyah</span>
          </div>
          {step==="results" && (
            <motion.button
              whileTap={{ scale:0.97, transition:SP.press }}
              onClick={()=>{setStep("input");setResult(null);setError("");}}
              style={{ fontFamily:C.mono, fontSize:10, color:C.inkDim, background:"transparent", border:`1px solid ${C.border}`, padding:"6px 14px", borderRadius:6, letterSpacing:"0.08em" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.borderMid;e.currentTarget.style.color=C.ink;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.inkDim;}}
            >New analysis</motion.button>
          )}
        </header>

        <AnimatePresence mode="wait">

          {/* ══ INPUT ══ */}
          {step==="input" && (
            <motion.div key="input"
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
              transition={{ duration:0.18, ease:[0.16,1,0.3,1] }}
              style={{ maxWidth:680, margin:"0 auto", padding:"56px 24px 100px" }}
            >
              {/* Hero , left-aligned, not centered (Taste Skill Rule 3) */}
              <motion.div
                variants={{ show:{ transition:{ staggerChildren:0.04, delayChildren:0.04 } } }}
                initial="hidden" animate="show"
                style={{ marginBottom:48 }}
              >
                <motion.div variants={{ hidden:{opacity:0,y:6}, show:{opacity:1,y:0,transition:SP.arrive} }}>
                  <span style={{ fontFamily:C.mono, fontSize:9, color:C.blue, letterSpacing:"0.16em", textTransform:"uppercase" }}>HR Intelligence</span>
                </motion.div>
                <motion.h1 variants={{ hidden:{opacity:0,y:8}, show:{opacity:1,y:0,transition:{...SP.arrive,delay:0.04}} }}
                  style={{ fontFamily:C.sans, fontWeight:700, fontSize:"clamp(34px,5vw,52px)", color:C.ink, letterSpacing:"-1.5px", lineHeight:1.1, margin:"10px 0 0" }}>
                  Most JDs fail before<br/>anyone applies.
                </motion.h1>
                <motion.p variants={{ hidden:{opacity:0,y:6}, show:{opacity:1,y:0,transition:{...SP.arrive,delay:0.08}} }}
                  style={{ fontFamily:C.sans, fontSize:15, fontWeight:400, color:C.inkMid, lineHeight:1.7, maxWidth:"52ch", marginTop:14 }}>
                  Bias, keyword gaps, and missing sections cost you candidates before the process begins. Paste yours and find out.
                </motion.p>
              </motion.div>

              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ ...SP.arrive, delay:0.14 }}
                style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <L>Job Description <span style={{ color:C.red }}>*</span></L>
                    <UploadBtn filename={jdFile} onFile={f=>handleFile(f,setJd,setJdFile)}/>
                  </div>
                  <Field value={jd} onChange={e=>{setJd(e.target.value);setJdFile("");}} placeholder="Paste the full job description..." minHeight={200}/>
                </div>

                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <L>Resume</L>
                      <span style={{ fontFamily:C.mono, fontSize:10, color:C.inkFaint, letterSpacing:"0.06em" }}>optional</span>
                    </div>
                    <UploadBtn filename={resFile} onFile={f=>handleFile(f,setResume,setResFile)}/>
                  </div>
                  <Field value={resume} onChange={e=>{setResume(e.target.value);setResFile("");}} placeholder="Paste your resume to enable match scoring..." minHeight={140}/>
                </div>

                {error && (
                  <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={SP.arrive}
                    style={{ background:C.redPale, border:`1px solid ${C.red}30`, borderRadius:6, padding:"10px 14px", fontSize:12, color:C.red, fontFamily:C.mono }}>
                    {error}
                  </motion.div>
                )}

                <motion.button
                  whileTap={!jd.trim()||loading ? {} : { scale:0.97, transition:SP.press }}
                  whileHover={!jd.trim()||loading ? {} : { scale:1.01, transition:SP.snap }}
                  onClick={analyze} disabled={!jd.trim()||loading}
                  style={{ height:46, paddingLeft:28, paddingRight:28, background:!jd.trim()||loading?C.raised:C.blue, border:"none", borderRadius:8, color:!jd.trim()||loading?C.inkDim:C.ink, fontFamily:C.sans, fontSize:14, fontWeight:500, cursor:!jd.trim()||loading?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:10, alignSelf:"flex-start", letterSpacing:"-0.1px" }}>
                  {loading ? (
                    <>
                      <motion.div animate={{ rotate:360 }} transition={{ duration:0.75, repeat:Infinity, ease:"linear" }}
                        style={{ width:14, height:14, border:`2px solid ${C.inkFaint}`, borderTopColor:C.ink, borderRadius:"50%" }}/>
                      Analysing
                    </>
                  ) : "Run Analysis"}
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* ══ RESULTS ══ */}
          {step==="results" && result && (
            <motion.div key="results"
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
              transition={{ duration:0.2, ease:[0.16,1,0.3,1] }}
            >
              {/* Score panel , full width, then splits below */}
              <div style={{ maxWidth:780, margin:"0 auto", padding:"40px 24px 0" }}>
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={SP.arrive}
                  style={{ padding:"24px 28px", borderBottom:`1px solid ${C.border}` }}>
                  <ScoreBar score={result.overallScore}/>
                </motion.div>
              </div>

              {/* Tab bar , Linear-style layoutId underline */}
              <div style={{ position:"sticky", top:52, zIndex:100, background:`${C.bg}F4`, backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ maxWidth:780, margin:"0 auto", display:"flex", padding:"0 24px", position:"relative" }}>
                  {tabs.map(t => (
                    <button key={t.id} onClick={()=>setTab(t.id)}
                      style={{ position:"relative", padding:"14px 20px", background:"transparent", border:"none", outline:"none", color:tab===t.id?C.ink:C.inkDim, fontFamily:C.mono, fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:tab===t.id?700:500, cursor:"pointer", transition:"color 140ms ease" }}>
                      {t.label}
                      {tab===t.id && (
                        <motion.div layoutId="jd-tab-line"
                          style={{ position:"absolute", bottom:-1, left:0, right:0, height:2, background:C.blue, borderRadius:1 }}
                          transition={SP.snap}/>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div style={{ maxWidth:780, margin:"0 auto", padding:"24px 24px 100px" }}>
                <AnimatePresence mode="wait">
                  {renderTab()}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ── Section , no cards, just ruled spacing ── */
function Section({ label, accent, children }) {
  return (
    <div style={{ marginBottom:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 0 14px", borderTop:`1px solid ${C.border}` }}>
        <div style={{ width:3, height:12, borderRadius:1, background:accent, flexShrink:0 }}/>
        <span style={{ fontFamily:C.mono, fontSize:11, fontWeight:700, color:C.inkMid, letterSpacing:"0.12em", textTransform:"uppercase" }}>{label}</span>
      </div>
      <div style={{ paddingBottom:6 }}>{children}</div>
    </div>
  );
}