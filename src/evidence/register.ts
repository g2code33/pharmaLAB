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

// Option A is a distinct revision: adding a source here never mutates a v1 profile.
export {
  sources as protocolContexts,
  registry as protocolParameters,
} from "../simulation/ach/protocols";
import { corbett } from "../simulation/ach/protocols";
export const controlPotency = {
  context: corbett,
  classification: "DIRECT_REPORTED",
  parameter: "EC50",
  value: corbett.ec50uM,
  units: "µM",
  pEC50: corbett.pEC50,
  uncertainty: { parameter: "pEC50", kind: "SEM", value: corbett.pEC50sem },
  calibration: "midpoint only",
  confidence: "Published group summary; no individual curves",
  notes:
    "No fitted slope, absolute maximum or pointwise extraction error inferred.",
} as const;

/** A new view over frozen v1 summaries, rather than retroactively relabelling an archive. */
import { evidence as legacySummaries } from "../simulation/ach/evidence";
export const publishedSummaries = [
  ...legacySummaries.map((row) => ({
    ...row,
    provenance:
      row.classification === "Estimated from experimental data"
        ? "FITTED"
        : "DIRECT_REPORTED",
    confidence: "Published summary only; not independent validation",
  })),
  { ...controlPotency, provenance: "DIRECT_REPORTED" },
];
