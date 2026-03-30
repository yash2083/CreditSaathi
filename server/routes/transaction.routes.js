const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { uploadTransactionRecords, addSingleTransactionRecord, getTransactionRecords } = require("../controllers/transaction.controller");

router.use(protect);

router.post("/upload", uploadTransactionRecords);
router.post("/:msmeId", addSingleTransactionRecord);
router.get("/:msmeId", getTransactionRecords);

module.exports = router;
