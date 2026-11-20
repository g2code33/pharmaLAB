import test from "node:test";
import assert from "node:assert/strict";
import {
  preset,
  sampleProtocol,
  doseCurve,
  schedule,
  validTrial,
  trialMetadata,
  csv,
  OPTION,
} from "../src/simulation/ach/protocol";
import { defaults, registry, corbett } from "../src/simulation/ach/protocols";
import { create, valid } from "../src/simulation/core";
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-9, `${a} versus ${b}`);
test("MPLM: explicit reported potency and transformed midpoint, not a gram calibration or fitted curve", () => {
  const t = preset(),
    rows = doseCurve(t.plan);
  near(rows[40].percent, 50);
  near(rows[40].logM, Math.log10(0.04e-6));
  near(rows[41].logM - rows[40].logM, rows[1].logM - rows[0].logM);
  assert.ok(Math.abs(-rows[40].logM - corbett.pEC50) < corbett.pEC50sem);
  assert.equal(defaults("mplm").scaleG, 0);
  assert.equal(
    registry("intact", defaults("intact")).find((x) => x.key === "ec50M")
      ?.provenance,
    "ASSUMED",
  );
});
test("phasic rise/fade, delayed tonic and independent sensitivity recovery", () => {
  const t = preset("intact"),
    r = sampleProtocol(t.plan, 1800);
  near(r[1].relative, 0);
  assert.ok(r[9].phasic > 0.5 && r[9].relative > r[88].relative);
  assert.ok(r[88].tonic > 0);
  assert.equal(r[91].nominalM, 0);
  assert.ok(r[91].relative > 0);
  assert.ok(r[300].relative < 0.001 && r[300].memory > 0.01);
  assert.ok(r[1100].secondary > 0.01);
  assert.ok(r[1629].phasic < r[9].phasic);
  assert.ok(r[1699].tonic > r[79].tonic);
  assert.equal(r[9].forceG, null);
  const f = sampleProtocol(
    { ...t.plan, knobs: { ...t.plan.knobs, scaleG: 2 } },
    9,
  );
  near(f[9].forceG!, 1 + 2 * r[9].relative);
});
test("separate onset, time to peak, and no instantaneous mechanical zero at wash", () => {
  const t = preset("intact"),
    p = { ...t.plan, schedule: "prolonged" as const },
    r = sampleProtocol(p, 400);
  const peak = r.reduce((a, b) => (a.phasic >= b.phasic ? a : b));
  assert.equal(peak.s - 1, p.knobs.peakS);
  near(r[151].secondary, 0);
  assert.ok(r[152].secondary > 0);
  const wash = sampleProtocol(p, 400, 220);
  near(wash[220].relative, r[220].relative);
  assert.ok(wash[221].relative < wash[220].relative);
  assert.equal(wash[220].nominalM, 0);
});
test("cumulative mass balance and interrupted schedule", () => {
  const p = { ...preset().plan, schedule: "cumulative" as const },
    r = sampleProtocol(p, 150);
  for (const e of schedule(p)) near(r[e.s].nominalM, e.targetM);
  assert.ok(r[61].volumeMl > r[31].volumeMl);
  assert.equal(r[121].volumeMl, 3);
  const interrupted = sampleProtocol(p, 150, 45);
  assert.equal(interrupted.at(-1)!.nominalM, 0);
  assert.deepEqual(
    interrupted.filter((q) => q.event).map((q) => q.s),
    [1, 31, 45],
  );
});
test("protocol payload is bounded, context-specific, replayable, mutually exclusive with v1", () => {
  const t = { ...preset(), elapsed: 20 };
  const e = {
    ...create("Protocol"),
    version: OPTION,
    trial: t,
    ach: undefined,
    datasets: [corbett.id],
    parameters: [OPTION],
  };
  assert.ok(valid(e));
  assert.ok(!valid({ ...e, ach: create("x").ach }));
  assert.ok(!valid({ ...e, datasets: ["incorrect"] }));
  for (const x of [
    { elapsed: 99e6 },
    { washAt: 22 },
    { plan: { ...t.plan, version: "future" } },
    { plan: { ...t.plan, knobs: { ...t.plan.knobs, peakS: -1 } } },
  ])
    assert.equal(validTrial({ ...t, ...x }), false);
  const restored = JSON.parse(JSON.stringify(e));
  assert.deepEqual(
    sampleProtocol(restored.trial.plan, 20),
    sampleProtocol(t.plan, 20),
  );
  const meta = trialMetadata(t, e.id, e.created);
  assert.equal(meta.classification, "SIMULATED");
  assert.match(csv(meta, sampleProtocol(t.plan, 20)), /metadata_json/);
});

test("strip and mucosa-deprived scenarios do not import isotonic parameters", () => {
  for (const context of ["strip", "deprived"] as const) {
    const t = preset(context);
    assert.equal(
      registry(context, t.plan.knobs).filter((r) =>
        ["DIRECT_REPORTED", "CALCULATED"].includes(r.provenance),
      ).length,
      0,
    );
    assert.equal(sampleProtocol(t.plan, 20)[20].forceG, null);
  }
});
test("manual additions and wash are causal and replayable; malformed history rejected", () => {
  const t = preset(),
    p = {
      ...t.plan,
      schedule: "manual" as const,
      manual: [
        { s: 0, targetM: t.plan.doseM },
        { s: 10, targetM: 0 },
        { s: 30, targetM: t.plan.doseM },
      ],
    };
  const r = sampleProtocol(p, 50);
  assert.equal(r[0].relative, 0);
  assert.ok(r[10].relative > 0.5);
  assert.equal(r[10].volumeMl, 3);
  assert.ok(r[30].memory > 0);
  assert.equal(r[30].nominalM, r[0].nominalM);
  assert.throws(() => sampleProtocol(p, 29));
  assert.throws(() =>
    sampleProtocol({ ...p, manual: [p.manual[1], p.manual[0]] }, 50),
  );
});

import {
  validComparison,
  fitComparison,
  template,
} from "../src/simulation/ach/comparison";
import { exposureMetrics } from "../src/simulation/ach/protocol";
test("local replicate calibration requires matched context and attribution; test vectors are not biological data", () => {
  const d = {
    ...template("mplm"),
    citation: "Software test only",
    rights: "Synthetic fixture",
    conditions: "numerical test",
    id: "test-only",
    curves: Array.from({ length: 6 }, (_, i) => ({
      preparationId: `fixture-${i}`,
      baselineG: 1,
      plateauG: [3, 3],
      points: [0.3, 0.5, 1, 2, 3].map((x) => ({
        molar: x * 1e-8,
        g: 1 + (2 * x) / (1 + x),
      })),
    })),
  };
  assert.ok(validComparison(d, "mplm"));
  assert.ok(!validComparison({ ...d, citation: "" }, "mplm"));
  assert.ok(!validComparison(d, "intact"));
  assert.ok(!validComparison({ ...d, recording: "isotonic" }, "mplm"));
  const fit = fitComparison(d)!;
  near(fit.estimates[0].emaxG, 2);
  near(fit.estimates[0].hill, 1);
  assert.ok(fit.confidenceIntervals.ec50M);
  assert.ok(fit.estimates.every((e) => e.rmseG < 1e-10));
});
test("exposure windows stop at a wash and require observed return", () => {
  const p = preset().plan;
  const [early] = exposureMetrics(sampleProtocol(p, 60));
  assert.equal(early.complete, false);
  assert.equal(early.firstMechanicalReturnS, null);
  const [closed] = exposureMetrics(sampleProtocol(p, 180));
  assert.deepEqual(closed.terminalWindowS, [81, 90]);
  assert.equal(closed.washS, 91);
  assert.ok(closed.firstMechanicalReturnS! > 0);
});
test("ascending and repeated non-cumulative protocols start each dose with exchanged solution, not a reset tissue", () => {
  for (const schedule of ["series", "repeated"] as const) {
    const p = { ...preset().plan, schedule, durationS: 540 },
      r = sampleProtocol(p, 540);
    const adds = r.filter((q) => q.event.startsWith("add"));
    assert.equal(adds.length, 3);
    assert.ok(r[180].memory > 0);
    assert.equal(r[180].nominalM, 0);
    assert.equal(exposureMetrics(r).length, 3);
    if (schedule === "series") assert.ok(adds[1].nominalM > adds[0].nominalM);
    else assert.equal(adds[1].nominalM, adds[0].nominalM);
  }
});
