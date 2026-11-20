import {
  evidence,
  type Preparation,
  type Recording,
  type Observation,
  type Uncertainty,
  type Classification,
} from "./evidence";
import { hill, nonnegative, pEC50, potencyInterval } from "./math";
const units = {
  EC50: "M",
  pEC50: "−log10(M)",
  Emax: "g",
  Hill: "1",
  baseline: "g",
  onset: "s",
  timeToPeak: "s",
  phasic: "g",
  fade: "g",
  tonic: "g",
  recovery: "s",
  repeatedExposure: "1",
};
type Key = keyof typeof units;
type Parameter = {
  preparation: Preparation;
  recording: Recording;
  value: number | null;
  units: string;
  uncertainty: Uncertainty | null;
  source: string | null;
  context: Observation["context"] | null;
  classification: Classification | null;
  calibration: "pending" | "reference only" | "approved";
  validation: "unvalidated";
};
export function profile(preparation: Preparation, recording: Recording) {
  const parameters = Object.fromEntries(
    Object.entries(units).map(([k, u]) => [
      k,
      {
        preparation,
        recording,
        value: null,
        units:
          recording === "isotonic" && u === "g"
            ? "% shortening (normalised)"
            : u,
        uncertainty: null,
        source: null,
        context: null,
        classification: null,
        calibration: "pending",
        validation: "unvalidated",
      },
    ]),
  ) as Record<Key, Parameter>;
  const records = evidence.filter(
    (e) => e.preparation === preparation && e.recording === recording,
  );
  for (const e of records) {
    if (e.parameter === "Secondary tonic onset") continue;
    const param: Parameter = {
      preparation,
      recording,
      value: e.value,
      units: e.units,
      uncertainty: structuredClone(e.uncertainty),
      source: e.id,
      context: structuredClone(e.context),
      classification: e.classification,
      calibration: "reference only",
      validation: "unvalidated",
    };
    parameters[e.parameter] = param;
    if (e.parameter === "EC50") {
      const [low, high] = potencyInterval(
        e.uncertainty.low,
        e.uncertainty.high,
      );
      parameters.pEC50 = {
        ...param,
        value: pEC50(e.value),
        units: units.pEC50,
        classification: "Calculated from published measurements",
        uncertainty: { kind: "95% CI", low, high },
      };
    }
  }
  return {
    version: "gp-ach-params/1",
    preparation,
    recording,
    parameters,
    datasets: records.map((e) => e.id),
  };
}
export type Profile = ReturnType<typeof profile>;
export function steadyForce(
  tissueM: number,
  p: Profile,
  expected: Preparation,
) {
  nonnegative(tissueM, "tissue concentration");
  if (p.preparation !== expected || p.recording !== "isometric")
    throw Error("Incompatible preparation or recording");
  const { EC50, Hill, Emax, baseline } = p.parameters;
  for (const key of ["EC50", "Hill", "Emax", "baseline"] as const) {
    const x = p.parameters[key];
    if (
      x.recording !== p.recording ||
      x.preparation !== expected ||
      x.units !== units[key]
    )
      throw Error("Parameter context mismatch: " + key);
  }
  if (
    [EC50, Hill, Emax, baseline].some(
      (x) => x.calibration !== "approved" || x.value === null || !x.source,
    )
  )
    return null;
  return hill(tissueM, EC50.value!, Hill.value!, Emax.value!, baseline.value!);
}
