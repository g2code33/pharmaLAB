import { createRun, validRun, VERSION, type Run } from "./ach/run";
import { tissues } from "../catalogue";
export { tissues, drugs } from "../catalogue";
export interface SimulationState {
  status: "AWAITING SCIENTIFIC VALIDATION";
  tension: number | null;
  mounted: boolean;
}
export interface ScientificEngine {
  snapshot(run?: Run): SimulationState;
}
export const engine: ScientificEngine = {
  snapshot: (run) => ({
    status: "AWAITING SCIENTIFIC VALIDATION",
    tension: run?.results.forceG ?? null,
    mounted: true,
  }),
};
export interface Experiment {
  ach?: Run;
  schema: 1;
  id: string;
  name: string;
  created: string;
  model: string;
  version: string;
  parameters: string[];
  conditions: Record<string, string>;
  datasets: string[];
  recording: { scale: string; sensitivity: string };
  events: { at: string; text: string }[];
  notes: string;
}
export function create(name: string): Experiment {
  const ach = createRun();
  return {
    ach,
    schema: 1,
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled experiment",
    created: new Date().toISOString(),
    model: tissues[0],
    version: VERSION,
    parameters: [ach.parameters.version],
    conditions: {},
    datasets: [...ach.parameters.datasets],
    recording: { scale: "60 s", sensitivity: "Unconfigured" },
    events: [],
    notes: "",
  };
}
export function valid(x: any): x is Experiment {
  const str = (v: any) => typeof v === "string",
    arr = (a: any) => Array.isArray(a) && a.every(str),
    date = (v: any) => str(v) && Number.isFinite(Date.parse(v));
  return (
    !!x &&
    x.schema === 1 &&
    (x.ach === undefined
      ? x.version !== VERSION
      : x.version === VERSION && validRun(x.ach)) &&
    str(x.id) &&
    str(x.name) &&
    date(x.created) &&
    str(x.model) &&
    str(x.version) &&
    arr(x.parameters) &&
    arr(x.datasets) &&
    (!x.ach ||
      (x.model === tissues[0] &&
        x.parameters.length === 1 &&
        x.parameters[0] === x.ach.parameters.version &&
        x.datasets.length === x.ach.parameters.datasets.length &&
        x.datasets.every(
          (id: string, i: number) => id === x.ach.parameters.datasets[i],
        ))) &&
    x.conditions &&
    typeof x.conditions === "object" &&
    !Array.isArray(x.conditions) &&
    Object.values(x.conditions).every(str) &&
    str(x.recording?.scale) &&
    str(x.recording?.sensitivity) &&
    str(x.notes) &&
    Array.isArray(x.events) &&
    x.events.every((e: any) => date(e?.at) && str(e.text))
  );
}
