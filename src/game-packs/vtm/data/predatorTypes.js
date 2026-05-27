// V5 predator types — the ten the prototype ships, mapped to NYC
// neighborhood pins for the hunt-map step. Each entry carries a
// `grants` and `cost` list whose strings are parsed by
// `rules/predatorBonuses.js` (Phase 4.4) to apply effects to the
// character on advance from Step VI; the strings themselves are
// also rendered verbatim in the predator detail panel, so they
// have to read cleanly and match the V5 corebook bonuses.
//
// `coord` is a {x, y} percentage on the Manhattan hunt map. `notice`
// (currently set only on Blood Leech) flags storyteller-approval
// gating in the picker.

import {
  Wind, Droplet, Skull, Home, UserCheck,
  Leaf, Theater, Moon as MoonIcon, Music, Heart,
} from 'lucide-react';

export const PREDATOR_TYPES = [
  {
    id: 'alleycat', name: 'Alleycat', sigil: Wind,
    neighborhood: 'BOWERY · LOWER EAST SIDE',
    pitch: 'You take blood by force or threat. Mugged in an alley, drained in a stairwell.',
    pool: 'Strength + Brawl or Wits + Streetwise',
    grants: [
      'Specialty: Intimidation (Stickups) or Brawl (Grappling)',
      'Gain (•) Celerity or (•) Potence',
      'Contact (•••) — Criminal',
    ],
    cost: ['Lose one dot of Humanity'],
    coord: { x: 38, y: 64 },
  },
  {
    id: 'bagger', name: 'Bagger', sigil: Droplet,
    neighborhood: 'MIDTOWN HOSPITALS',
    pitch: 'Cold blood. Stolen from blood banks, morgues, hospitals. Clinical. No witnesses.',
    pool: 'Intelligence + Streetwise',
    grants: [
      'Specialty: Larceny or Streetwise (Black Market)',
      'Gain (•) Blood Sorcery (in-clan) or (•) Obfuscate',
      'Feeding (•••) Iron Gullet',
    ],
    cost: ['Enemy (••) — Police or escaped victim'],
    coord: { x: 34, y: 42 },
  },
  {
    id: 'blood_leech', name: 'Blood Leech', sigil: Skull,
    neighborhood: 'EAST RIVER · UNDER THE BRIDGE',
    pitch: 'You feed from other Kindred. The deepest taboo. Most Princes will execute you for this.',
    pool: 'Wits + Stealth or Strength + Brawl',
    grants: [
      'Specialty: Stealth (vs vampires) or Brawl (Grappling)',
      'Gain (•) Celerity or (•) Protean',
      'Feeding (••) Bloodhound',
    ],
    cost: [
      'Lose three dots of Humanity',
      'Dark Secret (••) — Diablerist',
    ],
    notice: 'STORYTELLER APPROVAL',
    coord: { x: 50, y: 72 },
  },
  {
    id: 'cleaver', name: 'Cleaver', sigil: Home,
    neighborhood: 'BROOKLYN BROWNSTONES',
    pitch: 'A family. A circle. A spouse. They love you. They have no idea what you are.',
    pool: 'Manipulation + Subterfuge',
    grants: [
      'Specialty: Persuasion (Gaslighting) or Subterfuge (Coverups)',
      'Gain (•) Dominate or (•) Animalism',
      'Herd (••)',
    ],
    cost: ['Dark Secret (•) — Masquerade Breacher'],
    coord: { x: 62, y: 80 },
  },
  {
    id: 'consensualist', name: 'Consensualist', sigil: UserCheck,
    neighborhood: 'BUSHWICK · GOTH SCENES',
    pitch: 'Only those who say yes. Donors, gothic scenes, roleplayers. The vampire who plays by their own rules.',
    pool: 'Manipulation + Persuasion',
    grants: [
      'Specialty: Medicine (Phlebotomy) or Persuasion (Vessels)',
      'Gain (•) Auspex or (•) Fortitude',
      'Gain one dot of Humanity',
    ],
    cost: [
      'Dark Secret (•) — Masquerade Breacher',
      'Prey Exclusion (•) — Non-consenting',
    ],
    coord: { x: 80, y: 60 },
  },
  {
    id: 'farmer', name: 'Farmer', sigil: Leaf,
    neighborhood: 'CENTRAL PARK · NIGHT',
    pitch: 'Animal blood. Cats, dogs, livestock. Survivable. Barely. The Beast hates you.',
    pool: 'Composure + Animal Ken',
    grants: [
      'Specialty: Animal Ken (Specific) or Survival (Hunting)',
      'Gain (•) Animalism or (•) Protean',
      'Gain one dot of Humanity',
    ],
    cost: ['Feeding (••) — Vegan'],
    coord: { x: 32, y: 22 },
  },
  {
    id: 'osiris', name: 'Osiris', sigil: Theater,
    neighborhood: 'CHELSEA · CULT SOCIETIES',
    pitch: 'A cult. A church. A fan club. They worship you and offer their throats willingly.',
    pool: 'Manipulation + Subterfuge',
    grants: [
      'Specialty: Occult or Performance',
      'Gain (•) Blood Sorcery or (•) Presence',
      'Spend three dots between Fame and Herd',
    ],
    cost: ['Spend two dots between Enemies and Mythic Flaws'],
    coord: { x: 26, y: 50 },
  },
  {
    id: 'sandman', name: 'Sandman', sigil: MoonIcon,
    neighborhood: 'UPPER EAST SIDE · PENTHOUSES',
    pitch: 'Sleeping victims. Bedrooms, hospitals, dorm rooms. They never wake. Usually.',
    pool: 'Dexterity + Stealth',
    grants: [
      'Specialty: Medicine (Anesthetics) or Stealth (Break-in)',
      'Gain (•) Auspex or (•) Obfuscate',
      'Resources (•)',
    ],
    cost: [],
    coord: { x: 40, y: 27 },
  },
  {
    id: 'scene_queen', name: 'Scene Queen', sigil: Music,
    neighborhood: 'MEATPACKING · CLUBS',
    pitch: 'You feed in a subculture you helped build. Goth clubs, punk basements — your hunting ground.',
    pool: 'Manipulation + Persuasion',
    grants: [
      'Specialty: Etiquette / Leadership / Streetwise (scene)',
      'Gain (•) Dominate or (•) Potence',
      'Fame (•) within the scene',
      'Contact (•)',
    ],
    cost: ['Enemy (••) — A rival in the scene'],
    coord: { x: 22, y: 52 },
  },
  {
    id: 'siren', name: 'Siren', sigil: Heart,
    neighborhood: 'SOHO · ART DISTRICT',
    pitch: 'Seduction. The kiss feels like ecstasy. They beg you to come back next week.',
    pool: 'Charisma + Subterfuge',
    grants: [
      'Specialty: Persuasion or Subterfuge (Seduction)',
      'Gain (•) Fortitude or (•) Presence',
      'Looks Merit (••) — Beautiful',
    ],
    cost: ['Enemy (•) — A spurned admirer or jealous spouse'],
    coord: { x: 30, y: 58 },
  },
];

export const getPredatorType = (id) => PREDATOR_TYPES.find((p) => p.id === id) || null;
