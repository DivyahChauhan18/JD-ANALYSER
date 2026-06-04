import { useState } from "react";

const COLORS = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2e2c28",
  accent: "#e8c547",
  text: "#f0ede6",
  muted: "#8a8680",
  danger: "#e05c5c",
  success: "#5ce07a",
  info: "#5cb8e0",
};

function chipStyle(type) {
  const map = {
    match: { bg: "#1a3326", color: "#5ce07a", border: "#2a5a3a" },
    missing: { bg: "#3a1a1a", color: "#e05c5c", border: "#5a2a2a" },
    info: { bg: "#1a2a3a", color: "#5cb8e0", border: "#2a4a6a" },
  };
  const c = map[type] || map.info;
  return {
    display: "inline-flex",
    padding: "0.25rem 0.6rem",
    borderRadius: "20px",
    fontSize: "0.7rem",
    margin: "0.2rem",
    background: c.bg,
    color: c.color,
    border: `1px solid ${c.border}`,
  };
}

function tabStyle(active) {
  return {
    padding: "0.6rem 0.9rem",
    fontSize: "0.6rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    background: "none",
    border: "none",
    color: active ? COLORS.accent : COLORS.muted,
    borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
    fontFamily: "'DM Mono', monospace",
    whiteSpace: "nowrap",
  };
}

function Bullet({ text, color }) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", padding: "0.2rem 0" }}>
      <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, marginTop: "0.5rem", flexShrink: 0 }} />
      <div style={{ fontSize: "0.78rem", lineHeight: "1.55", color: COLORS.text }}>{text}</div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: "8px", border: `1px solid ${COLORS.border}`, overflow: "hidden", marginBottom: "0.75rem" }}>
      <div style={{ padding: "0.65rem 1rem", borderBottom: `1px solid ${COLORS.border}`, fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.muted, display: "flex", gap: "0.4rem" }}>
        <span>{icon}</span>{title}
      </div>
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>{children}</div>
    </div>
  );
}

function ScoreGauge({ score }) {
  const color = score >= 75 ? COLORS.success : score >= 50 ? COLORS.accent : COLORS.danger;
  const label = score >= 75 ? "Strong" : score >= 50 ? "Moderate" : "Needs Work";
  return (
    <div style={{ background: COLORS.surface, borderRadius: "8px", border: `1px solid ${COLORS.border}`, padding: "1rem", display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
      <div>
        <div style={{ fontSize: "2.8rem", fontFamily: "'Playfair Display', serif", fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: "0.6rem", color: COLORS.muted, letterSpacing: "0.1em" }}>/100</div>
      </div>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color, marginBottom: "0.2rem" }}>{label}</div>
        <div style={{ fontSize: "0.7rem", color: COLORS.muted, lineHeight: 1.5 }}>Overall JD quality score</div>
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
  const [errorDetail, setErrorDetail] = useState("");
  const [step, setStep] = useState("input");

  async function analyze() {
    if (!jd.trim()) return;
    setLoading(true);
    setResult(null);
    setErrorDetail("");

    const hasResume = resume.trim().length > 0;

    const prompt = `You are an expert HR analyst. Analyze the Job Description${hasResume ? " and Resume" : ""} below.

JOB DESCRIPTION:
${jd}
${hasResume ? `\nRESUME:\n${resume}` : ""}

Return ONLY raw JSON (no markdown, no backticks, no explanation). Use this exact structure:
{
  "overallScore": 72,
  "structure": {
    "missingSections": ["Benefits & perks", "Reporting structure"],
    "presentSections": ["Role overview", "Responsibilities"],
    "suggestions": ["Add a clear team size context", "Include growth path"]
  },
  "bias": {
    "flaggedPhrases": ["rockstar", "young and dynamic"],
    "inclusivityScore": 65,
    "improvements": ["Replace rockstar with high-performing"]
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
    "gaps": ["No direct ATS experience", "Missing HRBP exposure"],
    "verdict": "Candidate shows transferable skills but lacks direct HR operations experience."
  }` : ""}
}`;

    try {
      const response = await fetch("/api/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
          "x-api-key": process.env.REACT_APP_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        setErrorDetail(`HTTP ${response.status}: ${errText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.error) { setErrorDetail(`API error: ${JSON.stringify(data.error)}`); setLoading(false); return; }

      const raw = data.content?.map((i) => i.text || "").join("") || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { setErrorDetail(`No JSON in response:\n${raw.slice(0, 400)}`); setLoading(false); return; }

      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setActiveTab("structure");
      setStep("results");
    } catch (e) {
      setErrorDetail(`Exception: ${e.message}`);
    }
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
      case "structure": return <>
        <Section title="Missing Sections" icon="⚠">
          {r.structure.missingSections.length === 0
            ? <div style={{ color: COLORS.success, fontSize: "0.78rem" }}>All key sections present ✓</div>
            : r.structure.missingSections.map((s, i) => <Bullet key={i} text={s} color={COLORS.danger} />)}
        </Section>
        <Section title="Well Covered" icon="✓">
          {r.structure.presentSections.map((s, i) => <Bullet key={i} text={s} color={COLORS.success} />)}
        </Section>
        <Section title="Suggestions" icon="→">
          {r.structure.suggestions.map((s, i) => <Bullet key={i} text={s} color={COLORS.accent} />)}
        </Section>
      </>;
      case "bias": return <>
        <Section title="Inclusivity Score" icon="⚖">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "2rem", fontFamily: "'Playfair Display', serif", fontWeight: 700, color: r.bias.inclusivityScore >= 70 ? COLORS.success : r.bias.inclusivityScore >= 40 ? COLORS.accent : COLORS.danger }}>
              {r.bias.inclusivityScore}
            </div>
            <div style={{ fontSize: "0.7rem", color: COLORS.muted }}>/ 100</div>
          </div>
        </Section>
        <Section title="Flagged Phrases" icon="🚩">
          {r.bias.flaggedPhrases.length === 0
            ? <div style={{ color: COLORS.success, fontSize: "0.78rem" }}>No biased language ✓</div>
            : <div>{r.bias.flaggedPhrases.map((p, i) => <span key={i} style={chipStyle("missing")}>"{p}"</span>)}</div>}
        </Section>
        <Section title="How to Improve" icon="✎">
          {r.bias.improvements.map((s, i) => <Bullet key={i} text={s} color={COLORS.info} />)}
        </Section>
      </>;
      case "keywords": return <>
        <Section title="Strong Keywords" icon="◆">
          <div>{r.keywords.strong.map((k, i) => <span key={i} style={chipStyle("match")}>✓ {k}</span>)}</div>
        </Section>
        <Section title="Missing Keywords" icon="◇">
          <div>{r.keywords.missing.map((k, i) => <span key={i} style={chipStyle("missing")}>✕ {k}</span>)}</div>
        </Section>
        <Section title="SEO Tips" icon="↑">
          {r.keywords.seoTips.map((s, i) => <Bullet key={i} text={s} color={COLORS.accent} />)}
        </Section>
      </>;
      case "salary": return (
        <Section title="Salary Transparency" icon="₹">
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: r.salary.transparent ? COLORS.success : COLORS.danger, marginBottom: "0.4rem" }}>
            {r.salary.transparent ? "✓ Salary Disclosed" : "✕ Not Disclosed"}
          </div>
          <Bullet text={r.salary.observation} color={COLORS.muted} />
          <Bullet text={r.salary.recommendation} color={COLORS.accent} />
        </Section>
      );
      case "match": return r.resumeMatch ? <>
        <Section title="Match Score" icon="◎">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ fontSize: "2rem", fontFamily: "'Playfair Display', serif", fontWeight: 700, flexShrink: 0, color: r.resumeMatch.matchScore >= 70 ? COLORS.success : r.resumeMatch.matchScore >= 40 ? COLORS.accent : COLORS.danger }}>
              {r.resumeMatch.matchScore}%
            </div>
            <div style={{ fontSize: "0.73rem", color: COLORS.muted, lineHeight: 1.6, paddingTop: "0.2rem" }}>{r.resumeMatch.verdict}</div>
          </div>
        </Section>
        <Section title="Strengths vs JD" icon="✓">
          {r.resumeMatch.strengths.map((s, i) => <Bullet key={i} text={s} color={COLORS.success} />)}
        </Section>
        <Section title="Gaps to Address" icon="△">
          {r.resumeMatch.gaps.map((s, i) => <Bullet key={i} text={s} color={COLORS.danger} />)}
        </Section>
      </> : null;
      default: return null;
    }
  }

  const inputScreen = (
    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.muted, marginBottom: "0.35rem", display: "block" }}>
          Job Description *
        </span>
        <textarea
          style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "6px", color: COLORS.text, fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", padding: "0.85rem", resize: "vertical", lineHeight: "1.6", outline: "none", boxSizing: "border-box", minHeight: "180px" }}
          placeholder="Paste the full job description here..."
          value={jd}
          onChange={(e) => setJd(e.target.value)}
        />
      </div>
      <div>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.muted, marginBottom: "0.35rem", display: "block" }}>
          Your Resume (optional — for match scoring)
        </span>
        <textarea
          style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "6px", color: COLORS.text, fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", padding: "0.85rem", resize: "vertical", lineHeight: "1.6", outline: "none", boxSizing: "border-box", minHeight: "140px" }}
          placeholder="Paste your resume text to get a match score..."
          value={resume}
          onChange={(e) => setResume(e.target.value)}
        />
      </div>
      <button
        style={{ background: !jd.trim() || loading ? COLORS.border : COLORS.accent, color: !jd.trim() || loading ? COLORS.muted : COLORS.bg, border: "none", borderRadius: "4px", padding: "0.8rem", fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: !jd.trim() || loading ? "not-allowed" : "pointer", width: "100%" }}
        onClick={analyze}
        disabled={!jd.trim() || loading}
      >
        {loading ? "◌  Analysing..." : "→ Run Analysis"}
      </button>
      {errorDetail && (
        <div style={{ background: "#2a1515", border: `1px solid #5a2a2a`, borderRadius: "6px", padding: "0.85rem", fontSize: "0.7rem", color: COLORS.danger, lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>⚠ Error:</div>
          {errorDetail}
        </div>
      )}
    </div>
  );

  const resultsScreen = result ? (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "1rem 1.25rem 0" }}>
        <ScoreGauge score={result.overallScore} />
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, overflowX: "auto", flexShrink: 0 }}>
        {tabs.map((t) => <button key={t.id} style={tabStyle(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
        <button style={{ ...tabStyle(false), marginLeft: "auto", color: COLORS.muted }} onClick={() => { setStep("input"); setResult(null); }}>← New</button>
      </div>
      <div style={{ overflowY: "auto", padding: "1rem 1.25rem", flex: 1 }}>
        {renderTab()}
      </div>
    </div>
  ) : null;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Mono', 'Courier New', monospace" }}>
        <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "1rem 1.25rem", display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.4rem", fontWeight: 700, color: COLORS.accent, margin: 0 }}>JD Analyzer</h1>
          <span style={{ fontSize: "0.6rem", color: COLORS.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>by Divyah · HR Tool</span>
        </div>
        {step === "input" ? inputScreen : resultsScreen}
      </div>
    </>
  );
}