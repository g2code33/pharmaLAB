import type { Profile } from "./profile";
import { nonnegative, positive } from "./math";
export interface AChHydrolysisModel {
  version: string;
  remainingM(initialM: number, seconds: number): number;
}
/** No enzyme or half-life estimate is registered. Mixing is a separate assumption. */
export const stableBath = {
  version: "ideal-mixing/no-hydrolysis/1",
  tissueConcentration(
    nominalM: number,
    seconds: number,
    hydrolysis: AChHydrolysisModel | null = null,
  ) {
    nonnegative(seconds, "contact duration");
    nonnegative(nominalM, "nominal concentration");
    return hydrolysis
      ? nonnegative(hydrolysis.remainingM(nominalM, seconds), "remaining ACh")
      : nominalM;
  },
};
export interface Exposure {
  at: string;
  kind: "add" | "wash";
  nominalM: number;
}
export interface TimeResponse {
  forceG: number | null;
  stage:
    | "unknown"
    | "onset"
    | "phasic"
    | "peak"
    | "fade"
    | "tonic"
    | "recovery";
  desensitisation: number | null;
}
export interface TimeModel {
  sample(
    profile: Profile,
    tissueM: number,
    steadyForceG: number | null,
    history: readonly Exposure[],
    at: string,
  ): TimeResponse;
}
export const pendingKinetics: TimeModel = {
  sample: () => ({ forceG: null, stage: "unknown", desensitisation: null }),
};
export interface Instrument {
  gain: number;
  sensitivity: number;
  zeroG: number;
  driftPerS: number;
  noiseAmplitude: number;
  sampleHz: number;
  calibration: string;
}
export const instrument: Instrument = {
  gain: 1,
  sensitivity: 1,
  zeroG: 0,
  driftPerS: 0,
  noiseAmplitude: 0,
  sampleHz: 1,
  calibration: "ideal display, not calibrated",
};
/** noiseSample is caller-supplied and must be saved if enabled. No hidden RNG. */
export function measure(
  forceG: number | null,
  c: Instrument,
  t: number,
  noiseSample = 0,
) {
  if (forceG === null) return null;
  positive(c.gain, "gain");
  positive(c.sensitivity, "sensitivity");
  positive(c.sampleHz, "sample rate");
  nonnegative(c.noiseAmplitude, "noise amplitude");
  nonnegative(t, "elapsed time");
  const y =
    (forceG - c.zeroG) * c.gain * c.sensitivity +
    t * c.driftPerS +
    c.noiseAmplitude * noiseSample;
  if (!Number.isFinite(y)) throw Error("Invalid instrument signal");
  return y;
}
