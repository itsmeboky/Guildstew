// Touchstone polaroid — image upload + three editable fields
// (name, who-they-are, conviction). The uploaded photo always
// renders in B&W to match the V5 photo-wall aesthetic. Like
// PolaroidUpload, an `onUploadImage` prop runs the platform
// Supabase upload and stores the resulting URL on the touchstone
// row; without it the component falls back to a FileReader
// data-URL preview.

import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { V } from '../theme/colors.js';

export default function PolaroidCard({ idx, ts, onUpdate, onRemove, rotate, onUploadImage }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    if (onUploadImage) {
      setUploading(true);
      try {
        const url = await onUploadImage(file, idx);
        if (url) onUpdate('image', url);
      } finally {
        setUploading(false);
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onUpdate('image', ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      background: '#f5ecda', padding: '16px 16px 70px',
      boxShadow: `0 16px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.5)`,
      transform: `rotate(${rotate}deg)`, position: 'relative', minHeight: 360,
    }}>
      <div style={{
        position: 'absolute', top: -14, left: '35%',
        width: 60, height: 24, background: '#c41e3a', opacity: 0.7,
        transform: 'rotate(-4deg)', boxShadow: `0 2px 4px rgba(0,0,0,0.4)`,
      }} />
      <button onClick={onRemove}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: V.blood, border: `1px solid ${V.bloodBri}`,
          color: V.textBri, width: 22, height: 22, borderRadius: '50%',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}>
        <X size={11} />
      </button>

      <div onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          width: '100%', aspectRatio: '1/1', marginBottom: 14,
          background: '#1a0a14', border: `1px solid #3a2818`,
          cursor: uploading ? 'wait' : 'pointer', overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {ts.image ? (
          <>
            <img src={ts.image} alt="touchstone"
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'grayscale(1) contrast(1.05) brightness(0.92)',
              }} />
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate('image', null); }}
              style={{
                position: 'absolute', bottom: 6, right: 6,
                background: 'rgba(196, 30, 58, 0.85)', border: `1px solid ${V.bloodBri}`,
                color: V.textBri, width: 22, height: 22, borderRadius: '50%',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11,
              }}>
              <X size={11} />
            </button>
          </>
        ) : uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#7a6440' }}>
            <Loader2 size={32} className="animate-spin" />
            <span className="f-typewriter" style={{ fontSize: 12 }}>developing…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#7a6440' }}>
            <Camera size={32} />
            <span className="f-typewriter" style={{ fontSize: 12 }}>click to upload</span>
            <span className="f-typewriter" style={{ fontSize: 9, opacity: 0.7, letterSpacing: '0.1em' }}>(WILL BECOME B&W)</span>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={ts.name || ''} onChange={(e) => onUpdate('name', e.target.value)} placeholder="Their name"
          style={{
            width: '100%', background: 'transparent',
            border: 'none', borderBottom: `1px solid #c41e3a40`,
            color: '#1a0a08', padding: '4px 0',
            fontFamily: "'Special Elite', monospace", fontSize: 16, outline: 'none', boxSizing: 'border-box',
          }} />
        <input value={ts.description || ''} onChange={(e) => onUpdate('description', e.target.value)} placeholder="Who they are to you"
          style={{
            width: '100%', background: 'transparent',
            border: 'none', borderBottom: `1px solid #c41e3a40`,
            color: '#3a2818', padding: '4px 0',
            fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }} />
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, padding: '8px 0', borderTop: `1px dashed #c41e3a40` }}>
        <div className="f-mono" style={{ fontSize: 8, color: '#c41e3a', letterSpacing: '0.25em', marginBottom: 4 }}>CONVICTION</div>
        <input value={ts.conviction || ''} onChange={(e) => onUpdate('conviction', e.target.value)} placeholder="The line you won't cross"
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: '#c41e3a', padding: 0,
            fontFamily: "'Special Elite', monospace", fontSize: 12, outline: 'none', boxSizing: 'border-box',
          }} />
      </div>
    </div>
  );
}
