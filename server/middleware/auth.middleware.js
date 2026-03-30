const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Access denied. No token provided." },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash -refreshToken");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not found." },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: { code: "TOKEN_EXPIRED", message: "Token expired. Please refresh." },
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid token." },
    });
  }
};

// Role-based access control
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action.",
        },
      });
    }
    next();
  };
};

module.exports = { protect, authorise };
