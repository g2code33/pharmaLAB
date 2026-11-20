import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { get, put } from "../src/database/store";
import { create, valid, engine } from "../src/simulation/core";
import { evidence, hasProvenance } from "../src/evidence/register";
test("versioned notebook round trip preserves historical revision", async () => {
  const record = {
    ...create("First practical"),
    version: "archived-revision",
    ach: undefined,
  };
  await put("experiments", [record]);
  assert.deepEqual(await get("experiments"), [record]);
  assert.ok(valid(record));
  assert.equal(valid({ ...record, schema: 2 }), false);
  assert.equal(valid({ ...record, datasets: [1] }), false);
  assert.equal(valid({ ...record, events: [{}] }), false);
});
test("provenance required and no biological results emitted", () => {
  assert.ok(evidence.length > 0 && evidence.every(hasProvenance));
  assert.equal(hasProvenance({ url: "https://example.org" }), false);
  assert.equal(engine.snapshot().tension, null);
});
