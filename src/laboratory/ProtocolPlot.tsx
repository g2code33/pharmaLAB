const fmt = (x: number) => Number(x.toPrecision(4)).toString();
export function Plot({
  series,
  dots,
  yMin = 0,
  overlay,
  xMin,
  xMax,
  yMax,
  label,
  xLabel,
  mark,
}: {
  series: [number, number][];
  dots?: [number, number][];
  yMin?: number;
  overlay?: [number, number][];
  xMin: number;
  xMax: number;
  yMax: number;
  label: string;
  xLabel: string;
  mark?: [number, number];
}) {
  const x = (v: number) => 55 + (500 * (v - xMin)) / (xMax - xMin || 1),
    y = (v: number) => 155 - (130 * (v - yMin)) / (yMax - yMin || 1);
  const points = (rows: [number, number][]) =>
    rows
      .filter(([t]) => t >= xMin && t <= xMax)
      .map(([a, b]) => `${x(a).toFixed(2)},${y(b).toFixed(2)}`)
      .join(" ");
  return (
    <svg
      viewBox="0 0 585 200"
      width="100%"
      role="img"
      aria-label={label}
      className="protocolPlot"
    >
      <title>{label}</title>
      <g fill="currentColor" fontSize="11">
        <text x="4" y="14">
          {label}
        </text>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <path
              d={`M55 ${y(yMin + f * (yMax - yMin))}H555`}
              stroke="currentColor"
              opacity=".18"
            />
            <text x="49" y={y(yMin + f * (yMax - yMin)) + 4} textAnchor="end">
              {fmt(yMin + f * (yMax - yMin))}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={55 + 500 * f} y="173" textAnchor="middle">
            {fmt(xMin + (xMax - xMin) * f)}
          </text>
        ))}
        <text x="306" y="194" textAnchor="middle">
          {xLabel}
        </text>
      </g>
      {overlay && (
        <polyline
          points={points(overlay)}
          fill="none"
          stroke="#b58436"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
      )}
      <polyline
        points={points(series)}
        stroke="#278974"
        strokeWidth="2.5"
        fill="none"
      />
      {dots?.map(([a, b], i) => (
        <circle key={i} cx={x(a)} cy={y(b)} r="3" fill="#b58436">
          <title>
            {fmt(a)} : {fmt(b)}
          </title>
        </circle>
      ))}
      {mark && <circle cx={x(mark[0])} cy={y(mark[1])} r="4" fill="#b58436" />}
    </svg>
  );
}
