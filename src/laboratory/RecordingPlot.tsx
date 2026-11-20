import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
export type SessionClock = { elapsed: number; since: number | null };
/** A wall-clock cursor, not a sample generator. There are no tension values. */
export function RecordingPlot({
  clock,
  scale = "60 s",
}: {
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
        Awaiting validated signal
        <small>No physiological samples recorded</small>
      </span>
      <div className="timeTicks">
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n}>{offset + (n * seconds) / 4} s</span>
        ))}
      </div>
    </div>
  );
}
