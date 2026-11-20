import { useId, useRef, useEffect } from "react";
import type { SimulationState } from "../simulation/core";
/** Illustration only. The mounted specimen is never animated by the renderer. */
export function Bath({ state }: { state: SimulationState }) {
  const node = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = node.current;
    if (!svg) return;
    let visible = true;
    const update = () => {
      svg.dataset.paused = String(!visible || document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(svg);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const k = useId().replace(/:/g, "");
  const u = (n: string) => `url(#${k + n})`;
  return (
    <svg
      ref={node}
      className="bath-svg"
      viewBox="0 0 560 320"
      role="img"
      aria-label="Jacketed organ bath with resting tissue, force transducer, gas line, dosing port and temperature controller"
    >
      <defs>
        {[
          ["steel", ["#334640", "#a1b4ad", "#f0f1de", "#808f88", "#354b43"]],
          ["dark", ["#65776b", "#324a40", "#112b23"]],
          ["rim", ["#6b9585", "#c6ddc9", "#4d7769", "#d1e6d7", "#5d8473"]],
          ["glass", ["#7ecdb8", "#c5ebd4", "#548f7c", "#c7f1de", "#8fb9a9"]],
          ["solution", ["#75d8b7", "#31967b", "#72caaa"]],
          ["tissue", ["#af7560", "#f0bb89", "#c2856c"]],
          ["brass", ["#635637", "#e0cc89", "#a08655"]],
        ].map(([n, c]) => (
          <linearGradient key={n as string} id={k + n}>
            {(c as string[]).map((v, i) => (
              <stop
                key={i}
                offset={i / ((c as string[]).length - 1)}
                stopColor={v}
              />
            ))}
          </linearGradient>
        ))}
      </defs>
      <g fill="none" stroke="#aac4ac" opacity=".24" strokeWidth=".7">
        <ellipse cx="286" cy="265" rx="185" ry="40" strokeDasharray="3 6" />
        <path d="M76 270 325 188m-195 11 302 82" strokeDasharray="3 6" />
      </g>
      <g strokeLinejoin="round">
        <path d="m102 251 202 43 109-35-201-40z" fill="#08271f" opacity=".6" />
        <path d="m108 236 186 42 106-31-183-39z" fill="#9ea99b" />
        <path d="m108 236 186 42v12l-186-42z" fill="#57665e" />
        <path d="m294 278 106-31v12l-106 31z" fill="#304b40" />
        <path d="m115 237 178 39 97-28" fill="none" stroke="#dce2cd" />
        <path
          d="m125 250 11 3v5l-11-3zm159 36 11 2 9-3v5l-9 3-11-2zm95-32 10-3v5l-10 3z"
          fill="#192f26"
        />
        <ellipse cx="173" cy="238" rx="20" ry="6" fill="#4a5a50" />
        <path d="M155 231v6c0 7 36 8 36 0v-6z" fill={u("steel")} />
        <ellipse cx="173" cy="231" rx="18" ry="5" fill="#a8b5a7" />
        <path d="M167 33v198c0 4 11 4 11 0V33z" fill={u("steel")} />
        <ellipse cx="172.5" cy="33" rx="5.5" ry="2" fill="#e2e7d6" />
        <path d="m157 65 16 4 19-6V48l-17-4-18 6z" fill={u("dark")} />
        <path d="m157 50 16 4 19-6-17-4z" fill="#8b9c8e" />
        <path d="m172 55 79-21v7l-79 22z" fill={u("steel")} />
        <path d="m169 54 81-22 5 2-83 23z" fill="#c4ccc0" />
        <circle cx="162" cy="59" r="7" fill={u("dark")} stroke="#a8b8a8" />
        <circle cx="162" cy="59" r="3" fill="#263d32" />
        <path
          d="M245 34q-2-20-28-19c-35 2-25 28-46 23"
          fill="none"
          stroke="#7e9d88"
          strokeWidth="3"
        />
        <path d="m236 34 20-6 31 8-21 7z" fill="#a6b4a4" />
        <path d="m236 34 30 9v18l-30-9z" fill={u("dark")} />
        <path d="m266 43 21-7v18l-21 7z" fill="#405a4c" />
        <circle className="lamp" cx="244" cy="43" r="2" fill="#d9e997" />
        <path d="m255 57 10 3v7l-10-3z" fill={u("steel")} />
        <path d="M260 66v9q0 6 4 4t0-5" stroke="#bfd4c0" fill="none" />
        <path d="m263 79 0 75" stroke="#e0dcc6" strokeWidth="1.15" />
        <path d="M175 189l42-11 10 3-42 12z" fill="#b3b9a9" />
        <path d="m175 189 10 4 42-12v8l-42 12-10-4z" fill={u("dark")} />
        <path
          d="M214 112v100c0 22 109 22 109 0V112"
          fill={u("glass")}
          fillOpacity=".25"
          stroke="#a7caba"
          strokeWidth="1.8"
        />
        <ellipse
          cx="268.5"
          cy="112"
          rx="54.5"
          ry="14"
          fill="#8ab5a3"
          fillOpacity=".34"
          stroke="#c7ddd1"
          strokeWidth="2"
        />
        <ellipse
          cx="268.5"
          cy="112"
          rx="45.5"
          ry="10"
          fill="#244f41"
          stroke="#a4c3b2"
        />
        <path
          d="M223 113v93c0 17 91 17 91 0v-93"
          fill="none"
          stroke="#a5c6b4"
        />
        <path
          d="M224 146v60c0 14 89 15 89 0v-60"
          fill={u("solution")}
          opacity=".58"
        />
        <ellipse
          className="meniscus"
          cx="268.5"
          cy="146"
          rx="44.5"
          ry="9"
          fill="#83d5b2"
          fillOpacity=".56"
          stroke="#a8e0c7"
        />
        <path
          d="m263 146-1 11m-1 36-2 12 17 3v-99"
          fill="none"
          stroke="#cbd8bd"
          strokeWidth="1.5"
        />
        {state.mounted && (
          <path
            d="M261 155q4-4 6 1c3 7-1 12-1 18s-1 15-5 20q-3 2-5-1c0-7 4-12 3-19s-1-14 2-19z"
            fill={u("tissue")}
            stroke="#e4b58e"
            strokeWidth=".9"
          />
        )}
        <g fill="none" stroke="#c7eee0" opacity=".8">
          {[0, 1, 2, 3].map((i) => (
            <circle
              className={"bubble b" + i}
              key={i}
              cx={289 + (i % 2) * 4}
              cy={194 - i * 9}
              r={1.6 + (i % 2) * 0.5}
            />
          ))}
        </g>
        <path
          d="M219 122v80m4-69v29m94-40v84"
          fill="none"
          stroke="#e6f6e9"
          strokeWidth="2.5"
          opacity=".66"
        />
        <path
          d="M214 210c0 19 109 20 109 0v8c0 21-109 20-109 0z"
          fill={u("rim")}
        />
        <path
          d="M213 112c3 18 107 19 111 0v4c-1 20-110 18-111 0z"
          fill={u("rim")}
        />
        <path d="M214 185l-22 5m129-57 17-5" stroke="#b6d5c3" strokeWidth="8" />
        <path d="M214 185l-22 5m129-57 17-5" stroke="#608f7d" strokeWidth="4" />
        <path
          d="M192 190c-22 6-20 43 8 51s71 24 101 12"
          fill="none"
          stroke="#83ae95"
          strokeWidth="5"
        />
        <path
          d="M337 128c26-5 28 32 29 70"
          fill="none"
          stroke="#83ae95"
          strokeWidth="5"
        />
        <path
          d="M290 202v-70q-1-11 8-15l18-7"
          fill="none"
          stroke="#bbd0bd"
          strokeWidth="2.8"
        />
        <path d="m296 111 8-27 5 1-9 27z" fill={u("steel")} />
        <path d="m302 88 2-9 8 2-3 9z" fill={u("brass")} />
        <path d="m319 216 35-11 49 11-34 12z" fill="#bac1ad" />
        <path d="m319 216 50 12v30l-50-12z" fill="#909d8d" />
        <path d="m369 228 34-12v30l-34 12z" fill="#576a5b" />
        <path d="m325 223 20 5v9l-20-5z" fill="#234538" />
        <path d="m329 228 12 3" stroke="#d1cd85" />
        <ellipse
          cx="356"
          cy="239"
          rx="5"
          ry="6"
          fill="#394b3d"
          stroke="#d1d7c2"
        />
        <path d="m356 239 1-4" stroke="#e8d49c" />
        <path d="m375 237 20-6m-20 10 20-6m-20 10 20-6" stroke="#354f40" />
      </g>
      <g className="callouts" fill="none" stroke="#a9bb91" strokeWidth=".8">
        <path d="m285 44 21-16h42M312 157l25-19h35M258 179l-47 36h-55" />
        {[
          [285, 44],
          [312, 157],
          [258, 179],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="2" fill="#e1cb82" />
        ))}
      </g>
      <g fill="#d0ddc4" fontFamily="monospace" fontSize="8.5" letterSpacing="1">
        <text x="353" y="31">
          {state.relative === undefined
            ? "TRANSDUCER"
            : state.tension === null
              ? `${(state.relative * 100).toFixed(1)}% SIM`
              : `${state.tension.toFixed(2)} g SIM`}
        </text>
        <text x="378" y="141">
          BATH CHAMBER
        </text>
        <text x="80" y="218">
          TISSUE MOUNT
        </text>
      </g>
    </svg>
  );
}
