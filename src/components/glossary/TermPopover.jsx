// Content of the glossary popover surfaced by <Term>'s (ⓘ) icon.
// Shows the term's full explanation plus clickable chips for related
// concepts. Clicking a chip swaps the popover to that related entry
// in place — no modal stacking, no losing the user's focus.

import { useState } from 'react';
import { PF2E_GLOSSARY } from '@/game-packs/pf2e/content/glossary';

function RelatedChip({ entry, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center px-2 py-0.5 mr-1.5 mb-1.5 text-xs rounded-sm bg-pf-brass/10 border border-pf-brass/40 text-pf-brass hover:bg-pf-brass/20 hover:border-pf-brass focus:outline-none focus-visible:ring-1 focus-visible:ring-pf-brass transition-colors"
    >
      {entry.term}
    </button>
  );
}

export default function TermPopover({ slug }) {
  const [activeSlug, setActiveSlug] = useState(slug);
  const entry = PF2E_GLOSSARY[activeSlug];

  if (!entry) {
    return (
      <p className="text-sm text-pf-stone italic">
        Glossary entry unavailable.
      </p>
    );
  }

  const relatedEntries = (entry.related || [])
    .map((relSlug) => ({ slug: relSlug, entry: PF2E_GLOSSARY[relSlug] }))
    .filter((r) => r.entry);

  return (
    <div>
      <header className="mb-2">
        <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-1">
          Glossary
        </p>
        <h3 className="font-display text-lg text-pf-bone leading-tight">
          {entry.term}
        </h3>
      </header>

      <p className="text-sm leading-relaxed text-pf-parchment">{entry.full}</p>

      {relatedEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-pf-brass-dim/30">
          <p className="font-display text-[9px] tracking-[0.25em] text-pf-stone uppercase mb-1.5">
            Related
          </p>
          <div className="flex flex-wrap">
            {relatedEntries.map(({ slug: relSlug, entry: relEntry }) => (
              <RelatedChip
                key={relSlug}
                entry={relEntry}
                onClick={() => setActiveSlug(relSlug)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
