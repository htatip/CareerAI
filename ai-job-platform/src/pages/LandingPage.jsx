import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const features = [
  { icon: "⚡", title: "AI Skill Extraction", desc: "Upload your PDF resume and let our AI instantly identify every technical skill." },
  { icon: "🎯", title: "ATS Score", desc: "See how your resume scores against Applicant Tracking Systems before applying." },
  { icon: "🔍", title: "Live Job Search", desc: "Search thousands of real jobs matched to your skill profile via JSearch API." },
  { icon: "🤖", title: "AI Job Ranking", desc: "Our AI ranks jobs by fit and explains why each one matches your background." },
  { icon: "✍️", title: "Resume Improvement", desc: "Get specific rewrite suggestions with before/after examples for every weak section." },
  { icon: "📊", title: "Job Match Analysis", desc: "Paste any job description and get a detailed match score with missing skills." },
];

export default function LandingPage() {
   const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate("/dashboard");
  }, [token]);
  return (
    <div className="min-h-screen">
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Powered by Groq LLM + Spring Boot
          </div>
          <h1 className="font-display text-6xl md:text-8xl font-extrabold leading-none tracking-tight mb-6">
            Your resume.<br />
            <span className="text-accent">Optimized.</span>
          </h1>
          <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Upload your PDF, extract skills with AI, get ATS scores, find matching jobs, and receive expert improvement suggestions — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 rounded-full bg-accent text-ink font-semibold text-base hover:bg-accent/90 transition-all hover:scale-105 shadow-lg shadow-accent/20">
              Start for Free →
            </Link>
            <Link to="/login" className="px-8 py-3.5 rounded-full border border-border text-paper text-base hover:border-accent/50 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-paper mb-4">Everything you need to land the job</h2>
            <p className="text-muted text-lg">Six powerful tools, one seamless workflow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-border bg-surface hover:border-accent/40 transition-all duration-300 hover:-translate-y-1">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display font-semibold text-paper text-lg mb-2">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-surface border border-border rounded-3xl p-12">
          <h2 className="font-display text-4xl font-bold text-paper mb-4">Ready to optimize your career?</h2>
          <p className="text-muted mb-8">Create your free account and upload your first resume in under 2 minutes.</p>
          <Link to="/register" className="inline-flex items-center px-8 py-3.5 rounded-full bg-accent text-ink font-semibold hover:bg-accent/90 transition-all hover:scale-105">
            Get Started Free →
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-muted text-sm">
          <span className="font-display font-bold text-paper">career<span className="text-accent">AI</span></span>
          {" "}· Built with Spring Boot, FastAPI, Groq, and React
        </p>
      </footer>
    </div>
  );
}