// God Banner Builder — inline heraldry creator for deity-creation flow.
// Same builder Guildstew uses for guild crests, scoped here for the PF2e
// deity modal. Verbatim from the prototype, plus the BANNER_* constants
// and the co-located ShapePath helper.

import React, { useState } from 'react';
import {
  Sword, Shield, Sun, Moon, Star, Flame, Leaf, Skull,
  Anchor, Hammer, Key, Crown, Mountain, Waves, Feather, Eye,
  Heart, Zap, Hexagon, Diamond,
} from 'lucide-react';
import CornerBrackets from './CornerBrackets.jsx';

export const BANNER_SHAPES = ['shield', 'circle', 'hex', 'banner'];
export const BANNER_PATTERNS = ['solid', 'halved-v', 'halved-h', 'quartered', 'diagonal'];
export const BANNER_SYMBOLS = [
  { id: 'sword', icon: Sword }, { id: 'shield', icon: Shield },
  { id: 'sun', icon: Sun }, { id: 'moon', icon: Moon },
  { id: 'star', icon: Star }, { id: 'flame', icon: Flame },
  { id: 'leaf', icon: Leaf }, { id: 'skull', icon: Skull },
  { id: 'anchor', icon: Anchor }, { id: 'hammer', icon: Hammer },
  { id: 'key', icon: Key }, { id: 'crown', icon: Crown },
  { id: 'mountain', icon: Mountain }, { id: 'waves', icon: Waves },
  { id: 'feather', icon: Feather }, { id: 'eye', icon: Eye },
  { id: 'heart', icon: Heart }, { id: 'zap', icon: Zap },
  { id: 'hex', icon: Hexagon }, { id: 'diamond', icon: Diamond },
];

export const DEFAULT_BANNER = {
  shape: 'shield', pattern: 'halved-v',
  primary: '#9B1D26', secondary: '#C9A961', symbolColor: '#F5EFE0',
  symbol: 'sun',
};

const ShapePath = ({ shape, primary, secondary, pattern }) => {
  // Path data for each shape, with masking via SVG defs
  const W = 100, H = 120;
  let clipPath = '';
  switch (shape) {
    case 'shield': clipPath = `M 50 10 L 90 25 L 90 70 Q 90 105 50 115 Q 10 105 10 70 L 10 25 Z`; break;
    case 'circle': clipPath = `M 50 60 m -45 0 a 45 45 0 1 0 90 0 a 45 45 0 1 0 -90 0`; break;
    case 'hex':    clipPath = `M 50 10 L 90 35 L 90 85 L 50 110 L 10 85 L 10 35 Z`; break;
    case 'banner': clipPath = `M 15 10 L 85 10 L 85 95 L 50 115 L 15 95 Z`; break;
    default: clipPath = `M 10 10 H 90 V 110 H 10 Z`;
  }

  // Build pattern fills
  const renderPattern = () => {
    switch (pattern) {
      case 'solid':
        return <rect x="0" y="0" width={W} height={H} fill={primary} />;
      case 'halved-v':
        return <>
          <rect x="0" y="0" width={W / 2} height={H} fill={primary} />
          <rect x={W / 2} y="0" width={W / 2} height={H} fill={secondary} />
        </>;
      case 'halved-h':
        return <>
          <rect x="0" y="0" width={W} height={H / 2} fill={primary} />
          <rect x="0" y={H / 2} width={W} height={H / 2} fill={secondary} />
        </>;
      case 'quartered':
        return <>
          <rect x="0" y="0" width={W / 2} height={H / 2} fill={primary} />
          <rect x={W / 2} y={H / 2} width={W / 2} height={H / 2} fill={primary} />
          <rect x={W / 2} y="0" width={W / 2} height={H / 2} fill={secondary} />
          <rect x="0" y={H / 2} width={W / 2} height={H / 2} fill={secondary} />
        </>;
      case 'diagonal':
        return <>
          <rect x="0" y="0" width={W} height={H} fill={primary} />
          <polygon points={`0,0 ${W},0 ${W},${H}`} fill={secondary} />
        </>;
      default:
        return <rect x="0" y="0" width={W} height={H} fill={primary} />;
    }
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <clipPath id={`clip-${shape}`}>
          <path d={clipPath} />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${shape})`}>{renderPattern()}</g>
      <path d={clipPath} fill="none" stroke="#C9A961" strokeWidth="1.5" />
    </svg>
  );
};

export { ShapePath };

const GodBannerBuilder = ({ banner, onChange }) => {
  const [tab, setTab] = useState('shape'); // shape | pattern | colors | symbol

  const update = (patch) => onChange({ ...banner, ...patch });
  const SymbolIcon = BANNER_SYMBOLS.find(s => s.id === banner.symbol)?.icon || Sun;

  return (
    <div className="relative bg-pf-bg-card border border-pf-brass-dim/40 p-5">
      <CornerBrackets active />
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase">Holy Symbol</p>
          <h4 className="font-display text-lg text-pf-bone">God Banner</h4>
        </div>
        <p className="text-[10px] text-pf-stone font-body italic">Same builder as guild crests.</p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Live preview */}
        <div className="col-span-12 md:col-span-4">
          <div className="aspect-square bg-pf-bg-elev/50 border border-pf-brass-dim/30 p-4 flex items-center justify-center relative">
            <div className="relative w-full h-full max-w-[160px]">
              <ShapePath shape={banner.shape} primary={banner.primary} secondary={banner.secondary} pattern={banner.pattern} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <SymbolIcon size={48} color={banner.symbolColor} strokeWidth={1.8} />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-pf-stone font-body text-center mt-2 italic">Live preview</p>
        </div>

        {/* Controls */}
        <div className="col-span-12 md:col-span-8">
          {/* Tab bar */}
          <div className="flex border-b border-pf-brass-dim/30 mb-3">
            {[
              { k: 'shape', label: 'Frame' },
              { k: 'pattern', label: 'Pattern' },
              { k: 'colors', label: 'Colors' },
              { k: 'symbol', label: 'Symbol' },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex-1 py-2 font-display text-[10px] tracking-[0.2em] uppercase transition-all border-b-2
                            ${tab === t.k ? 'border-pf-brass text-pf-bone' : 'border-transparent text-pf-stone hover:text-pf-parchment'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'shape' && (
            <div className="grid grid-cols-4 gap-2">
              {BANNER_SHAPES.map(s => (
                <button
                  key={s}
                  onClick={() => update({ shape: s })}
                  className={`aspect-square bg-pf-bg-elev/60 border p-3 transition-all
                              ${banner.shape === s ? 'border-pf-brass bg-pf-brass/10' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                >
                  <div className="w-full h-full">
                    <ShapePath shape={s} primary={banner.primary} secondary={banner.secondary} pattern={banner.pattern} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === 'pattern' && (
            <div className="grid grid-cols-5 gap-2">
              {BANNER_PATTERNS.map(p => (
                <button
                  key={p}
                  onClick={() => update({ pattern: p })}
                  className={`aspect-square bg-pf-bg-elev/60 border p-2 transition-all
                              ${banner.pattern === p ? 'border-pf-brass bg-pf-brass/10' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim'}`}
                >
                  <div className="w-full h-full">
                    <ShapePath shape={banner.shape} primary={banner.primary} secondary={banner.secondary} pattern={p} />
                  </div>
                  <p className="text-[9px] font-mono text-pf-stone uppercase mt-1">{p.replace('-', ' ')}</p>
                </button>
              ))}
            </div>
          )}

          {tab === 'colors' && (
            <div className="space-y-3">
              <div>
                <label className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase block mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={banner.primary} onChange={e => update({ primary: e.target.value })}
                         className="w-12 h-12 bg-transparent border border-pf-brass-dim/30 cursor-pointer" />
                  <span className="font-mono text-xs text-pf-stone">{banner.primary}</span>
                </div>
              </div>
              <div>
                <label className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase block mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={banner.secondary} onChange={e => update({ secondary: e.target.value })}
                         className="w-12 h-12 bg-transparent border border-pf-brass-dim/30 cursor-pointer" />
                  <span className="font-mono text-xs text-pf-stone">{banner.secondary}</span>
                </div>
              </div>
              <div>
                <label className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase block mb-2">Symbol Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={banner.symbolColor} onChange={e => update({ symbolColor: e.target.value })}
                         className="w-12 h-12 bg-transparent border border-pf-brass-dim/30 cursor-pointer" />
                  <span className="font-mono text-xs text-pf-stone">{banner.symbolColor}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'symbol' && (
            <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
              {BANNER_SYMBOLS.map(sym => {
                const SI = sym.icon;
                const active = banner.symbol === sym.id;
                return (
                  <button
                    key={sym.id}
                    onClick={() => update({ symbol: sym.id })}
                    className={`aspect-square flex items-center justify-center border transition-all
                                ${active ? 'border-pf-brass bg-pf-brass/10' : 'border-pf-brass-dim/30 hover:border-pf-brass-dim bg-pf-bg-elev/60'}`}
                  >
                    <SI size={22} className={active ? 'text-pf-brass' : 'text-pf-parchment'} strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GodBannerBuilder;
