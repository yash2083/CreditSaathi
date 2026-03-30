import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMSMEs, uploadGSTData, uploadTransactionData, fetchGSTRecords, fetchTransactionRecords } from "../store/msmeSlice";
import { generateScore } from "../store/scoreSlice";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, CreditCard, CheckCircle2, Target } from "lucide-react";

const sampleGST = [
  { filingPeriod: "GSTR3B_2024_01", filingType: "GSTR3B", filedOnTime: true, filingDate: "2024-02-10", taxableRevenue: 450000, taxPaid: 81000, nilReturn: false },
  { filingPeriod: "GSTR3B_2024_02", filingType: "GSTR3B", filedOnTime: true, filingDate: "2024-03-12", taxableRevenue: 520000, taxPaid: 93600, nilReturn: false },
  { filingPeriod: "GSTR3B_2024_03", filingType: "GSTR3B", filedOnTime: false, filingDate: "2024-04-22", taxableRevenue: 380000, taxPaid: 68400, nilReturn: false },
  { filingPeriod: "GSTR3B_2024_04", filingType: "GSTR3B", filedOnTime: true, filingDate: "2024-05-14", taxableRevenue: 610000, taxPaid: 109800, nilReturn: false },
  { filingPeriod: "GSTR3B_2024_05", filingType: "GSTR3B", filedOnTime: true, filingDate: "2024-06-11", taxableRevenue: 490000, taxPaid: 88200, nilReturn: false },
  { filingPeriod: "GSTR3B_2024_06", filingType: "GSTR3B", filedOnTime: true, filingDate: "2024-07-15", taxableRevenue: 570000, taxPaid: 102600, nilReturn: false },
  { filingPeriod: "GSTR3B_2024_07", filingType: "GSTR3B", filedOnTime: true, filingDate: "2024-08-10", taxableRevenue: 630000, taxPaid: 113400, nilReturn: false },
  { filingPeriod: "GSTR3B_2024_08", filingType: "GSTR3B", filedOnTime: false, filingDate: "2024-09-20", taxableRevenue: 420000, taxPaid: 75600, nilReturn: false },
];

const sampleTransactions = [
  { month: "2024-01", totalInflow: 580000, totalOutflow: 420000, upiTransactionCount: 145, upiVolume: 320000, chequeBouncedCount: 0, vendorPaymentsPunctuality: 0.92 },
  { month: "2024-02", totalInflow: 650000, totalOutflow: 480000, upiTransactionCount: 160, upiVolume: 380000, chequeBouncedCount: 1, vendorPaymentsPunctuality: 0.88 },
  { month: "2024-03", totalInflow: 510000, totalOutflow: 450000, upiTransactionCount: 132, upiVolume: 290000, chequeBouncedCount: 0, vendorPaymentsPunctuality: 0.90 },
  { month: "2024-04", totalInflow: 720000, totalOutflow: 510000, upiTransactionCount: 178, upiVolume: 420000, chequeBouncedCount: 0, vendorPaymentsPunctuality: 0.95 },
  { month: "2024-05", totalInflow: 600000, totalOutflow: 470000, upiTransactionCount: 155, upiVolume: 350000, chequeBouncedCount: 2, vendorPaymentsPunctuality: 0.85 },
  { month: "2024-06", totalInflow: 690000, totalOutflow: 500000, upiTransactionCount: 170, upiVolume: 400000, chequeBouncedCount: 0, vendorPaymentsPunctuality: 0.91 },
  { month: "2024-07", totalInflow: 750000, totalOutflow: 530000, upiTransactionCount: 190, upiVolume: 450000, chequeBouncedCount: 0, vendorPaymentsPunctuality: 0.93 },
  { month: "2024-08", totalInflow: 540000, totalOutflow: 480000, upiTransactionCount: 140, upiVolume: 310000, chequeBouncedCount: 1, vendorPaymentsPunctuality: 0.87 },
];

export default function DataUploadPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: msmes, gstRecords, transactionRecords } = useSelector((s) => s.msme);
  const { generating } = useSelector((s) => s.score);
  const [selectedMSME, setSelectedMSME] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { dispatch(fetchMSMEs()); }, [dispatch]);
  useEffect(() => { if (msmes.length > 0 && !selectedMSME) setSelectedMSME(msmes[0]._id); }, [msmes, selectedMSME]);
  useEffect(() => { if (selectedMSME) { dispatch(fetchGSTRecords(selectedMSME)); dispatch(fetchTransactionRecords(selectedMSME)); } }, [selectedMSME, dispatch]);

  const handleGST = async () => { setUploading(true); const r = await dispatch(uploadGSTData({ msmeId: selectedMSME, records: sampleGST })); setResult({ type: "GST", data: r.payload }); dispatch(fetchGSTRecords(selectedMSME)); setUploading(false); };
  const handleTx = async () => { setUploading(true); const r = await dispatch(uploadTransactionData({ msmeId: selectedMSME, records: sampleTransactions })); setResult({ type: "Transaction", data: r.payload }); dispatch(fetchTransactionRecords(selectedMSME)); setUploading(false); };
  const handleScore = async () => { await dispatch(generateScore(selectedMSME)); navigate("/dashboard"); };

  const canScore = gstRecords.length >= 6 && transactionRecords.length >= 6;

  return (
    <div className="space-y-6 max-w-[900px]">
      <div><h1 className="page-title">Data Upload</h1><p className="page-subtitle">Upload GST filing records and bank transactions for credit scoring</p></div>

      {msmes.length === 0 ? (
        <div className="card p-10 text-center">
          <FileSpreadsheet size={28} className="text-txt-muted mx-auto mb-3" />
          <p className="text-txt-secondary mb-4 text-sm">No MSME profile found. Please onboard first.</p>
          <button onClick={() => navigate("/msme/onboard")} className="btn-primary">Onboard MSME</button>
        </div>
      ) : (
        <>
          <div className="card p-5">
            <label className="input-label">Select MSME</label>
            <select className="input-field max-w-md" value={selectedMSME} onChange={(e) => setSelectedMSME(e.target.value)}>
              {msmes.map((m) => <option key={m._id} value={m._id}>{m.businessName} ({m.gstin})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-hover p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center"><FileSpreadsheet size={18} className="text-primary" /></div>
                <div><h3 className="text-sm font-semibold text-txt">GST Filing Records</h3><p className="text-xs text-txt-muted">{gstRecords.length} records uploaded</p></div>
              </div>
              <button onClick={handleGST} disabled={uploading} className="btn-primary text-sm w-full">{uploading ? "Uploading..." : "Upload Sample GST Data (8 months)"}</button>
            </div>
            <div className="card-hover p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center"><CreditCard size={18} className="text-primary" /></div>
                <div><h3 className="text-sm font-semibold text-txt">Transaction Records</h3><p className="text-xs text-txt-muted">{transactionRecords.length} records uploaded</p></div>
              </div>
              <button onClick={handleTx} disabled={uploading} className="btn-primary text-sm w-full">{uploading ? "Uploading..." : "Upload Sample Transactions (8 months)"}</button>
            </div>
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-success text-sm flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} /> {result.data?.message || `${result.type} data uploaded successfully`}
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-txt mb-4">Data Completeness</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${gstRecords.length >= 6 ? "bg-success" : "bg-border"}`} />
                <span className="text-sm text-txt">GST Records: <span className="font-mono font-semibold">{gstRecords.length}/6</span> min</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${transactionRecords.length >= 6 ? "bg-success" : "bg-border"}`} />
                <span className="text-sm text-txt">Transactions: <span className="font-mono font-semibold">{transactionRecords.length}/6</span> min</span>
              </div>
            </div>
            <button onClick={handleScore} disabled={!canScore || generating} className="btn-primary">
              {generating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : canScore ? <><Target size={16} /> Generate Credit Score</> : "Upload minimum 6 months to score"}
            </button>
          </div>

          {gstRecords.length > 0 && (
            <div className="table-container">
              <div className="px-4 py-3 bg-surface-alt border-b border-border"><h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">GST Records</h3></div>
              <table className="w-full">
                <thead><tr><th className="table-header">Period</th><th className="table-header">Type</th><th className="table-header">Revenue</th><th className="table-header">Tax</th><th className="table-header">On Time</th></tr></thead>
                <tbody>{gstRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-surface-alt transition-colors">
                    <td className="table-cell font-mono text-xs">{r.filingPeriod}</td>
                    <td className="table-cell">{r.filingType}</td>
                    <td className="table-cell">₹{r.taxableRevenue?.toLocaleString("en-IN")}</td>
                    <td className="table-cell">₹{r.taxPaid?.toLocaleString("en-IN")}</td>
                    <td className="table-cell">{r.filedOnTime ? <span className="text-success">Yes</span> : <span className="text-danger">No</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
