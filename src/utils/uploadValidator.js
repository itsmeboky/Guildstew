/**
 * uploadValidator — client-side upload validation.
 *
 * Validates files before they're handed to Supabase Storage. This is a
 * defense-in-depth check meant to surface a friendly error message to
 * the user before the upload hits the network. Real enforcement (auth,
 * quotas, bucket policies) lives on the server side.
 *
 * What this validates:
 *   - File size (per-call limit, default 10 MB)
 *   - MIME type (per-call allowlist, with sane per-uploadType defaults)
 *   - Filename safety (no path traversal, no NUL bytes, length ≤ 255)
 *   - SVG uploads are rejected (no sanitizer in the codebase yet — see
 *     TODO below)
 *
 * What this does NOT validate:
 *   - Antivirus / malware scanning
 *   - Content-sniffing (MIME type is taken from the browser-supplied
 *     `file.type`; a malicious user can lie). Real enforcement must
 *     happen server-side.
 *   - Image dimensions, EXIF stripping, or codec details
 *
 * Returns `{ valid: boolean, error: string | null }` so callers can
 * surface a specific, user-friendly error.
 *
 * Storage quota helpers (`checkStorageQuota`, `incrementUserStorage`,
 * etc.) remain pass-through stubs — real enforcement is the
 * `increment_user_storage` RPC + DB triggers, not this client module.
 *
 * @example
 *   const result = validateFile(file, "avatar");
 *   if (!result.valid) {
 *     toast.error(result.error);
 *     return;
 *   }
 *
 * @example
 *   const result = validateFile(file, "general", {
 *     maxSizeBytes: 5 * 1024 * 1024,
 *     allowedMimeTypes: ["image/png"],
 *   });
 */

const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILENAME_LENGTH = 255;

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/json",
  "text/plain",
];

// Per-uploadType defaults. Callers can override via opts.
const UPLOAD_TYPE_DEFAULTS = {
  avatar: { maxSizeBytes: 5 * 1024 * 1024, allowedMimeTypes: IMAGE_MIME_TYPES },
  homebrew: { maxSizeBytes: 10 * 1024 * 1024, allowedMimeTypes: IMAGE_MIME_TYPES },
  worldLore: { maxSizeBytes: 10 * 1024 * 1024, allowedMimeTypes: IMAGE_MIME_TYPES },
  map: { maxSizeBytes: 20 * 1024 * 1024, allowedMimeTypes: IMAGE_MIME_TYPES },
  general: {
    maxSizeBytes: DEFAULT_MAX_SIZE_BYTES,
    allowedMimeTypes: [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES],
  },
};

function fail(error) {
  return { valid: false, error };
}

function ok() {
  return { valid: true, error: null };
}

function isFilenameSafe(name) {
  if (typeof name !== "string" || name.length === 0) return false;
  if (name.length > MAX_FILENAME_LENGTH) return false;
  // Path traversal / separator / NUL byte
  if (name.includes("..")) return false;
  if (name.includes("/") || name.includes("\\")) return false;
  if (name.includes("\0")) return false;
  return true;
}

/**
 * Validate a File before upload.
 *
 * @param {File}   file
 * @param {string} [uploadType="general"] — 'avatar' | 'homebrew' | 'worldLore' | 'map' | 'general'
 * @param {object} [opts]
 * @param {number} [opts.maxSizeBytes]      — override size limit
 * @param {string[]} [opts.allowedMimeTypes] — override MIME allowlist
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateFile(file, uploadType = "general", opts = {}) {
  if (!file) return fail("No file provided.");

  const defaults = UPLOAD_TYPE_DEFAULTS[uploadType] || UPLOAD_TYPE_DEFAULTS.general;
  const maxSizeBytes = opts.maxSizeBytes ?? defaults.maxSizeBytes;
  const allowedMimeTypes = opts.allowedMimeTypes ?? defaults.allowedMimeTypes;

  if (!isFilenameSafe(file.name)) {
    return fail("Filename is invalid. Avoid slashes, '..', or names longer than 255 characters.");
  }

  if (typeof file.size !== "number" || file.size <= 0) {
    return fail("File appears to be empty.");
  }
  if (file.size > maxSizeBytes) {
    const mb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return fail(`File is too large. Maximum size is ${mb} MB.`);
  }

  const mime = (file.type || "").toLowerCase();

  // TODO: SVG content sanitization required — for now, SVG uploads are rejected.
  // SVGs can carry inline <script> and event handlers (XSS). When a sanitizer
  // (e.g. DOMPurify with SVG profile) is added to the codebase, SVGs may be
  // accepted by adding "image/svg+xml" to an allowlist and routing the file
  // contents through it before upload.
  if (mime === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    return fail("SVG uploads are not supported.");
  }

  if (!allowedMimeTypes.includes(mime)) {
    return fail(`File type "${mime || "unknown"}" is not allowed for ${uploadType} uploads.`);
  }

  return ok();
}

/* eslint-disable no-unused-vars */

// Storage quota helpers — pass-through stubs. Real enforcement lives in
// the `increment_user_storage` RPC + DB triggers; restore real client
// implementations once the billingClient/storageConfig import graph is
// audited (see git history of this file).

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
