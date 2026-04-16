import { supabase } from '@/api/supabaseClient';

/**
 * Upload a file to Supabase Storage.
 *
 * @param {File} file   — the File object to upload
 * @param {string} bucket — storage bucket (default: 'campaign-assets')
 * @param {string} path   — sub-path inside the bucket (e.g. "userId/avatar")
 * @returns {{ file_url: string }} — public URL of the uploaded file
 */
export async function uploadFile(file, bucket = 'campaign-assets', path = '') {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path
    ? `${path}/${Date.now()}_${safeName}`
    : `${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { file_url: urlData.publicUrl, url: urlData.publicUrl };
}
