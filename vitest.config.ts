import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests run in Vitest's default Node environment, which is all the current
// pure-function tests (the funnel math, position indexing, Zod schemas) need.
// DOM-touching component tests would additionally require `environment:
// "jsdom"` and @vitejs/plugin-react here.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
