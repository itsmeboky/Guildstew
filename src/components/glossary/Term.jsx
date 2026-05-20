// Inline PF2e term renderer. Wraps a snippet of tip prose with the
// glossary-styled brass underline, a hover tooltip (short blurb), and
// an (ⓘ) icon that opens a popover with the full explanation.
//
// Usage:
//   <Term slug="trained">trained</Term>
//   <Term slug="reflex" />                  // falls back to entry.term
//
// Unknown slugs render the children as plain text and warn in dev.

import { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PF2E_GLOSSARY } from '@/game-packs/pf2e/content/glossary';
import TermPopover from './TermPopover';

export default function Term({ slug, children }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const entry = PF2E_GLOSSARY[slug];

  if (!entry) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`<Term slug="${slug}" /> — no glossary entry`);
    }
    return <span>{children}</span>;
  }

  const label = children ?? entry.term;

  return (
    <span className="inline-flex items-baseline gap-[2px] whitespace-nowrap align-baseline">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="text-pf-brass font-semibold border-b border-dotted border-pf-brass/50 cursor-help"
              tabIndex={0}
            >
              {label}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={4}
            className="max-w-xs bg-pf-bg-elev border border-pf-brass/40 text-pf-parchment text-xs leading-relaxed px-3 py-2 not-italic font-body normal-case tracking-normal"
          >
            <span className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1">
              {entry.term}
            </span>
            {entry.short}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="ml-[2px] text-pf-brass/60 hover:text-pf-brass focus:text-pf-brass transition-colors align-super leading-none focus:outline-none focus-visible:ring-1 focus-visible:ring-pf-brass/60 rounded-sm"
            aria-label={`Learn more about ${entry.term}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Info size={11} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={6}
          className="w-80 bg-pf-bg-card border border-pf-brass/40 text-pf-parchment p-4 not-italic font-body normal-case tracking-normal"
        >
          <TermPopover slug={slug} />
        </PopoverContent>
      </Popover>
    </span>
  );
}
