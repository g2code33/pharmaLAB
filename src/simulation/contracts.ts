import type { EvidenceStatus } from "../evidence/register";
/** Design contracts only. No calibrated implementation is registered. */
export interface ModelRevision {
  id: string;
  version: string;
  datasetRevisions: readonly string[];
  status: EvidenceStatus;
}
export interface TissuePreparation extends ModelRevision {
  species: string;
  tissue: string;
  family: "intestinal" | "vascular" | "skeletal-neuromuscular";
  anatomy?: string;
  preparationMethod?: string;
  recordingMethod?: string;
  physiology?: string;
  protocols?: readonly string[];
  sensitivityEvidence?: readonly string[];
}
export interface CompoundRevision extends ModelRevision {
  genericName: string;
  drugClass?: string;
  target?: string;
  action?: string;
  classification?: string;
  stockEvidence?: string;
  massEvidence?: string;
  rangeEvidence?: string;
  effectsByPreparation?: Record<string, string[]>;
}
export interface RunManifest {
  tissue: TissuePreparation;
  compoundVersions: readonly CompoundRevision[];
  environmentRevision: string;
  instrumentRevision: string;
  protocolRevision: string;
  calibrationRevision: string;
}
export type Unavailable = { status: "NOT IMPLEMENTED"; reason: string };
export interface EngineModules {
  resolveParameters(manifest: RunManifest): Unavailable;
  receptorInteractions(manifest: RunManifest): Unavailable;
  tissueDynamics(manifest: RunManifest): Unavailable;
  measure(manifest: RunManifest): Unavailable;
  validate(manifest: RunManifest): Unavailable;
}
export const unavailable = (): Unavailable => ({
  status: "NOT IMPLEMENTED",
  reason: "Awaiting evidence review and independent validation",
});
export const modules: EngineModules = {
  resolveParameters: unavailable,
  receptorInteractions: unavailable,
  tissueDynamics: unavailable,
  measure: unavailable,
  validate: unavailable,
};
