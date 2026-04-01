import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMSMEs, fetchGSTRecords, fetchTransactionRecords } from "../store/msmeSlice";
import { fetchLatestScore, fetchScoreHistory } from "../store/scoreSlice";
import { fetchLoans } from "../store/loanSlice";
import { useNavigate } from "react-router-dom";
import { BarChart3, Target, Wallet, FileCheck, Upload, Landmark, PlusCircle, AlertTriangle } from "lucide-react";
import StatsCard from "../components/StatsCard";
import ScoreGauge from "../components/ScoreGauge";
import SHAPPanel from "../components/SHAPPanel";
import RiskBadge from "../components/RiskBadge";
import RevenueChart from "../components/RevenueChart";
import CashFlowChart from "../components/CashFlowChart";
import ScoreHistoryChart from "../components/ScoreHistoryChart";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { list: msmes, gstRecords, transactionRecords } = useSelector((s) => s.msme);
  const { latest, history } = useSelector((s) => s.score);
  const { list: loans } = useSelector((s) => s.loan);

  useEffect(() => { dispatch(fetchMSMEs()); dispatch(fetchLoans()); }, [dispatch]);

  useEffect(() => {
    if (msmes.length > 0) {
      const msmeId = msmes[0]._id;
      dispatch(fetchLatestScore(msmeId));
      dispatch(fetchScoreHistory(msmeId));
      dispatch(fetchGSTRecords(msmeId));
      dispatch(fetchTransactionRecords(msmeId));
    }
  }, [msmes, dispatch]);

  const msme = msmes[0];
  const isBanker = user?.role === "bank_officer" || user?.role === "admin";

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{isBanker ? "Portfolio Overview" : "Dashboard"}</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
        {!msme && <button onClick={() => navigate("/msme/onboard")} className="btn-primary"><PlusCircle size={16} /> Onboard MSME</button>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isBanker ? (
          <>
            <StatsCard icon={BarChart3} label="Portfolio" value={msmes.length} subtitle="Total MSMEs" />
            <StatsCard icon={Target} label="Scored" value={msmes.filter((m) => m.latestScoreId).length} subtitle="Assessments complete" />
            <StatsCard icon={Wallet} label="Applications" value={loans.length} subtitle="Active loans" />
            <StatsCard icon={AlertTriangle} label="High Risk" value={msmes.filter((m) => m.latestScoreId?.riskCategory === "High").length} />
          </>
        ) : (
          <>
            <StatsCard icon={BarChart3} label="Credit Score" value={latest?.scoreValue || "—"} subtitle={latest ? `Updated ${new Date(latest.createdAt).toLocaleDateString("en-IN")}` : "Not scored"} />
            <StatsCard icon={Target} label="Risk Level" value={latest?.riskCategory || "—"} />
            <StatsCard icon={Wallet} label="Loan Eligibility" value={latest?.recommendedLoanAmount ? `₹${(latest.recommendedLoanAmount / 100000).toFixed(0)}L` : "—"} subtitle={latest?.recommendedInterestBand || ""} />
            <StatsCard icon={FileCheck} label="Status" value={msme ? "Active" : "Pending"} subtitle={msme ? "Data connected" : "Onboard to begin"} />
          </>
        )}
      </div>

      {/* Main Content */}
      {msme ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Score + SHAP */}
          <div className="lg:col-span-4 space-y-5">
            <div className="card p-6 text-center">
              <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-5">Credit Score</h3>
              {latest ? (
                <>
                  <ScoreGauge score={latest.scoreValue} />
                  <div className="mt-3"><RiskBadge category={latest.riskCategory} score={latest.scoreValue} /></div>
                  {latest.explanationText && <p className="text-xs text-txt-muted mt-4 leading-relaxed">{latest.explanationText}</p>}
                </>
              ) : (
                <div className="py-8">
                  <p className="text-txt-muted text-sm mb-4">No score generated yet</p>
                  <button onClick={() => navigate("/data-upload")} className="btn-primary text-sm"><Upload size={14} /> Upload Data</button>
                </div>
              )}
            </div>
            {latest && <SHAPPanel shapSummary={latest.shapSummary} shapValues={latest.shapValues} />}
          </div>

          {/* Charts + Insights */}
          <div className="lg:col-span-8 space-y-5">
            <RevenueChart data={gstRecords} />
            <CashFlowChart data={transactionRecords} />
            <ScoreHistoryChart data={history} />

            {/* Stress Signals */}
            {latest?.stressSignals?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-txt mb-1 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-warning" /> Early Warning Signals
                </h3>
                <p className="text-xs text-txt-muted mb-3">Potential risk indicators detected in the data</p>
                <div className="space-y-2">
                  {latest.stressSignals.map((s, i) => (
                    <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-sm ${s.severity === "critical" ? "bg-red-50 text-danger border border-red-100" : "bg-amber-50 text-amber-800 border border-amber-100"}`}>
                      <span className="mt-0.5 flex-shrink-0">{s.severity === "critical" ? <AlertTriangle size={14} /> : <AlertTriangle size={14} />}</span>
                      <span className="text-xs leading-relaxed">{s.description || s.signal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Government Schemes */}
            {latest?.eligibleGovernmentSchemes?.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-txt mb-3">Eligible Government Schemes</h3>
                <div className="flex flex-wrap gap-2">
                  {latest.eligibleGovernmentSchemes.map((s, i) => (
                    <span key={i} className="badge-low text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Upload, title: "Upload Data", sub: "Import GST & transactions", path: "/data-upload" },
                { icon: Landmark, title: "Apply for Loan", sub: "Submit application", path: "/loans" },
                { icon: PlusCircle, title: "Add MSME", sub: "Onboard business", path: "/msme/onboard" },
              ].map((a, i) => (
                <button key={i} onClick={() => navigate(a.path)} className="card-hover p-4 text-left">
                  <a.icon size={18} className="text-primary mb-2" strokeWidth={1.8} />
                  <p className="text-sm font-medium text-txt">{a.title}</p>
                  <p className="text-xs text-txt-muted mt-0.5">{a.sub}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-txt mb-2">No MSME Profile Found</h2>
          <p className="text-txt-secondary text-sm mb-6 max-w-md mx-auto">
            Get started by onboarding your MSME business profile. Upload your GST and transaction data to receive an AI-powered credit score.
          </p>
          <button onClick={() => navigate("/msme/onboard")} className="btn-primary"><PlusCircle size={16} /> Onboard Your MSME</button>
        </div>
      )}
    </div>
  );
}
