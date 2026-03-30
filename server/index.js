const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { connectDB } = require("./config/db");

const app = express();

// ── Middleware ────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "http://localhost:3001", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
    },
  },
});
app.use(limiter);

// ── Health Check ─────────────────────────────
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    message: "CreditSaathi API is running",
    data: {
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
  });
});

// ── Routes ───────────────────────────────────
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/msmes", require("./routes/msme.routes"));
app.use("/api/v1/gst", require("./routes/gst.routes"));
app.use("/api/v1/transactions", require("./routes/transaction.routes"));
app.use("/api/v1/scoring", require("./routes/scoring.routes"));
app.use("/api/v1/loans", require("./routes/loan.routes"));

// ── 404 Handler ──────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// ── Global Error Handler ─────────────────────
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
    },
  });
});

// ── Start Server ─────────────────────────────
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 CreditSaathi API running on port ${PORT}`);
    });
  });
}

module.exports = app;
