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
  `${PUBLIC_BUCKET}/UI/characterbackground2.jpg`,
  `${PUBLIC_BUCKET}/UI/characterbackground3.jpg`,
  `${PUBLIC_BUCKET}/UI/characterbackground4.jpg`,
  `${PUBLIC_BUCKET}/UI/characterbackground5.jpg`,
];

export const CLAN_PORTRAITS = {
  brujah:    `${PUBLIC_BUCKET}/clans/brujah.jpg`,
  toreador:  `${PUBLIC_BUCKET}/clans/toreador.jpg`,
  ventrue:   `${PUBLIC_BUCKET}/clans/ventrue.jpg`,
  nosferatu: `${PUBLIC_BUCKET}/clans/nosferatu.jpg`,
  tremere:   `${PUBLIC_BUCKET}/clans/tremere.jpg`,
};

export const MEMORY_PHOTOS = [
  `${PUBLIC_BUCKET}/memory-photos/photo1.jpg`,
  `${PUBLIC_BUCKET}/memory-photos/photo2.jpg`,
  `${PUBLIC_BUCKET}/memory-photos/photo3.jpg`,
  `${PUBLIC_BUCKET}/memory-photos/photo4.jpg`,
  `${PUBLIC_BUCKET}/memory-photos/photo5.jpg`,
  `${PUBLIC_BUCKET}/memory-photos/photo6.jpg`,
  `${PUBLIC_BUCKET}/memory-photos/photo7.jpg`,
];

export const HUNT_MAP = `${PUBLIC_BUCKET}/maps/manhattan-hunt-map.jpg`;

export const ANATOMY_FIGURE = `${PUBLIC_BUCKET}/UI/anatomy-figure.jpg`;

// Keyed by skill-approach name (Jack / Balanced / Specialist) — the
// Education step (StepSkills) reads this map directly when rendering
// the grimoire-cover for each approach card.
export const GRIMOIRES = {
  Jack:       `${PUBLIC_BUCKET}/UI/grimoire-jack.jpg`,
  Balanced:   `${PUBLIC_BUCKET}/UI/grimoire-balanced.jpg`,
  Specialist: `${PUBLIC_BUCKET}/UI/grimoire-specialist.jpg`,
};
