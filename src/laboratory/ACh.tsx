import { controlPotency as potency } from "../evidence/register";
import { useState } from "react";
import {
  evidence,
  preparations,
  uncertaintyText,
  type Preparation,
} from "../simulation/ach/evidence";
import {
  molar,
  positive,
  volumeForTarget,
  mix,
  pEC50,
  potencyInterval,
} from "../simulation/ach/math";
import {
  createRun,
  apply,
  type Run,
  type Command,
} from "../simulation/ach/run";
export function EvidenceReplay() {
  const [filter, set] = useState("All preparations");
  return (
    <div className="achEvidence">
      <div className="mini">EVIDENCE REPLAY · PUBLISHED SUMMARIES</div>
      <h2>ACh observations</h2>
      <p>
        Published endpoints, not simulated samples. Isotonic shortening and
        isometric force are not interchangeable.
      </p>
      <label>
        Compare preparations
        <select value={filter} onChange={(e) => set(e.target.value)}>
          {["All preparations", ...preparations].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      {evidence
        .filter(
          (e) => filter === "All preparations" || e.preparation === filter,
        )
        .map((e) => (
          <details className="history" key={e.id}>
            <summary>
              {e.preparation} · {e.recording} · {e.parameter}: {e.value}{" "}
              {e.units}
            </summary>
            <p>
              {uncertaintyText(e.uncertainty)} {e.units} · n = {e.n} ·{" "}
              {e.statistic}
            </p>
            {e.parameter === "EC50" && (
              <p>
                Calculated pEC50: {pEC50(e.value).toFixed(2)} (95% CI{" "}
                {potencyInterval(e.uncertainty.low, e.uncertainty.high)
                  .map((v) => v.toFixed(2))
                  .join("–")}
                ).
              </p>
            )}
            <p>
              {e.context.temperatureC} °C · {e.context.volumeMl} mL ·{" "}
              {e.context.loadG} g load · {e.context.gas}. {e.context.solution}.{" "}
              {e.context.application}. Equilibration:{" "}
              {e.context.equilibrationMin ?? "unknown"} min. Contact:{" "}
              {e.context.exposureS ?? "not fixed or not reported"} s.
            </p>
            <p>
              {e.extraction}. {e.notes}
            </p>
            <a href={e.url} target="_blank" rel="noreferrer">
              {e.authors} ({e.year}), {e.publication}
            </a>
            <p>
              Fig. {e.figure} · {e.id} · {e.classification}
            </p>
          </details>
        ))}
      {(filter === "All preparations" || filter === "MPLM") && (
        <details className="history">
          <summary>MPLM · isometric · EC50: {potency.value} µM</summary>
          <p>
            DIRECT_REPORTED · pEC50 {potency.pEC50} ±{" "}
            {potency.uncertainty.value} SEM. {potency.context.n}. Fig 2a
            control, pp. 109–110.
          </p>
          <p>
            {potency.context.volumeMl} mL · {potency.context.temperatureC} °C ·{" "}
            {potency.context.gas} · {potency.context.loadG} g.{" "}
            {potency.context.solution}. {potency.notes}
          </p>
          <a href={potency.context.url} target="_blank" rel="noreferrer">
            {potency.context.publication}
          </a>
        </details>
      )}
      <EndpointPlot filter={filter} />
      <p>
        No reviewed concentration series or calibrated trace. EC50, Emax and
        slope fits, first peak time, fade, tonic force and recovery cannot be
        estimated from these summaries.
      </p>
    </div>
  );
}
export function AChControls({
  run,
  onChange,
}: {
  run: Run;
  onChange: (r: Run, text: string) => void;
}) {
  const [stock, S] = useState(""),
    [unit, U] = useState<"µM" | "M" | "nM" | "mM">("µM"),
    [volume, V] = useState(""),
    [target, T] = useState(""),
    [targetMode, M] = useState(false),
    [bath, B] = useState(String(run.initialMl)),
    [error, X] = useState("");
  const locked = run.history.length > 0,
    ml = locked ? run.initialMl : Number(bath);
  const base = () =>
    locked
      ? run
      : createRun(
          run.parameters.preparation,
          positive(ml, "bath volume"),
          run.instrument,
        );
  function dose() {
    const r = base(),
      stockM = molar(positive(Number(stock), "stock concentration"), unit),
      additionMl = targetMode
        ? volumeForTarget(
            r.bath,
            stockM,
            molar(positive(Number(target), "target concentration"), "µM"),
          )
        : positive(Number(volume), "addition volume");
    return { kind: "add" as const, stockM, additionMl };
  }
  let preview = "Enter stock and dose to calculate.";
  try {
    const d = dose();
    const b = mix(base().bath, d.stockM, d.additionMl);
    preview = `Add ${d.additionMl.toPrecision(4)} mL → ${(b.nominalM * 1e6).toPrecision(4)} µM in ${b.volumeMl.toPrecision(5)} mL`;
  } catch {
    /* Incomplete input is not a dose. */
  }
  function act(kind: "add" | "wash") {
    try {
      const cmd: Command = kind === "add" ? dose() : { kind };
      const r = apply(base(), cmd);
      onChange(
        r,
        kind === "add"
          ? `Add drug: Acetylcholine; nominal ${r.bath.nominalM} M`
          : "Wash preparation: complete bath exchange; recovery unknown",
      );
      X("");
    } catch (e) {
      X((e as Error).message);
    }
  }
  return (
    <fieldset disabled={run.state === "stopped"}>
      <div className="fields">
        <label>
          Compound
          <select>
            <option>Acetylcholine</option>
          </select>
        </label>
        <label>
          Preparation
          <select
            disabled={locked}
            value={run.parameters.preparation}
            onChange={(e) =>
              onChange(
                createRun(
                  e.target.value as Preparation,
                  run.initialMl,
                  run.instrument,
                ),
                "Preparation selected: " + e.target.value,
              )
            }
          >
            {preparations.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Initial bath volume (mL)
          <input
            type="number"
            disabled={locked}
            min="0"
            value={locked ? run.initialMl : bath}
            onChange={(e) => {
              B(e.target.value);
              const v = e.target.valueAsNumber;
              if (Number.isFinite(v) && v > 0)
                onChange(
                  createRun(run.parameters.preparation, v, run.instrument),
                  "Bath volume set: " + v + " mL",
                );
            }}
          />
        </label>
        <label>
          Stock concentration
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => S(e.target.value)}
          />
        </label>
        <label>
          Stock unit
          <select
            value={unit}
            onChange={(e) => U(e.target.value as typeof unit)}
          >
            {["M", "mM", "µM", "nM"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label>
          Dose by
          <select
            value={targetMode ? "target" : "volume"}
            onChange={(e) => M(e.target.value === "target")}
          >
            <option value="volume">Addition volume</option>
            <option value="target">Final concentration</option>
          </select>
        </label>
        {targetMode ? (
          <label>
            Target final concentration (µM)
            <input
              type="number"
              value={target}
              onChange={(e) => T(e.target.value)}
            />
          </label>
        ) : (
          <label>
            Addition volume (mL)
            <input
              type="number"
              value={volume}
              onChange={(e) => V(e.target.value)}
            />
          </label>
        )}
      </div>
      <details className="history">
        <summary>Instrument settings · uncalibrated</summary>
        <div className="fields">
          {(["gain", "noiseAmplitude"] as const).map((key) => (
            <label key={key}>
              {key === "gain"
                ? "Transducer display gain"
                : "Display noise amplitude"}
              <input
                disabled={locked}
                type="number"
                step="any"
                min="0"
                defaultValue={run.instrument[key]}
                onBlur={(e) => {
                  try {
                    const value = e.target.valueAsNumber;
                    if (value === run.instrument[key]) return;
                    onChange(
                      createRun(run.parameters.preparation, run.initialMl, {
                        ...run.instrument,
                        [key]: value,
                      }),
                      `Instrument ${key}: ${value}`,
                    );
                    X("");
                  } catch (err) {
                    e.target.value = String(run.instrument[key]);
                    X((err as Error).message);
                  }
                }}
              />
            </label>
          ))}
        </div>
        <p>
          Settings affect the displayed signal only. With no calibrated force,
          there is no signal or measurement noise.
        </p>
      </details>
      <p>{preview}</p>
      <div className="actions">
        <button onClick={() => act("add")}>Add ACh</button>
        <button onClick={() => act("wash")}>Wash preparation</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p>
        Nominal bath: {(run.bath.nominalM * 1e6).toPrecision(4)} µM ·{" "}
        {run.bath.volumeMl.toPrecision(5)} mL. Ideal instantaneous mixing;
        stable ACh during contact. Tissue concentration is assumed, not
        measured.
      </p>
      <details className="history">
        <summary>Administration history</summary>
        {run.history
          .filter((e) => e.kind === "add" || e.kind === "wash")
          .map((e, i) => (
            <p key={i}>
              {e.kind === "add"
                ? `ACh: ${e.additionMl} mL at ${e.stockM} M`
                : "Full wash"}{" "}
              → {e.nominalM} M in {e.volumeMl} mL · {e.at}
            </p>
          ))}
      </details>
    </fieldset>
  );
}

function EndpointPlot({ filter }: { filter: string }) {
  const points = evidence
    .filter((e) => e.parameter === "Emax")
    .filter((e) => filter === "All preparations" || filter === e.preparation);
  if (!points.length) return null;
  return (
    <figure>
      <figcaption>
        Isometric ACh response · published highest-dose endpoints
      </figcaption>
      <svg
        viewBox="0 0 350 165"
        width="100%"
        role="img"
        aria-label="Concentration versus tension: published mean and SEM at the highest tested concentration; no fitted line"
      >
        <g fill="currentColor" fontSize="10">
          <path d="M30 12V125H280" stroke="currentColor" fill="none" />
          <text x="2" y="12">
            g
          </text>
          {[0, 1, 2, 3, 4, 5].map((g) => (
            <text key={g} x="16" y={128 - 21 * g}>
              {g}
            </text>
          ))}
          {[-9, -8, -7, -6, -5, -4].map((v, i) => (
            <text key={v} x={22 + 50 * i} y="141">
              {v}
            </text>
          ))}
          <text x="80" y="160">
            log₁₀ [ACh] (mol/L)
          </text>
          {points.map((e) => {
            const y = 125 - 21 * e.value,
              err = 21 * e.uncertainty.value,
              x = 30 + 50 * (9 + Math.log10(e.context.testedRangeM[1]));
            return (
              <g key={e.id}>
                <path
                  d={`M${x - 3} ${y - err}h6m-3 0v${2 * err}m-3 0h6`}
                  stroke="currentColor"
                />
                <circle cx={x} cy={y} r="2.5" />
                <text x={x + 7} y={y + 3}>
                  {e.preparation === "MPLM" ? "MPLM" : "Intact"}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <small>
        Rodriguez et al. 2006 · mean ± SEM at 10⁻⁴ M. Text examples; not a
        reconstructed normal-control curve.
      </small>
    </figure>
  );
}
