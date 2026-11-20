import { validComparison, type Comparison } from "./comparison";
import {
  defaults,
  fields,
  sources,
  schedules,
  registry,
  type Context,
  type Schedule,
  type Knobs,
} from "./protocols";
import { hill, mix, volumeForTarget } from "./math";
import { instrument, measure, stableBath } from "./dynamics";
export const OPTION = "GP-ACH-001/option-a-1" as const;
export const WORKSTATION = "GP-ACH-001/option-a-2" as const;
export type Transfer =
  | { s: number; kind: "add"; stockM: number; volumeMl: number }
  | { s: number; kind: "exchange"; nominalM: number };
export interface Plan {
  transfers?: Transfer[];
  initialVolumeMl?: number;
  version: typeof OPTION | typeof WORKSTATION;
  context: Context;
  manual?: DoseEvent[];
  schedule: Schedule;
  doseM: number;
  durationS: number;
  knobs: Knobs;
}
export interface Trial {
  reservoirM?: number;
  recordFromS?: number;
  solutionRecipe?: "mplm" | "intact";
  comparison?: Comparison;
  plan: Plan;
  elapsed: number;
  stopped: boolean;
  washAt: number | null;
}
export function preset(context: Context = "mplm"): Trial {
  return {
    plan: {
      version: OPTION,
      context,
      schedule: context === "intact" ? "paired" : "single",
      doseM: context === "intact" ? 5.5e-6 : 1e-6,
      durationS: context === "intact" ? 1800 : 180,
      knobs: defaults(context),
    },
    elapsed: 0,
    stopped: false,
    washAt: null,
  };
}
/** New records support measured-volume commands; historical presets retain their reader. */
export function workstationPreset(context: Context = "mplm"): Trial {
  const t = preset(context);
  return {
    ...t,
    plan: { ...t.plan, version: WORKSTATION, schedule: "manual" },
  };
}
export function validTrial(value: unknown): value is Trial {
  const t = value as Trial,
    p = t?.plan;
  return (
    !!p &&
    (p.version === WORKSTATION ||
      (p.version === OPTION &&
        [
          p.transfers,
          p.initialVolumeMl,
          t.solutionRecipe,
          t.reservoirM,
          t.recordFromS,
        ].every((v) => v === undefined))) &&
    Object.hasOwn(sources, p.context) &&
    Object.hasOwn(schedules, p.schedule) &&
    (t.comparison === undefined || validComparison(t.comparison, p.context)) &&
    p.doseM >= 1e-12 &&
    p.doseM <= 1e-3 &&
    Number.isFinite(p.doseM) &&
    Number.isInteger(p.durationS) &&
    p.durationS >= 5 &&
    p.durationS <= 7200 &&
    (p.manual === undefined ||
      (p.schedule === "manual" &&
        Array.isArray(p.manual) &&
        p.manual.length <= 7201 &&
        p.manual.every(
          (e, i, events) =>
            e &&
            Number.isInteger(e.s) &&
            e.s >= 0 &&
            e.s <= t.elapsed &&
            (!i || events[i - 1].s < e.s) &&
            (e.targetM === 0 || e.targetM === p.doseM) &&
            (i === 0 ? e.targetM > 0 : events[i - 1].targetM !== e.targetM),
        ))) &&
    (t.solutionRecipe === undefined ||
      t.solutionRecipe === "mplm" ||
      t.solutionRecipe === "intact") &&
    (t.recordFromS === undefined ||
      (Number.isInteger(t.recordFromS) &&
        t.recordFromS >= 0 &&
        t.recordFromS < p.durationS)) &&
    (t.reservoirM === undefined ||
      (Number.isFinite(t.reservoirM) &&
        t.reservoirM >= 0 &&
        t.reservoirM <= 1e-3)) &&
    (p.initialVolumeMl === undefined ||
      (Number.isFinite(p.initialVolumeMl) &&
        p.initialVolumeMl >= 1 &&
        p.initialVolumeMl <= 100)) &&
    (p.transfers === undefined ||
      (p.schedule === "manual" &&
        Array.isArray(p.transfers) &&
        p.transfers.length <= 7201 &&
        p.transfers.every(
          (e, i, a) =>
            e &&
            Number.isInteger(e.s) &&
            e.s >= 0 &&
            e.s <= t.elapsed &&
            (!i || e.s >= a[i - 1].s) &&
            (e.kind === "exchange"
              ? Number.isFinite(e.nominalM) &&
                e.nominalM >= 0 &&
                e.nominalM <= 1e-3
              : e.kind === "add" &&
                Number.isFinite(e.stockM) &&
                e.stockM >= 1e-12 &&
                e.stockM <= 1 &&
                Number.isFinite(e.volumeMl) &&
                e.volumeMl >= 1e-6 &&
                e.volumeMl <= 100),
        ))) &&
    Number.isInteger(t.elapsed) &&
    t.elapsed >= 0 &&
    t.elapsed <= p.durationS &&
    typeof t.stopped === "boolean" &&
    (t.washAt === null ||
      (Number.isInteger(t.washAt) && t.washAt >= 0 && t.washAt <= t.elapsed)) &&
    !!p.knobs &&
    Object.entries(fields).every(([k, [, , min, max]]) => {
      const v = p.knobs[k as keyof Knobs];
      return Number.isFinite(v) && v >= min && v <= max;
    })
  );
}
export type DoseEvent = { s: number; targetM: number };
/** 1 s pre-dose baseline is a recorder convention. Only paired contact/rest intervals are source-based. */
export function schedule(p: Plan): DoseEvent[] {
  if (p.schedule === "manual") return p.manual ?? [];
  const c = p.doseM;
  if (p.schedule === "series" || p.schedule === "repeated")
    return [0, 1, 2]
      .flatMap((i) => [
        {
          s: 1 + 180 * i,
          targetM: p.schedule === "series" ? c * [0.1, 1 / 3, 1][i] : c,
        },
        { s: 91 + 180 * i, targetM: 0 },
      ])
      .filter((e) => e.s <= p.durationS);
  const rows: [number, number][] =
    p.schedule === "paired"
      ? [
          [1, c],
          [91, 0],
          [691, c],
          [1411, 0],
          [1621, c],
          [1711, 0],
        ]
      : p.schedule === "cumulative"
        ? [
            [1, c / 10],
            [31, c / 3],
            [61, c],
            [121, 0],
          ]
        : p.schedule === "prolonged"
          ? [
              [1, c],
              [1801, 0],
            ]
          : [
              [1, c],
              [91, 0],
            ];
  return rows
    .filter(([s]) => s <= p.durationS)
    .map(([s, targetM]) => ({ s, targetM }));
}
export interface Point {
  s: number;
  nominalM: number;
  volumeMl: number;
  phasic: number;
  tonic: number;
  secondary: number;
  relative: number;
  memory: number;
  forceG: number | null;
  event: string;
  commands?: string[];
}
interface Tissue {
  phasic: number;
  impulse: number;
  tonic: number;
  secondary: number;
  memory: number;
  drive: number;
  age: number;
  priorMemory: number;
}
const fresh = (): Tissue => ({
  phasic: 0,
  impulse: 0,
  tonic: 0,
  secondary: 0,
  memory: 0,
  drive: 0,
  age: 0,
  priorMemory: 0,
});
/** Replaceable phenomenological tissue step. No ionic/receptor kinetic constants. */
export interface TissueStep {
  advance(t: Tissue, drive: number, k: Knobs): Tissue;
}
export const optionA: TissueStep = {
  advance(t, d, k) {
    const on = d > 0,
      inc = Math.max(0, d - t.drive),
      age = on ? (t.drive === 0 ? 1 : t.age + 1) : 0,
      prior = t.drive === 0 && on ? t.memory : t.priorMemory;
    const memory = on
      ? d + (t.memory - d) * Math.exp(-1 / k.conditionS)
      : t.memory * Math.exp(-1 / k.recoverS);
    const r = Math.exp(-1 / k.peakS),
      relax = Math.exp(-1 / k.washS),
      impulse = t.impulse + Math.E * inc * d * (1 - t.memory);
    const phasic = on ? r * (t.phasic + impulse / k.peakS) : t.phasic * relax;
    const target = d * (1 - d * (1 - k.tonic)) * (1 + prior),
      tonic = on
        ? target + (t.tonic - target) * Math.exp(-1 / k.peakS)
        : t.tonic * relax;
    const x = Math.max(0, (age - k.delayS * (1 - prior)) / k.widthS);
    const pulse = d * k.secondary * (1 + prior) * x * Math.exp(1 - x);
    const secondary = on
      ? pulse + (t.secondary - pulse) * r
      : t.secondary * relax;
    return {
      phasic,
      impulse: on ? impulse * r : 0,
      tonic,
      secondary,
      memory,
      drive: d,
      age,
      priorMemory: prior,
    };
  },
};
export function sampleProtocol(
  p: Plan,
  end: number,
  washAt: number | null = null,
  model: TissueStep = optionA,
): Point[] {
  if (!validTrial({ plan: p, elapsed: end, washAt, stopped: false }))
    throw Error("Invalid protocol or sampling window");
  const events = new Map(schedule(p).map((e) => [e.s, e.targetM]));
  const initial = p.initialVolumeMl ?? sources[p.context].volumeMl;
  let nextTransfer = 0;
  let bath = { volumeMl: Number(initial), nominalM: 0 },
    t = fresh();
  const out: Point[] = [];
  for (let s = 0; s <= end; s++) {
    const target =
      s === washAt
        ? 0
        : washAt !== null && s > washAt
          ? undefined
          : events.get(s);
    let event = "";
    if (target === 0) {
      bath = { volumeMl: initial, nominalM: 0 };
      event = "wash";
    } else if (target !== undefined) {
      const stock = p.doseM * 100;
      const v = volumeForTarget(bath, stock, target);
      bath = mix(bath, stock, v);
      event = `add ${v} mL at ${stock} M`;
    }
    // Physical boluses and full-volume exchanges use the same bath as scheduled events.
    const commands = event ? [event] : [];
    while (p.transfers?.[nextTransfer]?.s === s) {
      const op = p.transfers[nextTransfer++];
      if (op.kind === "add") {
        bath = mix(bath, op.stockM, op.volumeMl);
        event = `add ${op.volumeMl} mL at ${op.stockM} M`;
      } else {
        bath = { volumeMl: initial, nominalM: op.nominalM };
        event = op.nominalM === 0 ? "wash" : `exchange at ${op.nominalM} M`;
      }
      commands.push(event);
    }
    const d = hill(
      stableBath.tissueConcentration(bath.nominalM, 0),
      p.knobs.ec50M,
      p.knobs.slope,
      1,
      0,
    );
    const relative = t.phasic + t.tonic + t.secondary;
    out.push({
      s,
      ...bath,
      phasic: t.phasic,
      tonic: t.tonic,
      secondary: t.secondary,
      relative,
      memory: t.memory,
      forceG:
        p.knobs.scaleG > 0
          ? measure(p.knobs.preloadG + relative * p.knobs.scaleG, instrument, s)
          : null,
      ...(commands.length > 1 ? { commands } : {}),
      event,
    });
    t = model.advance(t, d, p.knobs);
  }
  return out;
}
export function doseCurve(p: Plan) {
  return Array.from({ length: 81 }, (_, i) => {
    const logM = Math.log10(p.knobs.ec50M) - 3 + (i * 6) / 80;
    return {
      logM,
      molar: 10 ** logM,
      percent: hill(10 ** logM, p.knobs.ec50M, p.knobs.slope, 100, 0),
    };
  });
}
export function trialMetadata(t: Trial, id: string, date: string) {
  return {
    experimentId: id,
    created: date,
    version: t.plan.version,
    species: "Cavia porcellus",
    tissue: "ileum",
    agonist: "ACh",
    context: sources[t.plan.context],
    setupSolution: sources[t.solutionRecipe ?? t.plan.context].solution,
    solutionEffect: "Setup metadata only. No ion-specific response model.",
    protocol: schedules[t.plan.schedule],
    trial: t,
    parameters: registry(t.plan.context, t.plan.knobs),
    sampleHz: 1,
    classification: "SIMULATED",
    calibration: "provisional; no independent validation",
    mixing: stableBath.version,
    instrument: { ...instrument },
    units: {
      s: "virtual seconds",
      nominalM: "mol/L",
      volumeMl: "mL",
      relative: "active response / scenario scale (not measured Emax)",
      phasic: "scenario fraction",
      tonic: "sustained scenario fraction",
      secondary: "delayed scenario fraction",
      memory: "dimensionless history index",
      forceG: "g including passive load; null when unscaled",
      percent: "percent of static Hill drive",
      logM: "log10(mol/L)",
    },
    stockM: t.plan.transfers?.length ? null : t.plan.doseM * 100,
    stockStatus: t.plan.transfers?.length
      ? "See individual physical transfer records"
      : "ASSUMED: protocol stock selected for mass balance",
    referenceFit:
      "No verified point series; RMSE, slope CI and residuals unavailable",
  };
}
export function csv<T extends object>(metadata: object, rows: T[]) {
  const quote = (x: unknown) =>
    '"' + String(x ?? "").replaceAll('"', '""') + '"';
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [
    [...keys, "metadata_json"].map(quote).join(","),
    ...rows.map((r, i) =>
      [
        ...keys.map((key) => r[key as keyof T]),
        i === 0 ? JSON.stringify(metadata) : "",
      ]
        .map(quote)
        .join(","),
    ),
  ].join("\r\n");
}

/** Descriptive windows in scenario units, not an estimate of equilibrium or biological recovery. */
export function exposureMetrics(points: readonly Point[]) {
  return points.flatMap((q, i) => {
    if (!q.event || !q.nominalM) return [];
    let end = i + 1;
    while (end < points.length && !points[end].event) end++;
    const contact = points.slice(i, end),
      peak = contact.reduce((a, b) => (b.relative > a.relative ? b : a)),
      tail = contact.slice(-10),
      baseline = points[Math.max(0, i - 1)].relative;
    const firstRise = contact.find((p) => p.relative > q.relative + 0.001);
    const wash = points[end]?.event === "wash" ? points[end] : null;
    let firstReturn: number | null = null;
    if (wash) {
      for (let j = end; j < points.length; j++) {
        const x = points[j];
        if (x.nominalM > 0) break;
        if (Math.abs(x.relative - baseline) <= 0.01) {
          firstReturn = x.s - wash.s;
          break;
        }
      }
    }
    return [
      {
        onsetS: q.s,
        baselineRelative: baseline,
        peakRelative: peak.relative,
        timeToPeakS: peak.s - q.s,
        onsetLatencyS: firstRise ? firstRise.s - q.s : null,
        terminalMeanRelative:
          tail.reduce((a, b) => a + b.relative, 0) / tail.length,
        terminalWindowS: [tail[0].s, tail.at(-1)!.s],
        fadeRelative: peak.relative - tail.at(-1)!.relative,
        washS: wash?.s ?? null,
        firstMechanicalReturnS: firstReturn,
        complete: end < points.length,
      },
    ];
  });
}
