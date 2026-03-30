const CreditScore = require("../models/CreditScore");
const MSME = require("../models/MSME");
const GSTRecord = require("../models/GSTRecord");
const TransactionRecord = require("../models/TransactionRecord");
const asyncHandler = require("../middleware/error.middleware");
const { callMLService } = require("../services/ml.service");
const { createAuditLog } = require("../services/audit.service");
const crypto = require("crypto");

// Helper: assemble feature vector from MSME data
const assembleFeatures = async (msmeId) => {
  const gstRecords = await GSTRecord.find({ msmeId }).sort("filingDate");
  const txRecords = await TransactionRecord.find({ msmeId }).sort("month");

  if (gstRecords.length < 6 || txRecords.length < 6) {
    return null;
  }

  const totalFilings = gstRecords.length;
  const onTimeFilings = gstRecords.filter((r) => r.filedOnTime).length;
  const nilReturns = gstRecords.filter((r) => r.nilReturn).length;
  const revenues = gstRecords.map((r) => r.taxableRevenue);
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;

  const lastQuarterRevenue = revenues.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const firstQuarterRevenue = revenues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const revenueGrowthRate = firstQuarterRevenue > 0
    ? ((lastQuarterRevenue - firstQuarterRevenue) / firstQuarterRevenue) * 100
    : 0;

  const netCashFlows = txRecords.map((r) => r.totalInflow - r.totalOutflow);
  const avgNetCashFlow = netCashFlows.reduce((a, b) => a + b, 0) / netCashFlows.length;
  const mean = avgNetCashFlow;
  const variance = netCashFlows.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / netCashFlows.length;
  const cashFlowVolatility = Math.sqrt(variance);

  const upiVolumes = txRecords.map((r) => r.upiVolume || 0);
  const lastUpi = upiVolumes.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const firstUpi = upiVolumes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const upiVolumeGrowth = firstUpi > 0 ? ((lastUpi - firstUpi) / firstUpi) * 100 : 0;

  const totalBounces = txRecords.reduce((sum, r) => sum + (r.chequeBouncedCount || 0), 0);
  const totalTx = txRecords.length;
  const chequeBounceRate = totalTx > 0 ? totalBounces / (totalTx * 10) : 0;

  const vendorScores = txRecords.map((r) => r.vendorPaymentsPunctuality || 0.5);
  const vendorPaymentScore = vendorScores.reduce((a, b) => a + b, 0) / vendorScores.length;

  return {
    gst_filing_rate: totalFilings > 0 ? Math.min(totalFilings / (totalFilings + 2), 1) : 0,
    gst_on_time_rate: totalFilings > 0 ? onTimeFilings / totalFilings : 0,
    avg_monthly_revenue: avgRevenue,
    revenue_growth_rate: Math.max(-100, Math.min(200, revenueGrowthRate)),
    avg_net_cash_flow: avgNetCashFlow,
    cash_flow_volatility: cashFlowVolatility,
    upi_volume_growth: Math.max(-100, Math.min(200, upiVolumeGrowth)),
    cheque_bounce_rate: Math.min(chequeBounceRate, 1),
    vendor_payment_score: vendorPaymentScore,
    nil_return_ratio: totalFilings > 0 ? nilReturns / totalFilings : 0,
  };
};

// Loan recommendation mapping
const getLoanRecommendation = (score) => {
  if (score >= 700) return { amount: 5000000, band: "8-10%", schemes: ["Mudra Yojana (Tarun)", "CGTMSE", "PSB Loans 59 Min"] };
  if (score >= 650) return { amount: 2500000, band: "10-13%", schemes: ["Mudra Yojana (Kishor)", "CGTMSE", "PSB Loans 59 Min"] };
  if (score >= 600) return { amount: 1000000, band: "13-16%", schemes: ["Mudra Yojana (Kishor)", "CGTMSE"] };
  if (score >= 550) return { amount: 500000, band: "16-20%", schemes: ["Mudra Yojana (Shishu)"] };
  return { amount: 0, band: "N/A", schemes: [] };
};

// POST /api/v1/scoring/generate/:msmeId
const generateScore = asyncHandler(async (req, res) => {
  const msme = await MSME.findById(req.params.msmeId);
  if (!msme) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "MSME not found." } });
  }

  const features = await assembleFeatures(msme._id);
  if (!features) {
    return res.status(400).json({
      success: false,
      error: { code: "INSUFFICIENT_DATA", message: "Minimum 6 months of GST and transaction data required." },
    });
  }

  let mlResult;
  try {
    mlResult = await callMLService(features);
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: { code: "ML_SERVICE_ERROR", message: error.message },
    });
  }

  const loan = getLoanRecommendation(mlResult.score);

  const auditHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ features, score: mlResult.score }))
    .digest("hex");

  const creditScore = await CreditScore.create({
    msmeId: msme._id,
    generatedBy: req.user._id,
    scoreValue: mlResult.score,
    riskCategory: mlResult.risk_category,
    modelVersion: mlResult.model_version,
    shapValues: mlResult.shap_values,
    shapSummary: mlResult.shap_summary,
    featureInputSnapshot: features,
    recommendedLoanAmount: loan.amount,
    recommendedInterestBand: loan.band,
    eligibleGovernmentSchemes: loan.schemes,
    stressSignals: mlResult.stress_signals || [],
    fraudFlags: mlResult.fraud_flags || [],
    explanationText: generateExplanation(mlResult),
    auditHash,
  });

  msme.latestScoreId = creditScore._id;
  await msme.save();

  createAuditLog({
    action: "score_generated",
    performedBy: req.user._id,
    targetMsmeId: msme._id,
    entityType: "CreditScore",
    entityId: creditScore._id,
    req,
    payload: { score: mlResult.score, riskCategory: mlResult.risk_category },
  });

  res.status(201).json({ success: true, message: "Credit score generated", data: creditScore });
});

// Generate plain-English explanation
const generateExplanation = (result) => {
  const score = result.score;
  const risk = result.risk_category;
  let text = `Your credit score of ${score} places you in the ${risk} Risk category. `;

  if (score >= 700) {
    text += "Your strong financial indicators, including consistent GST filings and stable cash flow, support this excellent score. ";
    text += "You may be eligible for fast-track loan consideration.";
  } else if (score >= 550) {
    text += "Your financial profile shows mixed signals. While some indicators are positive, there are areas that could be improved. ";
    text += "Maintaining consistent filings and improving cash flow stability could boost your score.";
  } else {
    text += "Several financial stress signals are affecting your score. Key areas to address include GST filing consistency, ";
    text += "cash flow stability, and vendor payment punctuality. Consistent improvement over 3-6 months can significantly raise your score.";
  }

  return text;
};

// GET /api/v1/scoring/:msmeId/latest
const getLatestScore = asyncHandler(async (req, res) => {
  const score = await CreditScore.findOne({ msmeId: req.params.msmeId })
    .sort("-createdAt")
    .populate("generatedBy", "name email");

  if (!score) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "No score found." } });
  }

  res.json({ success: true, data: score });
});

// GET /api/v1/scoring/:msmeId/history
const getScoreHistory = asyncHandler(async (req, res) => {
  const scores = await CreditScore.find({ msmeId: req.params.msmeId })
    .select("scoreValue riskCategory createdAt modelVersion generatedBy")
    .populate("generatedBy", "name")
    .sort("-createdAt");

  res.json({ success: true, data: scores });
});

module.exports = { generateScore, getLatestScore, getScoreHistory };
