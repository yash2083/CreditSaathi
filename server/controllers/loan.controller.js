const LoanApplication = require("../models/LoanApplication");
const CreditScore = require("../models/CreditScore");
const MSME = require("../models/MSME");
const asyncHandler = require("../middleware/error.middleware");
const { createAuditLog } = require("../services/audit.service");

// POST /api/v1/loans — Submit loan application
const submitLoan = asyncHandler(async (req, res) => {
  const { msmeId, scoreId, requestedAmount, loanPurpose, repaymentTenure } = req.body;

  if (!msmeId || !scoreId || !requestedAmount || !loanPurpose) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "msmeId, scoreId, requestedAmount, and loanPurpose are required." },
    });
  }

  const score = await CreditScore.findById(scoreId);
  if (!score) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Credit score not found." } });
  }

  // Check if score is less than 90 days old
  const daysSinceScore = (Date.now() - score.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceScore > 90) {
    return res.status(400).json({
      success: false,
      error: { code: "SCORE_EXPIRED", message: "This score is outdated. Please generate a new score before applying." },
    });
  }

  const loan = await LoanApplication.create({
    msmeId,
    applicant: req.user._id,
    scoreId,
    requestedAmount,
    loanPurpose,
    repaymentTenure,
  });

  createAuditLog({
    action: "loan_submitted",
    performedBy: req.user._id,
    targetMsmeId: msmeId,
    entityType: "LoanApplication",
    entityId: loan._id,
    req,
  });

  res.status(201).json({ success: true, message: "Loan application submitted", data: loan });
});

// GET /api/v1/loans — List loan applications
const listLoans = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, msmeId } = req.query;
  const query = {};

  if (req.user.role === "msme_owner") {
    query.applicant = req.user._id;
  }
  if (status) query.status = status;
  if (msmeId) query.msmeId = msmeId;

  const total = await LoanApplication.countDocuments(query);
  const loans = await LoanApplication.find(query)
    .populate("msmeId", "businessName gstin")
    .populate("scoreId", "scoreValue riskCategory")
    .populate("applicant", "name email")
    .populate("assignedOfficer", "name email")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: loans,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/v1/loans/:id
const getLoanDetail = asyncHandler(async (req, res) => {
  const loan = await LoanApplication.findById(req.params.id)
    .populate("msmeId")
    .populate("scoreId")
    .populate("applicant", "name email")
    .populate("assignedOfficer", "name email");

  if (!loan) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Loan application not found." } });
  }

  res.json({ success: true, data: loan });
});

// PATCH /api/v1/loans/:id/status — Approve/Reject
const updateLoanStatus = asyncHandler(async (req, res) => {
  const { status, officerRemarks, approvedAmount } = req.body;

  if (!["under_review", "approved", "rejected", "disbursed"].includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid status." },
    });
  }

  if (status === "rejected" && !officerRemarks) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Remarks are required for rejection." },
    });
  }

  const loan = await LoanApplication.findByIdAndUpdate(
    req.params.id,
    {
      status,
      officerRemarks,
      approvedAmount,
      assignedOfficer: req.user._id,
      decisionDate: ["approved", "rejected"].includes(status) ? new Date() : undefined,
    },
    { new: true }
  );

  if (!loan) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Loan application not found." } });
  }

  const auditAction = status === "approved" ? "loan_approved" : status === "rejected" ? "loan_rejected" : "loan_submitted";
  createAuditLog({
    action: auditAction,
    performedBy: req.user._id,
    targetMsmeId: loan.msmeId,
    entityType: "LoanApplication",
    entityId: loan._id,
    req,
    payload: { status, officerRemarks },
  });

  res.json({ success: true, message: `Loan ${status}`, data: loan });
});

module.exports = { submitLoan, listLoans, getLoanDetail, updateLoanStatus };
