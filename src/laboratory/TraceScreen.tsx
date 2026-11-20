import { Activity } from "lucide-react";
import type { Point } from "../simulation/ach/protocol";
export const stamp = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
/** The graticule is instrument chrome. Only acquired engine samples enter the trace. */
export function TraceScreen({
  points,
  reference,
  start,
  span,
  annotations,
  recordFrom,
}: {
  points: Point[];
  reference: Point[];
  start: number;
  span: number;
  recordFrom: number;
  annotations: { s: number; text: string }[];
}) {
  const last = points.at(-1)!,
    g = last.forceG !== null,
    read = (q: Point) => q.forceG ?? q.relative * 100,
    max =
      Math.ceil(
        Math.max(g ? 1 : 100, ...points.map(read), ...reference.map(read)) /
          (g ? 1 : 25),
      ) * (g ? 1 : 25),
    x = (s: number) => (100 * (s - start)) / span,
    y = (v: number) => 100 - (100 * v) / max;
  const path = (rows: Point[]) =>
    rows
      .filter((q) => q.s >= start && q.s <= start + span)
      .map((q) => `${x(q.s)},${y(read(q))}`)
      .join(" ");
  const marks = [
    ...points
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
            ? "Wash"
            : q.event.startsWith("add")
              ? "ACh"
              : "Flush",
      })),
    ...annotations,
  ];
  return (
    <div className="scope">
      <div className="scopeUnit">
        {g ? "Total force (g) · assumed scale" : "Relative response (%)"}
      </div>
      <div className="yTicks">
        {[1, 0.75, 0.5, 0.25, 0].map((i) => (
          <span key={i}>{Number((max * i).toPrecision(3))}</span>
        ))}
      </div>
      <div className="graticule">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label="Simulated recording versus virtual time"
        >
          {reference.length > 0 && (
            <polyline
              points={path(reference)}
              fill="none"
              stroke="#bb923f"
              strokeDasharray="5 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {last.s > 0 && last.s >= recordFrom && (
            <polyline
              points={path(points.slice(recordFrom))}
              fill="none"
              stroke="#168570"
              strokeWidth="2.2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {marks
          .filter((q) => q.s >= start && q.s <= start + span)
          .map((q, i) => (
            <span
              key={i}
              title={`${stamp(q.s)} · ${q.text}`}
              className="scopeMark"
              style={{ left: `${Math.min(97, x(q.s))}%` }}
            >
              {q.text}
            </span>
          ))}
        {(!last.s || last.s < recordFrom) && (
          <div className="scopeEmpty">
            <span>
              <Activity size={24} />
            </span>
            <b>Awaiting recording</b>
            <small>
              {recordFrom > 0
                ? `Acquisition starts at ${recordFrom} s.`
                : "Press Record to begin acquiring samples."}
            </small>
          </div>
        )}
      </div>
      <div className="xTicks">
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((i) => (
          <span key={i}>{Math.round(start + span * i)}</span>
        ))}
      </div>
      <div className="axisTime">Time (s)</div>
    </div>
  );
}
