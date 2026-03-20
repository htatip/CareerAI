import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyResumes, getSkills, deleteResume, downloadResume } from "../services/resumeService";
import SkillBadge from "../components/SkillBadge";
import Loader from "../components/Loader";

export default function DashboardPage() {
  const { resumeId, saveResumeId } = useAuth();
  const [skills, setSkills] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [totalResumes, setTotalResumes] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (resumeId) {
      setLoading(true);
      getSkills(resumeId).then(setSkills).catch(console.error).finally(() => setLoading(false));
    }
  }, [resumeId]);

  useEffect(() => {
    fetchResumes(0);
  }, []);

  const fetchResumes = (p) => {
    getMyResumes(p, 5)
      .then((data) => {
        setResumes(data.content);
        setTotalResumes(data.totalElements);
        setPage(data.number);
      })
      .catch(console.error);
  };

  const handleDelete = async (id) => {
    try {
      await deleteResume(id);
      if (String(id) === String(resumeId)) {
        saveResumeId(null);
        setSkills([]);
      }
      fetchResumes(page);
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const actions = resumeId
    ? [
        { label: "Analyze Resume", icon: "🧠", to: `/resume/${resumeId}/analyze`, desc: "ATS score + strengths & weaknesses" },
        { label: "Search Jobs", icon: "🔍", to: `/jobs/${resumeId}`, desc: "Find real jobs by skill & location" },
        { label: "AI Job Picks", icon: "🤖", to: `/jobs/${resumeId}/recommend`, desc: "AI-ranked best-fit positions" },
      ]
    : [];

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">Dashboard</h1>
          <p className="text-muted">Your resume hub — analyze, search, and improve.</p>
        </div>

        {!resumeId ? (
          <div className="bg-surface border border-dashed border-accent/30 rounded-3xl p-12 text-center">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="font-display text-2xl font-bold text-paper mb-3">No resume yet</h2>
            <p className="text-muted mb-6">Upload your PDF resume to unlock all AI-powered features.</p>
            <Link to="/upload" className="inline-flex items-center px-6 py-3 rounded-full bg-accent text-ink font-semibold hover:bg-accent/90 transition-all">
              Upload Resume →
            </Link>
          </div>
        ) : (
          <>
            
            <div className="bg-surface border border-border rounded-3xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-paper text-xl">Detected Skills</h2>
                <span className="text-accent text-sm font-medium">{skills.length} found</span>
              </div>
              {loading ? <Loader text="Loading skills..." /> : skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => <SkillBadge key={s} skill={s} />)}
                </div>
              ) : (
                <p className="text-muted text-sm">No skills extracted yet.</p>
              )}
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {actions.map((a) => (
                <Link key={a.label} to={a.to} className="bg-surface border border-border rounded-2xl p-6 hover:border-accent/40 transition-all hover:-translate-y-1">
                  <div className="text-3xl mb-3">{a.icon}</div>
                  <h3 className="font-display font-semibold text-paper mb-1">{a.label}</h3>
                  <p className="text-muted text-sm">{a.desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}

       
        {resumes.length > 0 && (
          <div className="bg-surface border border-border rounded-3xl p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-paper text-xl">Resume History</h2>
              <Link to="/upload" className="text-sm text-accent hover:underline">+ Upload new</Link>
            </div>
            <div className="space-y-3">
              {resumes.map((r) => (
                <div key={r.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${String(r.id) === String(resumeId) ? "border-accent/40 bg-accent/5" : "border-border"}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <p className="text-paper font-medium text-sm">{r.fileName}</p>
                      <p className="text-muted text-xs">{new Date(r.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    {String(r.id) === String(resumeId) && (
                      <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Active</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    
                    <button
                      onClick={() => downloadResume(r.id, r.fileName)}
                      className="text-xs text-muted hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent/10"
                    >↓ PDF</button>

                   
                    {String(r.id) !== String(resumeId) && (
                      <button
                        onClick={() => saveResumeId(r.id)}
                        className="text-xs text-muted hover:text-paper transition-colors px-2 py-1 rounded-lg hover:bg-surface"
                      >Use this</button>
                    )}

                   
                    {deleteConfirm === r.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg bg-red-500/10">Confirm</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs text-muted px-2 py-1">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(r.id)}
                        className="text-xs text-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                      >✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            
            {totalResumes > 5 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <button
                  disabled={page === 0}
                  onClick={() => fetchResumes(page - 1)}
                  className="text-sm text-muted hover:text-paper disabled:opacity-30 transition-colors"
                >← Previous</button>
                <span className="text-sm text-muted">
                  Page {page + 1} of {Math.ceil(totalResumes / 5)}
                </span>
                <button
                  disabled={(page + 1) * 5 >= totalResumes}
                  onClick={() => fetchResumes(page + 1)}
                  className="text-sm text-muted hover:text-paper disabled:opacity-30 transition-colors"
                >Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}