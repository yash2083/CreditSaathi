const mongoose = require("mongoose");

const creditScoreSchema = new mongoose.Schema(
  {
    msmeId: { type: mongoose.Schema.Types.ObjectId, ref: "MSME", required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scoreValue: { type: Number, required: true, min: 300, max: 850 },
    riskCategory: {
      type: String,
      enum: ["Low", "Medium", "High"],
      required: true,
    },
    modelVersion: { type: String, default: "xgboost_v1" },
    shapValues: {
      gstConsistency: Number,
      cashFlowHealth: Number,
      revenueGrowth: Number,
      paymentBehaviour: Number,
      transactionVolume: Number,
      chequeBouncerate: Number,
    },
    shapSummary: [
      {
        feature: String,
        impact: Number,
        direction: { type: String, enum: ["positive", "negative"] },
        displayLabel: String,
      },
    ],
    featureInputSnapshot: { type: mongoose.Schema.Types.Mixed },
    recommendedLoanAmount: { type: Number },
    recommendedInterestBand: { type: String },
    eligibleGovernmentSchemes: [String],
    stressSignals: [
      {
        signal: String,
        severity: { type: String, enum: ["warning", "critical"] },
        description: String,
      },
    ],
    fraudFlags: [
      {
        flag: String,
        severity: { type: String, enum: ["medium", "high"] },
        description: String,
      },
    ],
    explanationText: { type: String },
    auditHash: { type: String },
  },
  { timestamps: true }
);

creditScoreSchema.index({ msmeId: 1, createdAt: -1 });
creditScoreSchema.index({ generatedBy: 1 });

module.exports = mongoose.model("CreditScore", creditScoreSchema);
