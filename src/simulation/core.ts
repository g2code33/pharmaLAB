import { tissues } from "../catalogue";
export { tissues, drugs } from "../catalogue";
export interface SimulationState {
  status: "AWAITING SCIENTIFIC VALIDATION";
  tension: null;
  mounted: boolean;
}
export interface ScientificEngine {
  snapshot(): SimulationState;
}
export const engine: ScientificEngine = {
  snapshot: () => ({
    status: "AWAITING SCIENTIFIC VALIDATION",
    tension: null,
    mounted: true,
  }),
};
export interface Experiment {
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
  return {
    schema: 1,
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled experiment",
    created: new Date().toISOString(),
    model: tissues[0],
    version: "foundation-1 (no biological model)",
    parameters: [],
    conditions: {},
    datasets: [],
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
    str(x.id) &&
    str(x.name) &&
    date(x.created) &&
    str(x.model) &&
    str(x.version) &&
    arr(x.parameters) &&
    arr(x.datasets) &&
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
