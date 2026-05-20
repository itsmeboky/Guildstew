// Section header wrapper for every "Use Recommended" affordance. Bundles:
//   - The section's title + optional inline extra (slot counter etc.)
//   - The RecommendedButton, which renders even when disabled (so the
//     affordance is always discoverable — see RecommendedButton.jsx)
//   - An "applied" indicator that lights up once the user has clicked
//     the button, signaling that the section reflects the curated build
//   - A collapsible "Why these picks?" reasoning panel that explains
//     both *why* the recommendation is what it is and *what* the picks
//     do mechanically — content pulled from recommendedBuilds.js's
//     per-section `reasoning` field
//
// Pre-Priority-4 the recommendation reasoning lived in a transient
// toast that vanished after a few seconds. Players who wanted to
// review the reasoning later had to re-trigger apply. Now the
// reasoning is persistent next to the section it explains, the
// applied state is visible at a glance, and disabled sections still
// surface the affordance (dimmed) so players learn the feature exists
// before content lands for every class.

import React, { useState } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import RecommendedButton from './RecommendedButton.jsx';
import AnnotatedText from '@/components/glossary/AnnotatedText';

export default function RecommendationPanel({
  title,
  extra,                   // optional react node next to title (counter, etc)
  reasoning,               // string — the WHY + WHAT for this section
  onApply,
  disabled,                // true → button visible but inactive
  applied,                 // true → user clicked apply at some point
  buttonTitle,             // override the RecommendedButton tooltip
  className = '',
}) {
  // Default-expanded once a player has applied the recommendation so
  // they can re-read the reasoning right after the picks land.
  // Otherwise default-collapsed to keep section headers compact.
  const [open, setOpen] = useState(!!applied);

  return (
    <div className={`mb-2 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          <p className="font-display text-[11px] tracking-[0.2em] text-pf-brass uppercase">
            {title}
          </p>
          {extra && (
            <span className="text-pf-stone text-[10px] font-body italic normal-case tracking-normal">
              {extra}
            </span>
          )}
          {applied && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-pf-sage border border-pf-sage/40 bg-pf-sage/10">
              <CheckCircle2 size={9} />
              applied
            </span>
          )}
        </div>
        <RecommendedButton
          onClick={onApply}
          disabled={disabled}
          title={buttonTitle}
        />
      </div>

      {reasoning && (
        <details
          open={open}
          onToggle={(e) => setOpen(e.currentTarget.open)}
          className="bg-pf-bg-elev/40 border border-pf-brass-dim/20 px-3 py-1.5"
        >
          <summary className="cursor-pointer flex items-center gap-1.5 text-[10px] font-display tracking-wider uppercase text-pf-stone hover:text-pf-parchment select-none">
            <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
            Why these picks?
          </summary>
          <p className="font-body text-[11px] text-pf-parchment leading-relaxed mt-2 whitespace-pre-line">
            <AnnotatedText text={reasoning} />
          </p>
        </details>
      )}
    </div>
  );
}
