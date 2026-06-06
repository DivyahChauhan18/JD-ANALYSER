import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════
   DESIGN DIRECTION: Obsidian Intelligence Terminal
   — Deep black base, electric crimson accent, razor glass cards
   — Cormorant Garamond for scores, DM Mono for data
   — Scanning animation, staggered reveals, classified-doc aesthetic
   ═══════════════════════════════════════════════════════════ */

const C = {
  void:         "#060809",
  obsidian:     "#0C0F14",
  obsidianMid:  "#111620",
  obsidianLight:"#181F2C",
  glass:        "rgba(255,255,255,0.03)",
  glassMid:     "rgba(255,255,255,0.06)",
  glassHigh:    "rgba(255,255,255,0.10)",
  border:       "rgba(255,255,255,0.06)",
  borderMid:    "rgba(255,255,255,0.10)",
  borderHigh:   "rgba(255,255,255,0.18)",
  crimson:      "#FF2D2D",
  crimsonDim:   "#CC2222",
  crimsonGlow:  "rgba(255,45,45,0.20)",
  crimsonTrace: "rgba(255,45,45,0.08)",
  ice:          "#FFFFFF",
  iceOff:       "rgba(255,255,255,0.85)",
  iceMid:       "rgba(255,255,255,0.50)",
  iceDim:       "rgba(255,255,255,0.28)",
  iceFaint:     "rgba(255,255,255,0.10)",
  sage:         "#22C55E",
  sageDim:      "rgba(34,197,94,0.15)",
  sageBorder:   "rgba(34,197,94,0.25)",
  amber:        "#F59E0B",
  amberDim:     "rgba(245,158,11,0.12)",
  amberBorder:  "rgba(245,158,11,0.25)",
  serif:        "'Cormorant Garamond', Georgia, serif",
  mono:         "'DM Mono', monospace",
  sans:         "'Plus Jakarta Sans', system-ui, sans-serif",
};

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

/* ── Helpers ── */
function scoreColor(s)  { return s >= 75 ? C.sage    : s >= 50 ? C.amber    : C.crimson; }
function scoreGlow(s)   { return s >= 75 ? C.sageDim  : s >= 50 ? C.amberDim  : C.crimsonGlow; }
function scoreLabel(s)  { return s >= 75 ? "STRONG"   : s >= 50 ? "MODERATE"  : "WEAK"; }
function scoreVerdict(s){ return s >= 75 ? "This JD is well-crafted. Recommend posting immediately." : s >= 50 ? "This JD has meaningful gaps. Revise before posting." : "This JD requires significant revision. Do not post yet."; }

/* ── PDF extraction ── */
async function extractTextFromPDF(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const lib = window.pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const pdf = await lib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(" ") + "\n";
          }
          resolve(text.trim());
        } else {
          const r2 = new FileReader(); r2.onload = te => resolve(te.target.result || ""); r2.readAsText(file);
        }
      } catch {
        const r2 = new FileReader(); r2.onload = te => resolve(te.target.result || ""); r2.readAsText(file);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ── Count-up score ── */
function CountUp({ target, duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const tick = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

/* ── Score display ── */
function ScoreDisplay({ score }) {
  const display = CountUp({ target: score });
  const col = scoreColor(score);
  const size = 140;
  const cx = size / 2, cy = size / 2, R = 44;
  const toRad = d => d * Math.PI / 180;
  const pt = (r, deg) => ({ x: cx + r * Math.cos(toRad(deg - 90)), y: cy + r * Math.sin(toRad(deg - 90)) });
  const arc = (r, from, to) => { const s = pt(r, from), e = pt(r, to); return `M${s.x},${s.y} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x},${e.y}`; };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="scoreGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={R + 10} fill="none" stroke={C.border} strokeWidth={0.5}/>
      {/* Track */}
      <path d={arc(R, 135, 405)} fill="none" stroke={C.iceFaint} strokeWidth={3} strokeLinecap="round"/>
      {/* Value arc */}
      <path d={arc(R, 135, 135 + 270 * (display / 100))} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" filter="url(#scoreGlow)"/>
      {/* Score */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={col}
        style={{ fontSize: 38, fontWeight: 700, fontFamily: C.serif, letterSpacing: "-2px" }}>{display}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={C.iceDim}
        style={{ fontSize: 9, fontFamily: C.mono, letterSpacing: "0.14em" }}>/ 100</text>
    </svg>
  );
}

/* ── Tag/Chip ── */
function Tag({ children, type }) {
  const map = {
    match:   { bg: C.sageDim,   color: C.sage,   border: C.sageBorder   },
    missing: { bg: C.crimsonTrace, color: C.crimson, border: "rgba(255,45,45,0.25)" },
    neutral: { bg: C.iceFaint,  color: C.iceMid,  border: C.border      },
  };
  const s = map[type] || map.neutral;
  return (
    <span style={{
      display: "inline-block",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 3, fontSize: 11,
      padding: "4px 12px", margin: "4px 4px 4px 0",
      fontFamily: C.mono, letterSpacing: "0.04em", fontWeight: 500,
    }}>{children}</span>
  );
}

/* ── Row ── */
function Row({ text, type, delay = 0 }) {
  const dot   = type === "match" ? C.sage : type === "missing" ? C.crimson : C.iceDim;
  const color = type === "match" ? C.sage : type === "missing" ? C.crimson : C.iceMid;
  return (
    <div style={{
      display: "flex", gap: 14, padding: "12px 0",
      borderBottom: `1px solid ${C.border}`,
      animation: `slideUp 400ms ${EASE} ${delay}ms both`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot, marginTop: 8, flexShrink: 0, boxShadow: `0 0 8px ${dot}` }}/>
      <p style={{ fontSize: 13, lineHeight: 1.75, color, margin: 0, fontFamily: C.mono }}>{text}</p>
    </div>
  );
}

/* ── Section block ── */
function Block({ number, label, accent, children, delay = 0 }) {
  return (
    <div style={{
      marginBottom: 10,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: "hidden",
      background: C.glass,
      animation: `slideUp 500ms ${EASE} ${delay}ms both`,
      position: "relative",
    }}>
      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${accent||C.crimson}, transparent)` }}/>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 22px",
        borderBottom: `1px solid ${C.border}`,
        background: C.glassMid,
      }}>
        <span style={{ fontSize: 9, color: C.iceDim, fontFamily: C.mono, minWidth: 20 }}>{number}</span>
        <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: accent || C.crimson, fontFamily: C.mono, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ padding: "16px 22px 18px" }}>{children}</div>
    </div>
  );
}

/* ── Scan line animation on textarea ── */
function ScanningTextarea({ value, onChange, placeholder, minHeight = 200 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: "transparent", border: "none",
          color: C.iceOff, fontFamily: C.mono, fontSize: 12,
          padding: "20px 24px", resize: "vertical",
          lineHeight: 1.8, minHeight,
          outline: "none", caretColor: C.crimson,
          boxSizing: "border-box",
        }}
      />
      {focused && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${C.crimson}, transparent)`,
          animation: "scanLine 2s ease-in-out infinite",
          pointerEvents: "none",
        }}/>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN
══════════════════════════════════════ */
export default function JDAnalyzer() {
  const [jd, setJd]                 = useState("");
  const [resume, setResume]         = useState("");
  const [jdFileName, setJdFileName] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState("structure");
  const [error, setError]           = useState("");
  const [step, setStep]             = useState("input");

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => { window.pdfjsLib = window["pdfjs-dist/build/pdf"]; };
    document.head.appendChild(s);
  }, []);

  async function handleJdFile(file) {
    if (file.type === "application/pdf") { const t = await extractTextFromPDF(file); if (t) { setJd(t); setJdFileName(file.name); } else setError("Could not extract PDF text."); }
    else { const t = await file.text(); setJd(t); setJdFileName(file.name); }
  }
  async function handleResumeFile(file) {
    if (file.type === "application/pdf") { const t = await extractTextFromPDF(file); if (t) { setResume(t); setResumeFileName(file.name); } else setError("Could not extract PDF text."); }
    else { const t = await file.text(); setResume(t); setResumeFileName(file.name); }
  }

  async function analyze() {
    if (!jd.trim()) return;
    setLoading(true); setResult(null); setError("");
    const hasResume = resume.trim().length > 0;
    const prompt = `You are an expert HR analyst. Analyze the Job Description${hasResume ? " and Resume" : ""} below.
JOB DESCRIPTION:\n${jd}${hasResume ? `\nRESUME:\n${resume}` : ""}
Return ONLY raw JSON (no markdown, no backticks):
{"overallScore":72,"structure":{"missingSections":["Benefits & perks"],"presentSections":["Role overview"],"suggestions":["Add team size context"]},"bias":{"flaggedPhrases":["rockstar"],"inclusivityScore":65,"improvements":["Replace 'rockstar' with 'high-performing'"]},"keywords":{"strong":["talent acquisition"],"missing":["ATS","HRBP"],"seoTips":["Add role level in title"]},"salary":{"transparent":false,"observation":"No salary range mentioned.","recommendation":"Include a salary band."}${hasResume ? `,"resumeMatch":{"matchScore":58,"strengths":["Strong coordination experience"],"gaps":["No ATS experience"],"verdict":"Transferable skills but lacks direct HR ops experience."}` : ""}}`;

    try {
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return; }
      const data = await res.json();
      const raw = data.content?.map(i => i.text || "").join("") || "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) { setError("Failed to parse response."); setLoading(false); return; }
      setResult(JSON.parse(match[0]));
      setActiveTab("structure");
      setStep("results");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  const tabs = [
    { id: "structure", label: "Structure" },
    { id: "bias",      label: "Bias" },
    { id: "keywords",  label: "Keywords" },
    { id: "salary",    label: "Salary" },
    ...(result?.resumeMatch ? [{ id: "match", label: "Match" }] : []),
  ];

  function renderTab() {
    if (!result) return null;
    const r = result;
    switch (activeTab) {
      case "structure": return (<>
        <Block number="01" label="Missing Sections" accent={C.crimson} delay={0}>
          {r.structure.missingSections.length === 0
            ? <p style={{ fontSize: 13, color: C.sage, fontFamily: C.mono, margin: 0 }}>◆ All key sections present</p>
            : r.structure.missingSections.map((s, i) => <Row key={i} text={s} type="missing" delay={i * 50} />)}
        </Block>
        <Block number="02" label="Present Sections" accent={C.sage} delay={80}>
          {r.structure.presentSections.map((s, i) => <Row key={i} text={s} type="match" delay={i * 40} />)}
        </Block>
        <Block number="03" label="Suggestions" accent={C.amber} delay={160}>
          {r.structure.suggestions.map((s, i) => <Row key={i} text={s} type="neutral" delay={i * 40} />)}
        </Block>
      </>);
      case "bias": return (<>
        <Block number="01" label="Inclusivity Score" accent={scoreColor(r.bias.inclusivityScore)} delay={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 32, padding: "8px 0" }}>
            <ScoreDisplay score={r.bias.inclusivityScore} />
            <div>
              <p style={{ fontSize: 9, letterSpacing: "0.2em", color: C.iceDim, fontFamily: C.mono, margin: "0 0 10px", textTransform: "uppercase" }}>Inclusivity Rating</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: scoreColor(r.bias.inclusivityScore), fontFamily: C.serif, margin: 0, fontStyle: "italic", letterSpacing: "-1px" }}>{scoreLabel(r.bias.inclusivityScore)}</p>
            </div>
          </div>
        </Block>
        <Block number="02" label="Flagged Phrases" accent={C.crimson} delay={80}>
          {r.bias.flaggedPhrases.length === 0
            ? <p style={{ fontSize: 13, color: C.sage, fontFamily: C.mono, margin: 0 }}>◆ No biased language detected</p>
            : r.bias.flaggedPhrases.map((p, i) => <Tag key={i} type="missing">"{p}"</Tag>)}
        </Block>
        <Block number="03" label="Improvements" accent={C.amber} delay={160}>
          {r.bias.improvements.map((s, i) => <Row key={i} text={s} type="neutral" delay={i * 40} />)}
        </Block>
      </>);
      case "keywords": return (<>
        <Block number="01" label="Strong Keywords" accent={C.sage} delay={0}>
          <div>{r.keywords.strong.map((k, i) => <Tag key={i} type="match">✓ {k}</Tag>)}</div>
        </Block>
        <Block number="02" label="Missing Keywords" accent={C.crimson} delay={80}>
          <div>{r.keywords.missing.map((k, i) => <Tag key={i} type="missing">✕ {k}</Tag>)}</div>
        </Block>
        <Block number="03" label="SEO Tips" accent={C.amber} delay={160}>
          {r.keywords.seoTips.map((s, i) => <Row key={i} text={s} type="neutral" delay={i * 40} />)}
        </Block>
      </>);
      case "salary": return (<>
        <Block number="01" label="Transparency" accent={r.salary.transparent ? C.sage : C.crimson} delay={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "8px 0" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: r.salary.transparent ? C.sageDim : C.crimsonTrace,
              border: `1px solid ${r.salary.transparent ? C.sageBorder : "rgba(255,45,45,0.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: r.salary.transparent ? C.sage : C.crimson,
            }}>{r.salary.transparent ? "✓" : "✕"}</div>
            <span style={{ fontSize: 18, fontWeight: 700, fontStyle: "italic", color: r.salary.transparent ? C.sage : C.crimson, fontFamily: C.serif }}>
              {r.salary.transparent ? "Salary Disclosed" : "No Salary Range"}
            </span>
          </div>
        </Block>
        <Block number="02" label="Observation" accent={C.amber} delay={80}><Row text={r.salary.observation} type="neutral" /></Block>
        <Block number="03" label="Recommendation" accent={C.iceDim} delay={160}><Row text={r.salary.recommendation} type="neutral" /></Block>
      </>);
      case "match": return r.resumeMatch ? (<>
        <Block number="01" label="Match Score" accent={scoreColor(r.resumeMatch.matchScore)} delay={0}>
          <div style={{ display: "flex", alignItems: "center", gap: 32, padding: "8px 0" }}>
            <ScoreDisplay score={r.resumeMatch.matchScore} />
            <p style={{ fontSize: 13, color: C.iceMid, fontFamily: C.mono, lineHeight: 1.8, margin: 0, maxWidth: 300 }}>{r.resumeMatch.verdict}</p>
          </div>
        </Block>
        <Block number="02" label="Strengths" accent={C.sage} delay={80}>{r.resumeMatch.strengths.map((s, i) => <Row key={i} text={s} type="match" delay={i * 40} />)}</Block>
        <Block number="03" label="Gaps" accent={C.crimson} delay={160}>{r.resumeMatch.gaps.map((s, i) => <Row key={i} text={s} type="missing" delay={i * 40} />)}</Block>
      </>) : null;
      default: return null;
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; }
        body { background: ${C.void}; }
        ::selection { background: ${C.crimsonGlow}; color: ${C.crimson}; }
        ::placeholder { color: ${C.iceDim}; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanLine { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes flicker  { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.6} 94%{opacity:1} }

        .fade  { animation: fadeUp 500ms ${EASE} both; }
        button { transition: all 160ms ease; cursor: pointer; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.void, color: C.iceOff, fontFamily: C.sans, position: "relative", overflow: "hidden" }}>

        {/* Background atmosphere */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          {/* Crimson orb top right */}
          <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,45,45,0.08) 0%, transparent 70%)" }}/>
          {/* Blue orb bottom left */}
          <div style={{ position: "absolute", bottom: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(30,60,120,0.12) 0%, transparent 70%)" }}/>
          {/* Subtle center glow */}
          <div style={{ position: "absolute", top: "30%", left: "35%", width: 700, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)" }}/>
          {/* Noise grain */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`, opacity: 0.5 }}/>
        </div>

        {/* Header */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(6,8,9,0.85)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 52px", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.crimson}, ${C.crimsonDim})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 20px ${C.crimsonGlow}`,
              animation: "flicker 8s ease-in-out infinite",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "white", fontFamily: C.serif, fontStyle: "italic" }}>JD</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ice, letterSpacing: "-0.02em", lineHeight: 1 }}>JD Analyzer</div>
              <div style={{ fontSize: 9, color: C.iceDim, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: C.mono, marginTop: 2 }}>by Divyah · HR Intelligence</div>
            </div>
          </div>

          {/* Status indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", border: `1px solid ${C.border}`, borderRadius: 20, background: C.glass }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.sage, animation: "pulse 2s ease-in-out infinite", boxShadow: `0 0 8px ${C.sage}` }}/>
            <span style={{ fontSize: 9, color: C.iceDim, fontFamily: C.mono, letterSpacing: "0.12em" }}>SYSTEM ACTIVE</span>
          </div>

          {step === "results" && (
            <button onClick={() => { setStep("input"); setResult(null); setError(""); }}
              style={{
                background: C.glass, border: `1px solid ${C.borderMid}`,
                borderRadius: 6, color: C.iceDim,
                fontSize: 9, padding: "8px 18px",
                fontFamily: C.mono, letterSpacing: "0.14em", textTransform: "uppercase",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.crimson; e.currentTarget.style.color = C.crimson; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.color = C.iceDim; }}
            >← New Analysis</button>
          )}
        </header>

        {/* ══ INPUT ══ */}
        {step === "input" && (
          <div className="fade" style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "72px 40px 100px" }}>

            {/* Hero */}
            <div style={{ marginBottom: 56 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ height: 1, width: 36, background: C.crimson, boxShadow: `0 0 8px ${C.crimson}` }}/>
                <span style={{ fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase", color: C.crimson, fontFamily: C.mono, fontWeight: 700 }}>Intelligence · HR Analysis</span>
              </div>
              <h1 style={{ fontSize: 72, fontWeight: 700, fontStyle: "italic", color: C.ice, margin: "0 0 16px", lineHeight: 0.95, letterSpacing: "-3px", fontFamily: C.serif }}>
                Decode any<br/>
                <span style={{ color: C.crimson, textShadow: `0 0 40px ${C.crimsonGlow}` }}>job description.</span>
              </h1>
              <p style={{ fontSize: 14, color: C.iceDim, lineHeight: 1.8, fontFamily: C.mono, maxWidth: 460, marginTop: 20 }}>
                Surface bias, keyword gaps, and missing sections — then see exactly how your resume stacks up.
              </p>
            </div>

            {/* JD Input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.iceDim, fontFamily: C.mono, fontWeight: 700 }}>
                  Job Description <span style={{ color: C.crimson }}>*</span>
                </label>
                <label style={{
                  fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: jdFileName ? C.sage : C.iceDim,
                  fontFamily: C.mono, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${jdFileName ? C.sageBorder : C.border}`,
                  padding: "6px 14px", borderRadius: 4,
                  background: jdFileName ? C.sageDim : C.glass,
                  transition: "all 150ms ease",
                }}>
                  {jdFileName ? `✓ ${jdFileName.slice(0, 22)}` : "↑ Upload PDF"}
                  <input type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={e => e.target.files[0] && handleJdFile(e.target.files[0])}/>
                </label>
              </div>
              <div style={{
                border: `1px solid ${C.borderMid}`,
                borderRadius: 12, overflow: "hidden",
                background: C.glass,
                backdropFilter: "blur(8px)",
                transition: `border-color 150ms ease, box-shadow 150ms ease`,
                position: "relative",
              }}
              onFocus={() => {}} onBlur={() => {}}>
                <ScanningTextarea
                  value={jd}
                  onChange={e => { setJd(e.target.value); setJdFileName(""); }}
                  placeholder="Paste the full job description here..."
                  minHeight={220}
                />
              </div>
            </div>

            {/* Resume Input */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: C.iceDim, fontFamily: C.mono, fontWeight: 700 }}>
                  Resume <span style={{ color: C.iceFaint, fontWeight: 400 }}>— optional</span>
                </label>
                <label style={{
                  fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                  color: resumeFileName ? C.sage : C.iceDim,
                  fontFamily: C.mono, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${resumeFileName ? C.sageBorder : C.border}`,
                  padding: "6px 14px", borderRadius: 4,
                  background: resumeFileName ? C.sageDim : C.glass,
                }}>
                  {resumeFileName ? `✓ ${resumeFileName.slice(0, 22)}` : "↑ Upload PDF"}
                  <input type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={e => e.target.files[0] && handleResumeFile(e.target.files[0])}/>
                </label>
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.glass, backdropFilter: "blur(8px)" }}>
                <ScanningTextarea
                  value={resume}
                  onChange={e => { setResume(e.target.value); setResumeFileName(""); }}
                  placeholder="Paste your resume — enables match scoring..."
                  minHeight={140}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: C.crimsonTrace, border: "1px solid rgba(255,45,45,0.2)", borderRadius: 8, padding: "12px 18px", fontSize: 11, color: C.crimson, fontFamily: C.mono, marginBottom: 20 }}>{error}</div>
            )}

            {/* CTA */}
            <button onClick={analyze} disabled={!jd.trim() || loading}
              style={{
                background: !jd.trim() || loading ? C.glassMid : `linear-gradient(135deg, ${C.crimson}, ${C.crimsonDim})`,
                color: !jd.trim() || loading ? C.iceDim : "white",
                border: `1px solid ${!jd.trim() || loading ? C.border : "transparent"}`,
                borderRadius: 8, padding: "15px 44px",
                fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
                fontFamily: C.mono, fontWeight: 700,
                cursor: !jd.trim() || loading ? "not-allowed" : "pointer",
                boxShadow: !jd.trim() || loading ? "none" : `0 0 30px ${C.crimsonGlow}, 0 4px 16px rgba(255,45,45,0.3)`,
                display: "flex", alignItems: "center", gap: 10,
              }}
              onMouseDown={e => { if (jd.trim() && !loading) e.currentTarget.style.transform = "scale(0.97)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                  Analysing…
                </>
              ) : "Run Analysis →"}
            </button>
          </div>
        )}

        {/* ══ RESULTS ══ */}
        {step === "results" && result && (
          <div className="fade" style={{ position: "relative", zIndex: 1 }}>

            {/* Score hero */}
            <div style={{ padding: "52px 40px 40px", maxWidth: 900, margin: "0 auto" }}>
              <div style={{
                border: `1px solid ${C.borderMid}`,
                borderRadius: 16, overflow: "hidden",
                background: C.glass,
                backdropFilter: "blur(16px)",
                position: "relative",
              }}>
                {/* Top crimson rule */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${scoreColor(result.overallScore)}, transparent)`, boxShadow: `0 0 20px ${scoreGlow(result.overallScore)}` }}/>
                {/* Ghost score */}
                <div style={{ position: "absolute", right: 32, top: -20, fontSize: 200, fontWeight: 700, fontStyle: "italic", fontFamily: C.serif, color: "rgba(255,255,255,0.02)", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{result.overallScore}</div>

                <div style={{ display: "flex", alignItems: "center", gap: 44, padding: "40px 48px" }}>
                  <ScoreDisplay score={result.overallScore} />
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.iceDim, fontFamily: C.mono, margin: "0 0 12px" }}>Overall JD Score</p>
                    <p style={{ fontSize: 48, fontWeight: 700, fontStyle: "italic", color: scoreColor(result.overallScore), fontFamily: C.serif, margin: "0 0 10px", letterSpacing: "-2px", textShadow: `0 0 30px ${scoreGlow(result.overallScore)}` }}>
                      {scoreLabel(result.overallScore)}
                    </p>
                    <p style={{ fontSize: 13, color: C.iceMid, fontFamily: C.mono, margin: "0 0 24px", lineHeight: 1.7 }}>{scoreVerdict(result.overallScore)}</p>
                    <div style={{ display: "flex", gap: 20 }}>
                      {[["< 50", "Weak", C.crimson], ["50–74", "Moderate", C.amber], ["75+", "Strong", C.sage]].map(([range, lbl, col]) => (
                        <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, boxShadow: `0 0 8px ${col}` }}/>
                          <span style={{ fontSize: 10, color: C.iceDim, fontFamily: C.mono }}>{range} · {lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{
              position: "sticky", top: 64, zIndex: 100,
              background: "rgba(6,8,9,0.9)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderBottom: `1px solid ${C.border}`,
              display: "flex", padding: "0 40px", overflowX: "auto",
              maxWidth: "none",
            }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: "16px 22px", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                  background: "transparent", color: activeTab === t.id ? C.ice : C.iceDim,
                  border: "none", borderBottom: `2px solid ${activeTab === t.id ? C.crimson : "transparent"}`,
                  fontFamily: C.mono, fontWeight: activeTab === t.id ? 700 : 400,
                  whiteSpace: "nowrap", marginBottom: -1,
                }}>{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div className="fade" key={activeTab} style={{ maxWidth: 900, margin: "0 auto", padding: "32px 40px 100px" }}>
              {renderTab()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}