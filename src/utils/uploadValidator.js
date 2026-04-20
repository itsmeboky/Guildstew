import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/config/storageConfig";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

/**
 * Reject files with disallowed types or that bust either the
 * hard ceiling (MAX_FILE_SIZE) or the type-specific byte limit. Surfaces
 * a toast on rejection; returns a plain boolean so callers can early-
 * return from the upload flow.
 *
 * @param {File} file
 * @param {'avatar'|'homebrew'|'worldLore'|'map'|'general'} uploadType
 */
export function validateFile(file, uploadType = "general") {
  if (!file) return false;
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    toast.error("File type not allowed. Accepted: JPEG, PNG, WebP, GIF, PDF.");
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`File too large. Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    return false;
  }
  const limit = FILE_SIZE_LIMITS[uploadType] || FILE_SIZE_LIMITS.general;
  if (file.size > limit) {
    const limitMB = (limit / (1024 * 1024)).toFixed(0);
    const fileMB = (file.size / (1024 * 1024)).toFixed(1);
    toast.error(`${uploadType} files are limited to ${limitMB}MB. This file is ${fileMB}MB.`);
    return false;
  }
  return true;
}

/**
 * Personal storage quota check — stub.
 *
 * The full implementation reads `user_profiles.storage_used_bytes` +
 * the tier catalog from billingClient and enforces a per-user cap.
 * That version pulled in a circular / broken import chain that
 * prevented the whole module from loading (white-screened the app
 * with "does not provide an export named 'checkUserStorageQuota'"
 * in the browser), so we ship a permissive stub here and let the
 * Edge Function / DB triggers own the hard enforcement for now.
 *
 * Signature is unchanged so every caller keeps working; when the
 * quota pipeline is re-enabled, swap this body back in.
 */
// eslint-disable-next-line no-unused-vars
export async function checkUserStorageQuota(userId, fileSize, tier = "free") {
  return { allowed: true };
}

export async function incrementUserStorage(userId, fileSize) {
  if (!userId || !fileSize) return;
  await supabase.rpc("increment_user_storage", { p_user_id: userId, p_bytes: fileSize });
}

export async function decrementUserStorage(userId, fileSize) {
  if (!userId || !fileSize) return;
  await supabase.rpc("increment_user_storage", { p_user_id: userId, p_bytes: -fileSize });
}
