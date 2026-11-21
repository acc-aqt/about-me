import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import { BASE_PATH } from "./site.config.ts";
import { content } from "./src/content.ts";
import { PLAIN_VIEW_PLACEHOLDER, renderPlainView } from "./src/plain-view.ts";

function plainView(): Plugin {
  return {
    name: "plain-view",
    transformIndexHtml(html) {
      return html.replace(PLAIN_VIEW_PLACEHOLDER, renderPlainView(content));
    },
  };
}

export default defineConfig({
  base: BASE_PATH,
  plugins: [plainView()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        plain: resolve(import.meta.dirname, "plain/index.html"),
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
