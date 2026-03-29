const request = require("supertest");
const app = require("../index");

describe("Health Check", () => {
  it("GET /api/v1/health should return 200", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.version).toBe("1.0.0");
  });
});

describe("404 Handler", () => {
  it("should return 404 for unknown routes", async () => {
    const res = await request(app).get("/api/v1/unknown");
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
