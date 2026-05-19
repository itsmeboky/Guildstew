// Visible-failure panel for characters whose `game_pack` field
// doesn't resolve to a registered pack. Same shape as the PF2e
// creator's UnknownEntityError — surfaces the bad slug, the list of
// valid slugs, and an optional reason string. Better than the
// previous behavior of silently rendering D&D 5e UI for every
// character regardless of system.

import React from "react";
import { AlertTriangle } from "lucide-react";

export default function UnknownGamePackError({ slug, validSlugs = [], reason }) {
  return (
    <div className="relative bg-[#1E2430] border border-pf-oxblood p-6 my-4 rounded">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-pf-oxblood-glow shrink-0 mt-0.5" size={20} />
        <div className="flex-1 min-w-0">
          <p className="font-display text-[11px] tracking-[0.25em] text-pf-oxblood-glow uppercase mb-1">
            Couldn't load character sheet
          </p>
          <p className="font-body text-sm text-pf-bone mb-2">
            The game pack <code className="font-mono text-pf-brass">"{slug || "unset"}"</code> isn't
            registered. This is likely a data-import or registry-config issue — please report it.
          </p>
          {reason && (
            <p className="font-body text-xs text-pf-stone italic mb-2">{reason}</p>
          )}
          {validSlugs.length > 0 && (
            <details className="font-body text-[11px] text-pf-stone">
              <summary className="cursor-pointer hover:text-pf-parchment">
                Show registered pack slugs ({validSlugs.length})
              </summary>
              <p className="font-mono mt-1 leading-relaxed">{validSlugs.join(", ")}</p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
