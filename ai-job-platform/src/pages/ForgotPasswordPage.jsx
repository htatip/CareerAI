import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await API.post("/api/auth/forgot-password", { email });
      setStatus("success");
      setMessage(res.data.message);
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">
            Forgot password?
          </h1>
          <p className="text-muted">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-8">
          {status === "success" ? (
            <div className="text-center space-y-4">
              {/* Success icon */}
              <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-paper font-medium">{message}</p>
              <p className="text-muted text-sm">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => { setStatus(null); setMessage(""); }}
                  className="text-accent hover:underline"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {status === "error" && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-paper placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <p className="text-center text-muted text-sm mt-6">
            Remember it?{" "}
            <Link to="/login" className="text-accent hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}