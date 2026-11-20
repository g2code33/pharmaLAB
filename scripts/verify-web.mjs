import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = path.resolve(process.argv[2] || "dist");
function data(url) {
  assert(/^\/[\w./-]+$/.test(url) && !url.includes(".."));
  const b = fs.readFileSync(path.join(root, url));
  assert(b.length);
  return b;
}
const sw = data("/sw.js").toString();
const files = JSON.parse(sw.match(/addAll\((\[[^\]]+\])\)/)[1]);
for (const f of files) data(f);
const html = data("/index.html").toString();
for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g))
  assert(files.includes(url), `Uncached ${url}`);
const m = JSON.parse(data("/manifest.webmanifest"));
assert.equal(m.start_url, "/");
for (const i of m.icons) {
  const png = data(i.src);
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, i.sizes);
  assert(files.includes(i.src));
}
const info = JSON.parse(data("/version.json"));
assert.equal(
  info.sha,
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
);
assert.equal(info.version, JSON.parse(fs.readFileSync("package.json")).version);
console.log(`Verified ${files.length} precached assets for ${info.sha}`);
