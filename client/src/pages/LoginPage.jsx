import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearError } from "../store/authSlice";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Shield, BarChart3, Landmark } from "lucide-react";

const highlights = [
  { icon: Shield, text: "Bank-grade security and data encryption" },
  { icon: BarChart3, text: "AI-powered credit scoring with SHAP explainability" },
  { icon: Landmark, text: "Automated loan eligibility and scheme matching" },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(loginUser(form));
    if (result.type === "auth/login/fulfilled") navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[48%] bg-primary-50 flex-col justify-between p-12 relative">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">CS</div>
            <span className="text-base font-semibold text-txt">CreditSaathi</span>
          </div>

          <h2 className="text-3xl font-bold text-txt leading-tight tracking-tight max-w-md">
            Smarter credit decisions for growing businesses
          </h2>
          <p className="text-txt-secondary mt-4 text-sm leading-relaxed max-w-sm">
            AI-powered credit intelligence helping India's 63M+ MSMEs access fair, transparent lending.
          </p>

          <div className="mt-10 space-y-4">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-subtle">
                  <h.icon size={16} className="text-primary" strokeWidth={1.8} />
                </div>
                <span className="text-sm text-txt-secondary">{h.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-txt-muted">© 2024 CreditSaathi Technologies</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">CS</div>
            <span className="text-sm font-semibold text-txt">CreditSaathi</span>
          </div>

          <h1 className="text-xl font-bold text-txt">Welcome back</h1>
          <p className="text-txt-secondary text-sm mt-1 mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-danger text-sm">{error}</div>
            )}
            <div>
              <label className="input-label">Email address</label>
              <input type="email" className="input-field" placeholder="you@company.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input type="password" className="input-field" placeholder="Enter your password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-txt-secondary mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
