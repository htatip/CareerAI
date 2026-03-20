import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResume } from "../services/resumeService";
import { useAuth } from "../context/AuthContext";
import SkillBadge from "../components/SkillBadge";

export default function UploadPage() {
  const navigate = useNavigate();
  const { saveResumeId } = useAuth();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f?.type !== "application/pdf") { setError("Only PDF files are accepted."); return; }
    setFile(f);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) { setError("Please select a PDF file."); return; }
    setLoading(true);
    setError("");
    try {
      setStep("📄 Uploading PDF...");
      await new Promise(r => setTimeout(r, 500));
      setStep("🔍 Extracting text from PDF...");
      await new Promise(r => setTimeout(r, 1000));
      setStep("🤖 AI is identifying your skills...");
      const data = await uploadResume(file);
      saveResumeId(data.id);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Is the backend running?");
    } finally {
      setLoading(false);
      setStep("");
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">Upload Resume</h1>
          <p className="text-muted">We'll extract your skills using AI instantly.</p>
        </div>

        {!result ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current.click()}
              className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-16 text-center transition-all ${dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/40 bg-surface"}`}
            >
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
              <div className="text-5xl mb-4">{file ? "✅" : "📄"}</div>
              {file ? (
                <>
                  <p className="font-display font-semibold text-paper text-lg">{file.name}</p>
                  <p className="text-muted text-sm mt-1">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                </>
              ) : (
                <>
                  <p className="font-display font-semibold text-paper text-lg">Drop your PDF here</p>
                  <p className="text-muted text-sm mt-1">or click to browse files</p>
                </>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || loading}
              className="w-full mt-6 py-4 rounded-2xl bg-accent text-ink font-semibold text-base hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : "Upload & Extract Skills →"}
            </button>

            {loading && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-surface border border-border">
                  <div className="w-4 h-4 rounded-full border-2 border-t-accent animate-spin" />
                  <span className="text-muted text-sm">{step}</span>
                </div>
                <p className="text-muted/50 text-xs mt-2">This takes 15-30 seconds — Groq AI is reading your resume</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-surface border border-border rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">✓</div>
              <div>
                <p className="font-display font-semibold text-paper">Upload successful!</p>
                <p className="text-muted text-sm">{result.fileName}</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm font-medium text-muted mb-3">Extracted Skills <span className="text-accent">({result.skills?.length || 0})</span></p>
              <div className="flex flex-wrap gap-2">
                {result.skills?.map((s) => <SkillBadge key={s} skill={s} />)}
              </div>
            </div>
            <button onClick={() => navigate("/dashboard")} className="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold hover:bg-accent/90 transition-all">
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}