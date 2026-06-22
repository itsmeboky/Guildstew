// Armor categorization by item name + per-item skill bonus aggregator.
// Lifted verbatim from the prototype.
//
//   ARMOR_TYPE_FROM_NAME  — best-guess unarmored/light/medium/heavy from an item label.
//   ITEM_SKILL_BONUSES    — table of items that grant a skill bonus or are required to act.
//                            Foundry import populates this from system.bonuses.skills.
//   computeItemSkillBonuses(data) — aggregates inventory bonuses (item bonuses don't stack).

export const ARMOR_TYPE_FROM_NAME = (name) => {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes('plate') || n.includes('chain mail') || n.includes('full plate') || n.includes('half plate')) return 'heavy';
  if (n.includes('chain shirt') || n.includes('hide') || n.includes('scale') || n.includes('breastplate') || n.includes('brigandine')) return 'medium';
  if (n.includes('leather') || n.includes('padded') || n.includes('studded')) return 'light';
  if (n.includes('clothing') || n.includes('robe') || n.includes('tunic')) return 'unarmored';
  return null;
};

export const ITEM_SKILL_BONUSES = {
  'Healer\'s Toolkit':            { skill: 'Medicine',   bonus: 1 },
  'Expanded Healer\'s Toolkit':   { skill: 'Medicine',   bonus: 1 },
  'Climbing Kit':                 { skill: 'Athletics',  bonus: 1, conditional: 'climbing only' },
  'Disguise Kit':                 { skill: 'Deception',  bonus: 1, conditional: 'disguises only' },
  'Religious Symbol':             { skill: 'Religion',   bonus: 0, conditional: 'required to cast' },
  'Artisan\'s Tools':             { skill: 'Crafting',   bonus: 0, conditional: 'required to Craft' },
  'Thieves\' Tools':              { skill: 'Thievery',   bonus: 0, conditional: 'required to disable locks/traps' },
  'Lockpicks':                    { skill: 'Thievery',   bonus: 0, conditional: 'required for locks' },
  'Lantern':                      { skill: 'Perception', bonus: 0, conditional: 'illuminates 20 ft' },
  'Lesser Bag of Holding':        { skill: null,         bonus: 0, conditional: '+25 Bulk capacity' },
};

export const computeItemSkillBonuses = (data) => {
  const out = {};
  for (const item of (data.loadout || [])) {
    const bonus = ITEM_SKILL_BONUSES[item.name];
    if (!bonus || !bonus.skill || bonus.bonus === 0) continue;
    // Item bonuses don't stack — take highest per skill
    if (!out[bonus.skill] || bonus.bonus > out[bonus.skill]) {
      out[bonus.skill] = bonus.bonus;
    }
  }
  return out;
};
