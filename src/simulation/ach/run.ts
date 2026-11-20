import { preparations, type Preparation } from "./evidence";
import { profile, steadyForce } from "./profile";
import { mix, positive, nonnegative } from "./math";
import {
  instrument,
  measure,
  pendingKinetics,
  stableBath,
  type Exposure,
  type Instrument,
} from "./dynamics";
export const VERSION = "GP-ACH-001/1";
export type Command =
  | { kind: "add"; stockM: number; additionMl: number }
  | { kind: "wash" | "start" | "pause" | "resume" | "stop" };
type Entry = Command & { at: string; nominalM: number; volumeMl: number };
export function createRun(
  preparation: Preparation = "Longitudinal strip",
  initialMl = 30,
  display: Pick<Instrument, "gain" | "noiseAmplitude"> = instrument,
) {
  if (!preparations.includes(preparation)) throw Error("Unknown preparation");
  positive(initialMl, "bath volume");
  const parameters = profile(preparation, "isometric");
  return {
    version: VERSION,
    parameters,
    initialMl,
    bath: { volumeMl: initialMl, nominalM: 0 },
    conditions: {
      temperatureC: null,
      gas: null,
      solution: "unspecified; not a reproduction of a paper",
    },
    instrument: {
      ...instrument,
      gain: positive(display.gain, "display gain"),
      noiseAmplitude: nonnegative(
        display.noiseAmplitude,
        "display noise amplitude",
      ),
    },
    assumptions: stableBath.version,
    analysis: "mass balance v1; no force fit",
    state: "ready" as "ready" | "recording" | "paused" | "stopped",
    history: [] as Entry[],
    results: {
      tissueM: 0,
      forceG: null as number | null,
      signal: null as number | null,
      recovery: "not assessed",
    },
  };
}
export type Run = ReturnType<typeof createRun>;
export function apply(
  run: Run,
  command: Command,
  at = new Date().toISOString(),
): Run {
  const last = run.history.at(-1);
  if (
    !Number.isFinite(Date.parse(at)) ||
    (last && Date.parse(at) < Date.parse(last.at))
  )
    throw Error("Invalid event time");
  if (run.state === "stopped")
    throw Error("Experiment stopped; reset or create another");
  let state: Run["state"] = run.state;
  let bath = run.bath;
  let recovery = run.results.recovery;
  switch (command.kind) {
    case "add":
      bath = mix(
        bath,
        positive(command.stockM, "ACh stock"),
        command.additionMl,
      );
      break;
    case "wash":
      bath = { nominalM: 0, volumeMl: run.initialMl };
      recovery = "unknown after wash";
      break;
    case "start":
      if (state !== "ready") throw Error("Already started");
      state = "recording";
      break;
    case "pause":
      if (state !== "recording") throw Error("Not recording");
      state = "paused";
      break;
    case "resume":
      if (state !== "paused") throw Error("Not paused");
      state = "recording";
      break;
    case "stop":
      state = "stopped";
      break;
    default:
      throw Error("Unknown operation");
  }
  const entry = { ...command, at, ...bath };
  const history = [...run.history, entry];
  const exposures = history.filter(
    (e): e is Entry & Exposure => e.kind === "add" || e.kind === "wash",
  );
  const tissueM = stableBath.tissueConcentration(
    bath.nominalM,
    (Date.parse(at) - Date.parse(exposures.at(-1)?.at ?? at)) / 1000,
  );
  const { forceG } = pendingKinetics.sample(
    run.parameters,
    tissueM,
    steadyForce(tissueM, run.parameters, run.parameters.preparation),
    exposures,
    at,
  );
  return {
    ...run,
    bath,
    state,
    history,
    results: {
      tissueM,
      forceG,
      signal:
        state === "recording"
          ? measure(
              forceG,
              run.instrument,
              (Date.parse(at) - Date.parse(history[0].at)) / 1000,
            )
          : null,
      recovery,
    },
  };
}
/** V1 replay is deterministic. Do not change v1 profiles in place; retain old readers. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(
      ([k, v]) =>
        Object.hasOwn(b, k) && same(v, (b as Record<string, unknown>)[k]),
    )
  );
}
export function validRun(value: unknown): value is Run {
  try {
    const r = value as Run;
    if (r.version !== VERSION || !Array.isArray(r.history)) return false;
    let replay = createRun(r.parameters.preparation, r.initialMl, r.instrument);
    for (const e of r.history) {
      const command: Command =
        e.kind === "add"
          ? { kind: "add", stockM: e.stockM, additionMl: e.additionMl }
          : { kind: e.kind };
      replay = apply(replay, command, e.at);
    }
    return same(replay, r);
  } catch {
    return false;
  }
}
