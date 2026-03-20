import { useState } from "react";
import { useParams } from "react-router-dom";
import { analyzeResume, improveResume } from "../services/resumeService";
import { parseAIJson } from "../utils/parseJson";
import Loader from "../components/Loader";

function ScoreRing({ score }) {
  const pct = Math.min(Math.max(Number(score) || 0, 0), 100);
  const color = pct >= 70 ? "#C8F135" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#1E1E2E" strokeWidth="10" fill="none" />
          <circle cx="50" cy="50" r="40" stroke={color} strokeWidth="10" fill="none"
            strokeDasharray={`${pct * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold" style={{ color }}>{pct}</span>
          <span className="text-muted text-xs">/ 100</span>
        </div>
      </div>
      <p className="text-muted text-sm mt-2">ATS Score</p>
    </div>
  );
}

function toList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") return [val];
  return [String(val)];
}

// Render example_rewrites — handles nested objects like { "Work Experience": { "Company": { "bullet_points": [...] } } }
function ExampleRewrites({ data }) {
  if (!data || typeof data !== "object") return null;

  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-3xl p-8">
      <h3 className="font-display font-semibold text-paper mb-6">✍️ Example Rewrites</h3>
      <div className="space-y-6">
        {entries.map(([section, sectionVal]) => (
          <div key={section}>
            <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-3">{section}</p>
            {/* sectionVal might be a string, array, or nested object */}
            {typeof sectionVal === "string" && (
              <p className="text-sm text-paper p-3 bg-ink rounded-xl border border-border">{sectionVal}</p>
            )}
            {Array.isArray(sectionVal) && (
              <ul className="space-y-2">
                {sectionVal.map((item, i) => (
                  <li key={i} className="text-sm text-paper p-3 bg-ink rounded-xl border border-border">{String(item)}</li>
                ))}
              </ul>
            )}
            {typeof sectionVal === "object" && !Array.isArray(sectionVal) && (
              <div className="space-y-4 pl-3 border-l border-border">
                {Object.entries(sectionVal).map(([subKey, subVal]) => (
                  <div key={subKey}>
                    <p className="text-muted text-xs font-medium mb-2">{subKey}</p>
                    {/* bullet_points array or nested further */}
                    {Array.isArray(subVal) && (
                      <ul className="space-y-2">
                        {subVal.map((item, i) => (
                          <li key={i} className="text-sm text-paper p-3 bg-ink rounded-xl border border-border flex gap-2">
                            <span className="text-accent mt-0.5">•</span>
                            <span>{String(item)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {typeof subVal === "object" && !Array.isArray(subVal) && subVal !== null && (
                      <div className="space-y-2">
                        {Object.entries(subVal).map(([k, v]) => (
                          <div key={k}>
                            {Array.isArray(v) ? (
                              <ul className="space-y-2">
                                {v.map((item, i) => (
                                  <li key={i} className="text-sm text-paper p-3 bg-ink rounded-xl border border-border flex gap-2">
                                    <span className="text-accent mt-0.5">•</span>
                                    <span>{String(item)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-paper p-3 bg-ink rounded-xl border border-border">{String(v)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {typeof subVal === "string" && (
                      <p className="text-sm text-paper p-3 bg-ink rounded-xl border border-border">{subVal}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { resumeId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [improvement, setImprovement] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    setLoadingAnalysis(true);
    setError("");
    setAnalysis(null);
    try {
      const raw = await analyzeResume(resumeId);
      const parsed = parseAIJson(raw);
      if (!parsed) throw new Error("Empty response from AI");
      setAnalysis(parsed);
    } catch (err) {
      setError("Analysis failed. " + (err.response?.data?.message || "Ensure the AI service is running on port 8000."));
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleImprove = async () => {
    setLoadingImprove(true);
    setError("");
    setImprovement(null);
    try {
      const raw = await improveResume(resumeId);
      const parsed = parseAIJson(raw);
      if (!parsed) throw new Error("Empty response from AI");
      setImprovement(parsed);
    } catch (err) {
      setError("Improvement failed. " + (err.response?.data?.message || "Ensure the AI service is running on port 8000."));
    } finally {
      setLoadingImprove(false);
    }
  };

  const score = analysis?.ATS_Score ?? analysis?.["Resume ATS Score"] ?? analysis?.ats_score ?? analysis?.score;
  const strengths = toList(analysis?.Strengths ?? analysis?.strengths);
  const weaknesses = toList(analysis?.Weaknesses ?? analysis?.weaknesses);
  const suggestions = toList(analysis?.Suggestions ?? analysis?.["Suggestions to improve the resume"] ?? analysis?.suggestions);

  const weakSections = toList(improvement?.weak_sections);
  const improveSuggestions = toList(improvement?.improvement_suggestions);
  const exampleRewrites = improvement?.example_rewrites;

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">Resume Analysis</h1>
          <p className="text-muted">AI-powered ATS scoring and improvement suggestions.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-4 mb-8">
          <button onClick={handleAnalyze} disabled={loadingAnalysis}
            className="flex-1 py-3.5 rounded-xl bg-accent text-ink font-semibold hover:bg-accent/90 transition-all disabled:opacity-50">
            {loadingAnalysis ? "Analyzing..." : "🧠 Analyze Resume"}
          </button>
          <button onClick={handleImprove} disabled={loadingImprove}
            className="flex-1 py-3.5 rounded-xl border border-border text-paper hover:border-accent/50 transition-all disabled:opacity-50">
            {loadingImprove ? "Processing..." : "✍️ Get Improvements"}
          </button>
        </div>

        {(loadingAnalysis || loadingImprove) && <Loader text="AI is reviewing your resume..." />}

        {/* Analysis Results */}
        {analysis && !loadingAnalysis && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
              {score != null && <ScoreRing score={score} />}
              <div className="flex-1">
                <h2 className="font-display text-2xl font-bold text-paper mb-4">Analysis Results</h2>
                {strengths.length > 0 && (
                  <div className="mb-4">
                    <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {strengths.map((s, i) => (
                        <li key={i} className="text-muted text-sm flex gap-2"><span className="text-accent">+</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div>
                    <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">Weaknesses</p>
                    <ul className="space-y-1">
                      {weaknesses.map((w, i) => (
                        <li key={i} className="text-muted text-sm flex gap-2"><span className="text-red-400">−</span>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {suggestions.length > 0 && (
              <div className="bg-surface border border-border rounded-3xl p-8">
                <h3 className="font-display font-semibold text-paper mb-4">💡 Suggestions</h3>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="text-muted text-sm p-3 bg-ink rounded-xl border border-border">{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Improvement Results */}
        {improvement && !loadingImprove && (
          <div className="mt-6 space-y-6">
            {weakSections.length > 0 && (
              <div className="bg-surface border border-border rounded-3xl p-8">
                <h3 className="font-display font-semibold text-paper mb-4">⚠️ Weak Sections</h3>
                <ul className="space-y-2">
                  {weakSections.map((s, i) => (
                    <li key={i} className="text-muted text-sm p-3 bg-ink rounded-xl border border-border flex gap-2">
                      <span className="text-yellow-400 mt-0.5">⚠</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {improveSuggestions.length > 0 && (
              <div className="bg-surface border border-border rounded-3xl p-8">
                <h3 className="font-display font-semibold text-paper mb-4">✅ Improvement Suggestions</h3>
                <ul className="space-y-2">
                  {improveSuggestions.map((s, i) => (
                    <li key={i} className="text-muted text-sm p-3 bg-ink rounded-xl border border-border flex gap-2">
                      <span className="text-accent mt-0.5">→</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ExampleRewrites data={exampleRewrites} />
          </div>
        )}
      </div>
    </div>
  );
}