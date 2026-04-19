import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/config/storageConfig";
import { TIERS } from "@/api/billingClient";
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
 * Check whether the user's personal storage quota can absorb a file of
 * `fileSize` bytes. Returns { allowed, reason? } — callers surface the
 * reason via toast + abort the upload when denied.
 *
 * Honours `storage_limit_override_bytes` (admin bump) over the tier
 * default stored in `storage_limit_bytes`.
 */
export async function checkUserStorageQuota(userId, fileSize, tier = "free") {
  if (!userId) return { allowed: true };
  const tierData = TIERS[tier] || TIERS.free;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("storage_used_bytes, storage_limit_bytes, storage_limit_override_bytes")
    .eq("user_id", userId)
    .single();

  if (profile) {
    const limit =
      profile.storage_limit_override_bytes
      || profile.storage_limit_bytes
      || tierData.limits.userStorageBytes;
    const used = profile.storage_used_bytes || 0;
    if (used + fileSize > limit) {
      const limitMB = (limit / (1024 * 1024)).toFixed(0);
      const usedMB = (used / (1024 * 1024)).toFixed(1);
      return {
        allowed: false,
        reason: `Personal storage full (${usedMB}MB / ${limitMB}MB). Upgrade your plan or delete unused files.`,
      };
    }
  }
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
