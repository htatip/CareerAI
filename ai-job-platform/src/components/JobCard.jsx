export default function JobCard({ job, onAnalyze }) {
  // Handle both field names — AI returns job_title, JobDTO returns jobTitle
  const title = job.jobTitle || job.job_title || job.title || "Unknown Position";
  const score = job.match_score ?? job.score ?? null;
  const applyLink = job.applyLink || job.apply_link || job.job_apply_link || null;

  return (
    <div className="group bg-surface border border-border rounded-2xl p-6 hover:border-accent/40 transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">

          {/* Full job title — no truncation */}
          <h3 className="font-display font-semibold text-paper text-lg leading-snug">
            {title}
          </h3>

          {/* Company + location */}
          <p className="text-muted text-sm mt-1">
            {job.company}{job.location ? ` · ${job.location}` : ""}
          </p>

          {/* Match score bar */}
          {score !== null && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                />
              </div>
              <span className="text-accent text-xs font-semibold whitespace-nowrap">
                {score}% match
              </span>
            </div>
          )}

          {/* AI reason */}
          {job.reason && (
            <p className="text-muted text-xs mt-2 italic">{job.reason}</p>
          )}

          {/* Apply link */}
          {applyLink && (
            <a
              href={applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent hover:text-ink transition-all"
            >
              Apply Now →
            </a>
          )}
        </div>

        {onAnalyze && (
          <button
            onClick={() => onAnalyze(job)}
            className="shrink-0 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:border-accent hover:text-accent transition-all"
          >
            Analyze
          </button>
        )}
      </div>
    </div>
  );
}