import { hill, pEC50 } from "./math";
/** No phase window or equilibrium window is inferred from uncalibrated traces. */
export interface Sample {
  s: number;
  g: number;
}
export function traceMetrics(
  samples: readonly Sample[],
  onsetS: number,
  tonic: [number, number],
  washS: number,
  baselineG: number,
  toleranceG: number,
) {
  if (
    ![onsetS, ...tonic, washS, baselineG, toleranceG].every(Number.isFinite) ||
    onsetS > tonic[0] ||
    tonic[0] >= tonic[1] ||
    tonic[1] > washS ||
    toleranceG < 0
  )
    throw Error("Invalid analysis windows");
  if (
    samples.some(
      (p, i) =>
        !Number.isFinite(p.g) ||
        !Number.isFinite(p.s) ||
        (i > 0 && p.s <= samples[i - 1].s),
    )
  )
    throw Error("Invalid trace");
  const contact = samples.filter((p) => p.s >= onsetS && p.s < washS),
    window = contact.filter((p) => p.s >= tonic[0] && p.s <= tonic[1]);
  if (contact.length < 3 || window.length < 2) return null;
  const peak = contact.reduce((a, b) => (a.g >= b.g ? a : b)),
    tonicG = window.reduce((s, p) => s + p.g, 0) / window.length;
  const recovered = samples.find(
    (p) => p.s > washS && Math.abs(p.g - baselineG) <= toleranceG,
  );
  return {
    peakG: peak.g,
    timeToPeakS: peak.s - onsetS,
    tonicG,
    fadeG: peak.g - tonicG,
    firstReturnAfterWashS: recovered ? recovered.s - washS : null,
    recoveryNote: "No inference of full biological recovery",
  };
}
export type DataRole =
  | "calibration"
  | "independent validation"
  | "supporting mechanism"
  | "educational assumption";
export interface Series {
  id: string;
  observationIds: readonly string[];
  preparation: string;
  recording: string;
  conditions: string;
  role: DataRole;
}
export function compareIndependent(
  training: Series,
  holdout: Series,
  observed: readonly number[],
  predicted: readonly number[],
) {
  if (
    training.role !== "calibration" ||
    holdout.role !== "independent validation" ||
    training.id === holdout.id ||
    !training.observationIds.length ||
    !holdout.observationIds.length ||
    training.observationIds.some((id) => holdout.observationIds.includes(id))
  )
    throw Error("Independent observations required");
  if (
    training.preparation !== holdout.preparation ||
    training.recording !== holdout.recording ||
    training.conditions !== holdout.conditions
  )
    throw Error("Compare matched contexts separately");
  if (
    !observed.length ||
    observed.length !== predicted.length ||
    ![...observed, ...predicted].every(Number.isFinite)
  )
    throw Error("Missing paired observations");
  const residuals = predicted.map((v, i) => v - observed[i]);
  return {
    residuals,
    rmse: Math.sqrt(
      residuals.reduce((s, r) => s + r * r, 0) / residuals.length,
    ),
    validated: false,
  };
}

/** Per-preparation interpolation, only for series with independently established
 * baseline and upper plateau. Never infer either from a single extreme point.
 * Intervals quantify between-preparation variation (not point digitisation error).
 */
export type Curve = {
  preparationId: string;
  baselineG: number;
  plateauG: readonly number[];
  points: readonly { molar: number; g: number }[];
};
export function estimateCurve(source: Series, curves: readonly Curve[]) {
  if (
    source.role !== "calibration" ||
    source.recording !== "isometric" ||
    !source.observationIds.length ||
    curves.length < 3 ||
    new Set(curves.map((c) => c.preparationId)).size !== curves.length
  )
    return null;
  const estimates: {
    id: string;
    ec50M: number;
    pEC50: number;
    emaxG: number;
    hill: number;
    residualsG: number[];
    rmseG: number;
  }[] = [];
  for (const c of curves) {
    if (
      c.plateauG.length < 2 ||
      ![c.baselineG, ...c.plateauG].every(Number.isFinite) ||
      c.points.some(
        (p) =>
          !(p.molar > 0) || !Number.isFinite(p.molar) || !Number.isFinite(p.g),
      )
    )
      return null;
    const emax =
      c.plateauG.reduce((s, v) => s + v, 0) / c.plateauG.length - c.baselineG;
    if (!(emax > 0)) return null;
    const xy = c.points
      .map((p) => ({ x: Math.log(p.molar), f: (p.g - c.baselineG) / emax }))
      .filter((p) => p.f >= 0.2 && p.f <= 0.8);
    if (
      new Set(xy.map((p) => p.x)).size < 3 ||
      !xy.some((p) => p.f < 0.5) ||
      !xy.some((p) => p.f > 0.5)
    )
      return null;
    const mean = (v: number[]) => v.reduce((s, n) => s + n, 0) / v.length;
    const x = mean(xy.map((p) => p.x)),
      y = mean(xy.map((p) => Math.log(p.f / (1 - p.f))));
    const n =
        xy.reduce(
          (s, p) => s + (p.x - x) * (Math.log(p.f / (1 - p.f)) - y),
          0,
        ) / xy.reduce((s, p) => s + (p.x - x) ** 2, 0),
      ec = Math.exp(x - y / n);
    if (!(n > 0 && ec > 0 && Number.isFinite(n) && Number.isFinite(ec)))
      return null;
    const residuals = c.points.map(
      (p) => hill(p.molar, ec, n, emax, c.baselineG) - p.g,
    );
    estimates.push({
      id: c.preparationId,
      ec50M: ec,
      pEC50: pEC50(ec),
      emaxG: emax,
      hill: n,
      residualsG: residuals,
      rmseG: Math.sqrt(mean(residuals.map((v) => v * v))),
    });
  }
  return {
    classification: "Estimated from experimental data",
    source,
    algorithm:
      "OLS logit(fraction) vs ln(M) per preparation; empirical mean plateau increment",
    initialGuesses: null,
    constraints: "positive slope, bracketed midpoint, 20–80% region",
    estimates,
    confidenceIntervals: Object.fromEntries(
      (["ec50M", "pEC50", "emaxG", "hill"] as const).map((key) => [
        key,
        medianInterval(estimates.map((e) => e[key])),
      ]),
    ),
    intervalStatus:
      "Distribution-free median intervals across independent preparations; null if sample cannot support 95% coverage",
  };
}

/** Two-sided sign-test interval for the population median (independent replicates).
 * Sum binomial tails in log space to avoid underflow at large sample sizes. */
export function medianInterval(values: readonly number[]) {
  if (values.length < 6 || !values.every(Number.isFinite)) return null;
  const sorted = [...values].sort((a, b) => a - b),
    n = sorted.length;
  let logP = -n * Math.LN2,
    tail = 0,
    k = 0;
  while (k < n / 2 && tail + Math.exp(logP) <= 0.025) {
    tail += Math.exp(logP);
    logP += Math.log(n - k) - Math.log(k + 1);
    k++;
  }
  return {
    low: sorted[k - 1],
    high: sorted[n - k],
    coverage: 1 - 2 * tail,
    statistic: "median",
  };
}
