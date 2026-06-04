import { useState } from "react";

const C = {
  bg: "#efefed",
  surface: "#ffffff",
  topbar: "#111111",
  border: "#d8d8d4",
  borderStrong: "#a0a09c",
  text: "#111111",
  textSub: "#444440",
  muted: "#888884",
  gold: "#b8860b",
  goldBg: "#fdf8ec",
  goldBorder: "#e0c870",
  goldStrong: "#96700a",
  success: "#1a5c2a",
  successBg: "#edf7f0",
  successBorder: "#a8d4b4",
  danger: "#7a1010",
  dangerBg: "#f8eeee",
  dangerBorder: "#d4a8a8",
  warn: "#5a4410",
  warnBg: "#f8f3e8",
  warnBorder: "#d4c080",
  font: "'Instrument Serif', Georgia, serif",
  mono: "'DM Mono', monospace",
};

function scoreColor(s) { return s >= 75 ? C.success : s >= 50 ? C.warn : C.danger; }
function scoreBg(s) { return s >= 75 ? C.successBg : s >= 50 ? C.warnBg : C.dangerBg; }
function scoreLabel(s) { return s >= 75 ? "Strong" : s >= 50 ? "Moderate" : "Weak"; }

function Chip({ children, type }) {
  const map = {
    match: { bg: C.successBg, color: C.success, border: C.successBorder },
    missing: { bg: C.dangerBg, color: C.danger, border: C.dangerBorder },
    neutral: { bg: "#f0f0ee", color: C.textSub, border: C.border },
  };
  const s = map[type] || map.neutral;
  return (
    <span style={{ display: "inline-block", background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 2, fontSize: 11, padding: "4px 12px", margin: "4px 4px 4px 0", fontFamily: C.mono, letterSpacing: "0.03em", fontWeight: 500 }}>
      {children}
    </span>
  );
}

function Row({ text, type }) {
  const dot = type === "match" ? C.success : type === "missing" ? C.danger : C.borderStrong;
  const color = type === "match" ? C.success : type === "missing" ? C.danger : C.textSub;
  return (
    <div style={{ display: "flex", gap: 14, padding: "11px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot, marginTop: 8, flexShrink: 0 }} />
      <p style={{ fontSize: 13, lineHeight: 1.7, color: color, margin: 0, fontFamily: C.mono }}>{text}</p>
    </div>
  );
}

function Block({ number, label, accent, children }) {
  return (
    <div style={{ marginBottom: 0 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20, padding: "24px 32px", background: C.surface, borderBottom: `3px solid ${accent || C.text}` }}>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono, marginTop: 2, minWidth: 20 }}>{number}</span>
        <span style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: accent || C.text, fontFamily: C.mono, fontWeight: 700 }}>{label}</span>
      </div>
      {/* Section content */}
      <div style={{ padding: "20px 32px 24px", background: C.surface, borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
        {children}
      </div>
    </div>
  );
}

export default function JDAnalyzer() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("structure");
  const [error, setError] = useState("");
  const [step, setStep] = useState("input");

  async function analyze() {
    if (!jd.trim()) return;
    setLoading(true); setResult(null); setError("");
    const hasResume = resume.trim().length > 0;
    const prompt = `You are an expert HR analyst. Analyze the Job Description${hasResume ? " and Resume" : ""} below.

JOB DESCRIPTION:
${jd}
${hasResume ? `\nRESUME:\n${resume}` : ""}

Return ONLY raw JSON (no markdown, no backticks). Use this exact structure:
{
  "overallScore": 72,
  "structure": {
    "missingSections": ["Benefits & perks", "Reporting structure"],
    "presentSections": ["Role overview", "Responsibilities"],
    "suggestions": ["Add a clear team size context"]
  },
  "bias": {
    "flaggedPhrases": ["rockstar", "young and dynamic"],
    "inclusivityScore": 65,
    "improvements": ["Replace 'rockstar' with 'high-performing'"]
  },
  "keywords": {
    "strong": ["talent acquisition", "stakeholder management"],
    "missing": ["ATS", "onboarding", "HRBP"],
    "seoTips": ["Add role level in title e.g. Senior/Junior"]
  },
  "salary": {
    "transparent": false,
    "observation": "No salary range is mentioned.",
    "recommendation": "Include a salary band to increase application rates."
  }${hasResume ? `,
  "resumeMatch": {
    "matchScore": 58,
    "strengths": ["Strong event coordination experience"],
    "gaps": ["No direct ATS experience"],
    "verdict": "Candidate shows transferable skills but lacks direct HR operations experience."
  }` : ""}
}`;

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
    { id: "bias", label: "Bias" },
    { id: "keywords", label: "Keywords" },
    { id: "salary", label: "Salary" },
    ...(result?.resumeMatch ? [{ id: "match", label: "Match" }] : []),
  ];

  function renderTab() {
    if (!result) return null;
    const r = result;
    switch (activeTab) {
      case "structure": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Block number="01" label="Missing Sections" accent={C.danger}>
            {r.structure.missingSections.length === 0
              ? <p style={{ fontSize: 13, color: C.success, fontFamily: C.mono, margin: 0 }}>✓ All key sections present</p>
              : r.structure.missingSections.map((s, i) => <Row key={i} text={s} type="missing" />)}
          </Block>
          <Block number="02" label="Sections Present" accent={C.success}>
            {r.structure.presentSections.map((s, i) => <Row key={i} text={s} type="match" />)}
          </Block>
          <Block number="03" label="Suggestions" accent={C.gold}>
            {r.structure.suggestions.map((s, i) => <Row key={i} text={s} type="neutral" />)}
          </Block>
        </div>
      );
      case "bias": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Block number="01" label="Inclusivity Score" accent={scoreColor(r.bias.inclusivityScore)}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ fontSize: 80, fontWeight: 400, fontStyle: "italic", color: scoreColor(r.bias.inclusivityScore), lineHeight: 1, fontFamily: C.font }}>{r.bias.inclusivityScore}</span>
              <div>
                <p style={{ fontSize: 9, letterSpacing: "0.16em", color: C.muted, fontFamily: C.mono, margin: "0 0 6px", textTransform: "uppercase" }}>Out of 100</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: scoreColor(r.bias.inclusivityScore), fontFamily: C.mono, margin: 0 }}>{scoreLabel(r.bias.inclusivityScore)}</p>
              </div>
            </div>
          </Block>
          <Block number="02" label="Flagged Phrases" accent={C.danger}>
            {r.bias.flaggedPhrases.length === 0
              ? <p style={{ fontSize: 13, color: C.success, fontFamily: C.mono, margin: 0 }}>✓ No biased language</p>
              : r.bias.flaggedPhrases.map((p, i) => <Chip key={i} type="missing">"{p}"</Chip>)}
          </Block>
          <Block number="03" label="Improvements" accent={C.gold}>
            {r.bias.improvements.map((s, i) => <Row key={i} text={s} type="neutral" />)}
          </Block>
        </div>
      );
      case "keywords": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Block number="01" label="Strong Keywords" accent={C.success}>
            <div>{r.keywords.strong.map((k, i) => <Chip key={i} type="match">✓ {k}</Chip>)}</div>
          </Block>
          <Block number="02" label="Missing Keywords" accent={C.danger}>
            <div>{r.keywords.missing.map((k, i) => <Chip key={i} type="missing">✕ {k}</Chip>)}</div>
          </Block>
          <Block number="03" label="SEO Tips" accent={C.gold}>
            {r.keywords.seoTips.map((s, i) => <Row key={i} text={s} type="neutral" />)}
          </Block>
        </div>
      );
      case "salary": return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Block number="01" label="Transparency Status" accent={r.salary.transparent ? C.success : C.danger}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 36, color: r.salary.transparent ? C.success : C.danger, fontFamily: C.font, fontStyle: "italic" }}>{r.salary.transparent ? "✓" : "✕"}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: r.salary.transparent ? C.success : C.danger, fontFamily: C.mono }}>{r.salary.transparent ? "Salary Disclosed" : "No Salary Range"}</span>
            </div>
          </Block>
          <Block number="02" label="Observation" accent={C.gold}>
            <Row text={r.salary.observation} type="neutral" />
          </Block>
          <Block number="03" label="Recommendation" accent={C.gold}>
            <Row text={r.salary.recommendation} type="neutral" />
          </Block>
        </div>
      );
      case "match": return r.resumeMatch ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Block number="01" label="Match Score" accent={scoreColor(r.resumeMatch.matchScore)}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ fontSize: 80, fontWeight: 400, fontStyle: "italic", color: scoreColor(r.resumeMatch.matchScore), lineHeight: 1, fontFamily: C.font }}>{r.resumeMatch.matchScore}%</span>
              <p style={{ fontSize: 12, color: C.textSub, fontFamily: C.mono, lineHeight: 1.8, margin: 0, maxWidth: 300 }}>{r.resumeMatch.verdict}</p>
            </div>
          </Block>
          <Block number="02" label="Resume Strengths" accent={C.success}>
            {r.resumeMatch.strengths.map((s, i) => <Row key={i} text={s} type="match" />)}
          </Block>
          <Block number="03" label="Gaps to Address" accent={C.danger}>
            {r.resumeMatch.gaps.map((s, i) => <Row key={i} text={s} type="missing" />)}
          </Block>
        </div>
      ) : null;
      default: return null;
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        textarea:focus { outline: none; border-color: ${C.text} !important; box-shadow: 0 0 0 3px rgba(20,20,20,0.08) !important; }
        button:hover { opacity: 0.85; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .fade { animation: fadeUp 0.3s ease forwards; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.font }}>

        {/* Topbar */}
        <div style={{ background: C.topbar, padding: "0 48px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${C.gold}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 400, fontStyle: "italic", color: "#ffffff", margin: 0, fontFamily: C.font }}>JD Analyzer</h1>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: C.mono }}>by Divyah</span>
          </div>
          {step === "results" && (
            <button onClick={() => { setStep("input"); setResult(null); setError(""); }}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 2, color: "rgba(255,255,255,0.5)", fontSize: 9, padding: "6px 16px", cursor: "pointer", fontFamily: C.mono, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              ← New Analysis
            </button>
          )}
        </div>

        {step === "input" && (
          <div className="fade">
            {/* Big hero */}
            <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "64px 64px 56px" }}>
              <div style={{ maxWidth: 680 }}>
                <p style={{ fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: C.muted, fontFamily: C.mono, margin: "0 0 20px" }}>AI-Powered · HR Intelligence</p>
                <h2 style={{ fontSize: 64, fontWeight: 400, fontStyle: "italic", color: C.text, margin: "0 0 20px", lineHeight: 1.0, letterSpacing: "-0.02em" }}>
                  Decode any<br />job description.
                </h2>
                <div style={{ width: 64, height: 3, background: C.gold, marginBottom: 20 }} />
                <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.8, fontFamily: C.mono, maxWidth: 440 }}>
                  Surface bias, keyword gaps, and missing sections — then see exactly how your resume stacks up.
                </p>
              </div>
            </div>

            {/* Form */}
            <div style={{ padding: "48px 64px 80px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <div>
                  <label style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text, fontFamily: C.mono, fontWeight: 700, display: "block", marginBottom: 10 }}>Job Description *</label>
                  <textarea
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, color: C.text, fontFamily: C.mono, fontSize: 12, padding: "16px 18px", resize: "vertical", lineHeight: 1.75, minHeight: 220, transition: "all 0.15s" }}
                    placeholder="Paste the full job description here..."
                    value={jd}
                    onChange={e => setJd(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text, fontFamily: C.mono, fontWeight: 700, display: "block", marginBottom: 10 }}>
                    Resume <span style={{ color: C.muted, fontWeight: 400 }}>(optional — for match scoring)</span>
                  </label>
                  <textarea
                    style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, color: C.text, fontFamily: C.mono, fontSize: 12, padding: "16px 18px", resize: "vertical", lineHeight: 1.75, minHeight: 150, transition: "all 0.15s" }}
                    placeholder="Paste your resume text..."
                    value={resume}
                    onChange={e => setResume(e.target.value)}
                  />
                </div>

                {error && (
                  <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: 2, padding: "11px 16px", fontSize: 11, color: C.danger, fontFamily: C.mono }}>{error}</div>
                )}

                <button
                  onClick={analyze}
                  disabled={!jd.trim() || loading}
                  style={{
                    background: !jd.trim() || loading ? C.border : C.topbar,
                    color: !jd.trim() || loading ? C.muted : "#ffffff",
                    border: "none", borderRadius: 2,
                    padding: "15px 40px", fontSize: 10,
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    fontFamily: C.mono, cursor: !jd.trim() || loading ? "not-allowed" : "pointer",
                    fontWeight: 700, alignSelf: "flex-start",
                  }}
                >
                  {loading ? "Analysing..." : "Run Analysis →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "results" && result && (
          <div className="fade">
            {/* Score hero — full width */}
            <div style={{ background: scoreBg(result.overallScore), borderBottom: `4px solid ${scoreColor(result.overallScore)}`, padding: "48px 64px 44px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
                <span style={{ fontSize: 120, fontWeight: 400, fontStyle: "italic", color: scoreColor(result.overallScore), lineHeight: 1, fontFamily: C.font }}>{result.overallScore}</span>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted, fontFamily: C.mono, margin: "0 0 8px" }}>Overall JD Score / 100</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: scoreColor(result.overallScore), fontFamily: C.mono, margin: "0 0 8px", letterSpacing: "-0.01em" }}>{scoreLabel(result.overallScore)}</p>
                  <p style={{ fontSize: 13, color: C.textSub, fontFamily: C.mono, margin: 0 }}>
                    {result.overallScore >= 75 ? "This JD is well-crafted and complete." : result.overallScore >= 50 ? "This JD has room for improvement." : "This JD needs significant work before posting."}
                  </p>
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", padding: "0 64px", overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: "16px 24px", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer",
                  background: "transparent",
                  color: activeTab === t.id ? C.text : C.muted,
                  border: "none",
                  borderBottom: activeTab === t.id ? `3px solid ${C.gold}` : "3px solid transparent",
                  fontFamily: C.mono, fontWeight: activeTab === t.id ? 700 : 400,
                  transition: "all 0.15s", whiteSpace: "nowrap",
                  marginBottom: -1,
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="fade" key={activeTab} style={{ padding: "32px 64px 80px" }}>
              {renderTab()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}