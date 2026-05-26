// Supabase upload helper for VTM character assets. Mirrors the
// path scheme pf2e uses (user-assets/{userId}/{game}/{tempId}/{slot}.{ext})
// so the read-side getCharacterPortraitUrl / getCharacterTokenUrl
// helpers in src/lib/characterMedia.js continue to work
// untouched.
//
// `tempId` is the placeholder UUID the creator generates on
// mount; once the row is saved it stays on the record so future
// re-uploads (portrait swap, replace token) keep the same key.

import { supabase } from '@/api/supabaseClient';

const extFromFile = (file) => {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = (file.type || '').split('/').pop();
  return (fromType || 'png').toLowerCase();
};

/**
 * Upload a single image file to user-assets and return a public URL.
 *
 * @param {Object} args
 * @param {string} args.userId   Supabase auth user.id (required)
 * @param {string} args.tempId   Per-character UUID (required)
 * @param {string} args.slot     'portrait' | 'token' | `touchstone-${n}` | `memory-${n}`
 * @param {File}   args.file     Browser File (image/*)
 * @returns {Promise<string>}    Public URL, cache-busted.
 */
export async function uploadVtmAsset({ userId, tempId, slot, file }) {
  if (!userId || !tempId) {
    throw new Error('uploadVtmAsset: missing userId or tempId');
  }
  if (!file) throw new Error('uploadVtmAsset: missing file');

  const ext = extFromFile(file);
  const filePath = `${userId}/vtm-characters/${tempId}/${slot}.${ext}`;

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
  return `${urlData.publicUrl}?t=${Date.now()}`;
}
