import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
const build = {
  version: JSON.parse(readFileSync("package.json", "utf8")).version,
  sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  builtAt: new Date().toISOString(),
  runner: process.env.RUNNER_NAME || os.platform(),
  target: process.env.PHARMA_TARGET || "web",
  signed: false,
};
export default defineConfig({
  define: { __BUILD__: JSON.stringify(build) },
  plugins: [
    {
      name: "build-identity",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify(build, null, 2) + "\n",
        });
      },
    },
  ],
  server: { host: "0.0.0.0", allowedHosts: true },
});
