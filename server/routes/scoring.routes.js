const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const { generateScore, getLatestScore, getScoreHistory } = require("../controllers/scoring.controller");

router.use(protect);

router.post("/generate/:msmeId", generateScore);
router.get("/:msmeId/latest", getLatestScore);
router.get("/:msmeId/history", getScoreHistory);

module.exports = router;
