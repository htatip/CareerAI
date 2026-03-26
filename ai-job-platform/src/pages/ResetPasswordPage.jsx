import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import API from "../api/axios";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Invalid / missing token guard
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-paper">Invalid reset link</h2>
          <p className="text-muted text-sm">This link is missing a token. Please request a new one.</p>
          <Link to="/forgot-password" className="inline-block mt-2 text-accent hover:underline text-sm">
            Request new link →
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/api/auth/reset-password", {
        token,
        newPassword: form.password,
      });
      navigate("/login", {
        state: { message: "Password reset successfully. Please sign in." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-paper mb-2">
            Reset password
          </h1>
          <p className="text-muted">Choose a strong new password for your account.</p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {[
              { name: "password",        label: "New password",      placeholder: "Min. 8 characters" },
              { name: "confirmPassword", label: "Confirm password",  placeholder: "Repeat your password" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  {field.label}
                </label>
                <input
                  type="password"
                  name={field.name}
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={handleChange}
                  required
                  className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-paper placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors text-sm"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            Back to{" "}
            <Link to="/login" className="text-accent hover:underline">
              sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}