// Supabase storage URLs for every system-supplied VTM image.
//
// The prototype carried base64 JPEGs inline because the artifact
// preview sandbox couldn't fetch from the network. In Guildstew
// every one of these lives in the `campaign-assets` bucket under
// `VTM/…`; see `vtm-assets-upload/UPLOAD_README.md` for the one-time
// upload step.
//
// Updating an asset: re-upload to the same key (Supabase storage
// `upsert: true`); no code change required. Adding a new background
// tile: drop it into `VTM/UI/` and push its URL into BACKGROUND_IMAGES
// — the random-per-mount picker in the root creator will start
// rotating it automatically.

const PUBLIC_BUCKET = 'https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/VTM';

export const BACKGROUND_IMAGES = [
  `${PUBLIC_BUCKET}/UI/characterbackground1.png`,
  `${PUBLIC_BUCKET}/UI/characterbackground2.png`,
  `${PUBLIC_BUCKET}/UI/characterbackground3.png`,
  `${PUBLIC_BUCKET}/UI/characterbackground4.png`,
  `${PUBLIC_BUCKET}/UI/characterbackground5.jpg`,
];

export const CLAN_PORTRAITS = {
  brujah:    `${PUBLIC_BUCKET}/clans/brujah.webp`,
  toreador:  `${PUBLIC_BUCKET}/clans/toreador.webp`,
  ventrue:   `${PUBLIC_BUCKET}/clans/ventrue.webp`,
  nosferatu: `${PUBLIC_BUCKET}/clans/nosferatu.webp`,
  tremere:   `${PUBLIC_BUCKET}/clans/tremere.webp`,
};

export const MEMORY_PHOTOS = [
  `${PUBLIC_BUCKET}/memory-photos/photo1.webp`,
  `${PUBLIC_BUCKET}/memory-photos/photo2.webp`,
  `${PUBLIC_BUCKET}/memory-photos/photo3.webp`,
  `${PUBLIC_BUCKET}/memory-photos/photo4.webp`,
  `${PUBLIC_BUCKET}/memory-photos/photo5.webp`,
  `${PUBLIC_BUCKET}/memory-photos/photo6.webp`,
  `${PUBLIC_BUCKET}/memory-photos/photo7.webp`,
];

export const HUNT_MAP = `${PUBLIC_BUCKET}/maps/manhattan-hunt-map.webp`;

export const ANATOMY_FIGURE = `${PUBLIC_BUCKET}/UI/anatomy-figure.webp`;

// Keyed by skill-approach name (Jack / Balanced / Specialist) — the
// Education step (StepSkills) reads this map directly when rendering
// the grimoire-cover for each approach card.
export const GRIMOIRES = {
  Jack:       `${PUBLIC_BUCKET}/UI/grimoire-jack.webp`,
  Balanced:   `${PUBLIC_BUCKET}/UI/grimoire-balanced.webp`,
  Specialist: `${PUBLIC_BUCKET}/UI/grimoire-specialist.webp`,
};
