import { estimateCurve, type Curve } from "./analysis";
import { sources, type Context } from "./protocols";
/** Local, attributed replicate input. Imported means from a single paper are not replicates. */
export interface Comparison {
  schema: "ach-replicates/1";
  contextId: string;
  species: "Cavia porcellus";
  tissue: "ileum";
  agonist: "ACh";
  recording: "isometric";
  preparation: string;
  citation: string;
  rights: string;
  id: string;
  conditions: string;
  curves: Curve[];
}
export function template(c: Context): Comparison {
  return {
    schema: "ach-replicates/1",
    contextId: sources[c].id,
    species: "Cavia porcellus",
    tissue: "ileum",
    agonist: "ACh",
    recording: "isometric",
    preparation: sources[c].preparation,
    citation: "",
    rights: "",
    id: "",
    conditions: "",
    curves: [],
  };
}
export function validComparison(
  value: unknown,
  c: Context,
): value is Comparison {
  const d = value as Comparison;
  const ref = template(c);
  return (
    !!d &&
    (
      [
        "schema",
        "contextId",
        "species",
        "tissue",
        "agonist",
        "recording",
        "preparation",
      ] as const
    ).every((k) => d[k] === ref[k]) &&
    [d.citation, d.rights, d.id, d.conditions].every(
      (s) => typeof s === "string" && s.trim().length > 0 && s.length <= 2000,
    ) &&
    Array.isArray(d.curves) &&
    d.curves.length >= 3 &&
    d.curves.length <= 100 &&
    new Set(d.curves.map((v) => v?.preparationId)).size === d.curves.length &&
    d.curves.every(
      (v) =>
        v &&
        typeof v.preparationId === "string" &&
        v.preparationId.trim().length > 0 &&
        Number.isFinite(v.baselineG) &&
        v.baselineG >= 0 &&
        Array.isArray(v.plateauG) &&
        v.plateauG.length >= 2 &&
        v.plateauG.length <= 100 &&
        v.plateauG.every((g) => Number.isFinite(g) && g >= 0) &&
        Array.isArray(v.points) &&
        v.points.length >= 3 &&
        v.points.length <= 500 &&
        v.points.every(
          (p) =>
            p &&
            Number.isFinite(p.molar) &&
            p.molar > 0 &&
            Number.isFinite(p.g) &&
            p.g >= 0,
        ),
    )
  );
}
export function fitComparison(d: Comparison) {
  return estimateCurve(
    {
      id: d.id,
      observationIds: d.curves.map((v) => v.preparationId),
      preparation: d.preparation,
      recording: d.recording,
      conditions: d.conditions,
      role: "calibration",
    },
    d.curves,
  );
}
