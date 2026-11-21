import { defineConfig } from "vitest/config";
import { BASE_PATH } from "./site.config.ts";

export default defineConfig({
  base: BASE_PATH,
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
