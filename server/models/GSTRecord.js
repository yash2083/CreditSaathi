const mongoose = require("mongoose");

const gstRecordSchema = new mongoose.Schema(
  {
    msmeId: { type: mongoose.Schema.Types.ObjectId, ref: "MSME", required: true },
    filingPeriod: { type: String, required: true },
    filingType: {
      type: String,
      enum: ["GSTR1", "GSTR3B", "GSTR9"],
      required: true,
    },
    filedOnTime: { type: Boolean, required: true },
    filingDate: { type: Date, required: true },
    taxableRevenue: { type: Number, required: true, min: 0 },
    taxPaid: { type: Number, required: true, min: 0 },
    nilReturn: { type: Boolean, default: false },
    amendment: { type: Boolean, default: false },
    rawDataRef: { type: String },
  },
  { timestamps: true }
);

gstRecordSchema.index({ msmeId: 1, filingPeriod: 1 }, { unique: true });
gstRecordSchema.index({ msmeId: 1, filingDate: -1 });

module.exports = mongoose.model("GSTRecord", gstRecordSchema);
