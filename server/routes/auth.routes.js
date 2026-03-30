const router = require("express").Router();
const { register, login, refreshTokenHandler, logout, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);

module.exports = router;
