// Thieves' Cant symbol catalog. All 42 SVGs are already uploaded to
// Supabase Storage under campaign-assets/dnd5e/languages/Thieves-Cant.
// Rendered through SymbolImage (CSS-mask tint) so GMs can pick any
// colour per world-lore entry.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CANT_BASE = `${SUPABASE_URL}/storage/v1/object/public/campaign-assets/dnd5e/languages/Thieves-Cant`;

export const THIEVES_CANT_SYMBOLS = [
  // Navigation
  { id: 'safe-this-way',            name: 'Safe This Way',            category: 'Navigation', src: `${CANT_BASE}/safe-this-way.svg` },
  { id: 'turn-in-direction',        name: 'Turn in Direction',        category: 'Navigation', src: `${CANT_BASE}/turn-in-direction.svg` },
  { id: 'do-not-go-this-way',       name: 'Do Not Go This Way',       category: 'Navigation', src: `${CANT_BASE}/do-not-go-this-way.svg` },
  { id: 'entry-underground',        name: 'Entry Underground',        category: 'Navigation', src: `${CANT_BASE}/entry-underground.svg` },
  { id: 'entry-from-above',         name: 'Entry From Above',         category: 'Navigation', src: `${CANT_BASE}/entry-from-above.svg` },
  { id: 'hidden-door',              name: 'Hidden Door',              category: 'Navigation', src: `${CANT_BASE}/hidden-door.svg` },
  { id: 'escape-route',             name: 'Escape Route',             category: 'Navigation', src: `${CANT_BASE}/escape-route.svg` },

  // Danger
  { id: 'danger-inside',            name: 'Danger Inside',            category: 'Danger', src: `${CANT_BASE}/danger-inside.svg` },
  { id: 'traps-ahead',              name: 'Traps Ahead',              category: 'Danger', src: `${CANT_BASE}/traps-ahead.svg` },
  { id: 'monsters-inside',          name: 'Monsters Inside',          category: 'Danger', src: `${CANT_BASE}/monsters-inside.svg` },
  { id: 'being-watched',            name: 'Being Watched',            category: 'Danger', src: `${CANT_BASE}/being-watched.svg` },
  { id: 'avoid-leave',              name: 'Avoid / Leave',            category: 'Danger', src: `${CANT_BASE}/avoid-leave.svg` },
  { id: 'do-not-enter',             name: 'Do Not Enter',             category: 'Danger', src: `${CANT_BASE}/do-not-enter.svg` },
  { id: 'get-out-fast',             name: 'Get Out Fast',             category: 'Danger', src: `${CANT_BASE}/get-out-fast.svg` },

  // Security
  { id: 'guarded-location',         name: 'Guarded Location',         category: 'Security', src: `${CANT_BASE}/guarded-location.svg` },
  { id: 'well-guarded',             name: 'Well Guarded',             category: 'Security', src: `${CANT_BASE}/well-guarded.svg` },
  { id: 'guards-patrol-here',       name: 'Guards Patrol Here',       category: 'Security', src: `${CANT_BASE}/guards-patrol-here.svg` },
  { id: 'no-guard-patrol',          name: 'No Guard Patrol',          category: 'Security', src: `${CANT_BASE}/no-guard-patrol.svg` },
  { id: 'secured-location',         name: 'Secured Location',         category: 'Security', src: `${CANT_BASE}/secured-location.svg` },
  { id: 'unsecured-location',       name: 'Unsecured Location',       category: 'Security', src: `${CANT_BASE}/unsecured-location.svg` },
  { id: 'protected-by-gang',        name: 'Protected by Gang',        category: 'Security', src: `${CANT_BASE}/protected-by-gang.svg` },
  { id: 'protected-by-magic',       name: 'Protected by Magic',       category: 'Security', src: `${CANT_BASE}/protected-by-magic.svg` },
  { id: 'magic-caster-here',        name: 'Magic Caster Here',        category: 'Security', src: `${CANT_BASE}/magic-caster-here.svg` },
  { id: 'crown-territory',          name: 'Crown Territory',          category: 'Security', src: `${CANT_BASE}/crown-territory.svg` },

  // Loot
  { id: 'wealthy',                  name: 'Wealthy',                  category: 'Loot', src: `${CANT_BASE}/wealthy.svg` },
  { id: 'valuables-inside',         name: 'Valuables Inside',         category: 'Loot', src: `${CANT_BASE}/valuables-inside.svg` },
  { id: 'worth-robbing-if-possible',name: 'Worth Robbing If Possible',category: 'Loot', src: `${CANT_BASE}/worth-robbing-if-possible.svg` },
  { id: 'not-worth-robbing',        name: 'Not Worth Robbing',        category: 'Loot', src: `${CANT_BASE}/not-worth-robbing.svg` },
  { id: 'nothing-of-value-here',    name: 'Nothing of Value Here',    category: 'Loot', src: `${CANT_BASE}/nothing-of-value-here.svg` },
  { id: 'already-looted',           name: 'Already Looted',           category: 'Loot', src: `${CANT_BASE}/already-looted.svg` },
  { id: 'fence',                    name: 'Fence (Sells Stolen Goods)',category:'Loot', src: `${CANT_BASE}/fence.svg` },

  // Social
  { id: 'trusted-person-inside',    name: 'Trusted Person Inside',    category: 'Social', src: `${CANT_BASE}/trusted-person-inside.svg` },
  { id: 'do-no-trust-inside',       name: 'Do Not Trust Inside',      category: 'Social', src: `${CANT_BASE}/do-no-trust-inside.svg` },
  { id: 'can-be-bribed',            name: 'Can Be Bribed',            category: 'Social', src: `${CANT_BASE}/can-be-bribed.svg` },
  { id: 'cannot-be-bribed',         name: 'Cannot Be Bribed',         category: 'Social', src: `${CANT_BASE}/cannot-be-bribed.svg` },
  { id: 'speak-the-word',           name: 'Speak the Word (Password)',category: 'Social', src: `${CANT_BASE}/speak-the-word.svg` },

  // Guild
  { id: 'safe-house',               name: 'Safe House',               category: 'Guild', src: `${CANT_BASE}/safe-house.svg` },
  { id: 'safe-for-guild',           name: 'Safe for Guild',           category: 'Guild', src: `${CANT_BASE}/safe-for-guild.svg` },
  { id: 'guild-protected',          name: 'Guild Protected',          category: 'Guild', src: `${CANT_BASE}/guild-protected.svg` },
  { id: 'guild-territory',          name: 'Guild Territory',          category: 'Guild', src: `${CANT_BASE}/guild-territory.svg` },
  { id: 'meeting-place',            name: 'Meeting Place',            category: 'Guild', src: `${CANT_BASE}/meeting-place.svg` },
  { id: 'heist-being-planned',      name: 'Heist Being Planned',      category: 'Guild', src: `${CANT_BASE}/heist-being-planned.svg` },
];

export const CANT_CATEGORIES = [...new Set(THIEVES_CANT_SYMBOLS.map((s) => s.category))];

// Preset colour swatches offered in the picker. The GM can always
// drop a custom hex through the colour input.
export const CANT_COLOR_PRESETS = [
  { id: 'gold',   value: '#d4a017' },
  { id: 'silver', value: '#c0c0c0' },
  { id: 'red',    value: '#ef4444' },
  { id: 'blue',   value: '#3b82f6' },
  { id: 'green',  value: '#22c55e' },
  { id: 'purple', value: '#a855f7' },
  { id: 'orange', value: '#f97316' },
  { id: 'white',  value: '#f8fafc' },
];

export const CANT_DEFAULT_COLOR = '#d4a017';
