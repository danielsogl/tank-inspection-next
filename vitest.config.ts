import { defineConfig } from "vitest/config";
import { config } from "dotenv";

// Load .env file
config();

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec,eval}.{ts,tsx}"],
    testTimeout: 60000,
    passWithNoTests: true,
  },
});
