import { useState } from "react";
import { useParams } from "react-router-dom";
import { recommendJobs } from "../services/jobService";
import { parseAIJson } from "../utils/parseJson";
import JobCard from "../components/JobCard";
import Loader from "../components/Loader";

export default function RecommendPage() {
  const { resumeId } = useParams();
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState("");

  const handleFetch = async () => {
    if (!location.trim()) return;
    setLoading(true);
    setError("");
    setJobs([]);
    try {
      const raw = await recommendJobs(resumeId, location.trim());
      const parsed = parseAIJson(raw);
      setJobs(Array.isArray(parsed) ? parsed : []);
      setSearchedLocation(location.trim());
      setFetched(true);
    } catch {
      setError("AI recommendation failed. Check both backend services.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleFetch();
  };

  const sortedJobs = [...jobs].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">AI Job Picks</h1>
          <p className="text-muted">Our AI searches live jobs using your skills and ranks the top matches.</p>
        </div>

        {/* Location input*/}
        <div className="bg-surface border border-border rounded-3xl p-6 mb-6">
          <label className="block text-paper text-sm font-medium mb-3">
            📍 Where are you looking for jobs?
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. India, Remote, Hyderabad, Bangalore..."
              className="flex-1 bg-ink border border-border rounded-xl px-4 py-3 text-paper placeholder:text-muted text-sm focus:outline-none focus:border-accent/60 transition-colors"
            />
            <button
              onClick={handleFetch}
              disabled={loading || !location.trim()}
              className="px-6 py-3 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? "Searching..." : "Find Jobs →"}
            </button>
          </div>
          <p className="text-muted text-xs mt-2">
            AI will search live listings near this location and rank them by how well they match your resume skills.
          </p>
        </div>

        {loading && <Loader text="AI is searching and ranking jobs for you..." />}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {fetched && !loading && sortedJobs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-sm">
                {sortedJobs.length} AI-ranked positions near <span className="text-paper font-medium">{searchedLocation}</span>
              </p>
              <button
                onClick={() => { setFetched(false); setJobs([]); }}
                className="text-xs text-muted hover:text-accent transition-colors"
              >
                ← New search
              </button>
            </div>
            {sortedJobs.map((job, i) => (
              <div key={i} className="relative">
                {i === 0 && (
                  <div className="absolute -top-2 -right-2 z-10 px-2.5 py-0.5 rounded-full bg-accent text-ink text-xs font-bold">
                    #1 Best Match
                  </div>
                )}
                <JobCard job={job} />
              </div>
            ))}
            <button
              onClick={handleFetch}
              className="w-full py-3 rounded-xl border border-border text-muted hover:border-accent/40 hover:text-paper transition-all text-sm mt-4"
            >
              Refresh Recommendations
            </button>
          </div>
        )}

        {fetched && !loading && sortedJobs.length === 0 && (
          <div className="text-center py-12 text-muted">
            No recommendations found for <span className="text-paper">{searchedLocation}</span>. Try a different location.
          </div>
        )}
      </div>
    </div>
  );
}