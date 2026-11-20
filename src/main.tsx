import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  FlaskConical,
  Layers3,
  Pill,
  Folders,
  ChartNoAxesCombined,
  FileText,
  Settings2,
  Info,
  PanelLeft,
  ChevronRight,
  ArrowRight,
  Plus,
  Database,
  ShieldCheck,
  Activity,
  FolderOpen,
  Cpu,
  CalendarDays,
  BookOpen,
  ArrowUpRight,
  CircleDot,
  ScrollText,
  Microscope,
  CircleCheck,
  TriangleAlert,
  SlidersHorizontal,
  X,
  ClipboardList,
  Network,
  Waypoints,
} from "lucide-react";
import { RecordingPlot, type SessionClock } from "./laboratory/RecordingPlot";
import { Plate } from "./laboratory/Plates";
import { Bath } from "./laboratory/Bath";
import {
  engine,
  tissues,
  drugs,
  create,
  valid,
  type Experiment,
} from "./simulation/core";
import { get, put, desktop } from "./database/store";
import "./style.css";
const pages = [
  "Dashboard",
  "Laboratory",
  "Tissue Library",
  "Drug Library",
  "Experiments",
  "Analysis",
  "Reports",
  "Settings",
  "About PharmaLab",
];
const icons = [
  LayoutDashboard,
  FlaskConical,
  Layers3,
  Pill,
  Folders,
  ChartNoAxesCombined,
  FileText,
  Settings2,
  Info,
];
const species = [
  "Cavia porcellus",
  "Oryctolagus cuniculus",
  "Gallus gallus domesticus",
  "Rattus norvegicus",
];
const tissueIcons = [Waypoints, Activity, Layers3, Network];
const defaults = {
  Difficulty: "Beginner",
  Theme: "Light",
  "Graphics quality": "Standard",
  "Animation quality": "Standard",
  "Recording update frequency": "Normal",
  "Graph rendering": "SVG",
  "3D availability": "Unavailable",
  "Reduced motion": "Off",
};
type Pref = typeof defaults;
const pageFromHash = () =>
  pages.find((p) => p === decodeURIComponent(location.hash.slice(1))) ||
  pages[0];
function download(name: string, text: string, type = "application/json") {
  const u = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function App() {
  const trigger = useRef<HTMLElement | null>(null);
  const [clock, setClock] = useState<SessionClock>({ elapsed: 0, since: null });
  const [query, Q] = useState("");
  const [page, P] = useState(pageFromHash),
    [menu, M] = useState(false),
    [all, A] = useState<Experiment[]>([]),
    [exp, E] = useState<Experiment | null>(null),
    [pref, F] = useState<Pref>(defaults),
    [ready, R] = useState(false),
    [msg, G] = useState(""),
    [modal, D] = useState(""),
    [busy, B] = useState(false),
    [closing, C] = useState(false),
    [collapsed, Collapse] = useState(false),
    [input, I] = useState(""),
    [detail, H] = useState(""),
    [rec, S] = useState("Stopped"),
    [drug, J] = useState<string>(drugs[0]),
    [online, O] = useState(navigator.onLine),
    [zoom, Z] = useState(false),
    [storageError, SE] = useState(false);
  useEffect(() => {
    Promise.all([get<Experiment[]>("experiments"), get<Pref>("settings")])
      .then(([a, f]) => {
        if (a && !a.every(valid)) throw Error();
        A(a || []);
        F({ ...defaults, ...f });
        R(true);
      })
      .catch(() => {
        SE(true);
        G(
          "Local storage could not be opened. Existing records have not been changed.",
        );
      });
    const hash = () => {
        P(pageFromHash());
        M(false);
      },
      net = () => O(navigator.onLine);
    window.addEventListener("hashchange", hash);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, []);
  useEffect(() => {
    const d = document.documentElement.dataset;
    d.theme = pref.Theme;
    d.motion =
      pref["Reduced motion"] === "On" || pref["Graphics quality"] === "Low"
        ? "off"
        : "on";
    d.animation = pref["Animation quality"];
  }, [pref]);
  function nav(p: string) {
    Q("");
    location.hash = p;
    P(p);
    M(false);
    H("");
  }
  function closeModal() {
    C(true);
    setTimeout(() => {
      D("");
      C(false);
      requestAnimationFrame(() => {
        if (trigger.current?.isConnected) trigger.current.focus();
        else document.querySelector<HTMLElement>("h1")?.focus();
      });
    }, 150);
  }
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => G(""), 6500);
    return () => clearTimeout(timer);
  }, [msg]);
  function dialog(d: string) {
    trigger.current = document.activeElement as HTMLElement;
    I("");
    D(d);
  }
  async function save(e: Experiment) {
    if (!ready) throw Error("Storage unavailable");
    const a = [e, ...all.filter((x) => x.id !== e.id)];
    await put("experiments", a);
    A(a);
  }
  function open(e: Experiment) {
    E(structuredClone(e));
    S("Stopped");
    setClock({ elapsed: 0, since: null });
    nav("Laboratory");
  }
  function event(text: string) {
    if (exp)
      E({
        ...exp,
        events: [...exp.events, { at: new Date().toISOString(), text }],
      });
  }
  function notify(p: Promise<unknown>, s: string) {
    p.then(() => G(s)).catch(() =>
      G("Could not save to local storage. Export a backup before closing."),
    );
  }
  function changeRec(s: string) {
    const at = performance.now();
    setClock((c) => ({
      elapsed:
        rec === "Stopped"
          ? 0
          : c.elapsed + (c.since === null ? 0 : at - c.since),
      since: s === "Recording" ? at : null,
    }));
    S(s);
    event(`Recording ${s.toLowerCase()} (no signal)`);
  }
  const latest = all[0];
  const status = storageError
    ? "Unavailable"
    : ready
      ? "Connected"
      : "Opening…";
  const count = all.length;
  const newBtn = (
    <button
      className="primary"
      disabled={!ready}
      onClick={() => dialog("New experiment")}
    >
      <Plus size={16} />
      New experiment
    </button>
  );
  const badge = (s: string) => (
    <span className={"badge " + (s === "Planned" ? "gray" : "")}>
      {s === "Planned" ? null : <i />}
      {s}
    </span>
  );
  function catalog(full = false) {
    return (
      <div className="catalog">
        {tissues.slice(0, full ? 4 : 3).map((t, i) => {
          const Ic = tissueIcons[i];
          return (
            <button
              key={t}
              onClick={() => {
                nav("Tissue Library");
                H(t);
              }}
            >
              <span className={"spec s" + i}>
                <Ic size={21} />
              </span>
              <span className="grow">
                <b>{t}</b>
                <small>
                  <em>{species[i]}</em>
                </small>
              </span>
              {badge(i ? "Planned" : "In development")}
            </button>
          );
        })}
      </div>
    );
  }
  function rows() {
    return all.map((e) => (
      <div className="row" key={e.id}>
        <ClipboardList size={18} />
        <button className="link grow left" onClick={() => open(e)}>
          {e.name}
        </button>
        <small>{new Date(e.created).toLocaleDateString()}</small>
        <button
          onClick={() =>
            notify(
              save({
                ...structuredClone(e),
                id: crypto.randomUUID(),
                created: new Date().toISOString(),
                name: e.name + " (copy)",
              }),
              "Experiment duplicated",
            )
          }
        >
          Duplicate
        </button>
      </div>
    ));
  }
  return (
    <div className={"shell " + (collapsed ? "collapsed" : "")}>
      <aside inert={!!modal} className={menu ? "show" : ""}>
        <div className="brand">
          <span>
            <FlaskConical />
          </span>
          <strong>
            Pharma<span>Lab</span>
          </strong>
        </div>
        <div className="navwrap">
          {pages.map((p, i) => {
            const Ic = icons[i];
            return (
              <React.Fragment key={p}>
                {[0, 4, 7].includes(i) && (
                  <label>
                    {i === 0 ? "WORKSPACE" : i === 4 ? "RESEARCH" : "SYSTEM"}
                  </label>
                )}
                <button
                  className={p === page ? "active" : ""}
                  title={p}
                  aria-label={p}
                  aria-current={page === p ? "page" : undefined}
                  onClick={() => nav(p)}
                >
                  <Ic size={17} />
                  <span>{p}</span>
                  {p === page && <i className="activeDot" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="local">
          <span className="dockicon">
            <Cpu size={18} />
          </span>
          <b>Local workstation</b>
          <small>
            PharmaLab <span>v{__BUILD__.version}</span>
          </small>
        </div>
      </aside>
      <main inert={!!modal}>
        <header>
          <button
            className="bare"
            aria-label="Toggle navigation"
            onClick={() =>
              window.matchMedia("(max-width:800px)").matches
                ? M(!menu)
                : Collapse(!collapsed)
            }
          >
            <PanelLeft size={17} />
          </button>
          <span className="divider" />
          Workspace <ChevronRight size={13} />
          <strong>{page}</strong>
          <span className="topstatus">
            <i /> Local session
          </span>
          <span className="profile" title="Local PharmaLab session">
            PL
          </span>
        </header>
        <article key={page} data-page={page}>
          <div className="eyebrow">
            <span />{" "}
            {page === "Dashboard"
              ? "WORKSTATION  /  OVERVIEW"
              : page === "Laboratory"
                ? "EXPERIMENT WORKSPACE"
                : "LOCAL WORKSPACE"}
          </div>
          <div className="title">
            <h1 tabIndex={-1}>
              {page === "Dashboard" ? "Laboratory dashboard" : page}
            </h1>
            {page === "Dashboard" ? (
              <span className="date">
                <CalendarDays size={14} />
                {new Date().toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            ) : page === "Experiments" ? (
              newBtn
            ) : null}
          </div>
          <p className="subtitle">
            {
              [
                "A local workspace for experimental pharmacology.",
                "Configure your preparation and document experimental actions.",
                "Browse preparations and review model development status.",
                "Explore planned compounds and their evidence status.",
                "Manage experiment records stored on this device.",
                "Review your experimental history and recording configuration.",
                "Export a readable record of your local experiments.",
                "Configure your local laboratory workspace.",
                "An independent, offline-first virtual pharmacology laboratory.",
              ][pages.indexOf(page)]
            }
          </p>
          {page === "Dashboard" && (
            <>
              <section className="hero">
                <div className="heroText">
                  <div className="heroLabel">
                    <span className="signalbars">▥</span> FEATURED INSTRUMENT{" "}
                    <i /> 01
                  </div>
                  <h2>
                    Organ bath
                    <br />
                    <em>workstation.</em>
                  </h2>
                  <p>
                    Prepare your tissue, configure the apparatus,
                    <br className="wide" /> and document your experiment.
                  </p>
                  <div className="actions">
                    {newBtn}
                    <button className="ghost" onClick={() => nav("Laboratory")}>
                      Open laboratory <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="drawing">
                  <span className="plateNo">
                    FIG. 01 <span>/</span> ISOMETRIC ASSEMBLY
                  </span>
                  <Bath state={engine.snapshot()} />
                  <span className="artBadge">
                    <i /> 2D APPARATUS VIEW
                  </span>
                </div>
                <div className="herofoot">
                  <span>
                    <CircleDot size={13} /> Guinea pig ileum
                  </span>
                  <span>Isometric tension recording</span>
                  <span>Illustrative apparatus · no signal</span>
                </div>
              </section>
              <div className="sectionhead">
                <div className="kicker">
                  <i /> QUICK ACCESS
                </div>
                <h2>Research modules</h2>
              </div>
              <div className="modules">
                {[
                  [
                    "Tissue Library",
                    "Preparation atlas",
                    "Browse tissue preparations",
                    "04 PREPARATIONS",
                    Microscope,
                  ],
                  [
                    "Drug Library",
                    "Drug reference",
                    "Explore the compound catalogue",
                    "06 COMPOUNDS",
                    Pill,
                  ],
                  [
                    "Experiments",
                    "Experiment notebook",
                    "Manage your local records",
                    "LOCAL RECORDS",
                    BookOpen,
                  ],
                ].map(([dest, name, desc, tag, Icon]: any, i) => (
                  <button
                    key={dest}
                    className={"module mod" + i}
                    onClick={() => nav(dest)}
                  >
                    <div className="moduleArt">
                      <Icon size={20} />
                      <Plate kind={i} />
                      <span>{tag}</span>
                    </div>
                    <div className="moduleCopy">
                      <b>{name}</b>
                      <ArrowUpRight size={16} />
                      <small>{desc}</small>
                    </div>
                  </button>
                ))}
              </div>
              <div className="columns">
                <section className="card">
                  <div className="cardhead">
                    <div>
                      <div className="mini">ACTIVITY LOG</div>
                      <h2>Recent experiments</h2>
                    </div>
                    <button
                      className="textbtn"
                      onClick={() => nav("Experiments")}
                    >
                      View all <ArrowRight size={14} />
                    </button>
                  </div>
                  {latest ? (
                    <button
                      className="recentEntry"
                      onClick={() => open(latest)}
                    >
                      <ClipboardList />
                      <span>
                        <b>{latest.name}</b>
                        <small>Continue experiment</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="empty">
                      <span>
                        <FolderOpen size={23} />
                      </span>
                      <div>
                        <b>No experiments yet</b>
                        <small>Your saved experiments will appear here.</small>
                      </div>
                    </div>
                  )}
                </section>
                <section className="card statusCard">
                  <div className="cardhead">
                    <div>
                      <div className="mini">SYSTEM MONITOR</div>
                      <h2>Workstation status</h2>
                    </div>
                    <Activity size={18} />
                  </div>
                  {[
                    [Cpu, "Local runtime", "Ready"],
                    [
                      ShieldCheck,
                      "Connectivity",
                      online ? "Online" : "Offline",
                    ],
                    [
                      Database,
                      desktop ? "SQLite storage" : "IndexedDB storage",
                      status,
                    ],
                  ].map(([Icon, label, value]: any) => (
                    <div className="statusline" key={label}>
                      <Icon size={14} />
                      <span>{label}</span>
                      <b>
                        <i />
                        {value}
                      </b>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )}
          {page === "Laboratory" && (
            <>
              <div className="toolbar">
                <strong>{exp?.name || "Preparation workspace"}</strong>
                {newBtn}
                {exp && (
                  <>
                    <button
                      onClick={() =>
                        notify(save(exp), "Experiment saved locally")
                      }
                    >
                      Save experiment
                    </button>
                    <button onClick={() => dialog("Reset experiment")}>
                      Reset experiment
                    </button>
                  </>
                )}
              </div>
              <div className="labgrid">
                <section className="panel">
                  <div className="mini">PREPARATION 01</div>
                  <h2>Guinea pig ileum</h2>
                  {[
                    ["Species", "Guinea pig (Cavia porcellus)"],
                    ["Preparation", "Isolated longitudinal ileum"],
                    ["Recording method", "Isometric tension recording"],
                    ["Protocol", "Independent exploration"],
                    ["Tissue status", "Model awaiting validation"],
                    ["Bath conditions", "Not calibrated"],
                  ].map(([k, v]) => (
                    <p key={k}>
                      <small>{k}</small>
                      {v}
                    </p>
                  ))}
                </section>
                <section className="panel apparatus">
                  <div className="instrumentHead">
                    <div className="heroLabel">INSTRUMENT 01</div>
                    <h2>Organ bath assembly</h2>
                  </div>
                  <div style={{ transform: `scale(${zoom ? 1.13 : 1})` }}>
                    <Bath state={engine.snapshot()} />
                  </div>
                  <small className="resting">
                    Illustrative apparatus · resting tissue
                  </small>
                  <div className="actions">
                    <button onClick={() => Z(!zoom)}>
                      Zoom {zoom ? "out" : "in"}
                    </button>
                    <button onClick={() => Z(false)}>Reset view</button>
                    <button disabled>3D unavailable</button>
                  </div>
                </section>
                <section className="panel dosage">
                  <div className="mini">CONTROL BANK</div>
                  <h2>Drug administration</h2>
                  <p>
                    {pref.Difficulty === "Beginner"
                      ? "Choose a compound and enter your setup. Actions are logged without generating a tissue response."
                      : "Manual setup · no calibrated response model."}
                  </p>
                  <fieldset disabled={!exp}>
                    <div className="fields">
                      <label>
                        Compound
                        <select
                          value={drug}
                          onChange={(e) => J(e.target.value)}
                        >
                          {drugs.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </select>
                      </label>
                      {[
                        "Stock concentration",
                        "Desired final concentration",
                        "Addition volume",
                        "Bath volume",
                      ].map((k) => (
                        <label key={k}>
                          {k}
                          <input
                            placeholder="Value and units"
                            value={exp?.conditions[k] || ""}
                            onChange={(e) =>
                              exp &&
                              E({
                                ...exp,
                                conditions: {
                                  ...exp.conditions,
                                  [k]: e.target.value,
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <small>Drug category: awaiting evidence</small>
                    <div className="actions">
                      <button
                        onClick={() =>
                          event(
                            `Add drug: ${drug}; setup: ${JSON.stringify(exp?.conditions)}`,
                          )
                        }
                      >
                        Log drug addition
                      </button>
                      <button
                        onClick={() => event("Wash preparation requested")}
                      >
                        Wash preparation
                      </button>
                    </div>
                  </fieldset>
                  {exp && (
                    <details className="history">
                      <summary>Administration history</summary>
                      {exp.events.filter((e) =>
                        /^(Add drug:|Wash preparation)/.test(e.text),
                      ).length ? (
                        exp.events
                          .filter((e) =>
                            /^(Add drug:|Wash preparation)/.test(e.text),
                          )
                          .map((e, i) => (
                            <p key={i}>
                              <small>
                                {new Date(e.at).toLocaleTimeString()}
                              </small>
                              {e.text
                                .split("; setup:")[0]
                                .replace(/^Add drug: /, "Compound · ")}
                            </p>
                          ))
                      ) : (
                        <p>No administrations logged.</p>
                      )}
                    </details>
                  )}
                </section>
              </div>
              <section className="panel recorder">
                <div className="cardhead">
                  <div>
                    <div className="mini">CHANNEL 01 / ISOMETRIC</div>
                    <h2>Live recording</h2>
                  </div>
                  {badge(rec)}
                </div>
                <RecordingPlot
                  clock={exp ? clock : undefined}
                  scale={exp?.recording.scale}
                />
                <small>Baseline unavailable · No physiological data</small>
                <div className="actions">
                  {["Start", "Pause", "Resume", "Stop"].map((a, i) => (
                    <button
                      key={a}
                      disabled={
                        !exp ||
                        ![
                          rec === "Stopped",
                          rec === "Recording",
                          rec === "Paused",
                          rec !== "Stopped",
                        ][i]
                      }
                      onClick={() =>
                        changeRec(
                          ["Recording", "Paused", "Recording", "Stopped"][i],
                        )
                      }
                    >
                      {a}
                    </button>
                  ))}
                  <button disabled>Export signal</button>
                </div>
                {exp && (
                  <div className="fields">
                    <label>
                      Time scale
                      <select
                        value={exp.recording.scale}
                        onChange={(e) =>
                          E({
                            ...exp,
                            recording: {
                              ...exp.recording,
                              scale: e.target.value,
                            },
                          })
                        }
                      >
                        {["30 s", "60 s", "120 s"].map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Recording sensitivity
                      <input disabled value="Awaiting calibration" />
                    </label>
                  </div>
                )}
              </section>
              {exp && (
                <section className="panel">
                  <h2>Experiment notebook</h2>
                  <label>
                    Notes
                    <textarea
                      value={exp.notes}
                      onChange={(e) => E({ ...exp, notes: e.target.value })}
                    />
                  </label>
                  <button onClick={() => dialog("Add annotation")}>
                    Add annotation
                  </button>
                  {exp.events.map((v, i) => (
                    <p key={i}>
                      {v.at} · {v.text}
                    </p>
                  ))}
                </section>
              )}
            </>
          )}
          {page === "Tissue Library" && (
            <section className="card atlas">
              <div className="catalogBanner">
                <Plate kind={0} />
                <div className="mini">REFERENCE SERIES / TISSUE</div>
                <span>Preparation atlas</span>
              </div>
              <div className="cardhead">
                <h2>Preparation catalogue</h2>
                {badge("4 preparations")}
              </div>
              {catalog(true)}
              {detail && (
                <div key={detail} className="panel detailPanel">
                  <h2>{detail}</h2>
                  <p>
                    {detail === tissues[2]
                      ? "Skeletal neuromuscular preparation; requires a distinct model."
                      : detail === tissues[0]
                        ? "Isolated longitudinal ileum · Isometric tension recording"
                        : "Preparation method awaiting review."}
                  </p>
                  <small>
                    Conditions, protocols and sensitivity: awaiting evidence. No
                    validated model.
                  </small>
                  {detail === tissues[0] && (
                    <button onClick={() => nav("Laboratory")}>
                      Open laboratory →
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
          {page === "Drug Library" && (
            <section className="card">
              <div className="cardhead">
                <div>
                  <div className="mini">REFERENCE SERIES / PHARMACOLOGY</div>
                  <h2>Compound catalogue</h2>
                </div>
                <Pill />
              </div>
              <label className="searchref">
                Find a compound
                <input
                  type="search"
                  placeholder="Search by generic name"
                  value={query}
                  onChange={(e) => Q(e.target.value)}
                />
              </label>
              {!drugs.some((d) =>
                d.toLowerCase().includes(query.trim().toLowerCase()),
              ) && <p className="noresults">No matching compounds.</p>}
              {drugs
                .filter((d) =>
                  d.toLowerCase().includes(query.trim().toLowerCase()),
                )
                .map((d) => (
                  <button className="listitem" key={d} onClick={() => H(d)}>
                    <span className="refnum">RX / 0{drugs.indexOf(d) + 1}</span>
                    <b className="grow left">{d}</b>
                    {badge("Awaiting evidence")}
                    <ChevronRight size={15} />
                  </button>
                ))}
              {detail && (
                <div key={detail} className="panel detailPanel">
                  <h2>{detail}</h2>
                  <p>
                    Class, receptor target, action, stock, molecular weight,
                    concentration range and tissue-specific effects await
                    evidence review.
                  </p>
                </div>
              )}
              <button className="footlink" onClick={() => nav("Analysis")}>
                View evidence register <ArrowRight size={15} />
              </button>
            </section>
          )}
          {page === "Experiments" && (
            <section className="panel">
              <div className="pageGlyph">
                <BookOpen />
              </div>
              <div className="mini">RESEARCH NOTEBOOK</div>
              <h2>Local experiments · {count}</h2>
              {count ? (
                rows()
              ) : (
                <p>
                  No saved experiments. Start a new experiment or import a local
                  backup.
                </p>
              )}
              <div className="actions">
                <button
                  onClick={() =>
                    download(
                      "pharmalab-backup.json",
                      JSON.stringify(all, null, 2),
                    )
                  }
                  disabled={!count}
                >
                  Export backup
                </button>
                <label className="file">
                  Import backup
                  <input
                    type="file"
                    accept=".json"
                    disabled={!ready}
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const a = JSON.parse(await file.text());
                        if (!Array.isArray(a) || !a.every(valid)) throw Error();
                        const ids = new Set(all.map((v) => v.id));
                        const merged = [
                          ...all,
                          ...a.filter((v) => !ids.has(v.id) && ids.add(v.id)),
                        ];
                        await put("experiments", merged);
                        A(merged);
                        G(
                          `Imported ${merged.length - all.length} records; existing IDs preserved.`,
                        );
                      } catch {
                        G(
                          "Import failed. Check the backup format and storage.",
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </section>
          )}
          {["Analysis", "Reports"].includes(page) && (
            <section className="panel">
              <div className="pageGlyph">
                {page === "Analysis" ? <Activity /> : <ScrollText />}
              </div>
              <div className="mini">
                {page === "Analysis" ? "SIGNAL INSPECTION" : "DOCUMENT ARCHIVE"}
              </div>
              <h2>
                {page === "Analysis"
                  ? "Experiment review"
                  : "Experiment reports"}
              </h2>
              {count ? (
                all.map((e) => (
                  <div className="row" key={e.id}>
                    <b className="grow">{e.name}</b>
                    <button
                      onClick={() =>
                        page === "Reports"
                          ? download(
                              "experiment-report.txt",
                              [
                                e.name,
                                e.created,
                                e.model,
                                e.version,
                                "No scientific signal recorded.",
                                e.notes,
                                ...e.events.map((v) => v.at + " " + v.text),
                              ].join("\n"),
                              "text/plain",
                            )
                          : H(e.id)
                      }
                    >
                      {page === "Reports" ? "Export report" : "Review"}
                    </button>
                  </div>
                ))
              ) : (
                <p>
                  No saved records to{" "}
                  {page === "Analysis" ? "analyse" : "report on"}.
                </p>
              )}
              {all
                .filter((e) => e.id === detail)
                .map((e) => (
                  <p key={e.id}>
                    {e.version} · {e.events.length} documented actions · Time
                    scale {e.recording.scale}
                  </p>
                ))}
            </section>
          )}
          {page === "Analysis" && (
            <section className="panel">
              <RecordingPlot
                scale={all.find((e) => e.id === detail)?.recording.scale}
              />
              <div className="mini">SCIENTIFIC PROVENANCE</div>
              <h2>Evidence register</h2>
              <p>No verified datasets have been added.</p>
              <small>
                Dataset ID · Parameter · Species and tissue · Original value and
                units · Source · Licence · Validation
              </small>
            </section>
          )}
          {page === "Settings" && (
            <section className="panel">
              <div className="pageGlyph">
                <SlidersHorizontal />
              </div>
              <div className="mini">WORKSTATION CONFIGURATION</div>
              <h2>Workspace preferences</h2>
              <p>
                Difficulty adjusts guidance, never biological parameters.
                Reduced motion and low graphics quality disable animation.
                Recording preferences are reserved for the future engine.
              </p>
              <div className="fields">
                {Object.entries(defaults).map(([k], i) => (
                  <label key={k}>
                    {k}
                    <select
                      disabled={!ready}
                      value={pref[k as keyof Pref]}
                      onChange={async (e) => {
                        const next = { ...pref, [k]: e.target.value };
                        try {
                          await put("settings", next);
                          F(next);
                        } catch {
                          G("Preference could not be saved");
                        }
                      }}
                    >
                      {[
                        ["Beginner", "Amateur", "Pro-Scientist"],
                        ["Light", "Dark"],
                        ["Low", "Standard", "High"],
                        ["Low", "Standard"],
                        ["Low", "Normal", "High"],
                        ["SVG"],
                        ["Unavailable"],
                        ["On", "Off"],
                      ][i].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          )}
          {page === "About PharmaLab" && (
            <section className="panel">
              <div className="pageGlyph">
                <FlaskConical />
              </div>
              <div className="mini">
                FOUNDATION RELEASE · {__BUILD__.version} ·{" "}
                {__BUILD__.sha.slice(0, 7)}
              </div>
              <h2>PharmaLab</h2>
              <p>
                A local laboratory for independent experimentation and
                evidence-traceable pharmacology education. No account, cloud
                service or PharmaTRACK installation required.
              </p>
              <h3>Scientific status</h3>
              <p>
                The guinea pig ileum model awaits evidence review and
                calibration. No biological simulations or validated numerical
                results are available in this release.
              </p>
            </section>
          )}
          <footer>
            <FlaskConical size={13} /> PharmaLab <span> / </span> Scientific
            workstation <b>FOUNDATION / v{__BUILD__.version}</b>
          </footer>
        </article>
      </main>
      {msg && (
        <div
          role="status"
          className={
            "toast " +
            (/failed|not|unavailable/i.test(msg) ? "error" : "success")
          }
        >
          {/failed|not|unavailable/i.test(msg) ? (
            <TriangleAlert size={16} />
          ) : (
            <CircleCheck size={16} />
          )}
          {msg}
          <button onClick={() => G("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className={"overlay " + (closing ? "leaving" : "")}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) closeModal();
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-label={modal}
            className="panel modal"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) closeModal();
              if (e.key === "Tab") {
                const els = e.currentTarget.querySelectorAll<HTMLElement>(
                  "input,button:not(:disabled)",
                );
                if (e.shiftKey && document.activeElement === els[0]) {
                  e.preventDefault();
                  els[els.length - 1]?.focus();
                } else if (
                  !e.shiftKey &&
                  document.activeElement === els[els.length - 1]
                ) {
                  e.preventDefault();
                  els[0]?.focus();
                }
              }
            }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              B(true);
              try {
                if (modal === "New experiment") {
                  const v = create(input);
                  await save(v);
                  open(v);
                } else if (modal === "Add annotation") {
                  event("Annotation: " + input);
                } else if (exp) {
                  const v = {
                    ...create(exp.name),
                    id: exp.id,
                    created: exp.created,
                    model: exp.model,
                    version: exp.version,
                  };
                  await save(v);
                  open(v);
                }
                closeModal();
              } catch {
                G("Could not update local record.");
              } finally {
                B(false);
              }
            }}
          >
            <div className="mini">PHARMALAB WORKSPACE</div>
            <h2>{modal}</h2>
            {modal === "Reset experiment" ? (
              <p>
                Clear this experiment’s notes, settings, and action history?
                This cannot be undone.
              </p>
            ) : (
              <label>
                {modal === "New experiment" ? "Experiment name" : "Annotation"}
                <input
                  autoFocus
                  required
                  value={input}
                  onChange={(e) => I(e.target.value)}
                  placeholder={
                    modal === "New experiment"
                      ? "Name your experiment"
                      : "Enter an observation"
                  }
                />
              </label>
            )}
            <div className="actions">
              <button
                type="button"
                autoFocus={modal === "Reset experiment"}
                disabled={busy}
                onClick={closeModal}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : modal === "New experiment"
                    ? "Start experiment"
                    : modal === "Reset experiment"
                      ? "Confirm reset"
                      : "Add annotation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (import.meta.env.PROD && !desktop && "serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(console.error);
