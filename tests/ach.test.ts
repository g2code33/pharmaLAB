import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { get, put } from "../src/database/store";
import { evidence, preparations } from "../src/simulation/ach/evidence";
import { hasProvenance } from "../src/evidence/register";
import {
  molar,
  mix,
  volumeForTarget,
  hill,
  pEC50,
  ec50FromP,
  potencyInterval,
} from "../src/simulation/ach/math";
import { createRun, apply, validRun } from "../src/simulation/ach/run";
import { profile, steadyForce } from "../src/simulation/ach/profile";
import {
  instrument,
  measure,
  stableBath,
} from "../src/simulation/ach/dynamics";
import { create, valid } from "../src/simulation/core";
import {
  compareIndependent,
  estimateCurve,
  medianInterval,
  traceMetrics,
  type Series,
} from "../src/simulation/ach/analysis";
const near = (x: number, y: number) =>
  assert.ok(
    Math.abs(x - y) < 1e-12 * Math.max(Math.abs(y), 1e-12),
    `${x} ≠ ${y}`,
  );
test("M, mM, µM and nM conversions; impossible or ambiguous input rejected", () => {
  for (const [value, unit] of [
    [1, "M"],
    [1e3, "mM"],
    [1e6, "µM"],
    [1e9, "nM"],
  ] as const)
    near(molar(value, unit), 1);
  assert.equal(molar(0, "M"), 0);
  for (const v of [-1, NaN, Infinity]) assert.throws(() => molar(v, "M"));
  assert.throws(() => molar(1, "mg" as "M"));
  assert.throws(() => molar(Number.MIN_VALUE, "nM"));
});
test("mass balance accounts for added volume and residual ACh; inverse hits target", () => {
  const bath = { nominalM: 1e-6, volumeMl: 30 },
    b = mix(bath, 32e-6, 1);
  near(b.nominalM, 2e-6);
  assert.equal(b.volumeMl, 31);
  const v = volumeForTarget(b, 40e-6, 3e-6);
  near(mix(b, 40e-6, v).nominalM, 3e-6);
  assert.throws(() => volumeForTarget(b, 1, 1));
  assert.throws(() => volumeForTarget(b, 1, 2));
  assert.throws(() => mix(b, 1, -1));
});
test("Hill function: zero, midpoint and asymptotes, including extreme exponent", () => {
  assert.equal(hill(0, 1e-9, 2, 6, 1), 1);
  assert.equal(hill(1e-9, 1e-9, 2, 6, 1), 4);
  assert.equal(hill(1e200, 1e-200, 100, 6, 1), 7);
  assert.equal(hill(1e-200, 1e200, 100, 6, 1), 1);
  assert.throws(() => hill(-1, 1, 1, 1, 1));
  assert.throws(() => hill(0, 1, 0, 1, 1));
});
test("pEC50 and decreasing CI transform preserve original observations", () => {
  near(ec50FromP(pEC50(4e-8)), 4e-8);
  assert.deepEqual(potencyInterval(1e-9, 1e-7), [7, 9]);
  assert.throws(() => pEC50(0));
  assert.throws(() => potencyInterval(1, 0.1));
  assert.throws(() => ec50FromP(Infinity));
});
test("registry has traceable matched endpoints and refuses cross-context loading", () => {
  assert.equal(new Set(evidence.map((e) => e.id)).size, evidence.length);
  assert.ok(evidence.every(hasProvenance));
  for (const p of preparations) {
    const iso = profile(p, "isometric");
    assert.equal(iso.parameters.EC50.value, null);
    assert.equal(steadyForce(0, iso, p), null);
    assert.throws(() => steadyForce(0, profile(p, "isotonic"), p));
  }
  const strip = profile("Longitudinal strip", "isotonic");
  assert.equal(strip.parameters.EC50.value, 4e-8);
  assert.equal(strip.parameters.EC50.context?.loadG, 0.3);
  assert.equal(
    strip.parameters.pEC50.classification,
    "Calculated from published measurements",
  );
  assert.throws(() =>
    steadyForce(1, profile("MPLM", "isometric"), "Intact segment"),
  );
});
test("instrument gain, drift and noise never supply a missing biological force", () => {
  assert.equal(
    measure(null, { ...instrument, noiseAmplitude: 20 }, 30, 1),
    null,
  );
  const g = 2;
  assert.equal(measure(g, instrument, 0), 2);
  assert.equal(measure(g, { ...instrument, gain: 3 }, 0), 6);
  assert.equal(stableBath.tissueConcentration(1e-7, 100), 1e-7);
});
test("recording transitions do not alter bath; wash empties bath, not tissue history", () => {
  let r = createRun();
  assert.throws(() => apply(r, { kind: "resume" }));
  for (const kind of ["start", "pause", "resume"] as const)
    r = apply(r, { kind });
  r = apply(r, { kind: "add", stockM: 1e-4, additionMl: 1 });
  r = apply(r, { kind: "add", stockM: 1e-4, additionMl: 1 });
  near(r.bath.nominalM, 2e-4 / 32);
  r = apply(r, { kind: "wash" });
  assert.equal(r.bath.nominalM, 0);
  assert.equal(r.bath.volumeMl, 30);
  assert.equal(r.results.forceG, null);
  assert.equal(r.results.recovery, "unknown after wash");
  assert.equal(r.history.filter((x) => x.kind === "add").length, 2);
  r = apply(r, { kind: "stop" });
  assert.throws(() => apply(r, { kind: "add", stockM: 1, additionMl: 1 }));
  assert.ok(validRun(r));
});
test("versioned notebook persists profile and deterministic results; altered archives rejected", async () => {
  const e = create("ACh");
  e.ach = apply(e.ach!, { kind: "add", stockM: 1e-5, additionMl: 0.3 });
  await put("ach-test", e);
  const saved = await get<typeof e>("ach-test");
  assert.deepEqual(saved, e);
  assert.ok(valid(saved));
  for (const change of [
    { version: "future" },
    { initialMl: 0 },
    { results: { signal: 0 } },
    { parameters: profile("MPLM", "isotonic") },
    { history: [{ kind: "oops" }] },
  ])
    assert.equal(validRun({ ...e.ach, ...change }), false);
  assert.equal(valid({ ...e, ach: undefined }), false);
});
const training: Series = {
  id: "synthetic",
  preparation: "MPLM",
  recording: "isometric",
  conditions: "fixture",
  role: "calibration",
  observationIds: ["1", "2"],
};
test("independent comparisons reject shared observations and unmatched conditions", () => {
  const other = {
    ...training,
    id: "different",
    role: "independent validation" as const,
  };
  assert.throws(() => compareIndependent(training, other, [1], [1]));
  const held = { ...other, observationIds: ["3"] };
  assert.throws(() =>
    compareIndependent(
      training,
      { ...held, conditions: "different" },
      [1],
      [1],
    ),
  );
  assert.deepEqual(compareIndependent(training, held, [2, 1], [1, 2]), {
    rmse: 1,
    residuals: [-1, 1],
    validated: false,
  });
});
test("fit and trace analysis require informative observations (nonbiological fixtures)", () => {
  assert.equal(estimateCurve(training, []), null);
  const sets = Array.from({ length: 6 }, (_, i) => ({
    preparationId: String(i),
    baselineG: 1,
    plateauG: [5, 5],
    points: [0.3, 0.6, 1, 2, 3].map((molar) => ({
      molar,
      g: hill(molar, 1, 1, 4, 1),
    })),
  }));
  const fit = estimateCurve(training, sets)!;
  near(fit.estimates[0].ec50M, 1);
  near(fit.estimates[0].hill, 1);
  assert.equal(fit.estimates[0].emaxG, 4);
  assert.equal(medianInterval([1, 2, 3]), null);
  assert.equal(fit.confidenceIntervals.hill!.coverage, 0.96875);
  assert.equal(traceMetrics([], 0, [2, 4], 5, 0, 0.1), null);
  const m = traceMetrics(
    [0, 4, 2, 2, 2, 1, 0].map((g, s) => ({ s, g })),
    0,
    [2, 4],
    5,
    0,
    0.1,
  )!;
  assert.deepEqual(
    [m.peakG, m.timeToPeakS, m.fadeG, m.tonicG, m.firstReturnAfterWashS],
    [4, 1, 2, 2, 1],
  );
});

test("frozen v1 archive stays readable with its original assumptions and display settings", async () => {
  const { readFile } = await import("node:fs/promises");
  const archive = JSON.parse(
    await readFile(
      new URL("./fixtures/gp-ach-v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.ok(validRun(archive));
  assert.equal(archive.state, "stopped");
  assert.equal(archive.instrument.gain, 2);
  near(archive.history[1].nominalM, (1e-4 * 0.3) / 30.3);
  assert.equal(archive.results.forceG, null);
});
test("a transplanted isotonic EC50 is rejected even inside an isometric envelope", () => {
  const p = profile("Longitudinal strip", "isometric");
  p.parameters.EC50 = profile("Longitudinal strip", "isotonic").parameters.EC50;
  assert.throws(
    () => steadyForce(0.01, p, "Longitudinal strip"),
    /context mismatch/,
  );
});
