export type EvidenceStatus =
  | "Awaiting evidence"
  | "Evidence collected"
  | "Awaiting calibration"
  | "Calibrated"
  | "Independently validated";
export interface Evidence {
  id: string;
  parameter: string;
  species: string;
  tissue: string;
  drug: string | null;
  method: string;
  conditions: string;
  publication: string;
  authors: string[];
  year: number;
  source: string;
  originalValue: number;
  units: string;
  sampleSize: number | null;
  uncertainty: string;
  extraction: string;
  license: string;
  calibration: EvidenceStatus;
  validation: EvidenceStatus;
  notes: string;
  category:
    | "Directly measured"
    | "Estimated from experimental data"
    | "Extracted from published figures"
    | "Educational assumption";
}
export const evidence: readonly Evidence[] = [];
/** Structural provenance checks only: never a scientific or legal approval. */
export function hasProvenance(record: Partial<Evidence>): boolean {
  return (
    [
      record.publication,
      record.extraction,
      record.license,
      record.units,
      record.method,
      record.conditions,
    ].every((v) => typeof v === "string" && v.trim().length > 0) &&
    !!record.authors?.length &&
    Number.isInteger(record.year) &&
    /^https?:\/\//.test(record.source || "") &&
    Number.isFinite(record.originalValue)
  );
}
