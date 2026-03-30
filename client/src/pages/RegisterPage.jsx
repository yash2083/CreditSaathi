import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, clearError } from "../store/authSlice";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "msme_owner", organisationName: "" });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(registerUser(form));
    if (result.type === "auth/register/fulfilled") navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg flex">
      <div className="hidden lg:flex lg:w-[48%] bg-primary-50 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">CS</div>
            <span className="text-base font-semibold text-txt">CreditSaathi</span>
          </div>
          <h2 className="text-3xl font-bold text-txt leading-tight tracking-tight max-w-md">
            Get started in minutes, not weeks
          </h2>
          <p className="text-txt-secondary mt-4 text-sm max-w-sm leading-relaxed">
            Onboard your MSME, upload GST and transaction data, and receive an AI-powered credit score with full transparency.
          </p>
          <div className="mt-10 space-y-3">
            {["Create your account", "Onboard MSME profile", "Upload financial data", "Get AI credit score"].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-semibold text-primary shadow-subtle">{i + 1}</div>
                <span className="text-sm text-txt-secondary">{s}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-txt-muted">© 2024 CreditSaathi Technologies</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">CS</div>
          </div>
          <h1 className="text-xl font-bold text-txt">Create account</h1>
          <p className="text-txt-secondary text-sm mt-1 mb-6">Join CreditSaathi</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-danger text-sm">{error}</div>}
            <div>
              <label className="input-label">Full Name</label>
              <input type="text" className="input-field" placeholder="Rajesh Kumar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" className="input-field" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input type="password" className="input-field" placeholder="Minimum 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Role</label>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="msme_owner">MSME Owner</option>
                  <option value="bank_officer">Bank Officer</option>
                </select>
              </div>
              <div>
                <label className="input-label">Organisation</label>
                <input type="text" className="input-field" placeholder="Company" value={form.organisationName} onChange={(e) => setForm({ ...form, organisationName: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? "Creating..." : <><span>Create Account</span> <ArrowRight size={16} /></>}
            </button>
          </form>
          <p className="text-center text-sm text-txt-secondary mt-6">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
