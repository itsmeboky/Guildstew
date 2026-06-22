// Dashed-border upload slot for portrait + token. Click opens the
// file picker; selecting an image uploads to the `user-assets` bucket
// at a deterministic path so re-uploads overwrite the same key. The
// resolved public URL is bubbled up via onChange — the caller decides
// where on the character record it persists (system_data.portrait_url
// / .token_url for PF2e).
//
// Token = 1:1 circular, Portrait = 2:3 rectangular — the two callable
// shapes mirror the prototype.

import React, { useRef, useState } from 'react';
import { Upload, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import CornerBrackets from './CornerBrackets.jsx';

const extFromFile = (file) => {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = (file.type || '').split('/').pop();
  return (fromType || 'png').toLowerCase();
};

const PortraitUpload = ({
  value,
  onChange,
  label,
  aspect = 'aspect-[3/4]',
  round = false,
  userId,
  tempId,
  kind = 'portrait', // 'portrait' | 'token'
}) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const openPicker = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!userId || !tempId) {
      toast.error('Sign in again — your session is missing identity info.');
      return;
    }

    const ext = extFromFile(file);
    const filePath = `${userId}/pf2e-characters/${tempId}/${kind}.${ext}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('user-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || undefined,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user-assets')
        .getPublicUrl(filePath);
      // Cache-bust so the same URL re-renders after an overwrite.
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      onChange?.(publicUrl);
    } catch (err) {
      console.error('Portrait upload failed', err);
      toast.error('Upload failed', {
        description: err?.message || 'Could not save the image. Try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <div
        onClick={openPicker}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(); }}
        className={`relative ${aspect} ${round ? 'rounded-full' : ''} bg-pf-bg-elev/50 border border-dashed border-pf-brass-dim/40 hover:border-pf-brass-dim flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group overflow-hidden`}
      >
        {!round && <CornerBrackets />}

        {value && !uploading && (
          <img
            src={value}
            alt={label}
            className={`absolute inset-0 w-full h-full object-cover ${round ? 'rounded-full' : ''}`}
          />
        )}

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-pf-bg-elev/80 gap-2 z-10">
            <Loader2 size={24} className="text-pf-brass animate-spin" />
            <span className="font-display text-[10px] tracking-[0.2em] text-pf-stone uppercase">Uploading</span>
          </div>
        )}

        {!value && !uploading && (
          <>
            {round
              ? <Camera size={22} className="text-pf-stone group-hover:text-pf-brass transition-colors" />
              : <Upload size={28} className="text-pf-stone group-hover:text-pf-brass transition-colors" />}
            {!round && <span className="font-display text-[10px] tracking-[0.2em] text-pf-stone uppercase">Upload</span>}
          </>
        )}

        {value && !uploading && (
          <div className="absolute inset-x-0 bottom-0 bg-pf-bg-elev/80 text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <span className="font-display text-[10px] tracking-[0.2em] text-pf-bone uppercase">Replace</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortraitUpload;
