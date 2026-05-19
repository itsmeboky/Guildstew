// Visible-failure panel for lookups that miss the slug index. Better
// than the silent `|| CLASSES[0]` fallback that quietly switched the
// character onto a different class — this surfaces the bad slug, the
// kind of entity it belonged to, and what the data layer thinks is
// available so the user can report it instead of playing a broken
// character.

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import CornerBrackets from './CornerBrackets.jsx';

const UnknownEntityError = ({ kind, slug, available = [] }) => (
  <div className="relative bg-pf-bg-card border border-pf-oxblood p-6 my-4">
    <CornerBrackets active />
    <div className="flex items-start gap-3">
      <AlertTriangle className="text-pf-oxblood-glow shrink-0 mt-0.5" size={20} />
      <div className="flex-1 min-w-0">
        <p className="font-display text-[11px] tracking-[0.25em] text-pf-oxblood-glow uppercase mb-1">
          Couldn't load {kind}
        </p>
        <p className="font-body text-sm text-pf-bone mb-2">
          The {kind} <code className="font-mono text-pf-brass">"{slug || 'unset'}"</code> isn't in the imported data.
          This is likely a data-import or template-slug issue — please report it.
        </p>
        {available.length > 0 && (
          <details className="font-body text-[11px] text-pf-stone">
            <summary className="cursor-pointer hover:text-pf-parchment">
              Show available {kind} slugs ({available.length})
            </summary>
            <p className="font-mono mt-1 leading-relaxed">{available.join(', ')}</p>
          </details>
        )}
      </div>
    </div>
  </div>
);

export default UnknownEntityError;
