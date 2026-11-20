import React, { useState, useEffect } from "react";
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
  HardDrive,
  Database,
  ShieldCheck,
  BookOpen,
  Activity,
  Microscope,
  FolderOpen,
  CircleHelp,
  Monitor,
  Check,
  Download,
  RefreshCw,
  Clock3,
  Menu,
  X,
  ClipboardList,
  Leaf,
  Network,
  Waypoints,
  Beaker,
} from "lucide-react";
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
  "Animation quality": "Low",
  "Recording update frequency": "Normal",
  "Graph rendering": "SVG",
  "3D availability": "Unavailable",
  "Reduced motion": "On",
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
  const [page, P] = useState(pageFromHash),
    [menu, M] = useState(false),
    [all, A] = useState<Experiment[]>([]),
    [exp, E] = useState<Experiment | null>(null),
    [pref, F] = useState<Pref>(defaults),
    [ready, R] = useState(false),
    [msg, G] = useState(""),
    [modal, D] = useState(""),
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
        H("");
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
    document.documentElement.dataset.theme = pref.Theme;
  }, [pref]);
  function nav(p: string) {
    location.hash = p;
    P(p);
    M(false);
    H("");
  }
  function dialog(d: string) {
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
    S(s);
    event(`Recording ${s.toLowerCase()} (no signal)`);
  }
  const latest = all[0];
  const PageIcon = icons[pages.indexOf(page)];
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
    <div className="shell">
      <aside className={menu ? "show" : ""}>
        <div className="brand">
          <span>
            <FlaskConical />
          </span>
          PharmaLab
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
                  onClick={() => nav(p)}
                >
                  <Ic size={17} />
                  {p}
                  {p === page && <i className="activeDot" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="local">
          <span className="dot" />
          Local workspace
          <small>
            PharmaLab <span>v0.1.0</span>
          </small>
        </div>
      </aside>
      <main>
        <header>
          <button
            className="bare"
            aria-label="Toggle navigation"
            onClick={() => M(!menu)}
          >
            <PanelLeft size={17} />
          </button>
          <span className="divider" />
          Workspace <ChevronRight size={13} />
          <strong>{page}</strong>
          <span className="topstatus">
            <i />
            Local mode
          </span>
        </header>
        <article>
          <div className="eyebrow">
            <span />{" "}
            {page === "Dashboard"
              ? "WORKSPACE OVERVIEW"
              : page === "Laboratory"
                ? "EXPERIMENT WORKSPACE"
                : "LOCAL WORKSPACE"}
          </div>
          <div className="title">
            <h1>{page === "Dashboard" ? "Laboratory dashboard" : page}</h1>
            {page === "Dashboard" ? (
              <span className="date">
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
                "Your preparations, experiments, and laboratory tools in one place.",
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
                    <i /> VIRTUAL LABORATORY
                  </div>
                  <h2>Welcome to PharmaLab</h2>
                  <p>
                    Explore preparations, set up your organ bath, and
                    <br className="wide" /> document your experiments in a local
                    workspace.
                  </p>
                  <div className="actions">
                    {newBtn}
                    <button className="ghost" onClick={() => nav("Laboratory")}>
                      Open laboratory <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="drawing">
                  <Bath state={engine.snapshot()} />
                  <small>FIG. 01 &nbsp;/&nbsp; ORGAN BATH ASSEMBLY</small>
                </div>
              </section>
              <div className="sectionLabel">WORKSPACE STATUS</div>
              <div className="stats">
                {[
                  [Monitor, "Application", "Operational", "Local runtime"],
                  [
                    ShieldCheck,
                    "Connectivity",
                    online ? "Online" : "Offline",
                    "Offline-first workspace",
                  ],
                  [
                    Database,
                    "Local storage",
                    status,
                    desktop ? "SQLite database" : "IndexedDB database",
                  ],
                ].map(([Icon, t, v, sub]: any) => (
                  <section className="stat" key={t}>
                    <span className="statIcon">
                      <Icon size={19} />
                    </span>
                    <div>
                      <small>{t}</small>
                      <b>{v}</b>
                      <small>{sub}</small>
                    </div>
                    <i className="dot" />
                  </section>
                ))}
              </div>
              <div className="columns">
                <section className="card">
                  <div className="cardhead">
                    <div>
                      <div className="mini">PREPARATION CATALOGUE</div>
                      <h2>Available preparations</h2>
                    </div>
                    <Layers3 size={20} />
                  </div>
                  {catalog()}
                  <button
                    className="footlink"
                    onClick={() => nav("Tissue Library")}
                  >
                    View tissue library <ArrowRight size={15} />
                  </button>
                </section>
                <section className="card">
                  <div className="cardhead">
                    <div>
                      <div className="mini">EXPERIMENT LOG</div>
                      <h2>Recent experiments</h2>
                    </div>
                    <Clock3 size={20} />
                  </div>
                  {latest ? (
                    <div className="empty">
                      <Folders />
                      <b>{latest.name}</b>
                      <button onClick={() => open(latest)}>
                        Continue experiment →
                      </button>
                    </div>
                  ) : (
                    <div className="empty">
                      <span>
                        <FolderOpen size={26} />
                      </span>
                      <b>No experiments yet</b>
                      <small>Your saved experiments will appear here.</small>
                    </div>
                  )}
                  <button
                    className="footlink"
                    onClick={() => nav("Experiments")}
                  >
                    View all experiments <ArrowRight size={15} />
                  </button>
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
                  <div className="mini">2D APPARATUS</div>
                  <div style={{ transform: `scale(${zoom ? 1.13 : 1})` }}>
                    <Bath state={engine.snapshot()} />
                  </div>
                  <div className="actions">
                    <button onClick={() => Z(!zoom)}>
                      Zoom {zoom ? "out" : "in"}
                    </button>
                    <button onClick={() => Z(false)}>Reset view</button>
                    <button disabled>3D unavailable</button>
                  </div>
                </section>
              </div>
              <section className="panel">
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
                      <select value={drug} onChange={(e) => J(e.target.value)}>
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
                    <button onClick={() => event("Wash preparation requested")}>
                      Wash preparation
                    </button>
                  </div>
                </fieldset>
              </section>
              <section className="panel">
                <div className="cardhead">
                  <h2>Live recording</h2>
                  {badge(rec)}
                </div>
                <div className="graph">
                  Tissue tension · No validated signal available
                  <small>Time →</small>
                </div>
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
            <section className="card">
              <div className="cardhead">
                <h2>Preparation catalogue</h2>
                {badge("4 preparations")}
              </div>
              {catalog(true)}
              {detail && (
                <div className="panel">
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
                <h2>Compound catalogue</h2>
                <Pill />
              </div>
              {drugs.map((d) => (
                <button className="listitem" key={d} onClick={() => H(d)}>
                  <Pill size={17} />
                  <b className="grow left">{d}</b>
                  {badge("Awaiting evidence")}
                  <ChevronRight size={15} />
                </button>
              ))}
              {detail && (
                <div className="panel">
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
              <h2>Workspace preferences</h2>
              <p>
                Difficulty adjusts guidance, never biological parameters.
                Rendering preferences are stored for future engine support.
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
              <div className="mini">FOUNDATION RELEASE · 0.1.0</div>
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
            <FlaskConical size={13} /> PharmaLab <span> / </span> Local
            workspace <b>PHASE 01 · FOUNDATION</b>
          </footer>
        </article>
      </main>
      {msg && (
        <div role="status" className="toast">
          {msg}
          <button onClick={() => G("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div className="overlay">
          <form
            className="panel modal"
            onSubmit={async (e) => {
              e.preventDefault();
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
                D("");
              } catch {
                G("Could not update local record.");
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
              <button type="button" onClick={() => D("")}>
                Cancel
              </button>
              <button className="primary">
                {modal === "New experiment"
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
