import type { Run } from "../simulation/ach/run";
import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
export type SessionClock = { elapsed: number; since: number | null };
/** A wall-clock cursor, not a sample generator. There are no tension values. */
export function RecordingPlot({
  clock,
  run,
  scale = "60 s",
}: {
  run?: Run;
  clock?: SessionClock;
  scale?: string;
}) {
  const [now, T] = useState(() => performance.now());
  useEffect(() => {
    if (clock?.since == null) return;
    let timer: number | undefined;
    const sync = () => {
      window.clearInterval(timer);
      if (!document.hidden) {
        T(performance.now());
        timer = window.setInterval(() => T(performance.now()), 1000);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [clock?.since]);
  const t = Math.floor(
      ((clock?.elapsed || 0) +
        (clock?.since != null ? Math.max(0, now - clock.since) : 0)) /
        1000,
    ),
    seconds = parseInt(scale) || 60,
    offset = t - (t % seconds);
  return (
    <>
      {" "}
      <div className={"graph " + (clock?.since != null ? "recording" : "")}>
        <span className="axisY">Tissue tension · uncalibrated</span>
        {clock && (
          <>
            <div className="cursorTrack">
              <i style={{ left: `${(100 * (t % seconds)) / seconds}%` }} />
            </div>
            <span className="timeRead">SESSION TIME / {t} s</span>
          </>
        )}
        <span className="signalEmpty">
          <Activity size={22} />
          {run?.results.signal == null
            ? "Awaiting validated signal"
            : `${run.results.signal} display units`}
          <small>No physiological samples recorded</small>
        </span>
        <div className="timeTicks">
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n}>{offset + (n * seconds) / 4} s</span>
          ))}
        </div>
      </div>
      {run && <BathReadout run={run} />}
    </>
  );
}

function BathReadout({ run }: { run: Run }) {
  const events = run.history.filter(
    (e) => e.kind === "add" || e.kind === "wash",
  );
  if (!events.length) return null;
  const levels = [0, ...events.map((e) => e.nominalM)];
  const max = levels.reduce((a, b) => Math.max(a, b), 0);
  const path = levels
    .map(
      (v, i) =>
        `${i ? "H" : "M"}${10 + (i * 280) / (levels.length - 1)}${i ? "V" : " "}${75 - (60 * v) / (max || 1)}`,
    )
    .join(" ");
  return (
    <figure aria-label="Calculated nominal ACh concentration by administration event">
      <figcaption>
        Nominal bath concentration · calculated, not force
      </figcaption>
      <svg
        viewBox="0 0 300 85"
        width="100%"
        height="85"
        role="img"
        aria-label={`Event 0 to ${events.length}; range 0 to ${max} molar`}
      >
        <path d={path} stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
      <small>
        Event 0 → {events.length} · maximum {(max * 1e6).toPrecision(4)} µM
      </small>
    </figure>
  );
}
