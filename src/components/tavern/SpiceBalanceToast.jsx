import React, { useEffect, useMemo, useRef, useState } from "react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { formatSpice } from "@/config/spiceConfig";

/**
 * Animated Spice balance notification.
 *
 * Drops in for ~3 seconds after a successful purchase, counting up
 * from the pre-purchase balance to the new balance over ~1.5s via
 * requestAnimationFrame with an ease-out curve so the last digits
 * crawl. Self-dismisses; the parent just hands us `from` and `to`.
 *
 *   <SpiceBalanceToast from={500} to={1810} onDone={() => ...} />
 */
const COUNT_DURATION_MS  = 1500;
const VISIBLE_DURATION_MS = 3000;

// Ease-out so the count slows as it approaches the final number
// instead of snapping flat on the last frame.
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function SpiceBalanceToast({ from, to, onDone }) {
  const [display, setDisplay] = useState(from);
  const [phase, setPhase] = useState("entering"); // entering | holding | leaving
  const rafRef = useRef(null);

  // Animate the count independently of the fade-in/out transitions.
  useEffect(() => {
    const start = performance.now();
    const delta = to - from;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION_MS);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [from, to]);

  // Entering → hold for the visible window → leaving → done.
  useEffect(() => {
    const enter = setTimeout(() => setPhase("holding"), 40);
    const leave = setTimeout(() => setPhase("leaving"), VISIBLE_DURATION_MS);
    const done  = setTimeout(() => onDone?.(), VISIBLE_DURATION_MS + 400);
    return () => { clearTimeout(enter); clearTimeout(leave); clearTimeout(done); };
  }, [onDone]);

  const transform = useMemo(() => {
    if (phase === "entering") return "translateY(-16px)";
    if (phase === "leaving")  return "translateY(-8px)";
    return "translateY(0)";
  }, [phase]);

  const opacity = phase === "entering" ? 0 : phase === "leaving" ? 0 : 1;

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
      style={{ transform: `translateX(-50%) ${transform}`, opacity, transition: "opacity 300ms ease, transform 300ms ease" }}
    >
      <div className="pointer-events-auto inline-flex items-center gap-3 bg-gradient-to-br from-amber-500 to-orange-500 text-amber-950 rounded-full pl-4 pr-6 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)] border border-amber-300/60">
        <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
          <SpiceIcon size={24} color="#78350f" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Spice Balance</p>
          <p className="text-2xl font-black leading-tight tabular-nums">
            {formatSpice(display)}
          </p>
        </div>
      </div>
    </div>
  );
}
