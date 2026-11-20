import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = (await readdir("dist", { recursive: true, withFileTypes: true }))
  .filter((x) => x.isFile() && x.name !== "sw.js")
  .map((x) => (x.parentPath + "/" + x.name).replace(/^dist/, ""));
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile("dist" + f));
const key = "pharmalab-" + hash.digest("hex").slice(0, 16);
await writeFile(
  "dist/sw.js",
  `const key=${JSON.stringify(key)};self.addEventListener('install',e=>e.waitUntil(caches.open(key).then(c=>c.addAll(${JSON.stringify(files)}))));self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pharmalab-')&&k!==key).map(k=>caches.delete(k))))])));self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.open(key).then(async c=>(await c.match(e.request.mode==='navigate'?'/index.html':e.request,{ignoreVary:true}))||fetch(e.request)))})`,
);
