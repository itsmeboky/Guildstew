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

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { V } from '../theme/colors.js';

export default function PolaroidUpload({
  value, onChange, label, hint,
  rotate = 0, size = 200, tapeColor = '#c9b98e',
  onUpload, // async (file) => publicUrl
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

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
      <div onClick={() => !uploading && inputRef.current?.click()} style={{
        width: size, height: size * 1.2,
        background: value ? 'transparent' : '#1a0a14',
        border: `1px solid #3a2818`,
        cursor: uploading ? 'wait' : 'pointer',
        overflow: 'hidden', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {value ? (
          <>
            <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'polaroidDevelop 1.2s ease-out' }} />
            <button onClick={(e) => { e.stopPropagation(); onChange(null); }}
              style={{
                position: 'absolute', top: 6, right: 6,
                background: V.blood, border: `1px solid ${V.bloodBri}`,
                color: V.textBri, width: 22, height: 22, borderRadius: '50%',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <X size={11} />
            </button>
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
