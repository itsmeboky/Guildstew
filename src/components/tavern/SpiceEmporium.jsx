import React from "react";

/**
 * Trinket's Spice Emporium — purchase popup.
 *
 * This is Step 1 of the rebuild. The component currently exports a
 * no-op stub; steps 2-10 land the overlay, dome, title, cards,
 * CTAs, purchase flow, and animations. Data config is in place so
 * subsequent steps just reference BUNDLES + RARITY + IMAGES.
 */

// Canonical image URLs — all served from the app-assets/hero bucket.
export const IMAGES = {
  trinket: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/ezgif.com-reverse.gif",
  guild:   "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/Makeaguild.png",
  creator: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/becomeacreator1.png",
  tiers: [
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier1.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier2.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier3.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier4.png",
    "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/spicetier5.png",
  ],
};

// Five bundles, each mapped to a D&D item-rarity tier so the card
// gradients / borders / glows reuse the same palette the rest of
// the app already speaks. Best Deal is the Legendary tile so the
// orange/gold highlight matches the spec.
export const BUNDLES = [
  { id: 1, price: 5,   spice: 1310,  bonus: 60,   pct: "5%",  rarity: "common",    label: "Common" },
  { id: 2, price: 10,  spice: 2750,  bonus: 250,  pct: "10%", rarity: "uncommon",  label: "Uncommon" },
  { id: 3, price: 25,  spice: 7200,  bonus: 950,  pct: "15%", rarity: "legendary", label: "Legendary", best: true },
  { id: 4, price: 50,  spice: 14375, bonus: 1875, pct: "15%", rarity: "rare",      label: "Rare" },
  { id: 5, price: 100, spice: 27500, bonus: 2500, pct: "10%", rarity: "veryrare",  label: "Very Rare" },
];

// Rarity palette — matches the existing item rarity system the
// Tavern / equipment picker / loot manager use, so cosmetically the
// shop feels like looting a chest. Each entry carries the gradient
// fill, a 2-stop border pair (`border[0]` is hover, `border[1]` is
// default), an accent color used for small fills / text, a glow
// rgba used on shadows + shimmers, and the text color for body copy.
export const RARITY = {
  common:    { gradient: "linear-gradient(160deg, #1e222a 0%, #2a2e36 50%, #1e222a 100%)", border: ["#9ca3af","#6b7280"], accent: "#9ca3af", glow: "rgba(156,163,175,0.25)", text: "#e2e8f0" },
  uncommon:  { gradient: "linear-gradient(160deg, #0f2418 0%, #1a3328 50%, #0f2418 100%)", border: ["#22c55e","#16a34a"], accent: "#22c55e", glow: "rgba(34,197,94,0.25)",   text: "#e2e8f0" },
  rare:      { gradient: "linear-gradient(160deg, #0f1a2e 0%, #1a2a45 50%, #0f1a2e 100%)", border: ["#3b82f6","#2563eb"], accent: "#3b82f6", glow: "rgba(59,130,246,0.3)",  text: "#e2e8f0" },
  veryrare:  { gradient: "linear-gradient(160deg, #1a0f2e 0%, #2a1a45 50%, #1a0f2e 100%)", border: ["#8b5cf6","#7c3aed"], accent: "#8b5cf6", glow: "rgba(139,92,246,0.3)",  text: "#e2e8f0" },
  legendary: { gradient: "linear-gradient(160deg, #f59e0b 0%, #d97706 40%, #b45309 100%)", border: ["#fbbf24","#f59e0b"], accent: "#fbbf24", glow: "rgba(245,158,11,0.45)", text: "#1a0f00" },
};

export default function SpiceEmporium({ open, onClose }) {
  if (!open) return null;
  return null; // step 2 lands the overlay + shell
}
