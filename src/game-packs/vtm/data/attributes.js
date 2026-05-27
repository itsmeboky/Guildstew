// V5 attribute layout — three categories of three. ATTRIBUTE_PRIORITY
// is the priority-distribution rule the picker enforces: exactly one
// 4 (primary peak), three 3s (good), four 2s (passable), one 1
// (weak). Reading the keys/values right-to-left: "spend 1 dot on a 4,
// 3 dots on 3s, 4 dots on 2s, 1 dot on a 1". The audit on this math
// is fixed — do not adjust it.

export const ATTRIBUTE_CATEGORIES = {
  Physical: ['Strength', 'Dexterity', 'Stamina'],
  Social:   ['Charisma', 'Manipulation', 'Composure'],
  Mental:   ['Intelligence', 'Wits', 'Resolve'],
};

export const ALL_ATTRIBUTES = [
  ...ATTRIBUTE_CATEGORIES.Physical,
  ...ATTRIBUTE_CATEGORIES.Social,
  ...ATTRIBUTE_CATEGORIES.Mental,
];

export const ATTRIBUTE_PRIORITY = { 4: 1, 3: 3, 2: 4, 1: 1 };
