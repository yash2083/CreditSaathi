import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMSMEs } from "../store/msmeSlice";
import { useNavigate } from "react-router-dom";
import { PlusCircle, Building2 } from "lucide-react";
import RiskBadge from "../components/RiskBadge";

export default function MSMEListPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: msmes, loading } = useSelector((s) => s.msme);

  useEffect(() => { dispatch(fetchMSMEs()); }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">MSME Portfolio</h1><p className="page-subtitle">{msmes.length} businesses managed</p></div>
        <button onClick={() => navigate("/msme/onboard")} className="btn-primary"><PlusCircle size={16} /> Onboard MSME</button>
      </div>

      {loading ? (
        <div className="card p-12 text-center"><span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" /></div>
      ) : msmes.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={28} className="text-txt-muted mx-auto mb-3" />
          <p className="text-txt-secondary text-sm">No MSMEs in your portfolio.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Business Name</th><th className="table-header">GSTIN</th><th className="table-header">Sector</th><th className="table-header">Type</th><th className="table-header">Score</th><th className="table-header">Status</th>
            </tr></thead>
            <tbody>{msmes.map((m) => (
              <tr key={m._id} className="hover:bg-surface-alt transition-colors cursor-pointer" onClick={() => navigate("/dashboard")}>
                <td className="table-cell font-medium text-txt">{m.businessName}</td>
                <td className="table-cell font-mono text-xs">{m.gstin}</td>
                <td className="table-cell">{m.sector}</td>
                <td className="table-cell capitalize">{m.businessType}</td>
                <td className="table-cell">{m.latestScoreId ? <RiskBadge category={m.latestScoreId.riskCategory} score={m.latestScoreId.scoreValue} /> : <span className="text-txt-muted text-xs">Not scored</span>}</td>
                <td className="table-cell"><span className={m.status === "active" ? "badge-low" : "badge-high"}>{m.status || "active"}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
