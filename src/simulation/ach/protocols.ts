/** Immutable Option A/1 reference contexts. Not interchangeable with v1 profiles. */
import { evidence } from "./evidence";
import { molar } from "./math";
export const corbett = {
  id: "CL97-control-v1",
  publication: "Corbett & Lees (1997)",
  doi: "10.1038/sj.bjp.0700870",
  url: "https://bpspubs.onlinelibrary.wiley.com/doi/full/10.1038/sj.bjp.0700870",
  location: "pp. 107–110; Fig 2a / Results",
  animals: "Male Dunkin Hartley, 200–650 g; animal count unspecified",
  preparation: "MPLM",
  method:
    "Peeled longitudinal muscle with adherent myenteric plexus; terminal 10–12 cm excluded. Mounted dimensions unspecified.",
  temperatureC: 37,
  volumeMl: 3,
  loadG: 1,
  gas: "95% O₂ / 5% CO₂",
  solution:
    "Krebs, mM: NaCl 118, KCl 4.75, CaCl2 2.54, NaH2PO4 1.1, MgSO4 1.2, NaHCO3 25, glucose 11.1; pH 7.4",
  recording: "Isometric · Pye-Ether transducer",
  equilibrationS: null,
  contact: "At least 1 min; exact Fig 2a wash intervals unspecified",
  n: "7 observations per point (mean ± SEM)",
  ec50uM: 0.04,
  pEC50: 7.39,
  pEC50sem: 0.04,
  rights: "Citation and scalar summaries only; figure reuse not cleared",
} as const;
const timing = evidence.find((e) => e.id === "C-intact-tonic-v1")!;
export const aboulafia = {
  id: timing.id,
  publication: "Aboulafia et al. (1987)",
  doi: timing.doi,
  url: timing.url,
  location: "pp. 348–350; Figs 1–4",
  animals: "Either sex, 150–200 g; animal count unspecified",
  preparation: "Intact segment",
  method: "4 cm distal ileum segments",
  temperatureC: 37,
  volumeMl: 5,
  loadG: 1,
  gas: timing.context.gas,
  solution: timing.context.solution,
  recording: "Isometric · Narco transducer",
  equilibrationS: null,
  contact:
    "90 s test, 600 s rest, 720 s conditioning, 210 s rest, 90 s test; 5.5 µM",
  n: "16 for secondary onset, not for entire trace",
  rights: timing.license,
} as const;
// Suzuki describes these preparations isotonically. Cite it for identity only:
// every apparatus setting below is an educational scenario, not its methods.
function exploratory(id: string, preparation: string) {
  return {
    id,
    preparation,
    method:
      "No matched isometric calibration. All bath and tissue settings are hypothetical.",
    publication: "Suzuki et al. (1995) · isotonic reference only",
    url: evidence[0].url,
    doi: evidence[0].doi,
    location: "No isometric source",
    animals: "Guinea pig; sex and weight unspecified",
    volumeMl: 10,
    temperatureC: 37,
    gas: "Air (assumed)",
    loadG: 1,
    solution: "Virtual bath (composition unspecified)",
    recording: "Isometric · hypothetical transducer",
    equilibrationS: null,
    contact: "No source-based schedule for this preparation",
    n: "No matched isometric observations",
    rights: evidence[0].license,
  };
}
export const sources = {
  mplm: corbett,
  intact: aboulafia,
  strip: exploratory("scenario-strip-1", "Longitudinal strip"),
  deprived: exploratory("scenario-deprived-1", "Mucosa-deprived segment"),
};
export type Context = keyof typeof sources;
export const schedules = {
  manual: "Manual · add and wash",
  single: "Single exposure",
  prolonged: "Prolonged contact",
  paired: "Non-cumulative · conditioning and retest",
  cumulative: "Cumulative · three additions",
  series: "Non-cumulative · ascending dose series",
  repeated: "Repeated equal exposures",
};
export type Schedule = keyof typeof schedules;
export type Provenance =
  | "DIRECT_REPORTED"
  | "DIGITIZED"
  | "CALCULATED"
  | "FITTED"
  | "ASSUMED"
  | "UNCALIBRATED"
  | "SIMULATED";
// All numerical scenario knobs have units and UI bounds. Bounds are software limits, not biology.
export const fields = {
  ec50M: ["EC50", "M", 1e-12, 1e-2],
  slope: ["Hill slope", "1", 0.1, 8],
  peakS: ["Phasic pulse peak", "s", 1, 90],
  tonic: ["Sustained fraction", "1", 0, 1],
  delayS: ["Secondary delay", "s", 1, 1200],
  secondary: ["Secondary pulse size", "fraction", 0, 1],
  widthS: ["Secondary pulse time scale", "s", 1, 1200],
  washS: ["Mechanical relaxation", "s", 1, 300],
  conditionS: ["Conditioning time scale", "s", 1, 2400],
  recoverS: ["Sensitivity recovery", "s", 1, 3600],
  preloadG: ["Passive load", "g", 0, 5],
  scaleG: ["Hypothetical force scale", "g", 0, 20],
} as const;
export type Knobs = Record<keyof typeof fields, number>;
export function defaults(c: Context): Knobs {
  return {
    ec50M: c === "mplm" ? molar(corbett.ec50uM, "µM") : 1e-6,
    slope: 1,
    peakS: 8,
    tonic: 0.25,
    delayS: c === "intact" ? timing.value * 60 : 45,
    secondary: c === "intact" ? 0.3 : 0.15,
    widthS: 180,
    washS: 12,
    conditionS: 240,
    recoverS: 360,
    preloadG: sources[c].loadG,
    scaleG: 0,
  };
}
export function registry(c: Context, p: Knobs) {
  return (Object.keys(fields) as (keyof Knobs)[]).map((key) => {
    const unchanged = p[key] === defaults(c)[key];
    const provenance: Provenance =
      unchanged && key === "preloadG" && (c === "mplm" || c === "intact")
        ? "DIRECT_REPORTED"
        : unchanged &&
            ((key === "ec50M" && c === "mplm") ||
              (key === "delayS" && c === "intact"))
          ? "CALCULATED"
          : key === "scaleG" && p[key] === 0
            ? "UNCALIBRATED"
            : "ASSUMED";
    return {
      key,
      name: fields[key][0],
      value: p[key],
      unit: fields[key][1],
      provenance,
      context: sources[c].id,
      source:
        provenance === "DIRECT_REPORTED" || provenance === "CALCULATED"
          ? sources[c].location
          : null,
      uncertainty:
        provenance === "CALCULATED"
          ? key === "delayS"
            ? "SEM 18 s, n=16; prolonged 5.5 µM only"
            : "Reported pEC50 SEM 0.04; not a CI for EC50"
          : null,
      status: "not independently validated",
      notes:
        provenance === "ASSUMED"
          ? "Scenario input; not measured or fitted"
          : key === "scaleG"
            ? "Zero disables absolute force"
            : key === "delayS"
              ? "Use at other concentrations is an extrapolation"
              : null,
    };
  });
}
