const router = require("express").Router();
const { protect, authorise } = require("../middleware/auth.middleware");
const { submitLoan, listLoans, getLoanDetail, updateLoanStatus } = require("../controllers/loan.controller");

router.use(protect);

router.post("/", submitLoan);
router.get("/", listLoans);
router.get("/:id", getLoanDetail);
router.patch("/:id/status", authorise("admin", "bank_officer"), updateLoanStatus);

module.exports = router;
