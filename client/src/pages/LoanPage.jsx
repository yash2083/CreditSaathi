import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMSMEs } from "../store/msmeSlice";
import { fetchLatestScore } from "../store/scoreSlice";
import { submitLoan, fetchLoans, updateLoanStatus } from "../store/loanSlice";
import { Landmark, PlusCircle } from "lucide-react";

const purposeLabels = { working_capital: "Working Capital", equipment: "Equipment Purchase", expansion: "Business Expansion", other: "Other" };
const statusBadge = { submitted: "badge-medium", under_review: "badge-medium", approved: "badge-low", rejected: "badge-high", disbursed: "badge-low" };

export default function LoanPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list: msmes } = useSelector((s) => s.msme);
  const { latest } = useSelector((s) => s.score);
  const { list: loans } = useSelector((s) => s.loan);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ requestedAmount: "", loanPurpose: "working_capital", repaymentTenure: 12 });
  const [actionId, setActionId] = useState(null);
  const [af, setAf] = useState({ status: "", officerRemarks: "" });
  const isBanker = user?.role === "bank_officer" || user?.role === "admin";

  useEffect(() => { dispatch(fetchMSMEs()); dispatch(fetchLoans()); }, [dispatch]);
  useEffect(() => { if (msmes.length > 0) dispatch(fetchLatestScore(msmes[0]._id)); }, [msmes, dispatch]);

  const handleApply = async () => {
    if (!latest || !msmes[0]) return;
    await dispatch(submitLoan({ msmeId: msmes[0]._id, scoreId: latest._id, requestedAmount: parseInt(form.requestedAmount), loanPurpose: form.loanPurpose, repaymentTenure: parseInt(form.repaymentTenure) }));
    setShow(false); dispatch(fetchLoans());
  };

  const handleAction = async (id) => { await dispatch(updateLoanStatus({ id, ...af })); setActionId(null); dispatch(fetchLoans()); };

  return (
    <div className="space-y-6 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">{isBanker ? "Loan Management" : "Loan Center"}</h1><p className="page-subtitle">{isBanker ? "Review and manage applications" : "Apply for loans and track status"}</p></div>
        {!isBanker && latest && <button onClick={() => setShow(!show)} className={show ? "btn-secondary" : "btn-primary"}>{show ? "Cancel" : <><PlusCircle size={16} /> Apply for Loan</>}</button>}
      </div>

      {!isBanker && latest && (
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-4">Your Loan Eligibility</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div><p className="text-xs text-txt-muted mb-1">Max Amount</p><p className="text-xl font-bold text-txt">{latest.recommendedLoanAmount ? `₹${(latest.recommendedLoanAmount / 100000).toFixed(0)}L` : "—"}</p></div>
            <div><p className="text-xs text-txt-muted mb-1">Interest Band</p><p className="text-xl font-bold text-txt">{latest.recommendedInterestBand || "—"}</p></div>
            <div><p className="text-xs text-txt-muted mb-1">Credit Score</p><p className="text-xl font-bold text-primary">{latest.scoreValue}</p></div>
          </div>
        </div>
      )}

      {show && (
        <div className="card p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-txt mb-4">New Loan Application</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="input-label">Amount (₹)</label><input type="number" className="input-field" placeholder="1000000" value={form.requestedAmount} onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })} /></div>
            <div><label className="input-label">Purpose</label><select className="input-field" value={form.loanPurpose} onChange={(e) => setForm({ ...form, loanPurpose: e.target.value })}>{Object.entries(purposeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label className="input-label">Tenure (months)</label><input type="number" className="input-field" value={form.repaymentTenure} onChange={(e) => setForm({ ...form, repaymentTenure: e.target.value })} /></div>
          </div>
          <button onClick={handleApply} className="btn-primary mt-4">Submit Application</button>
        </div>
      )}

      {loans.length > 0 ? (
        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Business</th><th className="table-header">Amount</th><th className="table-header">Purpose</th><th className="table-header">Score</th><th className="table-header">Status</th><th className="table-header">Date</th>{isBanker && <th className="table-header">Actions</th>}
            </tr></thead>
            <tbody>{loans.map((l) => (
              <tr key={l._id} className="hover:bg-surface-alt transition-colors">
                <td className="table-cell font-medium text-txt">{l.msmeId?.businessName || "—"}</td>
                <td className="table-cell font-mono">₹{(l.requestedAmount || 0).toLocaleString("en-IN")}</td>
                <td className="table-cell">{purposeLabels[l.loanPurpose] || l.loanPurpose}</td>
                <td className="table-cell font-mono">{l.scoreId?.scoreValue || "—"}</td>
                <td className="table-cell"><span className={statusBadge[l.status] || "badge"}>{l.status?.replace("_", " ")}</span></td>
                <td className="table-cell text-xs text-txt-muted">{new Date(l.createdAt).toLocaleDateString("en-IN")}</td>
                {isBanker && <td className="table-cell">
                  {l.status === "submitted" && (actionId === l._id ? (
                    <div className="flex items-center gap-2">
                      <select className="input-field py-1 text-xs" value={af.status} onChange={(e) => setAf({ ...af, status: e.target.value })}><option value="">Select</option><option value="approved">Approve</option><option value="rejected">Reject</option></select>
                      <input className="input-field py-1 text-xs w-24" placeholder="Remarks" value={af.officerRemarks} onChange={(e) => setAf({ ...af, officerRemarks: e.target.value })} />
                      <button onClick={() => handleAction(l._id)} className="btn-primary py-1 px-3 text-xs">Go</button>
                    </div>
                  ) : <button onClick={() => setActionId(l._id)} className="btn-secondary py-1 px-3 text-xs">Review</button>)}
                </td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Landmark size={28} className="text-txt-muted mx-auto mb-3" />
          <p className="text-txt-secondary text-sm">No loan applications yet.</p>
        </div>
      )}
    </div>
  );
}
