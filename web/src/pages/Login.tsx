import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid bg-radial-fade pointer-events-none" />
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[700px] rounded-full bg-brand-600/20 blur-[120px] pointer-events-none"
        aria-hidden
      />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-base font-bold text-white">
            L
          </span>
          <span className="text-xl font-semibold text-white">Locara SSH</span>
        </Link>
        <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl shadow-black/40">
          <h1 className="text-lg font-semibold text-white">Log in</h1>
          {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium py-2 transition-colors shadow-lg shadow-brand-900/40"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
          <p className="text-sm text-slate-500 text-center">
            No account?{" "}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
