// Stage only a package that already passed its target-specific inspection.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const [target, input, sign = "unsigned"] = process.argv.slice(2);
const ext = { web: ".zip", windows: ".exe", linux: ".deb" }[target];
assert(ext && path.extname(input) === ext && fs.statSync(input).size > 0);
assert(["unsigned", "signed"].includes(sign));
const info = JSON.parse(fs.readFileSync("dist/version.json"));
assert.equal(info.target, target);
assert.equal(
  info.sha,
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
);
assert.equal(info.version, JSON.parse(fs.readFileSync("package.json")).version);
info.signed = sign === "signed";
const id = `pharmalab-${target}-${info.version}-${info.sha.slice(0, 7)}`;
const out = "release-out/" + id;
fs.mkdirSync(out, { recursive: true });
const file = id + "-" + sign + ext;
fs.copyFileSync(input, path.join(out, file));
fs.writeFileSync(
  out + "/build-info.json",
  JSON.stringify({ ...info, file, size: fs.statSync(input).size }, null, 2) +
    "\n",
);
let sums = "";
for (const name of [file, "build-info.json"])
  sums +=
    createHash("sha256")
      .update(fs.readFileSync(path.join(out, name)))
      .digest("hex") +
    "  " +
    name +
    "\n";
fs.writeFileSync(out + "/SHA256SUMS.txt", sums);
if (process.env.GITHUB_OUTPUT)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `artifact=${id}\n`);
const summary = `${target} | verified | ${sign} | ${file} | ${fs.statSync(input).size} bytes\n`;
console.log(summary);
if (process.env.GITHUB_ACTIONS)
  console.log(
    `::notice title=Verified package::${file} | ${fs.statSync(input).size} bytes | sha256 ${sums.split(" ")[0]}`,
  );
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `Target | Build | Signing | Asset | Size\n---|---|---|---|---\n${summary}\nBuilt ${info.builtAt} on ${info.runner} at ${info.sha}\n`,
  );
