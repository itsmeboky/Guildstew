import React from 'react';

/**
 * Combat portrait with HP-based visual state.
 *
 * Three states are derived from current / max HP:
 *   - healthy  (>50% HP)          → unchanged portrait
 *   - bloodied (<=50% HP, >0)     → red splatter overlay (custom
 *                                   bloodied portrait if provided)
 *   - dead     (<=0 HP)           → greyscale + skull
 *
 * Props:
 *   url             — primary portrait URL
 *   bloodiedUrl     — optional alternate image used below the
 *                     splatter overlay when the character is
 *                     bloodied
 *   current, max    — HP values (numeric, nullable)
 *   alt, className  — pass-through
 *   skullSize       — visual size class for the death skull
 *                     ('sm' | 'md' | 'lg'); default 'md'
 *   overlayOpacity  — 0..1, default 0.6
 */
export default function PortraitWithState({
  url,
  bloodiedUrl,
  current,
  max,
  alt = '',
  className = '',
  fallback = null,
  skullSize = 'md',
  overlayOpacity = 0.6,
}) {
  const cur = Number(current ?? 0);
  const mx  = Number(max ?? 0);
  const pct = mx > 0 ? (cur / mx) * 100 : 100;
  const state = cur <= 0 ? 'dead' : pct <= 50 ? 'bloodied' : 'healthy';
  const src = state === 'bloodied' && bloodiedUrl ? bloodiedUrl : url;

  const skullClass =
    skullSize === 'sm' ? 'text-2xl' :
    skullSize === 'lg' ? 'text-6xl' : 'text-4xl';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover object-top transition-[filter] duration-300 ${
            state === 'dead' ? 'grayscale' : ''
          }`}
          draggable={false}
        />
      ) : (
        <div className={`w-full h-full ${state === 'dead' ? 'grayscale' : ''}`}>
          {fallback}
        </div>
      )}

      {state === 'bloodied' && (
        <div
          className="absolute inset-0 pointer-events-none bloodied-overlay"
          style={{
            opacity: overlayOpacity,
            mixBlendMode: 'multiply',
            // If the user has dropped a bloodied-overlay.png into
            // /public/assets/overlays/ the CSS below uses it;
            // otherwise the radial-gradient fallback still reads
            // as a bloody splatter so there's no dead art slot.
            backgroundImage:
              "url('/assets/overlays/bloodied-overlay.png'), " +
              "radial-gradient(circle at 30% 70%, rgba(139, 0, 0, 0.55) 0%, transparent 50%), " +
              "radial-gradient(circle at 70% 30%, rgba(180, 0, 0, 0.5) 0%, transparent 40%), " +
              "radial-gradient(circle at 50% 50%, rgba(120, 0, 0, 0.35) 0%, transparent 60%)",
            backgroundSize: 'cover, cover, cover, cover',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {state === 'dead' && (
        <>
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`${skullClass} drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]`}>💀</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Utility version for callers that already have HP values elsewhere
 * and just want to know the state string.
 */
export function portraitStateOf(current, max) {
  const cur = Number(current ?? 0);
  const mx  = Number(max ?? 0);
  const pct = mx > 0 ? (cur / mx) * 100 : 100;
  if (cur <= 0) return 'dead';
  if (pct <= 50) return 'bloodied';
  return 'healthy';
}
