const MSME = require("../models/MSME");
const asyncHandler = require("../middleware/error.middleware");
const { createAuditLog } = require("../services/audit.service");

// POST /api/v1/msmes — Create MSME profile
const createMSME = asyncHandler(async (req, res) => {
  const { businessName, gstin, pan, businessType, sector, registeredState, city,
          contactEmail, contactPhone, udyamRegistrationNo, annualTurnoverBand,
          employeeCount, incorporationDate } = req.body;

  if (!businessName || !gstin || !businessType || !sector || !registeredState || !contactEmail || !contactPhone) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Required fields missing." },
    });
  }

  const existing = await MSME.findOne({ gstin: gstin.toUpperCase() });
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: "DUPLICATE", message: "An MSME with this GSTIN already exists." },
    });
  }

  const msme = await MSME.create({
    owner: req.user._id,
    businessName, gstin, pan, businessType, sector, registeredState, city,
    contactEmail, contactPhone, udyamRegistrationNo, annualTurnoverBand,
    employeeCount, incorporationDate,
  });

  createAuditLog({ action: "msme_created", performedBy: req.user._id, targetMsmeId: msme._id, entityType: "MSME", entityId: msme._id, req });

  res.status(201).json({ success: true, message: "MSME profile created", data: msme });
});

// GET /api/v1/msmes — List MSMEs
const listMSMEs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, riskCategory, sector, status } = req.query;
  const query = {};

  // MSME owners only see their own
  if (req.user.role === "msme_owner") {
    query.owner = req.user._id;
  }
  if (status) query.status = status;
  if (sector) query.sector = sector;
  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: "i" } },
      { gstin: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
    ];
  }

  const total = await MSME.countDocuments(query);
  const msmes = await MSME.find(query)
    .populate("latestScoreId", "scoreValue riskCategory createdAt")
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // Filter by risk category after population if needed
  let filtered = msmes;
  if (riskCategory) {
    filtered = msmes.filter((m) => m.latestScoreId?.riskCategory === riskCategory);
  }

  res.json({
    success: true,
    data: filtered,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/v1/msmes/:id — Get MSME detail
const getMSME = asyncHandler(async (req, res) => {
  const msme = await MSME.findById(req.params.id)
    .populate("owner", "name email")
    .populate("latestScoreId");

  if (!msme) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "MSME not found." } });
  }

  // MSME owners can only see their own
  if (req.user.role === "msme_owner" && msme.owner._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "Access denied." } });
  }

  res.json({ success: true, data: msme });
});

// PUT /api/v1/msmes/:id — Update MSME
const updateMSME = asyncHandler(async (req, res) => {
  const msme = await MSME.findById(req.params.id);
  if (!msme) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "MSME not found." } });
  }

  // Non-updatable fields
  const { gstin, pan, ...updateData } = req.body;

  const updated = await MSME.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

  createAuditLog({ action: "msme_updated", performedBy: req.user._id, targetMsmeId: msme._id, entityType: "MSME", entityId: msme._id, req, payload: updateData });

  res.json({ success: true, message: "MSME updated", data: updated });
});

// DELETE /api/v1/msmes/:id — Soft delete
const deleteMSME = asyncHandler(async (req, res) => {
  const msme = await MSME.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
  if (!msme) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "MSME not found." } });
  }

  createAuditLog({ action: "msme_deleted", performedBy: req.user._id, targetMsmeId: msme._id, entityType: "MSME", entityId: msme._id, req });

  res.json({ success: true, message: "MSME deactivated", data: msme });
});

module.exports = { createMSME, listMSMEs, getMSME, updateMSME, deleteMSME };
