const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { uploadGSTRecords, addSingleGSTRecord, getGSTRecords } = require("../controllers/gst.controller");

router.use(protect);

router.post("/upload", uploadGSTRecords);
router.post("/:msmeId/manual", addSingleGSTRecord);
router.get("/:msmeId", getGSTRecords);

module.exports = router;
