import { isAbsolute } from "node:path";
import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  platform: "node",
  resolve: {
    conditionNames: ["node", "require"],
  },
  output: {
    file: "dist/index.js",
    format: "cjs",
    banner: "#!/usr/bin/env node",
  },
  // Keep dependencies and node builtins as bare runtime requires; only bundle
  // our own source. Matching node_modules by resolved path instead bakes
  // absolute build-machine paths into the output — non-portable when published,
  // and the backslashes make it fail outright on Windows.
  external: (id) => !id.startsWith(".") && !isAbsolute(id),
});
