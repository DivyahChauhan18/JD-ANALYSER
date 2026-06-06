import { useState, useEffect } from "react";

/* ── Tokens ── */
const C = {
  // Backgrounds
  bg1:          "#F5EFE8",
  bg2:          "#EDE4D8",
  // Glass
  glass:        "rgba(255,255,255,0.55)",
  glassBorder:  "rgba(255,255,255,0.75)",
  glassDeep:    "rgba(255,255,255,0.35)",
  // Ink
  ink:          "#1C1814",
  inkMid:       "#3A3228",
  inkLight:     "#6A6050",
  inkMute:      "#A09080",
  // Crimson accent
  crimson:      "#8B1A1A",
  crimsonLight: "#B02424",
  crimsonGlow:  "rgba(139,26,26,0.15)",
  crimsonPale:  "rgba(139,26,26,0.08)",
  // Navy
  navy:         "#1A2F50",
  navyGlow:     "rgba(26,47,80,0.12)",
  navyPale:     "rgba(26,47,80,0.07)",
  // Status
  sage:         "#1A4A2A",
  sagePale:     "rgba(26,74,42,0.1)",
  sageBorder:   "rgba(26,74,42,0.3)",
  amber:        "#7A4A00",
  amberPale:    "rgba(122,74,0,0.1)",
  amberBorder:  "rgba(122,74,0,0.3)",
  // Fonts
  serif:        "'Playfair Display', Georgia, serif",
  sans:         "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:         "'DM Mono', monospace",
};

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

/* ── Helpers ── */
function scoreColor(s)  { return s >= 75 ? C.sage   : s >= 50 ? C.amber   : C.crimson; }
function scorePale(s)   { return s >= 75 ? C.sagePale : s >= 50 ? C.amberPale : C.crimsonPale; }
function scoreLabel(s)  { return s >= 75 ? "Strong"  : s >= 50 ? "Moderate" : "Weak"; }
function scoreVerdict(s){ return s >= 75 ? "This JD is well-crafted and complete." : s >= 50 ? "This JD has meaningful room for improvement." : "This JD needs significant revision before posting."; }

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
          const r2 = new FileReader();
          r2.onload = te => resolve(te.target.result || "");
          r2.readAsText(file);
        }
      } catch {
        const r2 = new FileReader();
        r2.onload = te => resolve(te.target.result || "");
        r2.readAsText(file);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ── Glass card ── */
function GlassCard({ children, style = {}, accent }) {
  return (
    <div style={{
      background: C.glass,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${C.glassBorder}`,
      borderRadius: 20,
      boxShadow: `0 8px 32px rgba(28,24,20,0.08), 0 2px 8px rgba(28,24,20,0.04), inset 0 1px 0 rgba(255,255,255,0.8)`,
      position: "relative",
      overflow: "hidden",
      ...style,
    }}>
      {accent && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${accent}, transparent)`, borderRadius:"20px 20px 0 0" }}/>}
      {children}
    </div>
  );
}

/* ── Score arc ── */
function ScoreArc({ score, size = 130 }) {
  const col = scoreColor(score);
  const cx = size/2, cy = size/2, R = size*0.36;
  const sweep = 240, startDeg = 150;
  const toRad = d => d * Math.PI / 180;
  const pt = (r,deg) => ({ x: cx+r*Math.cos(toRad(deg-90)), y: cy+r*Math.sin(toRad(deg-90)) });
  const arc = (r,from,to) => { const s=pt(r,from),e=pt(r,to); return `M${s.x},${s.y} A${r},${r} 0 ${to-from>180?1:0} 1 ${e.x},${e.y}`; };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="arcGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={R+8} fill="rgba(255,255,255,0.4)" stroke="rgba(255,255,255,0.7)" strokeWidth={0.5}/>
      {/* Track */}
      <path d={arc(R,startDeg,startDeg+sweep)} fill="none" stroke="rgba(28,24,20,0.08)" strokeWidth={6} strokeLinecap="round"/>
      {/* Value */}
      <path d={arc(R,startDeg,startDeg+sweep*(score/100))} fill="none" stroke={col} strokeWidth={6} strokeLinecap="round" filter="url(#arcGlow)" opacity={0.9}/>
      {/* Score text */}
      <text x={cx} y={cy-4} textAnchor="middle" fill={col} style={{ fontSize:size*0.24, fontWeight:700, fontFamily:C.serif }}>{score}</text>
      <text x={cx} y={cy+14} textAnchor="middle" fill={C.inkMute} style={{ fontSize:size*0.08, fontFamily:C.mono, letterSpacing:"0.12em" }}>/ 100</text>
    </svg>
  );
}

/* ── Chip ── */
function Chip({ children, type }) {
  const map = {
    match:   { bg:"rgba(26,74,42,0.12)",   color:C.sage,   border:"rgba(26,74,42,0.25)"   },
    missing: { bg:"rgba(139,26,26,0.1)",   color:C.crimson, border:"rgba(139,26,26,0.22)" },
    neutral: { bg:"rgba(28,24,20,0.06)",   color:C.inkMid,  border:"rgba(28,24,20,0.12)"  },
  };
  const s = map[type] || map.neutral;
  return (
    <span style={{
      display:"inline-block",
      background:s.bg, color:s.color, border:`1px solid ${s.border}`,
      borderRadius:20, fontSize:11,
      padding:"5px 14px", margin:"4px 4px 4px 0",
      fontFamily:C.mono, letterSpacing:"0.03em", fontWeight:500,
      backdropFilter:"blur(8px)",
    }}>{children}</span>
  );
}

/* ── Row ── */
function Row({ text, type }) {
  const dot   = type==="match" ? C.sage : type==="missing" ? C.crimson : "rgba(28,24,20,0.25)";
  const color = type==="match" ? C.sage : type==="missing" ? C.crimson : C.inkMid;
  return (
    <div style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:"1px solid rgba(28,24,20,0.07)" }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:dot, marginTop:7, flexShrink:0, boxShadow:`0 0 6px ${dot}60` }}/>
      <p style={{ fontSize:13, lineHeight:1.75, color, margin:0, fontFamily:C.mono }}>{text}</p>
    </div>
  );
}

/* ── Section block ── */
function Block({ number, label, accent, children }) {
  return (
    <GlassCard style={{ marginBottom:12 }} accent={accent}>
      <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 24px", borderBottom:"1px solid rgba(255,255,255,0.5)" }}>
        <span style={{ fontSize:9, color:C.inkMute, fontFamily:C.mono, minWidth:22 }}>{number}</span>
        <span style={{ fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:accent||C.ink, fontFamily:C.mono, fontWeight:700 }}>{label}</span>
      </div>
      <div style={{ padding:"16px 24px 20px" }}>{children}</div>
    </GlassCard>
  );
}

/* ── Upload button ── */
function UploadBtn({ label, fileName, onChange }) {
  return (
    <label style={{
      display:"inline-flex", alignItems:"center", gap:6,
      fontSize:9, letterSpacing:"0.12em", textTransform:"uppercase",
      color: fileName ? C.sage : C.navy,
      fontFamily:C.mono, fontWeight:700, cursor:"pointer",
      border:`1px solid ${fileName ? "rgba(26,74,42,0.3)" : "rgba(26,47,80,0.25)"}`,
      padding:"7px 16px", borderRadius:20,
      background: fileName ? "rgba(26,74,42,0.1)" : "rgba(26,47,80,0.08)",
      backdropFilter:"blur(8px)",
      transition:`all 150ms ease`,
    }}>
      {fileName ? `✓ ${fileName.slice(0,22)}` : `↑ ${label}`}
      <input type="file" accept=".pdf,.txt" style={{ display:"none" }} onChange={onChange}/>
    </label>
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
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => { window.pdfjsLib = window["pdfjs-dist/build/pdf"]; };
    document.head.appendChild(script);
  }, []);

  async function handleJdFile(file) {
    if (file.type==="application/pdf") { const t=await extractTextFromPDF(file); if(t){setJd(t);setJdFileName(file.name);}else setError("Could not extract text from PDF."); }
    else { const t=await file.text(); setJd(t); setJdFileName(file.name); }
  }
  async function handleResumeFile(file) {
    if (file.type==="application/pdf") { const t=await extractTextFromPDF(file); if(t){setResume(t);setResumeFileName(file.name);}else setError("Could not extract text from PDF."); }
    else { const t=await file.text(); setResume(t); setResumeFileName(file.name); }
  }

  async function analyze() {
    if (!jd.trim()) return;
    setLoading(true); setResult(null); setError("");
    const hasResume = resume.trim().length > 0;
    const prompt = `You are an expert HR analyst. Analyze the Job Description${hasResume?" and Resume":""} below.

JOB DESCRIPTION:
${jd}
${hasResume?`\nRESUME:\n${resume}`:""}

Return ONLY raw JSON (no markdown, no backticks). Use this exact structure:
{
  "overallScore": 72,
  "structure": {
    "missingSections": ["Benefits & perks","Reporting structure"],
    "presentSections": ["Role overview","Responsibilities"],
    "suggestions": ["Add a clear team size context"]
  },
  "bias": {
    "flaggedPhrases": ["rockstar","young and dynamic"],
    "inclusivityScore": 65,
    "improvements": ["Replace 'rockstar' with 'high-performing'"]
  },
  "keywords": {
    "strong": ["talent acquisition","stakeholder management"],
    "missing": ["ATS","onboarding","HRBP"],
    "seoTips": ["Add role level in title e.g. Senior/Junior"]
  },
  "salary": {
    "transparent": false,
    "observation": "No salary range is mentioned.",
    "recommendation": "Include a salary band to increase application rates."
  }${hasResume?`,
  "resumeMatch": {
    "matchScore": 58,
    "strengths": ["Strong event coordination experience"],
    "gaps": ["No direct ATS experience"],
    "verdict": "Candidate shows transferable skills but lacks direct HR operations experience."
  }`:""}
}`;

    try {
      const res = await fetch("/api/v1/messages", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":process.env.REACT_APP_API_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:1500, messages:[{role:"user",content:prompt}] }),
      });
      if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return; }
      const data = await res.json();
      const raw = data.content?.map(i=>i.text||"").join("")||"";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) { setError("Failed to parse response."); setLoading(false); return; }
      setResult(JSON.parse(match[0]));
      setActiveTab("structure");
      setStep("results");
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  const tabs = [
    {id:"structure",label:"Structure"},
    {id:"bias",label:"Bias Check"},
    {id:"keywords",label:"Keywords"},
    {id:"salary",label:"Salary"},
    ...(result?.resumeMatch?[{id:"match",label:"Resume Match"}]:[]),
  ];

  function renderTab() {
    if (!result) return null;
    const r = result;
    switch(activeTab) {
      case "structure": return (<>
        <Block number="01" label="Missing Sections" accent={C.crimson}>
          {r.structure.missingSections.length===0?<p style={{fontSize:13,color:C.sage,fontFamily:C.mono,margin:0}}>✓ All key sections present</p>:r.structure.missingSections.map((s,i)=><Row key={i} text={s} type="missing"/>)}
        </Block>
        <Block number="02" label="Sections Present" accent={C.sage}>
          {r.structure.presentSections.map((s,i)=><Row key={i} text={s} type="match"/>)}
        </Block>
        <Block number="03" label="Suggestions" accent={C.amber}>
          {r.structure.suggestions.map((s,i)=><Row key={i} text={s} type="neutral"/>)}
        </Block>
      </>);
      case "bias": return (<>
        <Block number="01" label="Inclusivity Score" accent={scoreColor(r.bias.inclusivityScore)}>
          <div style={{display:"flex",alignItems:"center",gap:28}}>
            <ScoreArc score={r.bias.inclusivityScore} size={110}/>
            <div>
              <p style={{fontSize:9,letterSpacing:"0.16em",color:C.inkMute,fontFamily:C.mono,margin:"0 0 8px",textTransform:"uppercase"}}>Inclusivity Rating</p>
              <p style={{fontSize:24,fontWeight:700,fontStyle:"italic",color:scoreColor(r.bias.inclusivityScore),fontFamily:C.serif,margin:0}}>{scoreLabel(r.bias.inclusivityScore)}</p>
            </div>
          </div>
        </Block>
        <Block number="02" label="Flagged Phrases" accent={C.crimson}>
          {r.bias.flaggedPhrases.length===0?<p style={{fontSize:13,color:C.sage,fontFamily:C.mono,margin:0}}>✓ No biased language detected</p>:r.bias.flaggedPhrases.map((p,i)=><Chip key={i} type="missing">"{p}"</Chip>)}
        </Block>
        <Block number="03" label="Improvements" accent={C.amber}>
          {r.bias.improvements.map((s,i)=><Row key={i} text={s} type="neutral"/>)}
        </Block>
      </>);
      case "keywords": return (<>
        <Block number="01" label="Strong Keywords" accent={C.sage}>
          <div>{r.keywords.strong.map((k,i)=><Chip key={i} type="match">✓ {k}</Chip>)}</div>
        </Block>
        <Block number="02" label="Missing Keywords" accent={C.crimson}>
          <div>{r.keywords.missing.map((k,i)=><Chip key={i} type="missing">✕ {k}</Chip>)}</div>
        </Block>
        <Block number="03" label="SEO Tips" accent={C.amber}>
          {r.keywords.seoTips.map((s,i)=><Row key={i} text={s} type="neutral"/>)}
        </Block>
      </>);
      case "salary": return (<>
        <Block number="01" label="Transparency Status" accent={r.salary.transparent?C.sage:C.crimson}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:r.salary.transparent?"rgba(26,74,42,0.12)":"rgba(139,26,26,0.1)",border:`2px solid ${r.salary.transparent?"rgba(26,74,42,0.3)":"rgba(139,26,26,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:r.salary.transparent?C.sage:C.crimson}}>
              {r.salary.transparent?"✓":"✕"}
            </div>
            <span style={{fontSize:17,fontWeight:700,fontStyle:"italic",color:r.salary.transparent?C.sage:C.crimson,fontFamily:C.serif}}>
              {r.salary.transparent?"Salary Disclosed":"No Salary Range"}
            </span>
          </div>
        </Block>
        <Block number="02" label="Observation" accent={C.amber}><Row text={r.salary.observation} type="neutral"/></Block>
        <Block number="03" label="Recommendation" accent={C.navy}><Row text={r.salary.recommendation} type="neutral"/></Block>
      </>);
      case "match": return r.resumeMatch?(<>
        <Block number="01" label="Match Score" accent={scoreColor(r.resumeMatch.matchScore)}>
          <div style={{display:"flex",alignItems:"center",gap:28}}>
            <ScoreArc score={r.resumeMatch.matchScore} size={110}/>
            <p style={{fontSize:13,color:C.inkMid,fontFamily:C.mono,lineHeight:1.8,margin:0,maxWidth:320}}>{r.resumeMatch.verdict}</p>
          </div>
        </Block>
        <Block number="02" label="Resume Strengths" accent={C.sage}>{r.resumeMatch.strengths.map((s,i)=><Row key={i} text={s} type="match"/>)}</Block>
        <Block number="03" label="Gaps to Address" accent={C.crimson}>{r.resumeMatch.gaps.map((s,i)=><Row key={i} text={s} type="missing"/>)}</Block>
      </>):null;
      default: return null;
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { -webkit-font-smoothing:antialiased; }
        body { margin:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
        .fade { animation: fadeUp 400ms ${EASE} both; }
        textarea { transition: all 150ms ease; }
        textarea:focus { outline:none; }
        button { transition: all 150ms ease; }
        button:hover { opacity:0.88; }
      `}</style>

      {/* Full page gradient background */}
      <div style={{
        minHeight:"100vh",
        background:`radial-gradient(ellipse at 20% 20%, #F0E6D8 0%, #EDE0D0 40%, #E8D8C4 100%)`,
        fontFamily:C.sans, color:C.ink,
        position:"relative",
      }}>
        {/* Ambient orbs */}
        <div style={{ position:"fixed", top:"-10%", right:"5%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(139,26,26,0.12) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"fixed", bottom:"10%", left:"-5%", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle, rgba(26,47,80,0.1) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"fixed", top:"40%", left:"30%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

        {/* Header */}
        <header style={{
          position:"sticky", top:0, zIndex:200,
          background:"rgba(240,230,216,0.7)",
          backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
          borderBottom:"1px solid rgba(255,255,255,0.6)",
          padding:"0 52px", height:68,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{
              width:38, height:38, borderRadius:12,
              background:`linear-gradient(135deg, ${C.crimson}, #6B1010)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 4px 12px rgba(139,26,26,0.35)`,
            }}>
              <span style={{ fontSize:13, fontWeight:700, color:"white", fontFamily:C.serif, fontStyle:"italic" }}>JD</span>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.ink, letterSpacing:"-0.02em", lineHeight:1 }}>JD Analyzer</div>
              <div style={{ fontSize:9, color:C.inkMute, letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:C.mono, marginTop:2 }}>by Divyah · HR Intelligence</div>
            </div>
          </div>
          {step==="results" && (
            <button onClick={()=>{setStep("input");setResult(null);setError("");}}
              style={{
                background:"rgba(255,255,255,0.5)", backdropFilter:"blur(8px)",
                border:"1px solid rgba(255,255,255,0.7)", borderRadius:20,
                color:C.inkLight, fontSize:9, padding:"8px 20px",
                cursor:"pointer", fontFamily:C.mono, letterSpacing:"0.14em", textTransform:"uppercase",
                boxShadow:"0 2px 8px rgba(28,24,20,0.08)",
              }}>← New Analysis</button>
          )}
        </header>

        {/* ── INPUT ── */}
        {step==="input" && (
          <div className="fade" style={{ position:"relative", zIndex:1 }}>
            {/* Hero */}
            <div style={{ padding:"72px 64px 56px", maxWidth:800 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ height:1, width:36, background:C.crimson }}/>
                <span style={{ fontSize:9, letterSpacing:"0.22em", textTransform:"uppercase", color:C.crimson, fontFamily:C.mono, fontWeight:700 }}>AI-Powered HR Intelligence</span>
              </div>
              <h1 style={{ fontSize:64, fontWeight:700, fontStyle:"italic", color:C.ink, margin:"0 0 16px", lineHeight:1.0, letterSpacing:"-2px", fontFamily:C.serif }}>
                Decode any<br/><span style={{ color:C.crimson, WebkitTextStroke:`1px ${C.crimson}` }}>job description.</span>
              </h1>
              <p style={{ fontSize:15, color:C.inkLight, lineHeight:1.8, fontFamily:C.mono, maxWidth:480 }}>
                Surface bias, keyword gaps, and missing sections — then see exactly how your resume stacks up.
              </p>
            </div>

            {/* Form */}
            <div style={{ padding:"0 64px 100px", maxWidth:900 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

                {/* JD card */}
                <GlassCard accent={C.crimson}>
                  <div style={{ padding:"16px 24px 14px", borderBottom:"1px solid rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <label style={{ fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:C.ink, fontFamily:C.mono, fontWeight:700 }}>
                      Job Description <span style={{ color:C.crimson }}>*</span>
                    </label>
                    <UploadBtn label="Upload PDF / TXT" fileName={jdFileName} onChange={e=>e.target.files[0]&&handleJdFile(e.target.files[0])}/>
                  </div>
                  <textarea
                    style={{ width:"100%", background:"transparent", border:"none", color:C.ink, fontFamily:C.mono, fontSize:12, padding:"20px 24px", resize:"vertical", lineHeight:1.8, minHeight:200 }}
                    placeholder="Paste the full job description here, or upload a PDF above..."
                    value={jd}
                    onChange={e=>{setJd(e.target.value);setJdFileName("");}}
                  />
                </GlassCard>

                {/* Resume card */}
                <GlassCard accent={C.navy}>
                  <div style={{ padding:"16px 24px 14px", borderBottom:"1px solid rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <label style={{ fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:C.ink, fontFamily:C.mono, fontWeight:700 }}>
                      Resume <span style={{ color:C.inkMute, fontWeight:400, letterSpacing:"0.08em" }}>— optional</span>
                    </label>
                    <UploadBtn label="Upload PDF / TXT" fileName={resumeFileName} onChange={e=>e.target.files[0]&&handleResumeFile(e.target.files[0])}/>
                  </div>
                  <textarea
                    style={{ width:"100%", background:"transparent", border:"none", color:C.ink, fontFamily:C.mono, fontSize:12, padding:"20px 24px", resize:"vertical", lineHeight:1.8, minHeight:140 }}
                    placeholder="Paste your resume, or upload above — enables match scoring..."
                    value={resume}
                    onChange={e=>{setResume(e.target.value);setResumeFileName("");}}
                  />
                </GlassCard>

                {error && (
                  <div style={{ background:"rgba(139,26,26,0.1)", border:"1px solid rgba(139,26,26,0.2)", borderRadius:12, padding:"12px 18px", fontSize:11, color:C.crimson, fontFamily:C.mono, backdropFilter:"blur(8px)" }}>{error}</div>
                )}

                <button onClick={analyze} disabled={!jd.trim()||loading}
                  style={{
                    background: !jd.trim()||loading ? "rgba(28,24,20,0.15)" : `linear-gradient(135deg, ${C.crimson}, #6B1010)`,
                    color: !jd.trim()||loading ? C.inkMute : "white",
                    border:"none", borderRadius:14,
                    padding:"16px 44px", fontSize:11,
                    letterSpacing:"0.18em", textTransform:"uppercase",
                    fontFamily:C.mono, cursor: !jd.trim()||loading ? "not-allowed" : "pointer",
                    fontWeight:700, alignSelf:"flex-start",
                    boxShadow: !jd.trim()||loading ? "none" : `0 8px 24px rgba(139,26,26,0.4)`,
                    transition:`all 200ms ${EASE}`,
                  }}
                  onMouseDown={e=>{if(jd.trim()&&!loading)e.currentTarget.style.transform="scale(0.97)";}}
                  onMouseUp={e=>{e.currentTarget.style.transform="scale(1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
                >
                  {loading?"Analysing…":"Run Analysis →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step==="results" && result && (
          <div className="fade" style={{ position:"relative", zIndex:1 }}>

            {/* Score hero */}
            <div style={{ padding:"52px 64px 48px" }}>
              <GlassCard accent={scoreColor(result.overallScore)} style={{ padding:"40px 48px", overflow:"visible" }}>
                {/* Ghost score */}
                <div style={{ position:"absolute", right:32, top:-10, fontSize:180, fontWeight:700, fontStyle:"italic", fontFamily:C.serif, color:"rgba(28,24,20,0.04)", lineHeight:1, userSelect:"none", pointerEvents:"none" }}>
                  {result.overallScore}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:44 }}>
                  <ScoreArc score={result.overallScore} size={150}/>
                  <div>
                    <p style={{ fontSize:9, letterSpacing:"0.22em", textTransform:"uppercase", color:C.inkMute, fontFamily:C.mono, margin:"0 0 12px" }}>Overall JD Score</p>
                    <p style={{ fontSize:42, fontWeight:700, fontStyle:"italic", color:scoreColor(result.overallScore), fontFamily:C.serif, margin:"0 0 10px", letterSpacing:"-1px" }}>
                      {scoreLabel(result.overallScore)}
                    </p>
                    <p style={{ fontSize:14, color:C.inkMid, fontFamily:C.mono, margin:"0 0 20px", lineHeight:1.7 }}>{scoreVerdict(result.overallScore)}</p>
                    <div style={{ display:"flex", gap:16 }}>
                      {[["< 50","Weak",C.crimson],["50–74","Moderate",C.amber],["75+","Strong",C.sage]].map(([range,lbl,col])=>(
                        <div key={lbl} style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <div style={{ width:7, height:7, borderRadius:"50%", background:col, boxShadow:`0 0 6px ${col}80` }}/>
                          <span style={{ fontSize:10, color:C.inkLight, fontFamily:C.mono }}>{range} · {lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Tabs */}
            <div style={{
              position:"sticky", top:68, zIndex:100,
              background:"rgba(240,230,216,0.8)",
              backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
              borderBottom:"1px solid rgba(255,255,255,0.6)",
              display:"flex", padding:"0 64px", overflowX:"auto",
            }}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
                  padding:"16px 22px", fontSize:9, letterSpacing:"0.18em", textTransform:"uppercase",
                  cursor:"pointer", background:"transparent",
                  color:activeTab===t.id?C.ink:C.inkMute,
                  border:"none", borderBottom:`2px solid ${activeTab===t.id?C.crimson:"transparent"}`,
                  fontFamily:C.mono, fontWeight:activeTab===t.id?700:400,
                  whiteSpace:"nowrap", marginBottom:-1,
                }}>{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div className="fade" key={activeTab} style={{ maxWidth:860, margin:"0 auto", padding:"32px 64px 100px" }}>
              {renderTab()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}