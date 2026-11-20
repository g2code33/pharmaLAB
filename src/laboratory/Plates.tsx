// Small original atlas plates; reference motifs, not scientific datasets.
export function Plate({ kind }: { kind: number }) {
  return (
    <svg
      aria-hidden="true"
      className="plate"
      viewBox="0 0 150 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 0 ? (
        <g transform="rotate(-18 78 40)">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${32 + i * 4} ${56 + i * 2} C12 19 54 5 70 20 S87 56 112 30 Q123 18 119 12 M${32 + i * 4} ${56 + i * 2} C38 73 55 69 63 56 S74 30 82 44 S96 74 116 59`}
            />
          ))}
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={`M${36 + i * 2} ${26 - Math.sin(i / 4) * 7}l3 4`}
            />
          ))}
        </g>
      ) : kind === 1 ? (
        <g>
          {[
            [39, 37],
            [74, 37],
            [91.5, 58],
          ].map(([x, y]) => (
            <path key={x} d={`M${x} ${y - 15}l17 8v16l-17 9-17-9v-16z`} />
          ))}
          <path d="m56 30 0 12m24-14 9 4m7 16 10 6m-84-24-12-7m82 7 16-9 16 8m-16-8v-12m-87 38-10 8" />
          {[
            [10, 23],
            [108, 8],
            [125, 30],
            [10, 55],
          ].map(([x, y]) => (
            <circle key={x + y} cx={x} cy={y} r="3" />
          ))}
        </g>
      ) : (
        <g transform="rotate(-12 75 40)">
          <path d="m37 11 62 2 13 10-1 48-73-4z M98 13v12l14-2 M38 68l-5-4-1-48 5-4 M46 24l35 1m-35 7 48 2m-48 7 40 1m-40 8 24 1m-24 8 38 1" />
          <path d="m86 53 26-28 4 4-25 28-8 4z" />
        </g>
      )}
    </svg>
  );
}
