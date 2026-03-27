import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login } from "../services/authService";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: saveToken } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const successMessage = location.state?.message;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await login(form);
      saveToken(token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">Welcome back</h1>
          <p className="text-muted">Sign in to your careerAI account.</p>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {successMessage && (
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-paper placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>

            {/* Password field with Forgot password link */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted hover:text-accent transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                name="password"
                type="password"
                placeholder="Your password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-paper placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            No account?{" "}
            <Link to="/register" className="text-accent hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}