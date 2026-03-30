const GSTRecord = require("../models/GSTRecord");
const MSME = require("../models/MSME");
const asyncHandler = require("../middleware/error.middleware");
const { createAuditLog } = require("../services/audit.service");

// POST /api/v1/gst/upload — Upload bulk GST records
const uploadGSTRecords = asyncHandler(async (req, res) => {
  const { msmeId, records } = req.body;

  if (!msmeId || !records || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "msmeId and records array are required." },
    });
  }

  const msme = await MSME.findById(msmeId);
  if (!msme) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "MSME not found." } });
  }

  let imported = 0;
  let errors = [];

  for (let i = 0; i < records.length; i++) {
    try {
      const record = records[i];
      await GSTRecord.findOneAndUpdate(
        { msmeId, filingPeriod: record.filingPeriod },
        { ...record, msmeId },
        { upsert: true, new: true, runValidators: true }
      );
      imported++;
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  }

  createAuditLog({
    action: "gst_uploaded",
    performedBy: req.user._id,
    targetMsmeId: msmeId,
    entityType: "GSTRecord",
    req,
    payload: { imported, errors: errors.length },
  });

  res.json({
    success: true,
    message: `${imported} records imported, ${errors.length} errors found`,
    data: { imported, errors },
  });
});

// POST /api/v1/gst/:msmeId/manual — Add single GST record
const addSingleGSTRecord = asyncHandler(async (req, res) => {
  const { msmeId } = req.params;
  const msme = await MSME.findById(msmeId);
  if (!msme) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "MSME not found." } });
  }

  const existing = await GSTRecord.findOne({ msmeId, filingPeriod: req.body.filingPeriod });
  if (existing) {
    Object.assign(existing, req.body);
    await existing.save();
    return res.json({ success: true, message: "Record updated", data: existing });
  }

  const record = await GSTRecord.create({ ...req.body, msmeId });
  res.status(201).json({ success: true, message: "Record created", data: record });
});

// GET /api/v1/gst/:msmeId — Get all GST records
const getGSTRecords = asyncHandler(async (req, res) => {
  const { msmeId } = req.params;
  const { sort = "-filingDate", filingType } = req.query;
  const query = { msmeId };
  if (filingType) query.filingType = filingType;

  const records = await GSTRecord.find(query).sort(sort);
  res.json({ success: true, data: records, meta: { total: records.length } });
});

module.exports = { uploadGSTRecords, addSingleGSTRecord, getGSTRecords };
