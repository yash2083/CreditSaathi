const mongoose = require("mongoose");

const loanApplicationSchema = new mongoose.Schema(
  {
    msmeId: { type: mongoose.Schema.Types.ObjectId, ref: "MSME", required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    scoreId: { type: mongoose.Schema.Types.ObjectId, ref: "CreditScore", required: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    loanPurpose: {
      type: String,
      enum: ["working_capital", "equipment", "expansion", "other"],
      required: true,
    },
    repaymentTenure: { type: Number }, // months
    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "rejected", "disbursed"],
      default: "submitted",
    },
    officerRemarks: { type: String },
    approvedAmount: { type: Number },
    decisionDate: { type: Date },
  },
  { timestamps: true }
);

loanApplicationSchema.index({ msmeId: 1 });
loanApplicationSchema.index({ status: 1 });
loanApplicationSchema.index({ assignedOfficer: 1 });

module.exports = mongoose.model("LoanApplication", loanApplicationSchema);
