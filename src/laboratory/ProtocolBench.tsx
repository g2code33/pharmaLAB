import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import {
  Activity,
  Beaker,
  ChartNoAxesCombined,
  ChevronDown,
  Droplets,
  ListTree,
  Maximize2,
  Minus,
  Pause,
  Pipette,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Square,
  Waves,
  Zap,
  Calculator,
  Layers3,
  NotebookPen,
} from "lucide-react";
import { ProtocolNotebook } from "./ProtocolNotebook";
import { TraceScreen, stamp } from "./TraceScreen";

import { Bath } from "./Bath";

import {
  WORKSTATION,
  workstationPreset,
  sampleProtocol,
  schedule,
  validTrial,
  type Trial,
  type Transfer,
} from "../simulation/ach/protocol";
import {
  sources,
  schedules,
  type Context,
  type Schedule,
} from "../simulation/ach/protocols";
import { molar, mix } from "../simulation/ach/math";
import { tissues, drugs, type Experiment } from "../simulation/core";
const fmt = (x: number) => Number(x.toPrecision(4)).toString();
type DownloadFn = (name: string, data: string, type?: string) => void;
function Group({
  icon: Icon,
  name,
  children,
  open = false,
}: {
  icon: typeof Activity;
  name: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="ctrlGroup" open={open}>
      <summary>
        <Icon size={16} />
        {name}
        <ChevronDown size={14} />
      </summary>
      <div className="groupBody">{children}</div>
    </details>
  );
}
export function ProtocolBench({
  exp,
  all,
  change,
  download,
  newRun,
  save,
  reset,
  annotate,
  notes,
  setField,
  setScale,
}: {
  exp: Experiment;
  all: Experiment[];
  change: (v: Trial) => void;
  download: DownloadFn;
  newRun: () => void;
  save: () => void;
  reset: () => void;
  annotate: () => void;
  notes: (s: string) => void;
  setField: (key: string, value: string) => void;
  setScale: (seconds: number) => void;
}) {
  const t = exp.trial!,
    p = t.plan,
    k = p.knobs,
    source = sources[p.context];
  const [playing, play] = useState(false),
    [speed, speedTo] = useState(1),
    [start, pan] = useState<number | null>(null),
    [inspect, seek] = useState<number | null>(null),
    [compare, selectComparison] = useState(""),
    [error, report] = useState(""),
    [drugTab, drugTo] = useState("Agonist"),
    [tab, tabTo] = useState("Chart"),
    [drawer, show] = useState(false),
    [reserve, reserveTo] = useState("1"),
    [expanded, expand] = useState(false);
  const span = parseInt(exp.recording.scale) || 60,
    zoom = setScale,
    stock = exp.conditions.stock ?? "0.1",
    volume = exp.conditions.volume ?? "0.03",
    unit = (exp.conditions.stockUnit ?? "mM") as "M" | "mM" | "µM" | "nM";
  const recordFrom = t.recordFromS ?? 0;
  const [showExample, exampleTo] = useState(false);
  // This read-only example is never written to the active experiment or exports.
  const demo = useMemo(() => {
    if (!showExample) return [];
    const plan = workstationPreset().plan;
    plan.durationS = 200;
    plan.transfers = [1e-7, 4e-7, 1.6e-6, 6.4e-6].flatMap(
      (stockM, i): Transfer[] => [
        { s: 5 + 50 * i, kind: "add", stockM, volumeMl: 0.1 },
        { s: 29 + 50 * i, kind: "exchange", nominalM: 0 },
      ],
    );
    return sampleProtocol(plan, 200);
  }, [showExample]);
  const example = showExample && !playing && !t.elapsed;
  const locked =
    t.elapsed > 0 ||
    !!p.manual?.length ||
    !!p.transfers?.length ||
    playing ||
    t.stopped;
  const onTick = useRef(change);
  useEffect(() => {
    onTick.current = change;
  }, [change]);
  useEffect(() => {
    if (!playing) return;
    if (t.stopped || t.elapsed >= p.durationS) {
      play(false);
      return;
    }
    const id = setTimeout(
      () =>
        onTick.current({
          ...t,
          elapsed: Math.min(p.durationS, t.elapsed + speed),
        }),
      1000,
    );
    return () => clearTimeout(id);
  }, [t, playing, speed, p.durationS]);
  const full = useMemo(
      () => sampleProtocol(p, p.durationS, t.washAt),
      [p, t.washAt],
    ),
    observed = full.slice(0, t.elapsed + 1),
    live = observed[t.elapsed],
    index = Math.min(inspect ?? t.elapsed, t.elapsed),
    point = observed[index];
  const other = all.find((e) => e.id === compare)?.trial;
  const reference = useMemo(
    () =>
      other &&
      other.plan.context === p.context &&
      other.plan.knobs.scaleG === k.scaleG &&
      other.plan.knobs.preloadG === k.preloadG
        ? sampleProtocol(other.plan, other.elapsed, other.washAt).slice(
            other.recordFromS ?? 0,
          )
        : [],
    [other, p.context, k.scaleG, k.preloadG],
  );
  const initial = p.initialVolumeMl ?? source.volumeMl,
    recipe = sources[t.solutionRecipe ?? p.context].solution,
    manual = p.schedule === "manual",
    canTransfer =
      manual &&
      !t.stopped &&
      t.elapsed < p.durationS &&
      (p.transfers?.length ?? 0) < 7201;
  let preview: ReturnType<typeof mix> | undefined,
    problem = "";
  const additionMl = Number(volume);
  let stockM = 0;
  try {
    stockM = molar(Number(stock), unit);
    if (
      stockM < 1e-12 ||
      stockM > 1 ||
      !(additionMl >= 1e-6 && additionMl <= 100)
    )
      throw Error(
        "Enter stock from 1 pM to 1 M and volume from 0.000001 to 100 mL.",
      );
    preview = mix(live, stockM, additionMl);
  } catch (e) {
    problem = (e as Error).message;
  }
  function transfer(op: Transfer) {
    exampleTo(false);
    if (canTransfer)
      update({ ...t, plan: { ...p, transfers: [...(p.transfers ?? []), op] } });
  }
  const records = [
    ...observed
      .flatMap((q) =>
        (q.commands ?? (q.event ? [q.event] : [])).map((event) => ({
          s: q.s,
          event,
        })),
      )
      .map((q) => ({
        s: q.s,
        text:
          q.event === "wash"
            ? "Bath washed"
            : q.event.startsWith("add")
              ? "Acetylcholine administered"
              : "Reservoir exchange",
        detail: q.event,
      })),
    ...exp.events.map((e) => ({
      s: Number(e.text.match(/^\[(\d+) s\]/)?.[1] ?? 0),
      text: e.text,
      detail: e.at,
    })),
  ].sort((a, b) => b.s - a.s);
  function update(v: Trial) {
    v = { ...v, plan: { ...v.plan, version: WORKSTATION } };
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
  const drugInputs = (
    <>
      <div className="dual">
        <label>
          Stock concentration
          <input
            type="number"
            min="0"
            step="any"
            value={stock}
            onChange={(e) => setField("stock", e.target.value)}
          />
        </label>
        <label>
          Stock unit
          <select
            value={unit}
            onChange={(e) => setField("stockUnit", e.target.value)}
          >
            {["M", "mM", "µM", "nM"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Administration volume (mL)
        <input
          type="number"
          min="0"
          step="any"
          value={volume}
          onChange={(e) => setField("volume", e.target.value)}
        />
      </label>
    </>
  );
  const profile = (
    <label>
      Preparation
      <select
        aria-label="Source profile"
        value={p.context}
        disabled={locked}
        onChange={(e) => {
          const v = workstationPreset(e.target.value as Context);
          change(v);
          report("");
        }}
      >
        {Object.entries(sources).map(([v, s]) => (
          <option key={v} value={v}>
            {s.preparation}
          </option>
        ))}
      </select>
    </label>
  );
  const setupFields = (
    <>
      {profile}
      <small>
        Changing preparation loads its source recipe and default conditions.
      </small>
      <label>
        Exposure protocol
        <select
          disabled={locked}
          value={p.schedule}
          onChange={(e) => {
            const schedule = e.target.value as Schedule;
            update({
              ...t,
              plan: {
                ...p,
                schedule,
                durationS:
                  schedule === "prolonged"
                    ? 2100
                    : schedule === "paired"
                      ? 1800
                      : ["series", "repeated"].includes(schedule)
                        ? 540
                        : 180,
              },
            });
          }}
        >
          {Object.entries(schedules).map(([id, v]) => (
            <option key={id} value={id}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {!manual &&
        numbers("Scheduled target (µM)", p.doseM * 1e6, 1e-6, 1000, (v) =>
          update({ ...t, plan: { ...p, doseM: v * 1e-6 } }),
        )}
      {numbers("Bath volume (mL)", initial, 1, 100, (v) =>
        update({ ...t, plan: { ...p, initialVolumeMl: v } }),
      )}
      {numbers("Passive load (g)", k.preloadG, 0, 5, (v) =>
        update({ ...t, plan: { ...p, knobs: { ...k, preloadG: v } } }),
      )}
      {numbers(
        "Start acquisition at (s)",
        recordFrom,
        0,
        p.durationS - 1,
        (v) => update({ ...t, recordFromS: v }),
      )}
      {numbers("Recording duration (s)", p.durationS, 5, 7200, (v) =>
        update({ ...t, plan: { ...p, durationS: v } }),
      )}
      <label>
        Chart window
        <select value={span} onChange={(e) => zoom(+e.target.value)}>
          {[...new Set([15, 30, 60, 120, 300, 900, 7200, span])]
            .sort((a, b) => a - b)
            .map((v) => (
              <option key={v} value={v}>
                {v} s
              </option>
            ))}
        </select>
      </label>
    </>
  );
  const apparatus = (
    <Bath
      state={{
        mounted: true,
        status: "AWAITING SCIENTIFIC VALIDATION",
        tension: live.forceG,
        relative: live.relative,
      }}
    />
  );
  const annotations = exp.events
    .filter((e) => /^\[\d+ s\]/.test(e.text))
    .map((e) => ({
      s: Number(e.text.match(/\d+/)![0]),
      text: e.text.replace(/^\[\d+ s\]\s*/, ""),
    }));
  const windowStart = start ?? Math.max(0, t.elapsed - span),
    status =
      t.stopped || t.elapsed === p.durationS
        ? "Stopped"
        : playing
          ? "Recording"
          : t.elapsed
            ? "Paused"
            : "Standby";
  return (
    <div className="instrument">
      <div className="stationTitle">
        <div>
          <h1>Organ bath laboratory</h1>
        </div>
        <button onClick={save}>
          <Save size={15} />
          Save experiment
        </button>
      </div>
      <button
        className="mobileControls"
        aria-expanded={drawer}
        onClick={() => show(!drawer)}
      >
        <SlidersHorizontal size={16} /> {drawer ? "Hide" : "Show"} experiment
        controls
      </button>
      <div className="instrumentLayout">
        <section
          className={"controlRack " + (drawer ? "rackOpen" : "")}
          aria-label="Experiment controls"
        >
          <div className="rackHead">
            <SlidersHorizontal size={17} />
            <b>Experiment controls</b>
          </div>
          <Group icon={Layers3} name="Tissue preparation" open>
            <label>
              Tissue type
              <select value={tissues[0]}>
                {tissues.map((v, i) => (
                  <option key={v} disabled={i > 0}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <button className="wide" onClick={newRun}>
              <Plus size={15} />
              New experiment
            </button>
          </Group>
          <Group icon={Zap} name="Stimulus">
            <p>Electrical stimulation is not modeled.</p>
            <fieldset disabled>
              <legend>Stimulus off</legend>
              <button>ON</button> <button>OFF</button>
              <label>
                <input type="radio" /> Nerve stimulation
              </label>
              <label>
                <input type="radio" /> Muscle stimulation
              </label>
            </fieldset>
          </Group>
          <Group icon={Pipette} name="Drug administration" open>
            <div className="drugSwitch">
              {["Agonist", "Antagonist", "Unknown"].map((v) => (
                <button
                  key={v}
                  aria-pressed={drugTab === v}
                  onClick={() => drugTo(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            {drugTab === "Agonist" ? (
              <>
                <label>
                  Active drug
                  <select>
                    <option>{drugs[0]}</option>
                  </select>
                </label>
                {tab !== "Dilution Formula" && drugInputs}
                <div className="dosePreview">
                  <span>Final bath concentration</span>
                  <b>{preview ? fmt(preview.nominalM * 1e6) : "—"} µM</b>
                </div>
                {problem && <small role="alert">{problem}</small>}
                <button
                  className="greenBtn wide"
                  disabled={!preview || !canTransfer}
                  onClick={() =>
                    transfer({
                      s: t.elapsed,
                      kind: "add",
                      stockM,
                      volumeMl: additionMl,
                    })
                  }
                >
                  <Plus size={16} />
                  Add to organ bath
                </button>
                {!manual && (
                  <small>Scheduled protocol controls additions.</small>
                )}
              </>
            ) : (
              <p>
                No {drugTab.toLowerCase()} module is available for this
                preparation.
              </p>
            )}
          </Group>
          <Group icon={Droplets} name="Reservoir">
            <p>
              Reservoir: {fmt((t.reservoirM ?? 0) * 1e6)} µM ACh. A flush
              replaces the bath with {initial} mL; it does not reset tissue
              history.
            </p>
            <label>
              Prepare reservoir (µM ACh)
              <input
                type="number"
                min="0"
                max="1000"
                value={reserve}
                onChange={(e) => reserveTo(e.target.value)}
              />
            </label>
            <button
              disabled={
                !canTransfer ||
                !reserve.trim() ||
                !(Number(reserve) >= 0 && Number(reserve) <= 1000)
              }
              onClick={() =>
                update({ ...t, reservoirM: Number(reserve) * 1e-6 })
              }
            >
              Prepare reservoir
            </button>
            <button
              disabled={!canTransfer}
              onClick={() =>
                transfer({
                  s: t.elapsed,
                  kind: "exchange",
                  nominalM: t.reservoirM ?? 0,
                })
              }
            >
              Flush reservoir to bath
            </button>
            <button
              disabled={!t.reservoirM || t.stopped}
              onClick={() => update({ ...t, reservoirM: 0 })}
            >
              Clear drugs from reservoir
            </button>
          </Group>
          <Group icon={Beaker} name="Physiological solution">
            <label>
              Salt solution
              <select
                value={t.solutionRecipe ?? "profile"}
                disabled={locked}
                onChange={(e) =>
                  update({
                    ...t,
                    solutionRecipe:
                      e.target.value === "profile"
                        ? undefined
                        : (e.target.value as "mplm" | "intact"),
                  })
                }
              >
                <option value="profile">
                  Profile solution · {source.solution.split(/[,(]/)[0]}
                </option>
                {(["mplm", "intact"] as const)
                  .filter((c) => c !== p.context)
                  .map((c) => (
                    <option key={c} value={c}>
                      {sources[c].solution.split(/[,(]/)[0]} · metadata only
                    </option>
                  ))}
              </select>
            </label>
            <p>{recipe}</p>
            <small>
              Recipe metadata only. An alternative solution is not a calibration
              for these conditions.
            </small>
          </Group>
          <Group icon={Settings2} name="Experimental conditions">
            {tab !== "Experimental Setup" && setupFields}
            <p>
              {source.temperatureC} °C · {source.gas}. Temperature and gas are
              descriptive. Equilibration duration is unmodeled.
            </p>
          </Group>
        </section>
        <section className="workArea">
          <div className="stationTabs">
            {(
              [
                ["Chart", ChartNoAxesCombined],
                ["Experimental Setup", SlidersHorizontal],
                ["Dilution Formula", Calculator],
              ] as const
            ).map(([name, I]) => (
              <button
                key={name}
                aria-pressed={tab === name}
                onClick={() => tabTo(name)}
              >
                <I size={16} />
                {name}
              </button>
            ))}
          </div>
          {tab === "Chart" ? (
            <>
              <section className="recorderCard">
                <div className="recHead">
                  <div>
                    <h2>
                      {example ? "Example kymograph" : "Kymograph tracing"}
                    </h2>
                  </div>
                  {example && (
                    <button onClick={() => exampleTo(false)}>
                      Return to live chart
                    </button>
                  )}
                  <span className="statePill">
                    <i />
                    {status}
                  </span>
                </div>
                <TraceScreen
                  key={example ? "example" : "live"}
                  points={example ? demo : observed}
                  reference={example ? [] : reference}
                  start={example ? 0 : windowStart}
                  span={example ? 200 : span}
                  annotations={example ? [] : annotations}
                  recordFrom={example ? 0 : recordFrom}
                  example={example}
                  onExample={() => exampleTo(true)}
                />
                <div className="transport">
                  <button
                    className="greenBtn"
                    disabled={playing || t.stopped || t.elapsed >= p.durationS}
                    onClick={() => {
                      exampleTo(false);
                      play(true);
                    }}
                  >
                    <Play size={14} />
                    {t.elapsed ? "Resume" : "Record"}
                  </button>
                  <button disabled={!playing} onClick={() => play(false)}>
                    <Pause size={14} />
                    Pause
                  </button>
                  <button
                    disabled={t.stopped || (!playing && !t.elapsed)}
                    onClick={() => {
                      play(false);
                      change({ ...t, stopped: true });
                    }}
                  >
                    <Square size={12} />
                    Stop
                  </button>
                  <button
                    disabled={
                      t.stopped || t.elapsed >= p.durationS || !live.nominalM
                    }
                    onClick={() =>
                      manual
                        ? transfer({
                            s: t.elapsed,
                            kind: "exchange",
                            nominalM: 0,
                          })
                        : change({ ...t, washAt: t.elapsed })
                    }
                  >
                    <Waves size={15} />
                    Wash
                  </button>
                  <button onClick={annotate}>
                    <NotebookPen size={14} />
                    Annotate
                  </button>
                  <span className="readingStrip" aria-label="Live bath status">
                    {stamp(t.elapsed)} · {fmt(live.nominalM * 1e6)} µM ACh ·{" "}
                    {source.temperatureC} °C
                  </span>
                </div>
                <div className="timeControls">
                  <label>
                    Start time (s)
                    <input
                      type="number"
                      min="0"
                      max={t.elapsed}
                      disabled={example}
                      value={example ? 0 : windowStart}
                      onChange={(e) =>
                        pan(
                          Math.max(
                            0,
                            Math.min(t.elapsed, Math.floor(+e.target.value)),
                          ),
                        )
                      }
                    />
                  </label>
                  <input
                    type="range"
                    aria-label="Scroll chart time"
                    min={0}
                    max={t.elapsed}
                    disabled={example || !t.elapsed}
                    value={windowStart}
                    onChange={(e) => pan(+e.target.value)}
                  />
                  <button
                    disabled={example || start === null}
                    onClick={() => pan(null)}
                  >
                    Follow live
                  </button>
                  <label>
                    Window size
                    <select
                      disabled={example}
                      value={example ? 200 : span}
                      onChange={(e) => zoom(+e.target.value)}
                    >
                      {[
                        ...new Set([
                          15,
                          30,
                          60,
                          100,
                          120,
                          300,
                          900,
                          7200,
                          example ? 200 : span,
                        ]),
                      ]
                        .sort((a, b) => a - b)
                        .map((n) => (
                          <option key={n} value={n}>
                            {n} s
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="zoomBar">
                    <button
                      aria-label="Zoom in"
                      onClick={() => zoom(Math.max(15, span / 2))}
                      disabled={example || span <= 15}
                    >
                      <Plus size={15} />
                    </button>
                    <button
                      aria-label="Zoom out"
                      onClick={() => zoom(Math.min(7200, span * 2))}
                      disabled={example || span >= 7200}
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      aria-label="Reset chart view"
                      disabled={example}
                      onClick={() => {
                        zoom(60);
                        pan(null);
                        seek(null);
                      }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              </section>
              <details className="utility">
                <summary>
                  <ListTree size={15} /> Inspection &amp; event log
                </summary>
                <div className="fields">
                  <label>
                    Inspect sample (s)
                    <input
                      type="range"
                      disabled={t.elapsed < recordFrom}
                      min={Math.min(recordFrom, t.elapsed)}
                      max={t.elapsed}
                      value={index}
                      onChange={(e) => seek(+e.target.value)}
                    />
                  </label>
                  <label>
                    Playback speed
                    <select
                      value={speed}
                      onChange={(e) => speedTo(+e.target.value)}
                    >
                      {[1, 10, 60].map((v) => (
                        <option key={v} value={v}>
                          {v}×
                        </option>
                      ))}
                    </select>
                  </label>
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
                  {index >= recordFrom ? (
                    <>
                      At {index} s: phasic {fmt(point.phasic * 100)}%, sustained{" "}
                      {fmt(point.tonic * 100)}%, secondary{" "}
                      {fmt(point.secondary * 100)}%.
                    </>
                  ) : (
                    "No sample acquired at this time."
                  )}{" "}
                  Passive load {k.preloadG} g. Baseline active response 0%. No
                  validated absolute force. Leaving the laboratory pauses
                  virtual time.
                </p>
                <h3>Event log</h3>
                {records.length ? (
                  records.map((v, i) => (
                    <div className="logEntry" key={i}>
                      <time>{stamp(v.s)}</time>
                      {v.text}
                    </div>
                  ))
                ) : (
                  <p>No events recorded.</p>
                )}
              </details>
            </>
          ) : tab === "Experimental Setup" ? (
            <section className="stationCard">
              <div className="micro">INSTRUMENT CONFIGURATION</div>
              <h2>Experimental setup</h2>
              <p>{source.method}</p>
              <button onClick={() => expand(!expanded)}>
                <Maximize2 size={15} />
                {expanded ? "Compact" : "Expand"} apparatus
              </button>
              <div className={"setupBath " + (expanded ? "expanded" : "")}>
                {apparatus}
              </div>
              <div className="fields">{setupFields}</div>
              <p>
                {source.recording} · {source.temperatureC} °C · {source.gas}
              </p>
              <p>{recipe}</p>
              <p>
                Bath: {fmt(live.volumeMl)} mL · {fmt(live.nominalM * 1e6)} µM
                ACh. Reservoir: {fmt((t.reservoirM ?? 0) * 1e6)} µM. Passive
                load: {k.preloadG} g.
              </p>
              <p>
                Stimulus off · ACh only · full bath exchange. Equilibration not
                modeled.
              </p>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.publication}
              </a>
              <details>
                <summary>Planned exposure schedule</summary>
                {schedule(p).map((e) => (
                  <p key={e.s}>
                    {e.s} s · {fmt(e.targetM * 1e6)} µM
                  </p>
                ))}
              </details>
            </section>
          ) : (
            <section className="stationCard">
              <div className="micro">MASS BALANCE</div>
              <h2>Dilution formula</h2>
              <p>
                Preview the next bolus in the active, well-mixed bath.
                Calculating does not administer drug.
              </p>
              <div className="formula">Cꜰ = (Cᵢ Vᵦ + Cₛ Vₐ) / (Vᵦ + Vₐ)</div>
              {drugInputs}
              <p>
                Current bath: {fmt(live.nominalM * 1e6)} µM ×{" "}
                {fmt(live.volumeMl)} mL
              </p>
              {preview ? (
                <p>
                  ({fmt(live.nominalM * 1e6)} × {fmt(live.volumeMl)} +{" "}
                  {fmt(stockM * 1e6)} × {fmt(additionMl)}) /{" "}
                  {fmt(preview.volumeMl)} ={" "}
                  <b>{fmt(preview.nominalM * 1e6)} µM</b> in{" "}
                  {fmt(preview.volumeMl)} mL.
                </p>
              ) : (
                <p role="alert">{problem}</p>
              )}
            </section>
          )}
          <ProtocolNotebook
            exp={exp}
            observed={observed}
            change={update}
            download={download}
            reset={reset}
            notes={notes}
            numbers={numbers}
          />
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
    </div>
  );
}
