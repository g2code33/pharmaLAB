import fs from "node:fs";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const paths = [
  "package.json",
  "package-lock.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
];
const sem = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function parts(v) {
  assert(sem.test(v), "Expected MAJOR.MINOR.PATCH without leading zeroes");
  let a = v.split(".").map(Number);
  assert(
    a.every((n) => Number.isSafeInteger(n) && n <= 65535),
    "Version exceeds Windows component limits",
  );
  return a;
}
export function next(old, arg) {
  let a = parts(old);
  const i = ["major", "minor", "patch"].indexOf(arg);
  if (i >= 0) {
    a[i]++;
    a.fill(0, i + 1);
    arg = a.join(".");
  }
  const b = parts(arg),
    idx = b.findIndex((v, i) => v !== parts(old)[i]);
  assert(idx >= 0 && b[idx] > parts(old)[idx], "Version must increase");
  return arg;
}
function run(arg) {
  const [p, l, t, c, k] = paths.map((f) => fs.readFileSync(f, "utf8"));
  const pkg = JSON.parse(p),
    lock = JSON.parse(l),
    tauri = JSON.parse(t);
  const v = pkg.version;
  parts(v);
  const cr = /(\[package\][^[]*?\nversion\s*=\s*")([^"]+)(")/,
    lr = /(\[\[package\]\]\nname = "pharmalab"\nversion = ")([^"]+)(")/;
  for (const val of [
    lock.version,
    lock.packages[""].version,
    tauri.version,
    c.match(cr)?.[2],
    k.match(lr)?.[2],
  ])
    assert.equal(val, v, "Version drift");
  if (!arg || arg === "check") {
    console.log(v);
    return;
  }
  const n = next(v, arg);
  pkg.version = lock.version = lock.packages[""].version = tauri.version = n;
  [pkg, lock, tauri].forEach((x, i) =>
    fs.writeFileSync(paths[i], JSON.stringify(x, null, 2) + "\n"),
  );
  fs.writeFileSync(
    paths[3],
    c.replace(cr, (_, a, b, z) => a + n + z),
  );
  fs.writeFileSync(
    paths[4],
    k.replace(lr, (_, a, b, z) => a + n + z),
  );
  console.log(n);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  run(process.argv[2]);
