import type { Observation } from "../simulation/ach/evidence";
export { evidence } from "../simulation/ach/evidence";
export type EvidenceStatus =
  | "Awaiting evidence"
  | "Evidence collected"
  | "Awaiting calibration"
  | "Calibrated"
  | "Independently validated";
/** Metadata completeness, never model approval or permission to redistribute. */
export function hasProvenance(r: Partial<Observation>) {
  return (
    [
      r.id,
      r.publication,
      r.url,
      r.doi,
      r.authors,
      r.extraction,
      r.license,
      r.units,
      r.originalUnits,
      r.recording,
      r.preparation,
      r.classification,
    ].every((v) => typeof v === "string" && v.trim().length > 0) &&
    Number.isFinite(r.value) &&
    !!r.context &&
    !!r.uncertainty
  );
}
