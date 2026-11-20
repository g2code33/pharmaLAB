// Re-verify complete artifact sets on the read-only runner AND after downloading from GitHub.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const [mode, root, selection = "all", output] = process.argv.slice(2);
const targets = selection === "all" ? ["web", "linux", "windows"] : [selection];
const ext = { web: ".zip", linux: ".deb", windows: ".exe" };
const version = JSON.parse(fs.readFileSync("package.json")).version,
  sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const digest = (b) => createHash("sha256").update(b).digest("hex");
const expected = [],
  rows = [],
  dest = mode === "collect" ? output : root;
assert(["collect", "verify"].includes(mode));
if (mode === "collect") fs.mkdirSync(dest, { recursive: false });
for (const target of targets) {
  assert(ext[target]);
  const id = `pharmalab-${target}-${version}-${sha.slice(0, 7)}`;
  const source = mode === "collect" ? path.join(root, id) : root;
  const meta = mode === "collect" ? "build-info.json" : id + "-build-info.json";
  const bytes = fs.readFileSync(path.join(source, meta));
  const b = JSON.parse(bytes);
  assert.equal(b.sha, sha);
  assert.equal(b.version, version);
  assert.equal(b.target, target);
  assert.equal(typeof b.signed, "boolean");
  assert(b.runner && Number.isFinite(Date.parse(b.builtAt)));
  assert.equal(
    b.file,
    `${id}-${b.signed ? "signed" : "unsigned"}${ext[target]}`,
  );
  const data = fs.readFileSync(path.join(source, b.file));
  assert(data.length > 0 && data.length === b.size);
  const name = id + "-build-info.json";
  if (mode === "collect") {
    assert.deepEqual(
      fs.readdirSync(source).sort(),
      [meta, b.file, "SHA256SUMS.txt"].sort(),
    );
    assert.equal(
      fs.readFileSync(source + "/SHA256SUMS.txt", "utf8"),
      `${digest(data)}  ${b.file}\n${digest(bytes)}  build-info.json\n`,
    );
    fs.writeFileSync(path.join(dest, name), bytes);
    fs.writeFileSync(path.join(dest, b.file), data);
  }
  expected.push(name, b.file);
  rows.push(
    `${target} | verified | ${b.signed ? "yes" : "no"} | ${b.file} | ${data.length} | ${b.runner} | ${b.builtAt}`,
  );
}
expected.sort();
const sums = expected
  .map((n) => digest(fs.readFileSync(path.join(dest, n))) + "  " + n + "\n")
  .join("");
if (mode === "collect") fs.writeFileSync(dest + "/SHA256SUMS.txt", sums);
else assert.equal(fs.readFileSync(dest + "/SHA256SUMS.txt", "utf8"), sums);
assert.deepEqual(
  fs.readdirSync(dest).sort(),
  [...expected, "SHA256SUMS.txt"].sort(),
);
console.log(rows.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    "\nTarget | Status | Signed | Asset | Bytes | Runner | Built UTC\n---|---|---|---|---|---|---\n" +
      rows.join("\n") +
      "\n",
  );
