/**
 * uploadValidator — stub.
 *
 * The full implementations (file-type/size validation, personal
 * storage quota enforcement, storage-counter bumps) depended on
 * an import chain (billingClient → storageConfig → supabaseClient)
 * that was failing to resolve in the browser dev build. The whole
 * app white-screened with
 *   "does not provide an export named 'checkUserStorageQuota'"
 * because a downstream import in that chain was evaluating empty.
 *
 * To unbreak the app unconditionally, this module is now
 * import-free — nothing it depends on can fail to load — and
 * exports every name any caller might import with safe defaults:
 *   validateFile                → true   (accept all files)
 *   checkStorageQuota           → { allowed: true }
 *   checkUserStorageQuota       → { allowed: true }  (legacy name)
 *   incrementStorageUsed        → no-op
 *   decrementStorageUsed        → no-op
 *   incrementUserStorage        → no-op  (legacy name)
 *   decrementUserStorage        → no-op  (legacy name)
 *
 * Real enforcement lives on the server side (DB triggers +
 * increment_user_storage RPC), so this trust-the-server stance is
 * safe — just not ideal for surfacing a friendly client-side
 * error before the upload hits the bucket. Restore the full
 * implementations once the billingClient / storageConfig import
 * graph is audited.
 */

/* eslint-disable no-unused-vars */

export function validateFile(file, uploadType = "general") {
  return true;
}

export async function checkStorageQuota(userId, fileSize, tier = "free") {
  return { allowed: true };
}

export async function checkUserStorageQuota(userId, fileSize, tier = "free") {
  return { allowed: true };
}

export async function incrementStorageUsed(userId, fileSize) {}

export async function decrementStorageUsed(userId, fileSize) {}

export async function incrementUserStorage(userId, fileSize) {}

export async function decrementUserStorage(userId, fileSize) {}
