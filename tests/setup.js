/**
 * Jest Test Setup
 * OpenFlow Node.js SDK Test Environment Configuration
 */

// Load test environment variables
require("dotenv").config({ path: ".env.test" });

// Set test timeout to 5 minutes globally
jest.setTimeout(300000);

// Global test setup
beforeAll(async () => {
  // Clean up any temp files from previous test runs
  const fs = require("fs");
  const path = require("path");

  const tempDir = process.env.TEST_TEMP_DIR || "./of_tmp";
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });
});

// Global test cleanup
afterAll(async () => {
  // Clean up temp files after all tests
  const fs = require("fs");
  const tempDir = process.env.TEST_TEMP_DIR || "./of_tmp";
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// Global error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
