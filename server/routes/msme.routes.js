const router = require("express").Router();
const { protect, authorise } = require("../middleware/auth.middleware");
const { createMSME, listMSMEs, getMSME, updateMSME, deleteMSME } = require("../controllers/msme.controller");

router.use(protect);

router.post("/", createMSME);
router.get("/", listMSMEs);
router.get("/:id", getMSME);
router.put("/:id", updateMSME);
router.delete("/:id", authorise("admin", "bank_officer"), deleteMSME);

module.exports = router;
