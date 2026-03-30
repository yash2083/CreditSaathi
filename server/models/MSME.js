const mongoose = require("mongoose");

const msmeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    businessName: { type: String, required: true, trim: true },
    gstin: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"],
    },
    pan: { type: String, uppercase: true, trim: true },
    businessType: {
      type: String,
      enum: ["micro", "small", "medium"],
      required: true,
    },
    sector: { type: String, required: true, trim: true },
    incorporationDate: { type: Date },
    registeredState: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    udyamRegistrationNo: { type: String, trim: true },
    annualTurnoverBand: {
      type: String,
      enum: ["<40L", "40L-1.5Cr", "1.5Cr-5Cr", "5Cr-25Cr", ">25Cr"],
    },
    employeeCount: { type: Number, min: 0 },
    bankAccountLinked: { type: Boolean, default: false },
    aaConsentGiven: { type: Boolean, default: false },
    aaConsentTimestamp: { type: Date },
    latestScoreId: { type: mongoose.Schema.Types.ObjectId, ref: "CreditScore" },
    status: {
      type: String,
      enum: ["active", "inactive", "flagged"],
      default: "active",
    },
  },
  { timestamps: true }
);

msmeSchema.index({ owner: 1 });
msmeSchema.index({ gstin: 1 }, { unique: true });
msmeSchema.index({ status: 1 });
msmeSchema.index({ sector: 1 });

module.exports = mongoose.model("MSME", msmeSchema);
