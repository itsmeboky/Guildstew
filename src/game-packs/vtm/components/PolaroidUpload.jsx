// Polaroid-styled image uploader. A cream rectangle with a strip
// of "tape" across the top, a square photo well in the middle that
// opens a file picker, and a typewriter-font caption below.
//
// Upload behavior: PRODUCTION (Phase 4.3) replaces the prototype's
// FileReader → data-URL with a real Supabase upload to
// user-assets/{userId}/vtm-characters/{tempId}/{slot}.{ext}. The
// `onUpload` prop, if provided, runs the platform-style upload and
// hands the public URL to `onChange`; otherwise the legacy data-URL
// path stays in place so the component is still usable from
// previews (Storybook, design references).
//
// Scale + position adjuster (Phase polish-round-2): after upload,
// a pencil button on the photo well opens "adjust" mode — the image
// becomes drag-to-pan and a zoom slider appears across the bottom
// of the well. Mirrors the dnd5e creator's PortraitPanel/ProfilePanel
// pattern (src/components/characterCreator/IdentityStep.jsx ~1221+):
// drag updates {x,y} translation, slider updates 0.5–3× scale, both
// persist via `onPositionChange` / `onZoomChange` so the parent can
// stash them on the character record. Render-time consumers
// (CharacterLibrary left sidebar, VTM CharacterDetail token) apply
// the same `translate(...) scale(...)` to keep the framing consistent.

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, Pencil, Check, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { V } from '../theme/colors.js';

export default function PolaroidUpload({
  value, onChange, label, hint,
  rotate = 0, size = 200, tapeColor = '#c9b98e',
  onUpload, // async (file) => publicUrl
  position, zoom,
  onPositionChange, onZoomChange,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const dragRef = useRef(null); // { startX, startY, startPosX, startPosY }

  const pos = position || { x: 0, y: 0 };
  const z = zoom || 1;
  const hasTransform = position || zoom;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (onUpload) {
      setUploading(true);
      try {
        const url = await onUpload(file);
        if (url) onChange(url);
      } finally {
        setUploading(false);
      }
      return;
    }
    // Fallback: data-URL preview when no upload handler is wired.
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    if (!adjusting) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };
    const handleMove = (ev) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      onPositionChange?.({
        x: dragRef.current.startPosX + dx,
        y: dragRef.current.startPosY + dy,
      });
    };
    const handleUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const canAdjust = !!value && !!onPositionChange && !!onZoomChange;

  return (
    <div style={{
      background: '#f5ecda',
      padding: `${size * 0.07}px ${size * 0.07}px ${size * 0.27}px`,
      boxShadow: `0 14px 36px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)`,
      transform: `rotate(${rotate}deg)`, position: 'relative',
      transition: 'transform 0.3s ease',
    }}>
      <div style={{
        position: 'absolute', top: -12, left: '38%',
        width: size * 0.3, height: 22, background: tapeColor, opacity: 0.75,
        transform: 'rotate(-4deg)', boxShadow: `0 2px 4px rgba(0,0,0,0.4)`,
      }} />
      <div
        onClick={() => !uploading && !adjusting && !value && inputRef.current?.click()}
        style={{
          width: size, height: size * 1.2,
          background: value ? 'transparent' : '#1a0a14',
          border: `1px solid #3a2818`,
          cursor: adjusting ? 'move' : (value ? 'default' : (uploading ? 'wait' : 'pointer')),
          overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {value ? (
          <>
            <img
              src={value}
              alt={label}
              onMouseDown={handleMouseDown}
              draggable={false}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: hasTransform
                  ? `translate(${pos.x}px, ${pos.y}px) scale(${z})`
                  : 'none',
                transformOrigin: 'center center',
                animation: hasTransform ? 'none' : 'polaroidDevelop 1.2s ease-out',
                userSelect: 'none',
                pointerEvents: adjusting ? 'auto' : 'none',
              }}
            />
            {/* Adjust + remove buttons (only when not in adjust mode) */}
            {!adjusting && (
              <>
                {canAdjust && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAdjusting(true); }}
                    title="Adjust scale & position"
                    style={{
                      position: 'absolute', top: 6, right: 32,
                      background: V.gold, border: `1px solid ${V.goldDeep || V.gold}`,
                      color: '#1a1208', width: 22, height: 22, borderRadius: '50%',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Pencil size={11} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(null); }}
                  title="Remove image"
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: V.blood, border: `1px solid ${V.bloodBri}`,
                    color: V.textBri, width: 22, height: 22, borderRadius: '50%',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  <X size={11} />
                </button>
              </>
            )}
            {/* Adjust-mode overlay: drag instructions + zoom slider + done */}
            {adjusting && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: 6, left: 6, right: 6,
                  background: 'rgba(5, 8, 22, 0.85)',
                  borderRadius: 6, padding: '6px 8px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 9, color: V.textBri, letterSpacing: '0.05em',
                }}>
                  <Move size={9} />
                  <span>drag to pan</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ZoomOut size={9} style={{ color: V.textBri, flexShrink: 0 }} />
                  <Slider
                    value={[z]}
                    onValueChange={(v) => onZoomChange?.(v[0])}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <ZoomIn size={9} style={{ color: V.textBri, flexShrink: 0 }} />
                </div>
              </div>
            )}
            {adjusting && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAdjusting(false); }}
                title="Done"
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: V.cyan, border: `1px solid ${V.cyan}`,
                  color: '#04161b', width: 22, height: 22, borderRadius: '50%',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                <Check size={11} />
              </button>
            )}
          </>
        ) : uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#7a6440' }}>
            <Loader2 size={Math.max(20, size * 0.16)} className="animate-spin" />
            <span className="f-typewriter" style={{ fontSize: 11 }}>developing…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#7a6440' }}>
            <Camera size={Math.max(20, size * 0.16)} />
            <span className="f-typewriter" style={{ fontSize: 11 }}>{hint || 'click to upload'}</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      {label && (
        <div className="f-typewriter" style={{
          position: 'absolute', bottom: size * 0.06, left: 0, right: 0,
          textAlign: 'center', color: V.parchInk, fontSize: 13, padding: '0 6px',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
