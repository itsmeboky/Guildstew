import React from "react";
import { Info } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

/**
 * Compact ⓘ info icon with a hover popover. Used throughout the
 * character creator to add helpful copy at high-friction
 * decision points without disturbing the existing layout. Hover
 * to reveal — never auto-pops. Tap-to-toggle on touch via the
 * underlying Radix HoverCard.
 *
 * Props:
 *   children   tooltip body — string or JSX
 *   side       hover-card side (default "right")
 *   className  extra classes on the trigger
 *   width      override "w-72" default for longer copy
 */
export default function InfoTip({
  children,
  side = "right",
  className = "",
  width = "w-72",
}) {
  if (!children) return null;
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className={`inline-flex items-center justify-center text-slate-400 hover:text-[#37F2D1] transition ${className}`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="start"
        sideOffset={8}
        className={`${width} bg-[#1E2430] border border-[#37F2D1]/40 text-white p-3 text-xs leading-relaxed`}
      >
        {typeof children === "string" ? <p>{children}</p> : children}
      </HoverCardContent>
    </HoverCard>
  );
}
