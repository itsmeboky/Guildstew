import { supabase } from "@/api/supabaseClient";
import { BUCKETS } from "@/config/storageConfig";
import {
  validateFile,
  checkUserStorageQuota,
  incrementUserStorage,
  decrementUserStorage,
} from "@/utils/uploadValidator";
import { toast } from "sonner";

/**
 * Upload a file to Supabase Storage.
 *
 * Defaults to the `user-assets` bucket — every user-generated asset
 * (portraits, homebrew art, lore images, maps, profile pics) belongs
 * there. SRD seed scripts that populate `campaign-assets` must pass
 * that bucket explicitly.
 *
 * When a bucket is user-assets the helper runs type + size validation,
 * checks the user's storage quota, and bumps the `storage_used_bytes`
 * counter via the `increment_user_storage` RPC after a successful
 * upload. Pass `{ userId, uploadType, tier }` to enable the full
 * pipeline; omit them for legacy callers that haven't migrated yet
 * (validation still runs when `uploadType` is provided).
 *
 * @param {File}   file
 * @param {string} bucket      — storage bucket (default: user-assets)
 * @param {string} path        — folder path inside the bucket
 * @param {object} [opts]
 * @param {string} [opts.userId]     — required for quota checks + storage bump
 * @param {string} [opts.uploadType] — 'avatar' | 'homebrew' | 'worldLore' | 'map' | 'general'
 * @param {string} [opts.tier]       — subscription tier for quota lookup
 * @returns {{ file_url: string, url: string, path: string, size: number }}
 */
export async function uploadFile(file, bucket = BUCKETS.USER, path = "", opts = {}) {
  const { userId, uploadType, tier } = opts;

  // Size / type validation only applies to user uploads — SRD seed
  // scripts pushing into `campaign-assets` can skip it.
  if (bucket === BUCKETS.USER && uploadType) {
    if (!validateFile(file, uploadType)) {
      throw new Error("File rejected by validator");
    }
  }

  // Personal storage quota — only relevant for user-uploads with a
  // known user id.
  if (bucket === BUCKETS.USER && userId) {
    const quota = await checkUserStorageQuota(userId, file.size, tier || "free");
    if (!quota.allowed) {
      toast.error(quota.reason);
      throw new Error(quota.reason);
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path
    ? `${path}/${Date.now()}_${safeName}`
    : `${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  // Only bump storage counters for uploads we actually bill against.
  if (bucket === BUCKETS.USER && userId) {
    try { await incrementUserStorage(userId, file.size); }
    catch (err) { console.warn("increment_user_storage failed:", err?.message || err); }
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return {
    file_url: urlData.publicUrl,
    url: urlData.publicUrl,
    path: filePath,
    size: file.size,
  };
}

/**
 * Delete a stored file and decrement the owner's storage counter when
 * the file lives in `user-assets`. Accepts the storage path (the same
 * string returned as `path` from `uploadFile`) or a full public URL —
 * if the caller has only the URL we derive the path by stripping the
 * bucket prefix.
 */
export async function deleteFile(pathOrUrl, { userId, fileSize, bucket = BUCKETS.USER } = {}) {
  if (!pathOrUrl) return;
  let storagePath = pathOrUrl;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = pathOrUrl.indexOf(marker);
  if (idx !== -1) storagePath = pathOrUrl.slice(idx + marker.length);

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) throw error;

  if (bucket === BUCKETS.USER && userId && fileSize) {
    try { await decrementUserStorage(userId, fileSize); }
    catch (err) { console.warn("decrement_user_storage failed:", err?.message || err); }
  }
}
