import { Palette, User, Dices, Music, MousePointer2, Film, Image, Package } from "lucide-react";

/**
 * Tavern item categories.
 *
 * `value` is the string stored in `tavern_items.category` — never rename
 * without a migration. `label` is the user-facing name. `icon` is the
 * Lucide component used on cards and tabs. `fileHint` is the copy shown
 * on the upload form to tell the creator what asset to attach.
 */
export const TAVERN_CATEGORIES = [
  { value: "ui_theme",       label: "UI Theme",       icon: Palette,      fileHint: "Theme JSON with color / font tokens" },
  { value: "portrait",       label: "Portrait",       icon: User,         fileHint: "Single character portrait (PNG / WebP)" },
  { value: "portrait_pack",  label: "Portrait Pack",  icon: Image,        fileHint: "Collection of portrait images" },
  { value: "dice_skin",      label: "Dice Skin",      icon: Dices,        fileHint: "Dice texture or model reference" },
  { value: "sound_pack",     label: "Sound Pack",     icon: Music,        fileHint: "Audio files (MP3 / OGG)" },
  { value: "cursor_set",     label: "Cursor Set",     icon: MousePointer2,fileHint: "Cursor image set" },
  { value: "animation",      label: "Animation",      icon: Film,         fileHint: "GIF / WebP / Lottie animation" },
  { value: "profile_banner", label: "Profile Banner", icon: Package,      fileHint: "Banner image for your profile" },
];

export const CATEGORY_LABEL = TAVERN_CATEGORIES.reduce((acc, c) => {
  acc[c.value] = c.label;
  return acc;
}, {});

export function categoryIcon(value) {
  return (TAVERN_CATEGORIES.find((c) => c.value === value) || TAVERN_CATEGORIES[0]).icon;
}

export const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest",  label: "Newest" },
  { value: "price_asc",  label: "Price (Low → High)" },
  { value: "price_desc", label: "Price (High → Low)" },
  { value: "rating", label: "Highest Rated" },
];
