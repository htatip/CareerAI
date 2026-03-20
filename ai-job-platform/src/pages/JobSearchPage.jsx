import { useState } from "react";
import { useParams } from "react-router-dom";
import { searchJobs, analyzeJob } from "../services/jobService";
import { parseAIJson } from "../utils/parseJson";
import JobCard from "../components/JobCard";
import Loader from "../components/Loader";

export default function JobSearchPage() {
  const { resumeId } = useParams();
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!skill.trim()) return;
    setLoading(true);
    setError("");
    setJobs([]);
    try {
      const data = await searchJobs(resumeId, skill, location || "Remote");
      setJobs(data);
    } catch {
      setError("Job search failed. Check your RapidAPI key and backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (job) => {
    setSelectedJob(job);
    setMatchLoading(true);
    setMatchResult(null);
    try {
      const raw = await analyzeJob(resumeId, job.description);
      setMatchResult(parseAIJson(raw));
    } catch {
      setMatchResult({ error: "Analysis failed." });
    } finally {
      setMatchLoading(false);
    }
  };

  const score = matchResult?.["Match Score"] ?? matchResult?.match_score;
  const matched = matchResult?.["Matched Skills"] ?? matchResult?.matched_skills ?? [];
  const missing = matchResult?.["Missing Skills"] ?? matchResult?.missing_skills ?? [];

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">Job Search</h1>
          <p className="text-muted">Search real jobs and analyze your match against each one.</p>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
          <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill (e.g. React, Python)" required
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-paper placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors text-sm" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Hyderabad, Remote)"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-paper placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors text-sm" />
          <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl bg-accent text-ink font-semibold hover:bg-accent/90 transition-all disabled:opacity-50 whitespace-nowrap">
            {loading ? "Searching..." : "Search Jobs"}
          </button>
        </form>
        {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
        {loading && <Loader text="Fetching live jobs..." />}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {jobs.length > 0 && <p className="text-muted text-sm">{jobs.length} jobs found</p>}
            {jobs.map((job, i) => <JobCard key={i} job={job} onAnalyze={handleAnalyze} />)}
          </div>
          {(selectedJob || matchLoading) && (
            <div className="bg-surface border border-border rounded-2xl p-6 h-fit sticky top-24">
              <h3 className="font-display font-semibold text-paper mb-1">Match Analysis</h3>
              <p className="text-muted text-xs mb-4 truncate">{selectedJob?.title}</p>
              {matchLoading ? <Loader text="Analyzing match..." /> : matchResult && (
                <>
                  {score !== undefined && (
                    <div className="mb-4 p-4 bg-ink rounded-xl border border-border text-center">
                      <div className="font-display text-4xl font-bold text-accent">{score}%</div>
                      <div className="text-muted text-xs mt-1">Match Score</div>
                    </div>
                  )}
                  {matched.length > 0 && (
                    <div className="mb-4">
                      <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-2">Matched</p>
                      <div className="flex flex-wrap gap-1">
                        {matched.map((s, i) => <span key={i} className="px-2 py-0.5 text-xs bg-accent/10 text-accent rounded-full border border-accent/20">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {missing.length > 0 && (
                    <div>
                      <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">Missing</p>
                      <div className="flex flex-wrap gap-1">
                        {missing.map((s, i) => <span key={i} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded-full border border-red-500/20">{s}</span>)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}