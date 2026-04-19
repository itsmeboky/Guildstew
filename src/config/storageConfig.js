/**
 * Upload type → byte-limit table. Every upload path in the app picks
 * one of these keys so bumping an individual limit is a one-line
 * config change. MAX_FILE_SIZE is a hard ceiling that no upload type
 * can exceed even if its own limit is set higher.
 */
export const FILE_SIZE_LIMITS = {
  avatar:    2 * 1024 * 1024,   // character portraits, profile pics
  homebrew:  3 * 1024 * 1024,   // monster art, item icons
  worldLore: 5 * 1024 * 1024,   // lore images, document attachments
  map:       10 * 1024 * 1024,  // battle maps, world maps
  general:   5 * 1024 * 1024,   // catch-all default
};

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const BUCKETS = {
  // SRD game data (monster images, item icons, language fonts, Thieves'
  // Cant + Druidic SVGs). NOT for user uploads.
  SYSTEM: "campaign-assets",
  // Every user-uploaded asset lives here. Counts against storage
  // quotas on user_profiles / campaigns.
  USER:   "user-assets",
};
