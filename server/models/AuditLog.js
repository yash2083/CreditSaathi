const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "user_registered", "user_login", "user_logout",
        "msme_created", "msme_updated", "msme_deleted",
        "gst_uploaded", "transaction_uploaded",
        "score_generated",
        "loan_submitted", "loan_approved", "loan_rejected",
        "document_uploaded", "document_verified",
      ],
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetMsmeId: { type: mongoose.Schema.Types.ObjectId, ref: "MSME" },
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    ipAddress: { type: String },
    userAgent: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ targetMsmeId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
