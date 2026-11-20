// Include upstream notices in both packaged frontends. A new licence requires review.
import fs from "node:fs";
import assert from "node:assert/strict";
const lock = JSON.parse(fs.readFileSync("package-lock.json"));
const notices = [];
for (const [dir, dep] of Object.entries(lock.packages)) {
  if (!dir || dep.dev || dep.optional) continue;
  assert(dir.startsWith("node_modules/") && !dir.includes(".."));
  assert(
    ["MIT", "ISC", "MIT OR Apache-2.0", "Apache-2.0 OR MIT"].includes(
      dep.license,
    ),
    `Review licence: ${dir} ${dep.license}`,
  );
  const licenses = fs
    .readdirSync(dir)
    .filter((x) => /^licen[cs]e(?:$|[-.])/i.test(x));
  assert(licenses.length, `Missing notice for ${dir}`);
  notices.push(
    `${dir.slice(13)} ${dep.version}\nDeclared licence: ${dep.license}\n` +
      licenses.map((f) => fs.readFileSync(`${dir}/${f}`, "utf8")).join("\n"),
  );
}
fs.writeFileSync("dist/THIRD-PARTY-NOTICES.txt", notices.join("\n\n---\n\n"));
console.log(`Included ${notices.length} frontend dependency notices.`);
