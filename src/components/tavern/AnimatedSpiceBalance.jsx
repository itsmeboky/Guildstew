import React, { useEffect, useRef, useState } from "react";
import { formatSpice } from "@/config/spiceConfig";
import { subscribeSpicePurchase } from "@/lib/spiceBalanceBus";

/**
 * Drop-in wrapper for any balance display that should react to the
 * post-purchase count-up animation. Renders the formatted balance via
 * a `children(text)` render-prop so the caller stays in control of
 * the surrounding layout / icon / color.
 *
 *   <AnimatedSpiceBalance balance={wallet.balance}>
 *     {(text) => <span>{text}</span>}
 *   </AnimatedSpiceBalance>
 *
 * When `notifySpicePurchase({ from, to })` fires elsewhere in the
 * app, every mounted instance smoothly counts from `from` to `to`
 * over ~1.5s with an ease-out cubic curve, then settles on `to`.
 * Once the animation finishes we trust the parent's `balance` prop
 * (which React Query refetches separately) for the steady state.
 */
const COUNT_DURATION_MS = 1500;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export default function AnimatedSpiceBalance({ balance = 0, children }) {
  const [display, setDisplay] = useState(balance);
  const animatingRef = useRef(false);

  // Steady-state: when not animating, mirror whatever the parent
  // hands us. Skipped while an animation is in progress so the
  // count-up isn't yanked by a refetch landing mid-animation.
  useEffect(() => {
    if (animatingRef.current) return;
    setDisplay(balance);
  }, [balance]);

  useEffect(() => {
    return subscribeSpicePurchase(({ from, to }) => {
      animatingRef.current = true;
      const start = performance.now();
      const delta = to - from;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / COUNT_DURATION_MS);
        const eased = easeOutCubic(t);
        setDisplay(Math.round(from + delta * eased));
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          animatingRef.current = false;
        }
      };
      requestAnimationFrame(tick);
    });
  }, []);

  const formatted = formatSpice(display);
  if (typeof children === "function") return children(formatted);
  return <span className="tabular-nums">{formatted}</span>;
}
