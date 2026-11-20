import { useState } from "react";
import type { Point } from "../simulation/ach/protocol";
export const stamp = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const fmt = (n: number) => Number(n.toPrecision(4)).toString();
/** Chart paper only displays acquired samples. Cursor selection never interpolates a force. */
export function TraceScreen({
  points,
  reference,
  start,
  span,
  annotations,
  recordFrom,
  example,
  onExample,
}: {
  points: Point[];
  reference: Point[];
  start: number;
  span: number;
  annotations: { s: number; text: string }[];
  recordFrom: number;
  example: boolean;
  onExample: () => void;
}) {
  const [cursor, select] = useState<number | null>(example ? 2192 : null);
  const last = points.at(-1)!,
    g = last.forceG !== null,
    unit = g ? "g" : "%",
    read = (p: Point) => p.forceG ?? 100 * p.relative;
  const inWindow = (p: Point) => p.s >= start && p.s <= start + span,
    rows = points.filter((p) => p.s >= recordFrom && inWindow(p)),
    overlay = reference.filter(inWindow);
  const [gain, setGain] = useState(1);
  const ymin = g
    ? Math.min(points[0].forceG ?? 0, ...rows.map(read), ...overlay.map(read))
    : 0;
  const autoMax =
    Math.ceil(
      Math.max(g ? 1 : 100, ...rows.map(read), ...overlay.map(read)) /
        (g ? 1 : 25),
    ) * (g ? 1 : 25);
  const ymax =
    ymin + (example ? 2.25 : Math.max(g ? 0.25 : 25, autoMax - ymin)) / gain;
  const x = (s: number) => ((s - start) * 100) / span,
    y = (n: number) =>
      100 - 100 * Math.min(1, Math.max(0, (n - ymin) / (ymax - ymin))),
    path = (r: Point[]) => r.map((q) => `${x(q.s)},${y(read(q))}`).join(" ");
  const acquired = last.s > 0 && last.s >= recordFrom,
    selected =
      cursor !== null &&
      acquired &&
      cursor >= recordFrom &&
      cursor <= last.s &&
      inWindow(points[cursor])
        ? points[cursor]
        : null;
  // Label ticks in absolute seconds (e.g. 2150, 2160...), not percentages of the window.
  function ticks(lo: number, hi: number, step: number) {
    const out: number[] = [];
    for (let i = Math.ceil(lo / step); i <= Math.floor(hi / step); i++)
      out.push(i * step);
    return out;
  }
  const xt = ticks(start, start + span, Math.max(1, Math.round(span / 10))),
    step0 = (ymax - ymin) / 4,
    base = 10 ** Math.floor(Math.log10(step0)),
    ystep =
      [1, 2, 2.5, 5, 10].reduce((a, b) =>
        Math.abs(a - step0 / base) < Math.abs(b - step0 / base) ? a : b,
      ) * base,
    yt = ticks(ymin, ymax, ystep);
  const clipped =
    rows.some((q) => read(q) > ymax) || overlay.some((q) => read(q) > ymax);
  const events = new Map<number, string[]>();
  function mark(s: number, text: string) {
    if (s >= start && s <= start + span)
      events.set(s, [...(events.get(s) ?? []), text]);
  }
  for (const q of points) {
    for (const event of q.commands ?? (q.event ? [q.event] : [])) {
      mark(
        q.s,
        event === "wash"
          ? "Wash"
          : event.startsWith("add")
            ? `ACh${q.commands?.length ? "" : ` ${q.nominalM.toExponential(2)} M`}`
            : "Flush",
      );
    }
  }
  for (const a of annotations) mark(a.s, a.text);
  const lanes: number[] = [];
  const labels = Array.from(events)
    .sort(([a], [b]) => a - b)
    .map(([s, list]) => {
      const left = x(s),
        label = list.length > 1 ? `${list[0]} +${list.length - 1}` : list[0];
      let lane = lanes.findIndex((v) => v <= left);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = left + 18;
      return { s, left, lane, label, title: `${s} s · ${list.join(" · ")}` };
    });
  return (
    <div className="scope kymograph stripChart">
      <div className="paperHead">
        <b>
          {g ? "Isometric force (g) · assumed scale" : "Isometric response (%)"}
        </b>
        <span>
          {example ? "Example only · assumed gram scale" : "Simulated · 1 Hz"}
        </span>
      </div>
      <div className="paperBody">
        <div className="scaleKeys">
          <button
            aria-label="Increase vertical gain"
            title="Increase vertical gain"
            disabled={gain >= 8}
            onClick={() => setGain(gain * 2)}
          >
            +
          </button>
          <button
            aria-label="Decrease vertical gain"
            title="Decrease vertical gain"
            disabled={gain <= 0.125}
            onClick={() => setGain(gain / 2)}
          >
            −
          </button>
        </div>
        <div className="yTicks">
          {yt.map((v) => (
            <span key={v} style={{ top: `${y(v)}%` }}>
              {fmt(v)}
            </span>
          ))}
        </div>
        <div
          className="graticule"
          role="group"
          tabIndex={0}
          aria-label="Trace inspection: point at a sample or use left and right arrows"
          onPointerMove={(e) => {
            if (!acquired || !rows.length) return;
            const b = e.currentTarget.getBoundingClientRect(),
              s = Math.round(start + (span * (e.clientX - b.left)) / b.width);
            select(s >= rows[0].s && s <= rows.at(-1)!.s ? s : null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              select(null);
              return;
            }
            if (
              !["ArrowLeft", "ArrowRight"].includes(e.key) ||
              !rows.length ||
              !acquired
            )
              return;
            e.preventDefault();
            select(
              Math.max(
                rows[0].s,
                Math.min(
                  rows.at(-1)!.s,
                  (selected?.s ?? rows[0].s) + (e.key === "ArrowLeft" ? -1 : 1),
                ),
              ),
            );
          }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            aria-label="Kymograph tracing versus virtual seconds"
          >
            <g className="stripRules">
              {xt.map((v) => (
                <line key={"t" + v} x1={x(v)} x2={x(v)} y1="0" y2="100" />
              ))}
              {yt.map((v) => (
                <line key={"f" + v} x1="0" x2="100" y1={y(v)} y2={y(v)} />
              ))}
            </g>
            {overlay.length > 0 && (
              <polyline
                points={path(overlay)}
                stroke="#af8a38"
                strokeDasharray="5 3"
              />
            )}
            {acquired && <polyline className="inkTrace" points={path(rows)} />}
          </svg>
          {selected && (
            <div className="paperCursor" style={{ left: `${x(selected.s)}%` }}>
              <i style={{ top: `${y(read(selected))}%` }} />
              <output className={x(selected.s) > 65 ? "flip" : ""}>
                {selected.s} s · {fmt(read(selected))} {unit}
              </output>
            </div>
          )}
          {!acquired && (
            <div className="scopeEmpty">
              <b>Ready to record</b>
              <small>
                {recordFrom
                  ? `Acquisition starts at ${recordFrom} s.`
                  : "Add ACh and press Record to see your tracing."}
              </small>
              {!last.s && (
                <button onClick={onExample}>View example tracing →</button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="xTicks">
        {xt.map((v, i) => (
          <span
            key={v}
            className={i % 2 ? "minorTick" : ""}
            style={{ left: `${x(v)}%` }}
          >
            {fmt(v)}
          </span>
        ))}
      </div>
      <div
        className="paperEvents"
        aria-label="Timeline events"
        style={{ height: `${Math.min(3, Math.max(1, lanes.length)) * 20}px` }}
      >
        {labels.map((m) => (
          <span
            key={m.s}
            className="scopeMark"
            title={m.title}
            style={{
              left: `${m.left}%`,
              top: 20 * m.lane,
              transform: m.left > 85 ? "translateX(-100%)" : undefined,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div className="axisTime">
        Time (s){clipped && <span> · Peaks exceed display range</span>}
      </div>
    </div>
  );
}
