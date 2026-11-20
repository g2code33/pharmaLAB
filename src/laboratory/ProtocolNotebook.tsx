import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Plot } from "./ProtocolPlot";
import { CurveReview } from "./CurveReview";
import { EvidenceReplay } from "./ACh";
import {
  csv,
  trialMetadata,
  exposureMetrics,
  doseCurve,
  type Trial,
  type Point,
} from "../simulation/ach/protocol";
import { registry, fields, type Knobs } from "../simulation/ach/protocols";
import { pEC50 } from "../simulation/ach/math";
import type { Experiment } from "../simulation/core";
const fmt = (x: number) => Number(x.toPrecision(4)).toString();
export function ProtocolNotebook({
  exp,
  observed,
  change,
  download,
  reset,
  notes,
  numbers,
}: {
  exp: Experiment;
  observed: Point[];
  change: (t: Trial) => void;
  download: (name: string, text: string, type?: string) => void;
  reset: () => void;
  notes: (text: string) => void;
  numbers: (
    name: string,
    value: number,
    min: number,
    max: number,
    commit: (v: number) => void,
  ) => ReactNode;
}) {
  const t = exp.trial!,
    p = t.plan,
    k = p.knobs,
    recordFrom = t.recordFromS ?? 0;
  const samples = observed.slice(recordFrom);
  const metrics = exposureMetrics(samples),
    peaks: [number, number][] = metrics.map((e) => [
      Math.log10(observed[e.onsetS].nominalM),
      100 * e.peakRelative,
    ]),
    curve = doseCurve(p);
  function exportData(kind: "trace" | "curve" | "registry" | "experiment") {
    const meta = {
      ...trialMetadata(t, exp.id, exp.created),
      analysis: metrics,
      conditions: exp.conditions,
      recording: exp.recording,
    };
    const prefix = `${exp.id}-ach-${kind}`;
    if (kind === "trace" || kind === "curve")
      download(
        prefix + ".csv",
        kind === "trace" ? csv(meta, samples) : csv(meta, curve),
        "text/csv",
      );
    else
      download(
        prefix + ".json",
        JSON.stringify(
          kind === "registry"
            ? meta
            : { experiment: exp, metadata: meta, samples },
          null,
          2,
        ),
      );
  }
  return (
    <details className="utility">
      <summary>
        <BookOpen size={15} /> Notebook, analysis &amp; exports
      </summary>
      <label>
        Experiment notes
        <textarea value={exp.notes} onChange={(e) => notes(e.target.value)} />
      </label>
      <p>
        Provisional simulation, not a validated physiological measurement. A
        gram scale is hypothetical.
      </p>
      <details>
        <summary>Concentration–response and source comparison</summary>
        {peaks.length > 0 && (
          <>
            <Plot
              label="Sampled exposure peaks · % of scenario scale"
              xLabel="log₁₀ nominal bath [ACh] (mol/L)"
              series={[]}
              dots={peaks}
              xMin={Math.min(...peaks.map((q) => q[0])) - 0.25}
              xMax={Math.max(...peaks.map((q) => q[0])) + 0.25}
              yMax={Math.max(1, ...peaks.map((q) => q[1]))}
            />
            <p>
              One simulated maximum per contact interval, including the ongoing
              interval. A repeated concentration can produce different peaks;
              these are not independent calibration points.
            </p>
          </>
        )}
        <Plot
          label="Static Hill drive (%) · not the time trace"
          xLabel="log₁₀ [ACh] (mol/L)"
          series={curve.map((q) => [q.logM, q.percent])}
          xMin={curve[0].logM}
          xMax={curve.at(-1)!.logM}
          yMax={100}
          mark={
            p.context === "mplm" && Math.abs(Math.log10(k.ec50M / 4e-8)) <= 3
              ? [Math.log10(4e-8), 50]
              : undefined
          }
        />
        <p>
          Scenario pEC50 {fmt(pEC50(k.ec50M))} · slope {k.slope}.{" "}
          {p.context === "mplm"
            ? "Marker: reported 0.04 µM midpoint (pEC50 7.39 ± 0.04 SEM)."
            : "No verified isometric potency for this profile and protocol."}{" "}
          No digitised series: no pointwise residuals, goodness of fit or fitted
          slope CI. A matched midpoint is not independent validation.
        </p>
      </details>
      <details>
        <summary>
          Parameter registry · inspect or adjust before starting
        </summary>
        <div className="fields">
          {registry(p.context, k).map((r) =>
            numbers(
              `${r.name} (${r.unit}) · ${r.provenance}`,
              r.value,
              fields[r.key][2],
              fields[r.key][3],
              (v) =>
                change({
                  ...t,
                  plan: {
                    ...p,
                    knobs: { ...k, [r.key as keyof Knobs]: v },
                  },
                }),
            ),
          )}
        </div>
        <p>
          Secondary onset in intact tissue: 2.5 ± 0.3 min, n=16, prolonged 5.5
          µM ACh only. Use elsewhere is hypothetical. Model {p.version};
          parameters without reported uncertainty have no experimental interval.
        </p>
      </details>
      <details>
        <summary>Exposure measurements</summary>
        <p>
          Relative signal, not grams. Onset is the first rise exceeding 0.1
          percentage point from the signal at addition. Terminal mean uses the
          last ≤10 samples before a change; this is not an equilibrium plateau.
          Mechanical return is the first sample within 1 percentage point of the
          pre-addition baseline, not sensitivity recovery.
        </p>
        {metrics.map((e) => (
          <p key={e.onsetS}>
            {e.onsetS} s · {e.complete ? "closed interval" : "ongoing"} ·
            baseline {fmt(e.baselineRelative * 100)}% · peak{" "}
            {fmt(e.peakRelative * 100)}% in {e.timeToPeakS} s · onset{" "}
            {e.onsetLatencyS === null ? "not reached" : e.onsetLatencyS + " s"}{" "}
            · terminal mean {fmt(e.terminalMeanRelative * 100)}% (
            {e.terminalWindowS.join("–")} s) · fade {fmt(e.fadeRelative * 100)}{" "}
            pp · return after wash{" "}
            {e.firstMechanicalReturnS === null
              ? "not observed"
              : e.firstMechanicalReturnS + " s"}
          </p>
        ))}
      </details>
      <CurveReview
        key={p.context}
        trial={t}
        change={change}
        download={download}
        id={exp.id}
        date={exp.created}
      />
      <details>
        <summary>Executed exposure history</summary>
        {observed
          .filter((q) => q.event)
          .map((q) => (
            <p key={q.s}>
              {q.s} s · {(q.commands ?? [q.event]).join("; ")} →{" "}
              {fmt(q.nominalM * 1e6)} µM
            </p>
          ))}
      </details>
      <div className="actions">
        {(["trace", "curve", "registry", "experiment"] as const).map((v) => (
          <button
            key={v}
            disabled={v === "trace" && !samples.length}
            onClick={() => exportData(v)}
          >
            Export {v} {v === "trace" || v === "curve" ? "CSV" : "JSON"}
          </button>
        ))}
      </div>
      <details>
        <summary>Source evidence</summary>
        <EvidenceReplay />
      </details>
      <button onClick={reset}>Reset experiment</button>
    </details>
  );
}
