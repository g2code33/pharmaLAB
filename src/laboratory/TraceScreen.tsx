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
  const [cursor, select] = useState<number | null>(null);
  const last = points.at(-1)!,
    g = last.forceG !== null,
    unit = g ? "g" : "%",
    read = (p: Point) => p.forceG ?? 100 * p.relative;
  const inWindow = (p: Point) => p.s >= start && p.s <= start + span,
    rows = points.filter((p) => p.s >= recordFrom && inWindow(p)),
    overlay = reference.filter(inWindow);
  const ymax =
    Math.ceil(
      Math.max(g ? 1 : 100, ...rows.map(read), ...overlay.map(read)) /
        (g ? 1 : 25),
    ) * (g ? 1 : 25);
  const x = (s: number) => ((s - start) * 100) / span,
    y = (n: number) => 100 - (100 * n) / ymax,
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
            ? `ACh${q.commands?.length ? "" : ` ${q.nominalM.toExponential(1)} M`}`
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
    <div className="scope kymograph">
      <div className="paperHead">
        <b>
          {g ? "Isometric force (g) · assumed scale" : "Isometric response (%)"}
        </b>
        <span>
          {example ? "Illustrative protocol · simulated" : "Simulated · 1 Hz"}
        </span>
      </div>
      <div className="paperBody">
        <div className="yTicks">
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <span key={f}>{fmt(f * ymax)}</span>
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
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => (
          <span key={f}>{fmt(start + f * span)}</span>
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
      <div className="axisTime">Time (s)</div>
    </div>
  );
}
