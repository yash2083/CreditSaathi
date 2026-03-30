import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createMSME } from "../store/msmeSlice";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const sectors = ["Textile", "Retail", "Manufacturing", "Food Processing", "Construction", "Services", "IT/Software", "Agriculture", "Healthcare", "Education"];
const states = ["Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu", "Delhi", "Uttar Pradesh", "Rajasthan", "West Bengal", "Telangana", "Madhya Pradesh", "Kerala", "Punjab", "Haryana", "Bihar", "Andhra Pradesh", "Other"];

export default function MSMEOnboardingPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ businessName: "", gstin: "", pan: "", businessType: "micro", sector: "Retail", registeredState: "Maharashtra", city: "", contactEmail: "", contactPhone: "", udyamRegistrationNo: "", annualTurnoverBand: "<40L", employeeCount: "" });
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((s) => s.msme);
  const update = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    setError(null);
    const r = await dispatch(createMSME({ ...form, employeeCount: parseInt(form.employeeCount) || 0 }));
    if (r.type === "msme/create/fulfilled") navigate("/dashboard");
    else setError(r.payload || "Failed to create MSME profile");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Onboard MSME</h1>
      <p className="page-subtitle mb-6">Register your business to get started with credit scoring</p>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        {["Basic Info", "Financial Info", "Confirm"].map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${s === step ? "bg-primary text-white" : s < step ? "bg-success text-white" : "bg-surface-alt text-txt-muted border border-border"}`}>
                  {s < step ? <Check size={14} /> : s}
                </div>
                <span className={`text-xs font-medium ${s === step ? "text-txt" : "text-txt-muted"}`}>{label}</span>
              </div>
              {s < 3 && <div className={`w-8 h-px ${s < step ? "bg-success" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-danger text-sm mb-4">{error}</div>}

      <div className="card p-6">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div><label className="input-label">Business Name *</label><input className="input-field" placeholder="ABC Textiles Pvt Ltd" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="input-label">GSTIN *</label><input className="input-field font-mono" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={(e) => update("gstin", e.target.value.toUpperCase())} maxLength={15} /></div>
              <div><label className="input-label">PAN</label><input className="input-field font-mono" placeholder="AAAAA0000A" value={form.pan} onChange={(e) => update("pan", e.target.value.toUpperCase())} maxLength={10} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="input-label">Business Type *</label><select className="input-field" value={form.businessType} onChange={(e) => update("businessType", e.target.value)}><option value="micro">Micro</option><option value="small">Small</option><option value="medium">Medium</option></select></div>
              <div><label className="input-label">Sector *</label><select className="input-field" value={form.sector} onChange={(e) => update("sector", e.target.value)}>{sectors.map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="input-label">State *</label><select className="input-field" value={form.registeredState} onChange={(e) => update("registeredState", e.target.value)}>{states.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="input-label">City</label><input className="input-field" placeholder="Mumbai" value={form.city} onChange={(e) => update("city", e.target.value)} /></div>
            </div>
            <div className="flex justify-end pt-2"><button onClick={() => setStep(2)} className="btn-primary" disabled={!form.businessName || !form.gstin}>Next</button></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="input-label">Contact Email *</label><input type="email" className="input-field" placeholder="info@abc.com" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} /></div>
              <div><label className="input-label">Contact Phone *</label><input className="input-field" placeholder="+91 98765 43210" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} /></div>
            </div>
            <div><label className="input-label">Udyam Registration No</label><input className="input-field font-mono" placeholder="UDYAM-XX-00-0000000" value={form.udyamRegistrationNo} onChange={(e) => update("udyamRegistrationNo", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="input-label">Annual Turnover</label><select className="input-field" value={form.annualTurnoverBand} onChange={(e) => update("annualTurnoverBand", e.target.value)}><option value="<40L">Under ₹40L</option><option value="40L-1.5Cr">₹40L – ₹1.5Cr</option><option value="1.5Cr-5Cr">₹1.5Cr – ₹5Cr</option><option value="5Cr-25Cr">₹5Cr – ₹25Cr</option><option value=">25Cr">Over ₹25Cr</option></select></div>
              <div><label className="input-label">Employees</label><input type="number" className="input-field" placeholder="25" value={form.employeeCount} onChange={(e) => update("employeeCount", e.target.value)} /></div>
            </div>
            <div className="flex justify-between pt-2"><button onClick={() => setStep(1)} className="btn-secondary">Back</button><button onClick={() => setStep(3)} className="btn-primary" disabled={!form.contactEmail || !form.contactPhone}>Next</button></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-txt">Confirm Details</h3>
            <div className="bg-surface-alt rounded-lg p-4 space-y-2.5 text-sm">
              {[["Business", form.businessName], ["GSTIN", form.gstin], ["Type", form.businessType], ["Sector", form.sector], ["Location", `${form.city}, ${form.registeredState}`], ["Email", form.contactEmail], ["Phone", form.contactPhone], ["Turnover", form.annualTurnoverBand]].map(([l, v], i) => (
                <div key={i} className="flex justify-between"><span className="text-txt-secondary">{l}</span><span className={`text-txt font-medium ${l === "GSTIN" ? "font-mono" : ""}`}>{v}</span></div>
              ))}
            </div>
            <div className="flex justify-between pt-2"><button onClick={() => setStep(2)} className="btn-secondary">Back</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? "Creating..." : "Create MSME Profile"}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
