const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../middleware/error.middleware");
const { createAuditLog } = require("../services/audit.service");

// Generate tokens
const generateAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "15m" });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" });

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, organisationName } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Name, email, password, and role are required." },
    });
  }

  if (!["bank_officer", "msme_owner"].includes(role)) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Role must be bank_officer or msme_owner." },
    });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: "DUPLICATE", message: "An account with this email already exists." },
    });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: password,
    role,
    organisationName: organisationName || "",
    organisationType: role === "msme_owner" ? "msme" : "bank",
  });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  createAuditLog({ action: "user_registered", performedBy: user._id, req });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organisationName: user.organisationName },
      accessToken,
      refreshToken,
    },
  });
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Email and password are required." },
    });
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: "AUTH_FAILED", message: "Invalid email or password." },
    });
  }

  if (user.isLocked()) {
    return res.status(423).json({
      success: false,
      error: { code: "ACCOUNT_LOCKED", message: "Account is temporarily locked. Try again later." },
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.loginAttempts = 0;
    }
    await user.save();
    return res.status(401).json({
      success: false,
      error: { code: "AUTH_FAILED", message: "Invalid email or password." },
    });
  }

  // Reset login attempts on success
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();

  createAuditLog({ action: "user_login", performedBy: user._id, req });

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, organisationName: user.organisationName },
      accessToken,
      refreshToken,
    },
  });
});

// POST /api/v1/auth/refresh
const refreshTokenHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Refresh token is required." },
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid refresh token." },
      });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Session expired, please log in again." },
    });
  }
});

// POST /api/v1/auth/logout
const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    user.refreshToken = undefined;
    await user.save();
    createAuditLog({ action: "user_logout", performedBy: user._id, req });
  }

  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        organisationName: req.user.organisationName,
      },
    },
  });
});

module.exports = { register, login, refreshTokenHandler, logout, getMe };
