import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { token, logout, resumeId } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ink/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-xl tracking-tight">
          career<span className="text-accent">AI</span>
        </Link>
        <div className="flex items-center gap-4">
          {token ? (
            <>
              <Link to="/dashboard" className="text-sm text-muted hover:text-paper transition-colors">Dashboard</Link>
              {resumeId && (
                <>
                  <Link to={`/jobs/${resumeId}`} className="text-sm text-muted hover:text-paper transition-colors">Jobs</Link>
                  <Link to={`/jobs/${resumeId}/recommend`} className="text-sm text-muted hover:text-paper transition-colors">AI Picks</Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="text-sm px-4 py-1.5 rounded-full border border-border text-muted hover:border-accent hover:text-accent transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted hover:text-paper transition-colors">Login</Link>
              <Link to="/register" className="text-sm px-4 py-1.5 rounded-full bg-accent text-ink font-semibold hover:bg-accent/90 transition-all">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
