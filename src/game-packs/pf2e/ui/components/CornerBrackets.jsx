// Decorative L-shaped corner brackets used on cards and upload slots.
// Verbatim from prototype.

import React from 'react';

const CornerBrackets = ({ active = false }) => (
  <>
    <span className={`absolute top-0 left-0 w-3 h-3 border-t border-l ${active ? 'border-pf-brass' : 'border-pf-brass-dim/40'}`} />
    <span className={`absolute top-0 right-0 w-3 h-3 border-t border-r ${active ? 'border-pf-brass' : 'border-pf-brass-dim/40'}`} />
    <span className={`absolute bottom-0 left-0 w-3 h-3 border-b border-l ${active ? 'border-pf-brass' : 'border-pf-brass-dim/40'}`} />
    <span className={`absolute bottom-0 right-0 w-3 h-3 border-b border-r ${active ? 'border-pf-brass' : 'border-pf-brass-dim/40'}`} />
  </>
);

export default CornerBrackets;
