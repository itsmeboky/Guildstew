// Dashed-border upload slot for portrait + avatar. Supports both rectangular
// (portrait, aspect-[3/4]) and round (avatar) variants. Verbatim from prototype.

import React from 'react';
import { Upload, Camera, Image as ImageIcon } from 'lucide-react';
import CornerBrackets from './CornerBrackets.jsx';

const PortraitUpload = ({ value, onChange, label, aspect = 'aspect-[3/4]', round = false }) => (
  <div className="space-y-2">
    <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block">{label}</label>
    <div
      onClick={() => onChange && onChange('placeholder')}
      className={`relative ${aspect} ${round ? 'rounded-full' : ''} bg-pf-bg-elev/50 border border-dashed border-pf-brass-dim/40 hover:border-pf-brass-dim flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group overflow-hidden`}
    >
      {!round && <CornerBrackets />}
      {value ? (
        <div className="flex flex-col items-center gap-2">
          <ImageIcon size={28} className="text-pf-brass" />
          <span className="font-body text-xs text-pf-parchment">Image uploaded</span>
        </div>
      ) : (
        <>
          {round ? <Camera size={22} className="text-pf-stone group-hover:text-pf-brass transition-colors" /> :
                   <Upload size={28} className="text-pf-stone group-hover:text-pf-brass transition-colors" />}
          {!round && <span className="font-display text-[10px] tracking-[0.2em] text-pf-stone uppercase">Upload</span>}
        </>
      )}
    </div>
  </div>
);

export default PortraitUpload;
