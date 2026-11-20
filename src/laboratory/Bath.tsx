import type { SimulationState } from "../simulation/core";
// Axonometric technical drawing; coordinates are illustrative, not a scale model.
export function Bath({ state }: { state: SimulationState }) {
  return (
    <svg
      viewBox="0 0 400 240"
      role="img"
      aria-label="Technical drawing of a jacketed organ bath, tissue mount and force transducer"
    >
      <defs>
        <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
          <path
            d="M18 0H0V18"
            fill="none"
            stroke="#94c6ac"
            opacity=".13"
            strokeWidth=".6"
          />
        </pattern>
      </defs>
      <rect width="400" height="240" fill="url(#grid)" />
      <g
        stroke="#a7cbb4"
        strokeWidth="1.25"
        fill="#254d42"
        strokeLinejoin="round"
      >
        <path d="m67 197 118 30 109-38-117-28z M67 197v5l118 31 109-39v-5 M185 227v6" />
        <path d="m104 194 12 3 12-4-12-3z" />
        <path d="M112 191V27q3-3 6 0v165q-3 3-6 0z" />
        <path d="m102 45 12 4 15-5v-8l-12-3-15 5z M102 38l12 4 15-6 M114 42v7" />
        <path d="m119 39 68-19 12 4-68 20z M131 44v5l68-20v-5" />
        <path d="m172 28 25-8 23 7-25 9z M172 28v14l23 8 25-9V27 M195 36v14" />
        <path d="M191 49v9l5 2 5-2V49 M196 60v50" />
        <g fill="#447364" fillOpacity=".38">
          <path d="M149 98v72c0 23 99 23 99 0V98" />
          <ellipse cx="198.5" cy="98" rx="49.5" ry="13" />
          <ellipse cx="198.5" cy="98" rx="40" ry="9" />
          <path d="M158 99v68c0 16 81 16 81 0V99" />
          <ellipse cx="198" cy="130" rx="39" ry="9" fill="#81bca1" />
          <path d="M159 131v36c0 14 79 14 79 0v-36" fill="#719d84" />
        </g>
        {state.mounted && (
          <path
            d="M195 111q-5 7-3 15l-3 11q1 5 5 3l4-15q4-9 0-14z"
            fill="#d4ba79"
            stroke="#e9d397"
          />
        )}
        <path d="m193 141-2 19 15 4V95" fill="none" />
        <path
          d="M149 152l-17 5v9l17-5 M247 112l14-4v7l-14 4 M211 166V96q0-9 8-11l22-6"
          fill="none"
        />
        <path d="m226 91 7-15 4 1-7 15z" />
        <path d="m153 183 0 9q45 20 91-1v-9" fill="none" />
      </g>
      <g stroke="#bed7a6" strokeWidth=".8" fill="none" strokeDasharray="3 3">
        <path d="m218 30 27-14h56 M234 117l42-28h25 M194 136l79 15h28" />
      </g>
      <g fill="#cadcc9" fontSize="8" fontFamily="monospace">
        <text x="305" y="19">
          TRANSDUCER
        </text>
        <text x="305" y="92">
          BATH CHAMBER
        </text>
        <text x="305" y="154">
          TISSUE MOUNT
        </text>
      </g>
    </svg>
  );
}
