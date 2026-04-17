import React, { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

/**
 * Tracks whether the viewport is below the given breakpoint. Resizes
 * the state on window resize so flipping orientation on a tablet
 * flips the gate without a reload.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

/**
 * Blocks small viewports with a "use a computer" message. Wraps pages
 * that are too dense for phones (GMPanel / CampaignPlayerPanel).
 * Hooks live in this wrapper, not the wrapped page — swapping renders
 * is safe across hook-order rules.
 */
export function DesktopOnly({ children }) {
  const isMobile = useIsMobile();
  if (!isMobile) return <>{children}</>;
  return (
    <div className="min-h-screen bg-[#0f1219] flex flex-col items-center justify-center text-center px-6">
      <Monitor className="w-16 h-16 text-[#37F2D1] mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Desktop Required</h2>
      <p className="text-slate-400 max-w-sm">
        The GM and Player panels are designed for desktop screens. Please switch to a computer for the best experience.
      </p>
    </div>
  );
}
