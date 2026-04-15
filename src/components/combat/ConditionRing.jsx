import React from "react";
import { CONDITION_COLORS, CONDITIONS } from "@/components/combat/conditions";

/**
 * SVG text-path condition ring. One ring per active condition, stacked
 * as concentric circles around a portrait. The condition name arcs
 * along the top of its circle and slowly rotates; adjacent rings spin
 * in opposite directions so they're easy to distinguish.
 *
 *   - Max 4 rings on screen; overflow collapses to a +N badge
 *   - Hovering the overlay pauses rotation and opens a tooltip panel
 *     listing every active condition with its 5e description + rules
 *   - Designed to overlay a circular portrait; position: absolute
 *     inset-0 by default, so the parent just needs relative + rounded
 */
export default function ConditionRing({ conditions = [], size = 80 }) {
  const [hovered, setHovered] = React.useState(false);

  if (!conditions || conditions.length === 0) return null;

  const MAX_VISIBLE = 4;
  const visible = conditions.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, conditions.length - MAX_VISIBLE);

  // Ring geometry. Outer radius sits just inside the SVG viewBox so
  // the stroke isn't clipped. Each successive ring steps in by `step`.
  const step = 4;
  const outerRadius = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = size >= 72 ? 6.5 : size >= 56 ? 5.5 : 4.5;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{ pointerEvents: "auto" }}
      >
        {visible.map((condName, i) => {
          const color = CONDITION_COLORS[condName] || "#ffffff";
          const r = outerRadius - i * step;
          const pathId = `cond-ring-${i}-${condName.replace(/\s+/g, "-")}`;
          // Alternate rotation direction ring-by-ring.
          const direction = i % 2 === 0 ? "normal" : "reverse";
          // 20s per revolution feels subtle but alive. Stagger start
          // so multiple rings don't lock-step.
          const duration = 20 + i * 3;

          return (
            <g
              key={`${condName}-${i}`}
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                animation: `gs-spin ${duration}s linear infinite ${direction}`,
                animationPlayState: hovered ? "paused" : "running",
              }}
            >
              <defs>
                {/*
                  Arc path: starts at the top of the circle and sweeps
                  almost a full turn clockwise. The `0.01` offset on the
                  end point keeps SVG from short-circuiting into a zero-
                  length arc (which some renderers collapse entirely).
                */}
                <path
                  id={pathId}
                  d={`M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.01},${cy - r}`}
                  fill="none"
                />
              </defs>
              {/* Full faint ring — visible even where the text isn't. */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={1.6}
                opacity={0.35}
              />
              {/* Brighter arc behind the text for a "glow where the word is" effect. */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={0.6}
                opacity={0.85}
              />
              <text
                fill={color}
                fontSize={fontSize}
                fontWeight="bold"
                letterSpacing={2}
                opacity={0.95}
              >
                <textPath href={`#${pathId}`} startOffset="0%">
                  {condName.toUpperCase()}
                </textPath>
              </text>
            </g>
          );
        })}
      </svg>

      {/* Overflow badge */}
      {overflow > 0 && (
        <div
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-black/90 border border-white/40 text-white text-[9px] font-bold flex items-center justify-center"
          style={{ pointerEvents: "auto" }}
          title={conditions.slice(MAX_VISIBLE).join(", ")}
        >
          +{overflow}
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-[60] min-w-[220px] max-w-[280px] rounded-xl bg-[#050816]/97 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-3 text-left"
          style={{ pointerEvents: "auto" }}
        >
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">
            Active Conditions
          </div>
          <ul className="flex flex-col gap-2">
            {conditions.map((name) => {
              const cond = CONDITIONS[name];
              const color = CONDITION_COLORS[name] || "#ffffff";
              return (
                <li key={name} className="flex flex-col gap-0.5">
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color }}
                  >
                    {name}
                  </span>
                  {cond?.description && (
                    <span className="text-[11px] text-slate-300 leading-snug">
                      {cond.description}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
