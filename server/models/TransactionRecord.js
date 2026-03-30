const mongoose = require("mongoose");

const transactionRecordSchema = new mongoose.Schema(
  {
    msmeId: { type: mongoose.Schema.Types.ObjectId, ref: "MSME", required: true },
    month: { type: String, required: true, match: [/^\d{4}-\d{2}$/, "Month must be YYYY-MM"] },
    totalInflow: { type: Number, required: true, min: 0 },
    totalOutflow: { type: Number, required: true, min: 0 },
    netCashFlow: { type: Number },
    upiTransactionCount: { type: Number, default: 0, min: 0 },
    upiVolume: { type: Number, default: 0, min: 0 },
    chequeBouncedCount: { type: Number, default: 0, min: 0 },
    emiPaidOnTime: { type: Boolean },
    vendorPaymentsPunctuality: { type: Number, min: 0, max: 1, default: 0.5 },
    seasonalityFlag: { type: Boolean, default: false },
    dataSource: {
      type: String,
      enum: ["manual", "aa_framework", "bank_statement_ocr"],
      default: "manual",
    },
  },
  { timestamps: true }
);

// Auto-compute net cash flow
transactionRecordSchema.pre("save", function (next) {
  this.netCashFlow = this.totalInflow - this.totalOutflow;
  next();
});

transactionRecordSchema.index({ msmeId: 1, month: 1 }, { unique: true });
transactionRecordSchema.index({ msmeId: 1, createdAt: -1 });

module.exports = mongoose.model("TransactionRecord", transactionRecordSchema);
