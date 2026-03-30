const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const callMLService = async (features) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/score`, features, {
      timeout: 12000,
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error("ML scoring service is unavailable. Please try again later.");
    }
    if (error.code === "ECONNABORTED") {
      throw new Error("ML scoring service timed out. Please try again.");
    }
    throw new Error(error.response?.data?.detail || "ML service error");
  }
};

const checkMLHealth = async () => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    return response.data;
  } catch {
    return { status: "unavailable" };
  }
};

module.exports = { callMLService, checkMLHealth };
