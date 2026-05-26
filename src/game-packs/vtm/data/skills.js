// V5 skills + the three skill-distribution approaches the prototype
// offers in the Education step. Each `dist` is a map from rating →
// number-of-skills-at-that-rating; the picker hands the player that
// pool to allocate across the 27 skills.
//
// Jack: 1@3, 8@2, 10@1 → 19 skills filled, 8 untrained.
// Balanced: 3@3, 5@2, 7@1 → 15 skills filled, 12 untrained.
// Specialist: 1@4, 3@3, 3@2, 3@1 → 10 skills filled, 17 untrained.
//
// Verified against the V5 corebook. Do not adjust.

export const SKILL_CATEGORIES = {
  Physical: [
    'Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms',
    'Larceny', 'Melee', 'Stealth', 'Survival',
  ],
  Social: [
    'Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership',
    'Performance', 'Persuasion', 'Streetwise', 'Subterfuge',
  ],
  Mental: [
    'Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine',
    'Occult', 'Politics', 'Science', 'Technology',
  ],
};

export const ALL_SKILLS = [
  ...SKILL_CATEGORIES.Physical,
  ...SKILL_CATEGORIES.Social,
  ...SKILL_CATEGORIES.Mental,
];

export const SKILL_APPROACHES = {
  Jack: {
    name: 'Jack of All Trades',
    blurb: 'Adequate at everything. Exceptional at nothing.',
    dist: { 3: 1, 2: 8, 1: 10 },
  },
  Balanced: {
    name: 'Balanced',
    blurb: 'Competent across the board. The default for most Kindred.',
    dist: { 3: 3, 2: 5, 1: 7 },
  },
  Specialist: {
    name: 'Specialist',
    blurb: 'Virtuoso at one thing. Sharp in a few others. Blind elsewhere.',
    dist: { 4: 1, 3: 3, 2: 3, 1: 3 },
  },
};
