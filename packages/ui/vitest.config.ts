import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@money-insight/ui": resolve(__dirname, "./src"),
      "@money-insight/shared": resolve(__dirname, "../shared/src"),
    },
  },
});
