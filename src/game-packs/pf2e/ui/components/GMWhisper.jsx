// "Helpful Tip" inline helper threaded through every step.
// tone='tip' shows a lightbulb, tone='warning' shows an alert icon.
// (Component name kept as GMWhisper to avoid a sweep of every import
// site — only the visible label was renamed.)

import React from 'react';
import { Lightbulb, AlertCircle } from 'lucide-react';

const GMWhisper = ({ children, tone = 'tip' }) => {
  const Icon = tone === 'warning' ? AlertCircle : Lightbulb;
  return (
    <div className="relative bg-pf-brass/5 border-l-2 border-pf-brass pl-4 pr-4 py-3 my-4">
      <div className="flex items-start gap-3">
        <Icon size={16} className="text-pf-brass shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase mb-1">Helpful Tip</p>
          <p className="font-body text-sm text-pf-parchment leading-relaxed italic">{children}</p>
        </div>
      </div>
    </div>
  );
};

export default GMWhisper;
