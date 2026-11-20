import { Plot } from "./ProtocolPlot";
import { CurveReview } from "./CurveReview";
import { useEffect, useMemo, useState } from "react";
import { Bath } from "./Bath";
import {
  csv,
  exposureMetrics,
  doseCurve,
  preset,
  sampleProtocol,
  schedule,
  trialMetadata,
  validTrial,
  type Trial,
  type Point,
} from "../simulation/ach/protocol";
import {
  fields,
  registry,
  sources,
  schedules,
  type Context,
  type Knobs,
  type Schedule,
} from "../simulation/ach/protocols";
import { molar, pEC50 } from "../simulation/ach/math";
import type { Experiment } from "../simulation/core";
type Download = (filename: string, data: string, type?: string) => void;
const fmt = (x: number) => Number(x.toPrecision(4)).toString();
export function ProtocolBench({
  exp,
  all,
  change,
  download,
}: {
  exp: Experiment;
  all: Experiment[];
  change: (v: Trial) => void;
  download: Download;
}) {
  const t = exp.trial!,
    p = t.plan,
    k = p.knobs,
    source = sources[p.context];
  const [playing, play] = useState(false),
    [speed, speedTo] = useState(10),
    [span, zoom] = useState(180),
    [magnify, magnification] = useState(false),
    [inspect, seek] = useState<number | null>(null),
    [compare, selectComparison] = useState(""),
    [error, report] = useState(""),
    [unit, setUnit] = useState<"M" | "mM" | "µM" | "nM">("µM");
  const locked = t.elapsed > 0 || !!p.manual?.length || playing || t.stopped;
  // Simulation time is deterministic; navigation/closing never synthesises missed samples.
  useEffect(() => {
    if (!playing) return;
    if (t.stopped || t.elapsed >= p.durationS) {
      play(false);
      return;
    }
    const timer = window.setTimeout(
      () => change({ ...t, elapsed: Math.min(p.durationS, t.elapsed + speed) }),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [playing, t, speed, p.durationS, change]);
  const full = useMemo(
    () => sampleProtocol(p, p.durationS, t.washAt),
    [p, t.washAt],
  );
  const observed = full.slice(0, t.elapsed + 1),
    live = observed[t.elapsed],
    index = Math.min(inspect ?? t.elapsed, t.elapsed),
    point = observed[index];
  const other = all.find((e) => e.id === compare)?.trial;
  const matched =
    other &&
    other.plan.context === p.context &&
    other.plan.knobs.scaleG === k.scaleG &&
    other.plan.knobs.preloadG === k.preloadG
      ? other
      : null;
  const reference = useMemo(
    () =>
      matched
        ? sampleProtocol(matched.plan, matched.elapsed, matched.washAt)
        : [],
    [matched],
  );
  const val = (q: Point) => q.forceG ?? q.relative * 100,
    xmax = Math.max(1, index),
    xmin = Math.max(0, xmax - span);
  const peak = observed.reduce((a, b) => (b.relative > a.relative ? b : a)),
    maxY = Math.max(
      k.scaleG > 0 ? k.preloadG + k.scaleG : 100,
      ...observed.map(val),
      ...reference.map(val),
    );
  const currentDose = observed
    .slice(0, index + 1)
    .reverse()
    .find((q) => q.event !== "");
  const contact =
    currentDose && currentDose.nominalM > 0
      ? observed.slice(currentDose.s, index + 1)
      : [];
  const contactPeak = contact.length
    ? contact.reduce((a, b) => (a.relative >= b.relative ? a : b))
    : null;
  const metrics = exposureMetrics(observed),
    peaks: [number, number][] = metrics.map((e) => [
      Math.log10(observed[e.onsetS].nominalM),
      100 * e.peakRelative,
    ]);
  const curve = useMemo(() => doseCurve(p), [p]);
  function update(v: Trial) {
    if (!validTrial(v)) {
      report("Value outside supported numerical range; settings unchanged.");
      return;
    }
    report("");
    change(v);
  }
  const numbers = (
    name: string,
    value: number,
    min: number,
    max: number,
    commit: (v: number) => void,
  ) => (
    <label key={`${p.context}:${name}:${value}`}>
      {name}
      <input
        disabled={locked}
        type="number"
        min={min}
        max={max}
        step="any"
        defaultValue={value}
        onBlur={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v) && v >= min && v <= max) {
            if (v !== value) commit(v);
          } else {
            e.target.value = String(value);
            report(`Enter ${min}–${max} for ${name}.`);
          }
        }}
      />
    </label>
  );
  function exportData(kind: "trace" | "curve" | "registry" | "experiment") {
    const meta = {
      ...trialMetadata(t, exp.id, exp.created),
      analysis: metrics,
    };
    const prefix = `${exp.id}-ach-${kind}`;
    if (kind === "trace" || kind === "curve")
      download(
        prefix + ".csv",
        kind === "trace" ? csv(meta, observed) : csv(meta, curve),
        "text/csv",
      );
    else
      download(
        prefix + ".json",
        JSON.stringify(
          kind === "registry"
            ? meta
            : { experiment: exp, metadata: meta, samples: observed },
          null,
          2,
        ),
      );
  }
  return (
    <>
      <div className="labgrid">
        <section className="panel">
          <div className="mini">PREPARATION / OPTION A</div>
          <h2>{source.preparation}</h2>
          <p>Guinea-pig ileum · {source.recording}</p>
          <p>{source.method}</p>
          <p>
            <small>Bath</small>
            {source.temperatureC} °C · {source.gas} · {fmt(live.volumeMl)} mL
          </p>
          <p>
            <small>Nominal ACh</small>
            {fmt(live.nominalM * 1e6)} µM · ideal mixing; no hydrolysis
          </p>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.publication}
          </a>
          <details>
            <summary>Experimental conditions</summary>
            <p>{source.solution}</p>
            <p>
              {source.animals}. {source.n}. {source.location}. Equilibration not
              specified here.
            </p>
          </details>
        </section>
        <section className="panel apparatus">
          <div className="instrumentHead">
            <div className="heroLabel">ISOMETRIC / SIMULATED</div>
            <h2>Organ bath assembly</h2>
          </div>
          <div style={{ transform: magnify ? "scale(1.12)" : "none" }}>
            <Bath
              state={{
                mounted: true,
                status: "AWAITING SCIENTIFIC VALIDATION",
                tension: live.forceG,
                relative: live.relative,
              }}
            />
          </div>
          <div className="actions">
            <button onClick={() => magnification(!magnify)}>
              Zoom {magnify ? "out" : "in"}
            </button>
            <button onClick={() => magnification(false)}>Reset view</button>
          </div>
          <p className="resting" aria-live="off">
            {live.forceG === null
              ? `${fmt(100 * live.relative)}% relative signal`
              : `${fmt(live.forceG)} g · assumed scale`}{" "}
            · {t.elapsed} s
          </p>
        </section>
        <section className="panel dosage">
          <div className="mini">ACh / EXPOSURE CONTROL</div>
          <h2>Protocol settings</h2>
          <div className="fields">
            <label>
              Source profile
              <select
                disabled={locked}
                value={p.context}
                onChange={(e) => {
                  seek(null);
                  change(preset(e.target.value as Context));
                }}
              >
                {Object.entries(sources).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.preparation} · {s.publication}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Exposure protocol
              <select
                disabled={locked}
                value={p.schedule}
                onChange={(e) => {
                  const v = e.target.value as Schedule;
                  update({
                    ...t,
                    plan: {
                      ...p,
                      schedule: v,
                      durationS:
                        v === "paired"
                          ? 1800
                          : v === "prolonged"
                            ? 2100
                            : v === "series" || v === "repeated"
                              ? 540
                              : 180,
                    },
                  });
                }}
              >
                {Object.entries(schedules).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {numbers(
              `Final ACh (${unit})`,
              p.doseM / molar(1, unit),
              1e-12 / molar(1, unit),
              1e-3 / molar(1, unit),
              (v) => update({ ...t, plan: { ...p, doseM: molar(v, unit) } }),
            )}
            <label>
              Concentration unit
              <select
                value={unit}
                disabled={locked}
                onChange={(e) => setUnit(e.target.value as typeof unit)}
              >
                {["M", "mM", "µM", "nM"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
            {numbers("Recording duration (s)", p.durationS, 5, 7200, (v) =>
              update({ ...t, plan: { ...p, durationS: v } }),
            )}
          </div>
          <details>
            <summary>Planned additions and full bath exchanges</summary>
            <p>
              Virtual seconds from start. {source.contact}. Schedule below is a
              simulation, not a replication.
            </p>
            {schedule(p).map((e) => (
              <p key={e.s}>
                {e.s} s ·{" "}
                {e.targetM === 0
                  ? "Full wash"
                  : `${fmt(e.targetM * 1e6)} µM final`}
              </p>
            ))}
          </details>
        </section>
      </div>
      <section className="panel recorder">
        <div className="mini">CHANNEL 01 / SIMULATED · UNVALIDATED</div>
        <h2>Protocol recording</h2>
        <p>
          Source observations constrain only selected parameters. Timing and
          sensitivity are provisional. Set a hypothetical force scale above zero
          to display grams; no study maximum is used as that scale.
        </p>
        <div className="actions">
          <button
            disabled={playing || t.stopped || t.elapsed >= p.durationS}
            onClick={() => play(true)}
          >
            {t.elapsed ? "Resume protocol" : "Start protocol"}
          </button>
          <button disabled={!playing} onClick={() => play(false)}>
            Pause protocol
          </button>
          {p.schedule === "manual" && (
            <button
              disabled={
                t.stopped ||
                live.nominalM > 0 ||
                live.event !== "" ||
                t.elapsed >= p.durationS
              }
              onClick={() =>
                change({
                  ...t,
                  plan: {
                    ...p,
                    manual: [
                      ...(p.manual ?? []),
                      { s: t.elapsed, targetM: p.doseM },
                    ],
                  },
                })
              }
            >
              Add ACh now
            </button>
          )}
          <button
            disabled={
              t.stopped ||
              live.nominalM === 0 ||
              t.washAt !== null ||
              (p.schedule === "manual" && !!live.event)
            }
            onClick={() =>
              p.schedule === "manual"
                ? change({
                    ...t,
                    plan: {
                      ...p,
                      manual: [
                        ...(p.manual ?? []),
                        { s: t.elapsed, targetM: 0 },
                      ],
                    },
                  })
                : change({ ...t, washAt: t.elapsed })
            }
          >
            {p.schedule === "manual"
              ? "Wash now"
              : "Wash now · cancel remaining doses"}
          </button>
          <button
            disabled={t.stopped}
            onClick={() => {
              play(false);
              change({ ...t, stopped: true });
            }}
          >
            Stop protocol
          </button>
          <label>
            Playback speed
            <select value={speed} onChange={(e) => speedTo(+e.target.value)}>
              {[1, 10, 60].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
        </div>
        <Plot
          label={
            k.scaleG
              ? "Total force (g) · assumed scale"
              : "Active response (% of scenario scale)"
          }
          xLabel="Virtual time (s)"
          series={observed.map((q) => [q.s, val(q)])}
          overlay={
            reference.length ? reference.map((q) => [q.s, val(q)]) : undefined
          }
          yMax={maxY}
          xMin={xmin}
          xMax={xmax}
        />
        <div className="fields">
          <label>
            Chart window
            <select value={span} onChange={(e) => zoom(+e.target.value)}>
              {[30, 180, 900, 7200].map((s) => (
                <option key={s} value={s}>
                  {s} s
                </option>
              ))}
            </select>
          </label>
          <label>
            Inspect / pan (s)
            <input
              type="range"
              min="0"
              max={t.elapsed}
              value={index}
              onChange={(e) => seek(+e.target.value)}
            />
          </label>
          <button onClick={() => seek(null)}>Follow live</button>
          <label>
            Compare saved run
            <select
              value={compare}
              onChange={(e) => selectComparison(e.target.value)}
            >
              <option value="">No overlay</option>
              {all
                .filter(
                  (e) =>
                    e.id !== exp.id &&
                    e.trial?.plan.context === p.context &&
                    e.trial.plan.knobs.scaleG === k.scaleG &&
                    e.trial.plan.knobs.preloadG === k.preloadG,
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p>
          At {index} s: phasic {fmt(point.phasic * 100)}%, sustained{" "}
          {fmt(point.tonic * 100)}%, secondary {fmt(point.secondary * 100)}%.
          History index {fmt(point.memory)}. Baseline load {k.preloadG} g;
          highest recorded signal {fmt(val(peak))}
          {k.scaleG ? " g" : "%"} at {peak.s} s.
        </p>
        {contactPeak && currentDose && (
          <p>
            Current exposure: sampled time to peak{" "}
            {contactPeak.s - currentDose.s} s · decline from peak{" "}
            {fmt(100 * (contactPeak.relative - point.relative))} percentage
            points.
          </p>
        )}
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
                One simulated maximum per contact interval, including the
                ongoing interval. A repeated concentration can produce different
                peaks; these are not independent calibration points.
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
            No digitised series: no pointwise residuals, goodness of fit or
            fitted slope CI. A matched midpoint is not independent validation.
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
                  update({
                    ...t,
                    plan: { ...p, knobs: { ...k, [r.key as keyof Knobs]: v } },
                  }),
              ),
            )}
          </div>
          <p>
            Secondary onset in intact tissue: 2.5 ± 0.3 min, n=16, prolonged 5.5
            µM ACh only. Use elsewhere is hypothetical. Model {p.version};
            parameters without reported uncertainty have no experimental
            interval.
          </p>
        </details>
        <details>
          <summary>Exposure measurements</summary>
          <p>
            Relative signal, not grams. Onset is the first rise exceeding 0.1
            percentage point from the signal at addition. Terminal mean uses the
            last ≤10 samples before a change; this is not an equilibrium
            plateau. Mechanical return is the first sample within 1 percentage
            point of the pre-addition baseline, not sensitivity recovery.
          </p>
          {metrics.map((e) => (
            <p key={e.onsetS}>
              {e.onsetS} s · {e.complete ? "closed interval" : "ongoing"} ·
              baseline {fmt(e.baselineRelative * 100)}% · peak{" "}
              {fmt(e.peakRelative * 100)}% in {e.timeToPeakS} s · onset{" "}
              {e.onsetLatencyS === null
                ? "not reached"
                : e.onsetLatencyS + " s"}{" "}
              · terminal mean {fmt(e.terminalMeanRelative * 100)}% (
              {e.terminalWindowS.join("–")} s) · fade{" "}
              {fmt(e.fadeRelative * 100)} pp · return after wash{" "}
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
                {q.s} s · {q.event} → {fmt(q.nominalM * 1e6)} µM
              </p>
            ))}
        </details>
        <div className="actions">
          {(["trace", "curve", "registry", "experiment"] as const).map((v) => (
            <button key={v} onClick={() => exportData(v)}>
              Export {v} {v === "trace" || v === "curve" ? "CSV" : "JSON"}
            </button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </section>
    </>
  );
}
