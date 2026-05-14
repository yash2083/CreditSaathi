import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMSMEs, uploadGSTData } from "../store/msmeSlice";
import {
  ScanLine, Upload, FileImage, CheckCircle2, AlertCircle,
  Loader2, X, Building2, Receipt, IndianRupee, ChevronDown, ChevronUp, Zap, Target
} from "lucide-react";
import api from "../services/api";

export default function InvoiceParserPage() {
  const dispatch = useDispatch();
  const { list: msmes } = useSelector((s) => s.msme);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generatingScore, setGeneratingScore] = useState(false);
  const [generatedScore, setGeneratedScore] = useState(null);
  const [scoreError, setScoreError] = useState(null);
  const [selectedMSME, setSelectedMSME] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => { dispatch(fetchMSMEs()); }, [dispatch]);
  useEffect(() => { if (msmes.length > 0 && !selectedMSME) setSelectedMSME(msmes[0]._id); }, [msmes, selectedMSME]);

  const handleFile = useCallback((f) => {
    if (!f) return;
    setFile(f);
    setParsed(null);
    setError(null);
    setSaved(false);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);
    setParsed(null);
    setSaved(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/parser/invoice", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      if (data.success) {
        setParsed(data.data);
      } else {
        setError(data.error?.message || "Parsing failed");
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Failed to parse invoice");
    } finally {
      setParsing(false);
    }
  };

  const handleSaveAsGST = async () => {
    if (!parsed || !selectedMSME) return;
    setSaving(true);

    const tax = parsed.tax_summary || {};
    const inv = parsed.invoice || {};
    const totalTax = (tax.total_cgst || 0) + (tax.total_sgst || 0) + (tax.total_igst || 0);

    const record = {
      filingPeriod: inv.invoice_date
        ? `INV_${inv.invoice_date.replace(/\//g, "-")}`
        : `INV_${new Date().toISOString().slice(0, 10)}`,
      filingType: "GSTR1",
      filedOnTime: true,
      filingDate: inv.invoice_date
        ? formatDateForAPI(inv.invoice_date)
        : new Date().toISOString().slice(0, 10),
      taxableRevenue: tax.total_taxable_value || 0,
      taxPaid: totalTax || tax.total_tax || 0,
      nilReturn: false,
    };

    try {
      await dispatch(uploadGSTData({ msmeId: selectedMSME, records: [record] }));
      setSaved(true);
    } catch {
      setError("Failed to save GST record");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateScore = async () => {
    if (!parsed || !selectedMSME) return;
    setGeneratingScore(true);
    setScoreError(null);
    setGeneratedScore(null);
    
    try {
      const { data } = await api.post(`/scoring/generate-ai/${selectedMSME}`, parsed);
      if (data.success) {
        setGeneratedScore(data.data);
      } else {
        setScoreError(data.error?.message || "Score generation failed");
      }
    } catch (err) {
      setScoreError(err.response?.data?.error?.message || err.message || "Failed to generate score");
    } finally {
      setGeneratingScore(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setParsed(null);
    setError(null);
    setSaved(false);
    setGeneratedScore(null);
    setScoreError(null);
  };

  return (
    <div className="space-y-6 max-w-[960px]">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <ScanLine size={24} className="text-primary" /> Invoice Parser
        </h1>
        <p className="page-subtitle">
          Upload a GST tax invoice image and our AI will extract structured data automatically
        </p>
      </div>

      {/* MSME selector */}
      {msmes.length > 0 && (
        <div className="card p-5">
          <label className="input-label">Select MSME (for saving parsed data)</label>
          <select
            className="input-field max-w-md"
            value={selectedMSME}
            onChange={(e) => setSelectedMSME(e.target.value)}
          >
            {msmes.map((m) => (
              <option key={m._id} value={m._id}>
                {m.businessName} ({m.gstin})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload zone */}
      {!file ? (
        <div
          className={`card p-10 border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-primary bg-primary-50/30 scale-[1.01]"
              : "border-border hover:border-primary/40 hover:bg-surface-alt/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-50 flex items-center justify-center">
            <Upload size={28} className="text-primary" />
          </div>
          <p className="text-sm font-semibold text-txt mb-1">
            Drop your invoice here or click to browse
          </p>
          <p className="text-xs text-txt-muted">
            Supports PNG, JPEG, WebP — up to 10 MB
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Preview header */}
          <div className="flex items-center justify-between px-5 py-3 bg-surface-alt border-b border-border">
            <div className="flex items-center gap-3">
              <FileImage size={18} className="text-primary" />
              <div>
                <p className="text-sm font-medium text-txt">{file.name}</p>
                <p className="text-xs text-txt-muted">
                  {(file.size / 1024).toFixed(1)} KB • {file.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!parsing && (
                <button onClick={clearFile} className="btn-secondary text-xs py-1.5 px-3">
                  <X size={14} /> Remove
                </button>
              )}
              <button
                onClick={handleParse}
                disabled={parsing}
                className="btn-primary text-xs py-1.5 px-4"
              >
                {parsing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Parsing with AI...
                  </>
                ) : parsed ? (
                  <>
                    <ScanLine size={14} /> Re-parse
                  </>
                ) : (
                  <>
                    <ScanLine size={14} /> Parse Invoice
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Image preview */}
          <div className="p-5 bg-gray-50 flex justify-center max-h-[400px] overflow-auto">
            <img
              src={preview}
              alt="Invoice preview"
              className="max-w-full rounded-lg shadow-sm border border-border"
              style={{ maxHeight: "380px", objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      {/* Parsing spinner */}
      {parsing && (
        <div className="card p-8 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary-50 flex items-center justify-center">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
          <p className="text-sm font-semibold text-txt mb-1">Analyzing Invoice...</p>
          <p className="text-xs text-txt-muted">
            Gemma 4 31B is extracting GST data from your invoice. This may take 15–30 seconds.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-start gap-2 animate-fade-in">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Parsing Failed</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Parsed results */}
      {parsed && !parsing && (
        <div className="space-y-4 animate-fade-in">
          {/* Success banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} />
            Invoice parsed successfully! Review the extracted data below.
          </div>

          {/* Invoice header info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seller */}
            <div className="card-hover p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 size={16} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-txt">Seller</h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-txt">{parsed.seller?.name || "—"}</p>
                <p className="text-txt-muted text-xs">{parsed.seller?.address || ""}</p>
                <p className="font-mono text-xs text-primary">
                  GSTIN: {parsed.seller?.gstin || "—"}
                </p>
                <p className="text-xs text-txt-secondary">
                  State: {parsed.seller?.state || "—"} ({parsed.seller?.state_code || ""})
                </p>
              </div>
            </div>

            {/* Buyer */}
            <div className="card-hover p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Building2 size={16} className="text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold text-txt">Buyer</h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-txt">{parsed.buyer?.name || "—"}</p>
                <p className="text-txt-muted text-xs">{parsed.buyer?.address || ""}</p>
                <p className="font-mono text-xs text-primary">
                  GSTIN: {parsed.buyer?.gstin || "—"}
                </p>
                <p className="text-xs text-txt-secondary">
                  State: {parsed.buyer?.state || "—"} ({parsed.buyer?.state_code || ""})
                </p>
              </div>
            </div>
          </div>

          {/* Invoice details */}
          <div className="card-hover p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Receipt size={16} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-txt">Invoice Details</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoField label="Invoice No." value={parsed.invoice?.invoice_number} />
              <InfoField label="Date" value={parsed.invoice?.invoice_date} />
              <InfoField label="HSN/SAC" value={parsed.invoice?.hsn_sac_code} />
              <InfoField label="Place of Supply" value={parsed.invoice?.place_of_supply} />
            </div>
          </div>

          {/* Line items */}
          {parsed.line_items?.length > 0 && (
            <div className="table-container">
              <button
                onClick={() => setShowItems(!showItems)}
                className="w-full px-4 py-3 bg-surface-alt border-b border-border flex items-center justify-between"
              >
                <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wide">
                  Line Items ({parsed.line_items.length})
                </h3>
                {showItems ? <ChevronUp size={14} className="text-txt-muted" /> : <ChevronDown size={14} className="text-txt-muted" />}
              </button>
              {showItems && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Description</th>
                        <th className="table-header">HSN</th>
                        <th className="table-header text-right">Qty</th>
                        <th className="table-header text-right">Rate</th>
                        <th className="table-header text-right">Taxable</th>
                        <th className="table-header text-right">CGST</th>
                        <th className="table-header text-right">SGST</th>
                        <th className="table-header text-right">IGST</th>
                        <th className="table-header text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.line_items.map((item, i) => (
                        <tr key={i} className="hover:bg-surface-alt transition-colors">
                          <td className="table-cell text-xs">{item.description || "—"}</td>
                          <td className="table-cell font-mono text-xs">{item.hsn_sac || "—"}</td>
                          <td className="table-cell text-right font-mono text-xs">{item.quantity || "—"}</td>
                          <td className="table-cell text-right font-mono text-xs">₹{fmt(item.rate)}</td>
                          <td className="table-cell text-right font-mono text-xs">₹{fmt(item.taxable_value)}</td>
                          <td className="table-cell text-right font-mono text-xs">
                            {item.cgst_amount ? `₹${fmt(item.cgst_amount)}` : "—"}
                          </td>
                          <td className="table-cell text-right font-mono text-xs">
                            {item.sgst_amount ? `₹${fmt(item.sgst_amount)}` : "—"}
                          </td>
                          <td className="table-cell text-right font-mono text-xs">
                            {item.igst_amount ? `₹${fmt(item.igst_amount)}` : "—"}
                          </td>
                          <td className="table-cell text-right font-mono text-xs font-semibold">₹{fmt(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tax summary */}
          <div className="card-hover p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <IndianRupee size={16} className="text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-txt">Tax Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SummaryField label="Taxable Value" value={parsed.tax_summary?.total_taxable_value} />
              <SummaryField label="CGST" value={parsed.tax_summary?.total_cgst} />
              <SummaryField label="SGST" value={parsed.tax_summary?.total_sgst} />
              <SummaryField label="IGST" value={parsed.tax_summary?.total_igst} />
              <SummaryField label="Total Tax" value={parsed.tax_summary?.total_tax} highlight />
              <SummaryField label="Total Amount" value={parsed.tax_summary?.total_amount} highlight />
            </div>
            {parsed.tax_summary?.amount_in_words && (
              <p className="mt-3 text-xs text-txt-muted italic">
                {parsed.tax_summary.amount_in_words}
              </p>
            )}
          </div>

          {/* Save action */}
          {msmes.length > 0 && (
            <div className="card p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-txt">Save as GST Record</p>
                <p className="text-xs text-txt-muted mt-0.5">
                  Push the extracted data into your MSME's GST filing records
                </p>
              </div>
              <button
                onClick={handleSaveAsGST}
                disabled={saving || saved}
                className="btn-primary text-sm"
              >
                {saved ? (
                  <><CheckCircle2 size={16} /> Saved!</>
                ) : saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Upload size={16} /> Save to GST Records</>
                )}
              </button>
            </div>
          )}

          {saved && !generatedScore && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} />
              GST record saved successfully! You can view it in the Data Upload page.
            </div>
          )}

          {/* AI Score Generation action */}
          {saved && !generatedScore && (
            <div className="card p-5 flex items-center justify-between border-primary/20 bg-primary-50/10">
              <div>
                <p className="text-sm font-semibold text-txt flex items-center gap-1.5">
                  <Zap size={16} className="text-primary" /> Generate Credit Score (XGBoost Ensemble)
                </p>
                <p className="text-xs text-txt-muted mt-0.5">
                  Run the parsed invoice data through our advanced risk models to generate a credit score instantly.
                </p>
              </div>
              <button
                onClick={handleGenerateScore}
                disabled={generatingScore}
                className="btn-primary text-sm shadow-md hover:shadow-lg transition-shadow"
              >
                {generatingScore ? (
                  <><Loader2 size={16} className="animate-spin" /> Evaluating Risk...</>
                ) : (
                  <><Target size={16} /> Generate Score</>
                )}
              </button>
            </div>
          )}

          {/* AI Score Error */}
          {scoreError && (
             <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-start gap-2 animate-fade-in">
             <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
             <div>
               <p className="font-medium">Score Generation Failed</p>
               <p className="text-xs mt-0.5 opacity-80">{scoreError}</p>
             </div>
           </div>
          )}

          {/* Generated AI Score Card */}
          {generatedScore && (
            <div className="card overflow-hidden border-primary/30 shadow-lg animate-fade-in">
              <div className="bg-gradient-to-r from-primary to-blue-600 px-5 py-4 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-lg font-bold flex items-center gap-2"><Target size={20} /> Credit Score Generated</h2>
                    <p className="text-primary-100 text-xs mt-0.5 opacity-90">Model: {generatedScore.modelVersion}</p>
                 </div>
                 <div className="text-right">
                    <div className="text-3xl font-extrabold tracking-tight">{generatedScore.scoreValue}</div>
                    <div className="text-xs font-medium uppercase tracking-wider text-primary-50">{generatedScore.riskCategory} Risk</div>
                 </div>
              </div>
              
              <div className="p-5 space-y-5">
                 <p className="text-sm text-txt leading-relaxed">
                   {generatedScore.explanationText}
                 </p>

                 {generatedScore.shapSummary?.length > 0 && (
                   <div>
                     <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                       <Zap size={14} className="text-amber-500" /> Key Drivers (SHAP Explanations)
                     </h3>
                     <div className="space-y-2">
                       {generatedScore.shapSummary.map((item, i) => (
                         <div key={i} className="flex items-start gap-3 p-3 bg-surface-alt rounded-lg border border-border">
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${item.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div>
                               <p className="text-xs font-semibold text-txt">{item.feature}</p>
                               <p className="text-xs text-txt-muted mt-0.5">{item.description}</p>
                            </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {generatedScore.stressSignals?.length > 0 && (
                   <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                     <h3 className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                       <AlertCircle size={14} /> Stress Signals Detected
                     </h3>
                     <ul className="list-disc pl-5 space-y-1">
                       {generatedScore.stressSignals.map((sig, i) => (
                         <li key={i} className="text-xs text-red-700">{typeof sig === 'string' ? sig : sig.signal || sig.message || JSON.stringify(sig)}</li>
                       ))}
                     </ul>
                   </div>
                 )}
              </div>
            </div>
          )}

          {/* Raw JSON toggle */}
          <details className="card overflow-hidden">
            <summary className="px-4 py-3 bg-surface-alt border-b border-border cursor-pointer text-xs font-semibold text-txt-secondary uppercase tracking-wide hover:bg-gray-100 transition-colors">
              Raw JSON Response
            </summary>
            <pre className="p-4 text-xs text-txt-secondary overflow-auto max-h-[400px] bg-gray-50 font-mono leading-relaxed">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

/* ── Helper components ── */

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-txt-muted font-semibold mb-0.5">{label}</p>
      <p className="text-sm text-txt font-medium">{value || "—"}</p>
    </div>
  );
}

function SummaryField({ label, value, highlight }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? "bg-primary-50" : "bg-gray-50"}`}>
      <p className="text-[10px] uppercase tracking-wide text-txt-muted font-semibold mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold ${highlight ? "text-primary" : "text-txt"}`}>
        ₹{fmt(value)}
      </p>
    </div>
  );
}

/* ── Utilities ── */

function fmt(n) {
  if (n === null || n === undefined || n === "" || n === 0) return "0.00";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateForAPI(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  // Handle DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3 && parts[0].length <= 2) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return dateStr;
}
