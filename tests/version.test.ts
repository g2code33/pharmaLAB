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
