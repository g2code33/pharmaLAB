/** Revision 1: attributed scalar summaries, not transcribed curves or model defaults. */
export const preparations = [
  "Longitudinal strip",
  "Intact segment",
  "Mucosa-deprived segment",
  "MPLM",
] as const;
export type Preparation = (typeof preparations)[number];
export type Recording = "isometric" | "isotonic";
export type Classification =
  | "Directly measured"
  | "Digitised from published figure"
  | "Calculated from published measurements"
  | "Estimated from experimental data"
  | "Educational assumption"
  | "Simulator-derived";
export type Uncertainty =
  | { kind: "95% CI"; low: number; high: number }
  | { kind: "SEM"; value: number };
const sources = {
  A: {
    publication:
      "Spontaneous Tone in Different Types of Longitudinal Muscle Preparations of Guinea Pig Ileum",
    authors: "N Suzuki, T Shibayama, T Mambo, Y Gomi",
    year: 1995,
    doi: "10.1254/jjp.69.23",
    url: "https://www.jstage.jst.go.jp/article/jphs1951/69/1/69_1_23/_pdf",
  },
  B: {
    publication:
      "Altered responsiveness of the guinea-pig isolated ileum to smooth muscle stimulants and to electrical stimulation after in situ ischemia",
    authors:
      "R Rodriguez, R Ventura-Martinez, J Santiago-Mejia, MR Avila-Costa, TI Fortoul",
    year: 2006,
    doi: "10.1038/sj.bjp.0706618",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1616997/",
  },
  C: {
    publication:
      "Sodium-dependence of the non-specific desensitization of the guinea-pig ileum induced by acetylcholine and histamine",
    authors: "J Aboulafia, H Capocci, ACM Paiva, TB Paiva",
    year: 1987,
    doi: "10.1111/j.1476-5381.1987.tb08964.x",
    url: "https://onlinelibrary.wiley.com/doi/10.1111/j.1476-5381.1987.tb08964.x",
  },
};
const common = {
  species: "Cavia porcellus",
  tissue: "Ileum",
  muscleLayer: "Longitudinal axis",
  agonist: "Acetylcholine",
  animalCount: null,
  extraction: "Transcribed from Results text; not digitised",
  license: "No dataset redistribution permission established",
  calibration: "reference only",
  validation: "not independently validated",
};
const isotonic = {
  temperatureC: 35,
  volumeMl: 30,
  solution:
    "Krebs (mM): NaCl 140, KCl 6, CaCl2 2, MgCl2 1, NaH2PO4 1, NaHCO3 5, glucose 11",
  gas: "Air",
  equilibrationMin: 60,
  exposureS: null,
  application: "Non-cumulative; 15 min intervals",
};
const isometric = {
  temperatureC: 37,
  volumeMl: 30,
  solution:
    "Krebs-bicarbonate (mM): NaCl 118, KCl 4.7, CaCl2 2.5, MgCl2 1.2, NaH2PO4 1.2, NaHCO3 25, glucose 11, choline chloride 0.3",
  gas: "95% O2 / 5% CO2",
  equilibrationMin: 60,
  exposureS: 10,
  testedRangeM: [1e-9, 1e-4] as const,
  application: "Non-cumulative; 30–60 mL wash, superfusion between doses",
};
function potency(
  id: string,
  preparation: Preparation,
  value: number,
  low: number,
  high: number,
  n: number,
) {
  return {
    ...common,
    ...sources.A,
    id,
    preparation,
    recording: "isotonic" as const,
    parameter: "EC50" as const,
    value,
    units: "M",
    originalUnits: "M",
    statistic: "Published regression estimate",
    uncertainty: { kind: "95% CI", low, high } as const,
    n,
    context: {
      ...isotonic,
      loadG: preparation === "Longitudinal strip" ? 0.3 : 0.8,
    },
    page: "26",
    figure: "3",
    classification: "Estimated from experimental data" as const,
    notes: "20–80% regression; relative shortening above spontaneous tone.",
  };
}
function maximum(
  id: string,
  preparation: Preparation,
  value: number,
  figure: string,
) {
  return {
    ...common,
    ...sources.B,
    id,
    preparation,
    recording: "isometric" as const,
    parameter: "Emax" as const,
    value,
    units: "g",
    originalUnits: "g",
    statistic: "Mean maximum at highest ACh concentration",
    uncertainty: { kind: "SEM", value: 0.2 } as const,
    n: "6–9 per bar; exact text-example n unspecified",
    context: { ...isometric, loadG: 1 },
    page: "374",
    figure,
    classification: "Directly measured" as const,
    notes:
      "Text example, not explicitly assigned to naïve vs paired nonischemic group. Not approved as a normal-control parameter.",
  };
}
export const evidence = [
  potency("A-intact-v1", "Intact segment", 1.6e-8, 4e-9, 6.3e-8, 6),
  potency("A-deprived-v1", "Mucosa-deprived segment", 3.6e-8, 1e-8, 1.6e-7, 5),
  potency("A-strip-v1", "Longitudinal strip", 4e-8, 8e-9, 1.6e-7, 4),
  maximum("B-intact-v1", "Intact segment", 4.5, "2 (context)"),
  maximum("B-mplm-v1", "MPLM", 2.6, "3 (context)"),
  {
    ...common,
    ...sources.C,
    id: "C-intact-tonic-v1",
    preparation: "Intact segment" as Preparation,
    recording: "isometric" as const,
    parameter: "Secondary tonic onset" as const,
    value: 2.5,
    units: "min",
    originalUnits: "min",
    statistic: "Mean",
    uncertainty: { kind: "SEM", value: 0.3 } as const,
    n: 16,
    context: {
      temperatureC: 37,
      volumeMl: 5,
      solution:
        "Tyrode (mM): NaCl 137, KCl 2.68, CaCl2 1.36, MgCl2 0.49, NaHCO3 11.9, NaH2PO4 0.36, glucose 5.1",
      gas: "Air",
      equilibrationMin: null,
      exposureS: null,
      application: "Prolonged contact; 5.5 µM ACh",
      loadG: 1,
    },
    page: "348–349",
    figure: "1",
    classification: "Directly measured" as const,
    notes:
      "Onset of secondary increase, NOT onset of contraction or time to first peak. Default 90 s contact does not apply to prolonged recording.",
  },
];
export type Observation = (typeof evidence)[number];
export function uncertaintyText(u: Uncertainty) {
  return u.kind === "SEM" ? `± ${u.value} SEM` : `95% CI ${u.low}–${u.high}`;
}
