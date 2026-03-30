const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({ action, performedBy, targetMsmeId, entityType, entityId, req, payload }) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetMsmeId,
      entityType,
      entityId,
      ipAddress: req?.ip || "unknown",
      userAgent: req?.get("user-agent") || "unknown",
      payload,
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
};

module.exports = { createAuditLog };
