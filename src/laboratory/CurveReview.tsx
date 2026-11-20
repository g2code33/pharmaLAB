import { useMemo, useState } from "react";
import {
  validComparison,
  template,
  fitComparison,
} from "../simulation/ach/comparison";
import { trialMetadata, type Trial } from "../simulation/ach/protocol";
import { hill } from "../simulation/ach/math";
import { Plot } from "./ProtocolPlot";
export function CurveReview({
  trial,
  change,
  download,
  id,
  date,
}: {
  trial: Trial;
  change: (t: Trial) => void;
  download: (file: string, text: string) => void;
  id: string;
  date: string;
}) {
  const [err, report] = useState(""),
    [index, select] = useState(0);
  const data = trial.comparison,
    fit = useMemo(() => (data ? fitComparison(data) : null), [data]);
  const e = fit?.estimates[index],
    c = data?.curves[index];
  const dots: [number, number][] = c
    ? c.points.map((p) => [Math.log10(p.molar), p.g])
    : [];
  const xmin = Math.min(...dots.map((p) => p[0])),
    xmax = Math.max(...dots.map((p) => p[0]));
  const line: [number, number][] =
    e && c
      ? Array.from({ length: 81 }, (_, i) => {
          const x = xmin + (i * (xmax - xmin)) / 80;
          return [x, hill(10 ** x, e.ec50M, e.hill, e.emaxG, c.baselineG)];
        })
      : [];
  return (
    <details>
      <summary>Fit a local replicate dataset</summary>
      <p>
        Import individual isometric ACh curves for this preparation. Supply
        baseline, repeated plateau measurements, citation, conditions and
        rights. A single published mean curve is not a set of independent
        replicates. Imported data stay in this notebook; fits do not replace the
        simulation parameters.
      </p>
      <button
        onClick={() =>
          download(
            "ach-replicates-template.json",
            JSON.stringify(
              {
                ...template(trial.plan.context),
                curves: [
                  {
                    preparationId: "",
                    baselineG: null,
                    plateauG: [],
                    points: [],
                  },
                ],
              },
              null,
              2,
            ),
          )
        }
      >
        Export input template
      </button>
      <label>
        Replicate JSON (local)
        <input
          type="file"
          accept="application/json,.json"
          onChange={async (ev) => {
            const f = ev.target.files?.[0];
            ev.target.value = "";
            if (!f) return;
            try {
              if (f.size > 1024 * 1024)
                throw Error("Use a dataset under 1 MiB.");
              const d = JSON.parse(await f.text());
              if (!validComparison(d, trial.plan.context))
                throw Error(
                  "Incompatible context or missing replicate metadata.",
                );
              if (!fitComparison(d))
                throw Error(
                  "Not enough bracketed mid-range and plateau observations.",
                );
              select(0);
              change({ ...trial, comparison: d });
              report("");
            } catch (error) {
              report((error as Error).message);
            }
          }}
        />
      </label>
      {err && <p role="alert">{err}</p>}
      {e && c && data && fit && (
        <>
          <p>
            FITTED · {data.citation} · {data.conditions}. {fit.algorithm}.
            Per-preparation estimates, not independent validation.
          </p>
          <label>
            Inspect preparation
            <select
              value={index}
              onChange={(ev) => select(Number(ev.target.value))}
            >
              {data.curves.map((v, i) => (
                <option key={v.preparationId} value={i}>
                  {v.preparationId}
                </option>
              ))}
            </select>
          </label>
          <Plot
            label="Measured observations (dots) and fitted response (g)"
            xLabel="log₁₀ [ACh] M"
            series={line}
            dots={dots}
            xMin={xmin}
            xMax={xmax}
            yMax={Math.max(...dots.map((v) => v[1]), ...line.map((v) => v[1]))}
          />
          <Plot
            label="Fitted minus observed force (g)"
            xLabel="log₁₀ [ACh] M"
            series={[
              [xmin, 0],
              [xmax, 0],
            ]}
            dots={dots.map((v, i) => [v[0], e.residualsG[i]])}
            xMin={xmin}
            xMax={xmax}
            yMin={Math.min(0, ...e.residualsG)}
            yMax={Math.max(1e-12, ...e.residualsG)}
          />
          <p>
            EC50 {e.ec50M.toPrecision(4)} M · Emax increment{" "}
            {e.emaxG.toPrecision(3)} g · Hill {e.hill.toPrecision(3)} · RMSE{" "}
            {e.rmseG.toPrecision(3)} g. {fit.intervalStatus}.
          </p>
          {Object.entries(fit.confidenceIntervals).map(([key, v]) => (
            <p key={key}>
              {key} median interval:{" "}
              {v
                ? `${v.low.toPrecision(4)}–${v.high.toPrecision(4)} (${(v.coverage * 100).toFixed(1)}% coverage)`
                : "insufficient independent replicates"}
            </p>
          ))}
          <button
            onClick={() =>
              download(
                "ach-local-fit.json",
                JSON.stringify(
                  {
                    metadata: trialMetadata(trial, id, date),
                    provenance: "FITTED",
                    fit,
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Export fit and residuals
          </button>
        </>
      )}
    </details>
  );
}
