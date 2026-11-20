import test from "node:test";
import assert from "node:assert/strict";
import { parts, next } from "../scripts/version.mjs";
test("reject invalid versions, duplicates, downgrades and component overflow", () => {
  for (const v of ["1.0", "v1.2.3", "01.2.3", "65536.0.0"])
    assert.throws(() => parts(v));
  for (const v of ["1.2.3", "1.2.2", "0.9.9"])
    assert.throws(() => next("1.2.3", v));
  assert.equal(next("1.2.3", "minor"), "1.3.0");
});

test("delivery rejects a modified web archive and preserves historical identity", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const { createHash } = await import("node:crypto");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pharmalab-test-"));
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
    const id = `pharmalab-web-${version}-${sha.slice(0, 7)}`,
      src = path.join(root, "incoming", id),
      out = path.join(root, "checked");
    fs.mkdirSync(src, { recursive: true });
    const file = id + "-unsigned.zip";
    const data = Buffer.from("test fixture only");
    fs.writeFileSync(path.join(src, file), data);
    const info = JSON.stringify({
      file,
      size: data.length,
      signed: false,
      builtAt: new Date().toISOString(),
      target: "web",
      runner: "fixture",
      version,
      sha,
    });
    fs.writeFileSync(path.join(src, "build-info.json"), info);
    const hash = (b: string | Buffer) =>
      createHash("sha256").update(b).digest("hex");
    fs.writeFileSync(
      path.join(src, "SHA256SUMS.txt"),
      `${hash(data)}  ${file}\n${hash(info)}  build-info.json\n`,
    );
    const run = (...args: string[]) =>
      execFileSync(process.execPath, ["scripts/delivery.mjs", ...args], {
        stdio: "pipe",
      });
    run("collect", path.join(root, "incoming"), "web", out);
    run("verify", out, "web");
    fs.writeFileSync(path.join(out, file), Buffer.alloc(data.length));
    assert.throws(() => run("verify", out, "web"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
