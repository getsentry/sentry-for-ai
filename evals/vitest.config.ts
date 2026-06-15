import { defineConfig } from "vitest/config";

const jsonOutputFile = process.env["VITEST_EVALS_JSON"];

export default defineConfig({
  test: {
    include: ["src/**/*.eval.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./src/setup.ts"],
    includeTaskLocation: true,
    reporters: [
      ["vitest-evals/reporter", { toolDetails: false }],
      ...(jsonOutputFile ? ([["json"]] as const) : []),
    ],
    outputFile: {
      ...(jsonOutputFile ? { json: jsonOutputFile } : {}),
    },
  },
});
