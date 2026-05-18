// Per-ancestry new-player guidance.
// complexity: 'easy' | 'intermediate' | 'advanced'
// tip: 2–3 sentences of plain-English guidance shown in the
//      "For New Players" panel on StepAncestry.
//
// Keyed by the ancestry slug (`ANCESTRIES[*].id` from data/ancestries.json).
// Missing slugs fall through to the `getAncestryTip` default below.

export const ANCESTRY_TIPS = {
  human: {
    complexity: 'easy',
    tip: "The default fantasy choice. Two free ability boosts, a free 1st-level feat, and flexible heritages make humans the most adaptable ancestry. Strong pick for a first PF2e character.",
  },
  dwarf: {
    complexity: 'easy',
    tip: "Tough and durable. Constitution and Wisdom boosts pair with most classes. Darkvision and clan dagger fit a clear fantasy. Forgiving for new players.",
  },
  elf: {
    complexity: 'easy',
    tip: "Long-lived and observant. Dexterity and Intelligence boosts shine for ranged martials and casters. Low-light vision. A safe, classic pick.",
  },
  halfling: {
    complexity: 'easy',
    tip: "Small, sneaky, and lucky. Dexterity and Wisdom boosts plus Halfling Luck make for forgiving gameplay. Great fit for new rogues, rangers, and bards.",
  },
  gnome: {
    complexity: 'easy',
    tip: "Curious and magical. Constitution and Charisma boosts plus a primal innate spell. Fey ties give flavor without complexity. Approachable.",
  },
  goblin: {
    complexity: 'easy',
    tip: "Reckless, fast, and fearless. Dexterity and Charisma boosts with a chaotic toolkit. Good when you want personality on your sleeve.",
  },
  leshy: {
    complexity: 'intermediate',
    tip: "Sentient plant beings — heavy on roleplay flavor. Mechanics are simple, but unusual anatomy (no need to eat, sometimes no sleep) can surprise newer players.",
  },
  catfolk: {
    complexity: 'intermediate',
    tip: "Mobile and curious. Good for ambush-style martials. Some heritages reward tactical positioning over raw stat optimization.",
  },
  hobgoblin: {
    complexity: 'intermediate',
    tip: "Disciplined and tough. Iron Fed and Smokeworker heritages reward specific tactical play. Slightly more setup than starter ancestries.",
  },
  orc: {
    complexity: 'intermediate',
    tip: "Strong and resilient. Ferocity is forgiving for tank builds, but managing the dying state cleanly takes a session or two of practice.",
  },
  tengu: {
    complexity: 'intermediate',
    tip: "Crow folk with weapon flexibility. Multiple weapon familiarities reward planning your weapon choices at character build, not mid-campaign.",
  },
  ratfolk: {
    complexity: 'intermediate',
    tip: "Small, sociable, and chittery. Cheek pouches give inventory tricks. Not hard, just unusual.",
  },
  nephilim: {
    complexity: 'intermediate',
    tip: "Planar-touched heritage replacing the old Tiefling/Aasimar/Genasi split. Mechanically straightforward, narratively dense — fits players who like backstory hooks.",
  },
  kobold: {
    complexity: 'intermediate',
    tip: "Draconic and clever. Various draconic exemplar heritages give different elemental flavors. Squishy at low levels, but charm and Dex carry you.",
  },
  athamaru: {
    complexity: 'advanced',
    tip: "Aquatic salamander people. Many feats and heritage options ONLY work in or near water — best in an aquatic campaign, or paired with a party that fights near coasts.",
  },
  automaton: {
    complexity: 'advanced',
    tip: "Constructed beings with unique repair mechanics and trait interactions. Healing works differently, and you interact with both 'object' and 'creature' rules. Lots of moving parts.",
  },
  awakened_animal: {
    complexity: 'advanced',
    tip: "Play a sapient animal — works best with a creative GM. Mechanics overlap with familiars and animal companions in ways that can confuse newer players.",
  },
  centaur: {
    complexity: 'advanced',
    tip: "Large size at level 1 changes how you interact with movement, terrain, and squeezing through doorways. Mechanically distinct from every other ancestry.",
  },
  skeleton: {
    complexity: 'advanced',
    tip: "Undead PC. Positive damage hurts you; negative damage heals you. Powerful at high levels but requires constant accounting for healing and condition immunities.",
  },
  conrasu: {
    complexity: 'advanced',
    tip: "Spirit-folded constructs from another plane. Niche fantasy, niche mechanics. Pick if their lore grabs you specifically.",
  },
  fetchling: {
    complexity: 'advanced',
    tip: "Shadow-touched humans from the Plane of Shadow. Mechanics are accessible; the lore investment is the heavier ask.",
  },
  fleshwarp: {
    complexity: 'advanced',
    tip: "Beings reshaped by alchemy or magic. Mechanically flexible (size varies by heritage) but appearance is intentionally unsettling — discuss with table before picking.",
  },
  strix: {
    complexity: 'advanced',
    tip: "Winged humanoids with limited flight at low levels. Flight rules in PF2e are strict; not for a first character.",
  },
  vanara: {
    complexity: 'intermediate',
    tip: "Monkey-folk with prehensile tails. Climb-focused movement and Dex/Wis boosts. Approachable if you like mobility-heavy play.",
  },
  ysoki: {
    complexity: 'intermediate',
    tip: "Spacefaring ratfolk variant — Starfinder crossover ancestry. Same cheek-pouch tricks, more sci-fi flavor.",
  },
};

export function getAncestryTip(slug) {
  return ANCESTRY_TIPS[slug] || {
    complexity: 'intermediate',
    tip: "Pick this ancestry if its lore or visuals speak to you. Mechanics are summarized in the statblock above — pair Dex-heavy ancestries with finesse classes, Str-heavy with martial frontliners.",
  };
}
