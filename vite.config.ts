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
      transformIndexHtml(html, ctx) {
        if (
          !ctx.bundle ||
          process.env.TAURI_ENV_PLATFORM ||
          build.target !== "web"
        )
          return html;
        return [
          {
            tag: "meta",
            injectTo: "head-prepend",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content:
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
            },
          },
        ];
      },
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
