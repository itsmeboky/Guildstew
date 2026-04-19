/**
 * D&D 5e Action Resolver
 *
 * Categorizes actions into their correct roll type so the combat system
 * routes to the right dice flow instead of treating everything as an attack.
 * 
 * Roll Types:
 *   "attack"       → d20 + attack mod vs AC → damage roll on hit
 *   "skill_check"  → d20 + skill mod vs DC (GM sets DC)
 *   "saving_throw" → target rolls d20 + save mod vs caster's Spell DC
 *   "no_roll"      → just applies the effect, uses the action
 * 
 * Action Costs:
 *   "action"       → uses the character's Action for the turn
 *   "bonus"        → uses the Bonus Action
 *   "reaction"     → uses the Reaction (not tracked per-turn in action bar, but noted)
 *   "free"         → doesn't cost anything (toggling non-lethal, etc.)
 */

import {
  abilityModifier,
  proficiencyBonus,
  SKILL_ABILITIES,
  SPELLCASTING_ABILITY,
  CLASS_SAVING_THROWS,
  cantripScaling,
} from '@/components/dnd5e/dnd5eRules';

// Actions from the CombatActionBar and what they actually are
const BASIC_ACTION_TYPES = {
  // Attack actions — d20 + mod vs AC, then damage
  "Attack":         { rollType: "attack", cost: "action", description: "Make a melee or ranged attack" },
  "Melee Attack":   { rollType: "attack", cost: "action", description: "Make a melee weapon attack" },
  "Ranged Attack":  { rollType: "attack", cost: "action", description: "Make a ranged weapon attack" },
  
  // Skill check actions — d20 + skill mod vs DC
  "Grapple":        { rollType: "skill_check", cost: "action", skill: "Athletics", contested: "Athletics or Acrobatics", description: "Grapple a creature (Athletics vs Athletics/Acrobatics)" },
  "Shove":          { rollType: "skill_check", cost: "action", skill: "Athletics", contested: "Athletics or Acrobatics", description: "Shove a creature (Athletics vs Athletics/Acrobatics)" },
  "Hide":           { rollType: "skill_check", cost: "action", skill: "Stealth", description: "Make a Stealth check to hide" },

  // Fire-and-forget utility actions — just consume the action, no dice.
  // (Throw is handled as a plain action here even though RAW it's a
  // weapon attack roll; the tool treats it as a flavor action the GM
  // narrates.)
  "Throw":          { rollType: "no_roll", cost: "action", description: "Throw a weapon or object" },
  
  // No-roll actions — just use the action, no dice needed
  "Dash":           { rollType: "no_roll", cost: "action", description: "Double your movement speed this turn" },
  "Disengage":      { rollType: "no_roll", cost: "action", description: "Your movement doesn't provoke opportunity attacks this turn" },
  "Dodge":          { rollType: "no_roll", cost: "action", description: "Attacks against you have disadvantage until your next turn" },
  "Help":           { rollType: "no_roll", cost: "action", description: "Give an ally advantage on their next ability check or attack roll" },
  "Ready Action":   { rollType: "no_roll", cost: "action", description: "Prepare an action to trigger on a condition" },
  "Use Object":     { rollType: "no_roll", cost: "action", description: "Use an item or object" },
  
  // Modifiers — don't cost anything
  "Non-Lethal":     { rollType: "modifier", cost: "free", description: "Toggle: melee attacks knock unconscious instead of killing" },
};

// Bonus action spells (common ones)
const BONUS_ACTION_SPELLS = new Set([
  "Healing Word", "Misty Step", "Spiritual Weapon", "Shield of Faith",
  "Hex", "Hunter's Mark", "Compelled Duel", "Divine Favor",
  "Expeditious Retreat", "Sanctuary", "Thunderous Smite",
  "Branding Smite", "Magic Weapon", "Mass Healing Word",
  "Shillelagh", "Swift Quiver", "Banishing Smite",
  "Staggering Smite", "Holy Weapon",
]);

// Reaction spells
const REACTION_SPELLS = new Set([
  "Shield", "Counterspell", "Absorb Elements", "Feather Fall",
  "Hellish Rebuke",
]);

// Base damage dice for spells that actually deal damage. Keyed by
// spell name. Cantrip dice listed here are the level-1–4 tier; caller
// can scale for higher caster levels via `getSpellDamageDice`. Multi-
// roll spells (Scorching Ray, Eldritch Blast, Magic Missile) list dice
// per ray / missile — the GM / renderer can multiply.
const SPELL_DAMAGE_DICE = {
  // --- Cantrips ---
  "Acid Splash": "1d6",
  "Chill Touch": "1d8",
  "Eldritch Blast": "1d10",
  "Fire Bolt": "1d10",
  "Frostbite": "1d6",
  "Infestation": "1d6",
  "Magic Stone": "1d6",
  "Poison Spray": "1d12",
  "Produce Flame": "1d8",
  "Ray of Frost": "1d8",
  "Sacred Flame": "1d8",
  "Shocking Grasp": "1d8",
  "Sword Burst": "1d6",
  "Thorn Whip": "1d6",
  "Thunderclap": "1d6",
  "Toll the Dead": "1d8",
  "Vicious Mockery": "1d4",
  "Word of Radiance": "1d6",
  "Create Bonfire": "1d8",
  "Control Flames": "1d8",
  "Primal Savagery": "1d10",
  // --- 1st Level ---
  "Burning Hands": "3d6",
  "Chromatic Orb": "3d8",
  "Cure Wounds": "1d8",
  "Ensnaring Strike": "1d6",
  "Faerie Fire": "0",
  "Guiding Bolt": "4d6",
  "Hail of Thorns": "1d10",
  "Healing Word": "1d4",
  "Hellish Rebuke": "2d10",
  "Ice Knife": "1d10",
  "Inflict Wounds": "3d10",
  "Magic Missile": "1d4+1",
  "Ray of Sickness": "2d8",
  "Searing Smite": "1d6",
  "Thunderous Smite": "2d6",
  "Thunderwave": "2d8",
  "Witch Bolt": "1d12",
  "Wrathful Smite": "1d6",
  // --- 2nd Level ---
  "Acid Arrow": "4d4",
  "Aganazzar's Scorcher": "3d8",
  "Cloud of Daggers": "4d4",
  "Dragon's Breath": "3d6",
  "Flame Blade": "3d6",
  "Flaming Sphere": "2d6",
  "Heat Metal": "2d8",
  "Melf's Acid Arrow": "4d4",
  "Mind Spike": "3d8",
  "Moonbeam": "2d10",
  "Scorching Ray": "2d6",
  "Shatter": "3d8",
  "Snilloc's Snowball Swarm": "3d6",
  "Spiritual Weapon": "1d8",
  // --- 3rd Level ---
  "Call Lightning": "3d10",
  "Conjure Barrage": "3d8",
  "Erupting Earth": "3d12",
  "Fireball": "8d6",
  "Lightning Arrow": "4d8",
  "Lightning Bolt": "8d6",
  "Spirit Guardians": "3d8",
  "Vampiric Touch": "3d6",
  // --- 4th Level ---
  "Blight": "8d8",
  "Fire Shield": "2d8",
  "Ice Storm": "4d6",
  "Sickening Radiance": "4d10",
  "Storm Sphere": "2d6",
  "Vitriolic Sphere": "10d4",
  "Wall of Fire": "5d8",
  // --- 5th Level ---
  "Cloudkill": "5d8",
  "Cone of Cold": "8d8",
  "Destructive Wave": "10d6",
  "Flame Strike": "8d6",
  "Immolation": "8d6",
  "Insect Plague": "4d10",
  "Steel Wind Strike": "6d10",
  // --- 6th Level ---
  "Chain Lightning": "10d8",
  "Disintegrate": "10d6+40",
  "Harm": "14d6",
  "Investiture of Flame": "4d6",
  "Investiture of Ice": "4d6",
  "Sunbeam": "6d8",
  // --- 7th Level ---
  "Crown of Stars": "4d12",
  "Delayed Blast Fireball": "12d6",
  "Finger of Death": "7d8+30",
  "Fire Storm": "7d10",
  "Prismatic Spray": "10d6",
  // --- 8th Level ---
  "Abi-Dalzim's Horrid Wilting": "12d8",
  "Earthquake": "5d6",
  "Incendiary Cloud": "10d8",
  // --- 9th Level ---
  "Meteor Swarm": "40d6",
  "Power Word Kill": "0",
  "Psychic Scream": "14d6",
};

/**
 * Return the base damage dice for a spell (e.g. "3d6"), or null if the
 * spell isn't in the table / doesn't deal damage. Callers can decide
 * how to upcast / scale by caster level.
 */
export function getSpellDamageDice(spellName) {
  if (!spellName) return null;
  const dice = SPELL_DAMAGE_DICE[spellName];
  if (!dice || dice === "0") return null;
  return dice;
}

/**
 * Post-resolution effect map. After a spell's attack / save finishes,
 * look the spell up here to decide what ACTUALLY happens next:
 *   - damage             → roll `dice` (optionally cantrip-scaled) and apply to target HP
 *   - heal               → roll `dice` and ADD to target HP (caps at max)
 *   - condition          → skip damage, apply a text label to the target
 *   - damage_condition   → damage as above, then apply condition
 *   - buff               → apply a buff label to the caster / ally
 *   - debuff             → apply a debuff label to the target
 *   - utility            → GM-narrated, just show the note
 *
 * Fields:
 *   dice        → base dice string (e.g. "3d6", "2d8+4d6")
 *   flat        → fixed amount (e.g. Heal = 70 HP)
 *   type        → damage type label
 *   scaling     → "cantrip" → getScaledDice scales with caster level
 *   addMod      → heal spells add spellcasting ability mod to the result
 *   autoHit     → skip the attack roll (Magic Missile)
 *   multiAttack → this many attack rolls (Scorching Ray, Eldritch Blast)
 *   condition   → label applied on success (e.g. "Paralyzed")
 *   buff        → buff description text
 *   debuff      → debuff description text
 *   note        → GM-only narrative blurb for utility spells
 */
/**
 * Hardcoded fallback effects for the most common combat spells. The
 * live database (campaign `spells` + global `dnd5e_spells`) is the
 * primary source — every spell row gets auto-classified from its
 * description via `classifySpellEffect`. This fallback only fills in
 * spells where the auto-classifier might get it wrong or the spell
 * hasn't been seeded yet.
 */
export const SPELL_EFFECTS_FALLBACK = {
  // DAMAGE spells — roll damage dice, subtract from target HP
  "Fire Bolt":        { effect: "damage", dice: "1d10", type: "fire", scaling: "cantrip" },
  "Eldritch Blast":   { effect: "damage", dice: "1d10", type: "force", scaling: "cantrip" },
  "Sacred Flame":     { effect: "damage", dice: "1d8", type: "radiant", scaling: "cantrip" },
  "Chill Touch":      { effect: "damage", dice: "1d8", type: "necrotic", scaling: "cantrip" },
  "Ray of Frost":     { effect: "damage", dice: "1d8", type: "cold", scaling: "cantrip" },
  "Acid Splash":      { effect: "damage", dice: "1d6", type: "acid", scaling: "cantrip" },
  "Poison Spray":     { effect: "damage", dice: "1d12", type: "poison", scaling: "cantrip" },
  "Shocking Grasp":   { effect: "damage", dice: "1d8", type: "lightning", scaling: "cantrip" },
  "Thorn Whip":       { effect: "damage", dice: "1d6", type: "piercing", scaling: "cantrip" },
  "Vicious Mockery":  { effect: "damage", dice: "1d4", type: "psychic", scaling: "cantrip" },
  "Produce Flame":    { effect: "damage", dice: "1d8", type: "fire", scaling: "cantrip" },
  "Burning Hands":    { effect: "damage", dice: "3d6", type: "fire", upcastPerLevel: "1d6" },
  "Chromatic Orb":    { effect: "damage", dice: "3d8", type: "varies", upcastPerLevel: "1d8" },
  "Guiding Bolt":     { effect: "damage", dice: "4d6", type: "radiant", upcastPerLevel: "1d6" },
  "Inflict Wounds":   { effect: "damage", dice: "3d10", type: "necrotic", upcastPerLevel: "1d10" },
  "Magic Missile":    { effect: "damage", dice: "3d4+3", type: "force", autoHit: true, upcastPerLevel: "1d4+1" },
  "Thunderwave":      { effect: "damage", dice: "2d8", type: "thunder", upcastPerLevel: "1d8" },
  "Shatter":          { effect: "damage", dice: "3d8", type: "thunder", upcastPerLevel: "1d8" },
  "Scorching Ray":    { effect: "damage", dice: "2d6", type: "fire", multiAttack: 3 },
  "Fireball":         { effect: "damage", dice: "8d6", type: "fire", upcastPerLevel: "1d6" },
  "Lightning Bolt":   { effect: "damage", dice: "8d6", type: "lightning", upcastPerLevel: "1d6" },
  "Call Lightning":   { effect: "damage", dice: "3d10", type: "lightning", upcastPerLevel: "1d10" },
  "Ice Storm":        { effect: "damage", dice: "2d8+4d6", type: "bludgeoning+cold" },
  "Blight":           { effect: "damage", dice: "8d8", type: "necrotic", upcastPerLevel: "1d8" },
  "Cone of Cold":     { effect: "damage", dice: "8d8", type: "cold", upcastPerLevel: "1d8" },
  "Cloudkill":        { effect: "damage", dice: "5d8", type: "poison", upcastPerLevel: "1d8" },

  // DAMAGE + CONDITION
  "Ray of Sickness":  { effect: "damage_condition", dice: "2d8", type: "poison", condition: "Poisoned", upcastPerLevel: "1d8" },

  // HEALING spells — roll dice, ADD to target HP (capped at max)
  "Cure Wounds":      { effect: "heal", dice: "1d8", addMod: true, upcastPerLevel: "1d8" },
  "Healing Word":     { effect: "heal", dice: "1d4", addMod: true, upcastPerLevel: "1d4" },
  "Mass Healing Word": { effect: "heal", dice: "1d4", addMod: true, upcastPerLevel: "1d4" },
  "Mass Cure Wounds": { effect: "heal", dice: "3d8", addMod: true, upcastPerLevel: "1d8" },
  "Heal":             { effect: "heal", flat: 70 },

  // CONDITION-ONLY spells — apply a condition tag, no damage
  "Hold Person":      { effect: "condition", condition: "Paralyzed" },
  "Hold Monster":     { effect: "condition", condition: "Paralyzed" },
  "Faerie Fire":      { effect: "condition", condition: "Outlined (advantage on attacks)" },
  "Blindness/Deafness": { effect: "condition", condition: "Blinded" },
  "Entangle":         { effect: "condition", condition: "Restrained" },
  "Web":              { effect: "condition", condition: "Restrained" },
  "Fear":             { effect: "condition", condition: "Frightened" },
  "Charm Person":     { effect: "condition", condition: "Charmed" },
  "Dominate Person":  { effect: "condition", condition: "Charmed" },
  "Command":          { effect: "condition", condition: "Commanded" },
  "Suggestion":       { effect: "condition", condition: "Charmed" },
  "Hypnotic Pattern": { effect: "condition", condition: "Incapacitated" },
  "Banishment":       { effect: "condition", condition: "Banished" },
  "Polymorph":        { effect: "condition", condition: "Polymorphed" },
  "Confusion":        { effect: "condition", condition: "Confused" },
  "Crown of Madness": { effect: "condition", condition: "Charmed" },
  "Bestow Curse":     { effect: "condition", condition: "Cursed" },
  "Stinking Cloud":   { effect: "condition", condition: "Incapacitated" },
  "Calm Emotions":    { effect: "condition", condition: "Calmed" },
  "Enlarge/Reduce":   { effect: "condition", condition: "Enlarged/Reduced" },

  // BUFF spells — apply a beneficial effect to self or ally
  "Bless":            { effect: "buff", buff: "+1d4 attacks and saves" },
  "Shield of Faith":  { effect: "buff", buff: "+2 AC" },
  "Haste":            { effect: "buff", buff: "Hasted" },
  "Greater Invisibility": { effect: "buff", buff: "Invisible" },
  "Mage Armor":       { effect: "buff", buff: "AC = 13 + DEX" },
  "Heroism":          { effect: "buff", buff: "Immune to Frightened, +spellmod temp HP per turn" },
  "Shield":           { effect: "buff", buff: "+5 AC until next turn" },
  "Blade Ward":       { effect: "buff", buff: "Resistance to bludgeoning/piercing/slashing" },

  // DEBUFF — ongoing effects on enemies
  "Bane":             { effect: "debuff", debuff: "-1d4 attacks and saves" },
  "Hex":              { effect: "debuff", debuff: "+1d6 necrotic on hits, disadvantage on chosen ability" },
  "Hunter's Mark":    { effect: "debuff", debuff: "+1d6 damage on hits" },

  // UTILITY — no mechanical effect tracked, GM describes result
  "Darkness":         { effect: "utility", note: "15ft radius magical darkness" },
  "Silence":          { effect: "utility", note: "20ft radius no sound, blocks verbal spells" },
  "Misty Step":       { effect: "utility", note: "Teleport 30ft" },
  "Counterspell":     { effect: "utility", note: "Negate a spell being cast" },
  "Dispel Magic":     { effect: "utility", note: "End one spell effect" },
  "Detect Magic":     { effect: "utility", note: "Sense magic within 30ft" },
  "Tongues":          { effect: "utility", note: "Understand any language" },
  "Plant Growth":     { effect: "utility", note: "Area becomes difficult terrain" },
  "Wall of Force":    { effect: "utility", note: "Invisible wall, nothing passes through" },
  "Wall of Stone":    { effect: "utility", note: "Stone wall, 10 panels" },
  "Wall of Fire":     { effect: "damage", dice: "5d8", type: "fire", note: "Creates wall, damages on entry or within 10ft" },
};

/**
 * Return the resolved effect definition for a spell, or null if the
 * spell isn't in the map (callers should fall back to the default
 * attack → damage pipeline with a 1d10 stand-in).
 */
/**
 * Look up a spell's post-roll effect. Preferred order:
 *   1. Hardcoded SPELL_EFFECTS_FALLBACK (curated for accuracy)
 *   2. Auto-classified from the provided spell row's description
 *   3. null (caller falls back to the generic damage pipeline)
 *
 * `spellData` is the row from the `spells` / `dnd5e_spells` table —
 * callers typically look it up in the cached `fullSpellsList` query
 * and pass it through.
 */
export function getSpellEffect(spellName, spellData = null) {
  if (!spellName) return null;
  if (SPELL_EFFECTS_FALLBACK[spellName]) return SPELL_EFFECTS_FALLBACK[spellName];
  if (spellData) return classifySpellEffect(spellData);
  return null;
}

/**
 * Derive an effect descriptor for a spell by parsing its description
 * text. This is the "auto-classifier" that powers the database-driven
 * spell effects system — any spell row with a description gets a
 * best-effort effect type even if it isn't in the hardcoded fallback.
 *
 * Priority:
 *   heal > damage_condition > condition > damage > utility
 *
 * Returns the same shape as SPELL_EFFECTS_FALLBACK entries:
 *   { effect, dice?, condition?, type?, addMod?, note? }
 */
export function classifySpellEffect(spell) {
  if (!spell || typeof spell !== "object") return { effect: "utility", note: "GM describes the effect" };

  // Exact name match wins even when called directly on a row.
  if (spell.name && SPELL_EFFECTS_FALLBACK[spell.name]) {
    return SPELL_EFFECTS_FALLBACK[spell.name];
  }

  const desc = (spell.description || "").toLowerCase();
  if (!desc) {
    return { effect: "utility", note: spell.description || "GM describes the effect" };
  }

  const diceMatch = desc.match(/(\d+d\d+)/);
  const firstDice = diceMatch ? diceMatch[1] : null;

  // --- Higher level / upcast rule sniff ---
  // "At Higher Levels. When you cast this spell using a spell slot of
  // Nth level or higher, the damage/healing increases by 1d6 for each
  // slot level above Nth." — grab the first extra-dice expression.
  const upcastSection = desc.includes("higher level") || desc.includes("higher levels");
  const upcastDiceMatch = upcastSection
    ? desc.match(/increases? by (\d+d\d+)/i) ||
      desc.match(/(\d+d\d+)\s+for each slot level above/i) ||
      desc.match(/extra (\d+d\d+)/i)
    : null;
  const detectedUpcast = upcastDiceMatch ? upcastDiceMatch[1] : null;

  // --- Healing ---
  const mentionsHeal =
    desc.includes("heal") ||
    (desc.includes("regain") && desc.includes("hit point")) ||
    (desc.includes("restore") && desc.includes("hit point"));
  if (mentionsHeal && !desc.includes("damage")) {
    return {
      effect: "heal",
      dice: firstDice || "1d8",
      addMod: desc.includes("spellcasting ability modifier"),
      ...(detectedUpcast ? { upcastPerLevel: detectedUpcast } : {}),
    };
  }

  // --- Conditions ---
  const CONDITION_KEYWORDS = {
    paralyzed: "Paralyzed",
    charmed: "Charmed",
    frightened: "Frightened",
    restrained: "Restrained",
    blinded: "Blinded",
    stunned: "Stunned",
    poisoned: "Poisoned",
    incapacitated: "Incapacitated",
    prone: "Prone",
    invisible: "Invisible",
    petrified: "Petrified",
    deafened: "Deafened",
    grappled: "Grappled",
  };
  for (const [keyword, label] of Object.entries(CONDITION_KEYWORDS)) {
    if (desc.includes(keyword)) {
      // Damage + condition hybrid (Ray of Sickness, Contagion, etc.)
      if (firstDice && (desc.includes("damage") || desc.includes("hit point"))) {
        return {
          effect: "damage_condition",
          dice: firstDice,
          condition: label,
          ...(detectedUpcast ? { upcastPerLevel: detectedUpcast } : {}),
        };
      }
      return { effect: "condition", condition: label };
    }
  }

  // --- Damage ---
  if (firstDice && desc.includes("damage")) {
    const DAMAGE_TYPES = [
      "fire",
      "cold",
      "lightning",
      "thunder",
      "acid",
      "poison",
      "necrotic",
      "radiant",
      "force",
      "psychic",
      "bludgeoning",
      "piercing",
      "slashing",
    ];
    const damageType = DAMAGE_TYPES.find((t) => desc.includes(t)) || "magical";
    return {
      effect: "damage",
      dice: firstDice,
      type: damageType,
      ...(detectedUpcast ? { upcastPerLevel: detectedUpcast } : {}),
    };
  }

  // --- Default: utility ---
  return {
    effect: "utility",
    note: (spell.description || "").slice(0, 140) || "GM describes the effect",
  };
}

/**
 * Scale a cantrip's base dice by the caster's character level. Only
 * the number of dice is multiplied — the face count stays the same.
 *   L1–4  → ×1  (base)
 *   L5–10 → ×2
 *   L11–16→ ×3
 *   L17+  → ×4
 * Non-dice strings (e.g. "3d4+3", "2d8+4d6") are returned unchanged
 * because cantrip scaling shouldn't apply to leveled spell dice.
 */
export function getScaledDice(baseDice, casterLevel) {
  if (!baseDice || typeof baseDice !== "string") return baseDice;
  const match = baseDice.match(/^(\d+)d(\d+)$/);
  if (!match) return baseDice;
  const multiplier = cantripScaling(casterLevel);
  return `${parseInt(match[1], 10) * multiplier}d${match[2]}`;
}

/**
 * Upcast a leveled spell's damage / heal dice by `extraLevels` above
 * its base. `upcastPerLevel` is the per-level increment from the
 * SPELL_EFFECTS_FALLBACK entry (e.g. Fireball → "1d6", Magic Missile
 * → "1d4+1"). If no upcast rule is provided we fall back to adding
 * one base-face die per extra level, which is the most common 5e
 * convention and a reasonable default the GM can mentally correct.
 *
 * Handles three forms:
 *   base "NdF"           + per-level "MdF"       → collapse to "(N+M*k)dF"
 *   base "NdF+X"         + per-level "MdF" or +X → append "+Mk dF" / "+X*k"
 *   base with +flat      → append "+Mk*flat"
 */
export function getUpcastDice(baseDice, upcastPerLevel, extraLevels) {
  if (!baseDice || typeof baseDice !== "string") return baseDice;
  const levels = Math.max(0, Number.isFinite(extraLevels) ? extraLevels : 0);
  if (levels === 0) return baseDice;

  // Fallback: "+1 base face die per level" when no explicit rule.
  let perLevel = upcastPerLevel;
  if (!perLevel) {
    const baseMatch = baseDice.match(/^(\d+)d(\d+)/);
    if (!baseMatch) return baseDice;
    perLevel = `1d${baseMatch[2]}`;
  }

  // Parse the per-level increment. Supports "NdF", "NdF+M", or bare "M".
  const perDiceMatch = perLevel.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  const perFlatMatch = perLevel.match(/^\+?(\d+)$/);

  // Detect whether the base is a simple "NdF" we can collapse into.
  const simpleBaseMatch = baseDice.match(/^(\d+)d(\d+)$/);

  if (perDiceMatch) {
    const perN = parseInt(perDiceMatch[1], 10);
    const perF = parseInt(perDiceMatch[2], 10);
    const perFlat = perDiceMatch[3] ? parseInt(perDiceMatch[3], 10) : 0;
    const extraDice = perN * levels;
    const extraFlat = perFlat * levels;

    if (simpleBaseMatch) {
      const baseN = parseInt(simpleBaseMatch[1], 10);
      const baseF = parseInt(simpleBaseMatch[2], 10);
      if (baseF === perF && extraFlat === 0) {
        return `${baseN + extraDice}d${baseF}`;
      }
    }
    // Non-collapsible — append as a compound term.
    const extra = extraFlat > 0 ? `${extraDice}d${perF}+${extraFlat}` : `${extraDice}d${perF}`;
    return `${baseDice}+${extra}`;
  }

  if (perFlatMatch) {
    const extraFlat = parseInt(perFlatMatch[1], 10) * levels;
    return `${baseDice}+${extraFlat}`;
  }

  return baseDice;
}

// Spells categorized by whether they use attack rolls or saving throws
const SPELL_ATTACK_SPELLS = new Set([
  // Cantrips
  "Chill Touch", "Eldritch Blast", "Fire Bolt", "Produce Flame",
  "Ray of Frost", "Shocking Grasp", "Thorn Whip",
  // 1st Level
  "Chromatic Orb", "Guiding Bolt", "Inflict Wounds", "Ray of Sickness",
  "Witch Bolt",
  // 2nd Level
  "Melf's Acid Arrow", "Scorching Ray",
  // 3rd Level
  "Vampiric Touch",
  // 4th Level
  "Blight",
  // Higher
  "Contagion", "Disintegrate", "Finger of Death",
]);

const SPELL_SAVE_MAP = {
  // Cantrips
  "Acid Splash": "dex", "Sacred Flame": "dex", "Vicious Mockery": "wis",
  "Poison Spray": "con",
  // 1st Level  
  "Bane": "cha", "Burning Hands": "dex", "Charm Person": "wis",
  "Command": "wis", "Compelled Duel": "wis", "Earth Tremor": "dex",
  "Entangle": "str", "Faerie Fire": "dex", "Hellish Rebuke": "dex",
  "Thunderwave": "con", "Wrathful Smite": "wis",
  // 2nd Level
  "Blindness/Deafness": "con", "Calm Emotions": "cha",
  "Crown of Madness": "wis", "Detect Thoughts": "wis",
  "Enlarge/Reduce": "con", "Flaming Sphere": "dex",
  "Gust of Wind": "str", "Heat Metal": "con", "Hold Person": "wis",
  "Moonbeam": "con", "Phantasmal Force": "int", "Shatter": "con",
  "Suggestion": "wis", "Web": "dex", "Zone of Truth": "cha",
  // 3rd Level
  "Bestow Curse": "wis", "Call Lightning": "dex",
  "Fear": "wis", "Fireball": "dex", "Hypnotic Pattern": "wis",
  "Lightning Bolt": "dex", "Sleet Storm": "dex",
  "Spirit Guardians": "wis", "Stinking Cloud": "con",
  // 4th Level
  "Banishment": "cha", "Confusion": "wis", "Ice Storm": "dex",
  "Polymorph": "wis", "Wall of Fire": "dex",
  // 5th Level
  "Cloudkill": "con", "Cone of Cold": "con", "Dominate Person": "wis",
  "Hold Monster": "wis", "Wall of Stone": "dex",
};

// Spells that don't need any roll (buff/utility)
const NO_ROLL_SPELLS = new Set([
  "Bless", "Cure Wounds", "Detect Magic", "Healing Word", "Mage Armor",
  "Magic Missile", "Shield", "Misty Step", "Spiritual Weapon",
  "Counterspell", "Dispel Magic", "Haste", "Revivify",
  "Death Ward", "Greater Invisibility", "Mass Cure Wounds",
  "Heal", "Mass Healing Word", "True Seeing",
  "Dancing Lights", "Druidcraft", "Guidance", "Light", "Mage Hand",
  "Mending", "Message", "Minor Illusion", "Prestidigitation",
  "Resistance", "Spare the Dying", "Thaumaturgy", "True Strike",
  "Friends", "Blade Ward", "Heroism", "Hunter's Mark",
  "Shield of Faith", "Sleep", "Darkness", "Silence",
  "Counterspell", "Dispel Magic", "Plant Growth", "Tongues",
  "Wall of Force",
]);

/**
 * Determine the action cost (action, bonus, reaction, free) for a spell.
 */
function getSpellCost(spellName) {
  if (BONUS_ACTION_SPELLS.has(spellName)) return "bonus";
  if (REACTION_SPELLS.has(spellName)) return "reaction";
  return "action";
}

/**
 * Given an action from the CombatActionBar, determine the roll type, cost, and config.
 * 
 * @param {object} action - The action object from onActionClick
 * @param {object} actor - The character/monster performing the action
 * @returns {object} - { rollType, cost, skill, save, description, requiresTarget, ... }
 */
export function resolveAction(action, actor) {
  if (!action) return { rollType: "no_roll", cost: "free" };

  // === SPELL ACTIONS ===
  if (action.type === "spell") {
    const spellName = typeof action.name === "string" ? action.name : action.spell?.name || action.name;
    // Metamagic (Quickened Spell, etc.) and feature overrides flag the
    // action with `costOverride`; honour that so the downstream gate
    // charges the correct resource.
    const cost = action.costOverride || getSpellCost(spellName);
    
    // Spell attack (d20 vs AC)
    if (SPELL_ATTACK_SPELLS.has(spellName)) {
      return {
        rollType: "attack",
        attackType: "spell",
        cost,
        requiresTarget: true,
        description: `Spell Attack: ${spellName}`,
        spellName,
      };
    }
    
    // Saving throw spell
    if (SPELL_SAVE_MAP[spellName] !== undefined) {
      const saveType = SPELL_SAVE_MAP[spellName];
      if (saveType) {
        return {
          rollType: "saving_throw",
          save: saveType,
          cost,
          requiresTarget: true,
          description: `${spellName} — target makes a ${saveType.toUpperCase()} saving throw`,
          spellName,
        };
      }
    }

    // No-roll spell (buffs, heals, utility)
    if (NO_ROLL_SPELLS.has(spellName)) {
      return {
        rollType: "no_roll",
        cost,
        requiresTarget: spellName === "Cure Wounds" || spellName === "Healing Word" || spellName === "Inflict Wounds",
        description: `Cast ${spellName}`,
        spellName,
      };
    }
    
    // Default for unknown spells
    return {
      rollType: "attack",
      attackType: "spell",
      cost,
      requiresTarget: true,
      description: `Cast ${spellName}`,
      spellName,
    };
  }

  // === MONSTER/NPC ACTIONS ===
  if (action.type === "monster_action"
      || action.type === "villain_action"
      || action.attack_bonus !== undefined
      || action.damage) {
    // Normalise the action cost into the action economy vocabulary.
    const costTag = (action.action_cost || "").toLowerCase();
    const cost = action.costOverride
      || (costTag === "bonus_action" || costTag === "bonus action" || costTag === "bonus" ? "bonus"
        : costTag === "reaction" ? "reaction"
        : costTag === "free" || costTag === "legendary" || costTag === "lair" ? "free"
        : "action");
    const explicitType = (action.action_type || "").toLowerCase();
    // Save-based monster actions route through the saving_throw flow so
    // the dice window prompts the target for a save vs DC instead of
    // rolling a to-hit the monster doesn't have.
    if (explicitType === "saving_throw" || (action.save_dc && !action.attack_bonus)) {
      return {
        rollType: "saving_throw",
        save: (action.save_ability || "DEX").toLowerCase(),
        saveDC: action.save_dc ? Number(action.save_dc) : undefined,
        cost,
        requiresTarget: true,
        description: action.name || "Monster Save",
        weapon: action,
      };
    }
    if (explicitType === "no_roll") {
      return {
        rollType: "no_roll",
        cost,
        requiresTarget: false,
        description: action.name || "Monster Action",
      };
    }
    if (explicitType === "healing") {
      return {
        rollType: "no_roll",
        cost,
        requiresTarget: true,
        description: action.name || "Heal",
        healing: action.healing_dice,
      };
    }
    return {
      rollType: "attack",
      attackType: "monster",
      cost,
      requiresTarget: true,
      description: action.name || "Monster Attack",
      weapon: action,
    };
  }

  // === BASIC ACTIONS (from action bar) ===
  const basicAction = BASIC_ACTION_TYPES[action.name];
  if (basicAction) {
    return {
      ...basicAction,
      // Class features like Rogue Cunning Action and Monk Step of the Wind
      // let certain actions run as a bonus action instead of an action. The
      // caller (CombatActionBar bonus row) flags those with costOverride so
      // the action economy gate consumes the right pool.
      cost: action.costOverride || basicAction.cost,
      classFeature: action.classFeature || null,
      requiresTarget: basicAction.rollType === "attack" || action.name === "Grapple" || action.name === "Shove",
      weapon: action.weapon || null,
      mode: action.mode || null,
      isOffHand: action.isOffHand || false,
    };
  }

  // === WEAPON ATTACK (explicit) ===
  if (action.type === "basic" && action.name === "Attack") {
    const cost = action.isOffHand ? "bonus" : "action";
    return {
      rollType: "attack",
      attackType: "weapon",
      cost,
      requiresTarget: true,
      description: action.weapon ? `Attack with ${action.weapon.name}` : "Attack",
      weapon: action.weapon,
      mode: action.mode,
      isOffHand: action.isOffHand || false,
    };
  }

  // === FALLBACK ===
  return {
    rollType: "no_roll",
    cost: "action",
    description: action.name || "Unknown Action",
    requiresTarget: false,
  };
}

/**
 * Consume the action cost from the action economy state.
 * Returns the new actions state.
 *
 * @param {object} currentActions - { action: bool, bonus: bool, reaction: bool, inspiration: bool }
 * @param {string} cost - "action", "bonus", "reaction", "free"
 * @returns {object} - updated actions state
 */
export function consumeActionCost(currentActions, cost) {
  if (cost === "free") return currentActions;
  if (cost === "action") return { ...currentActions, action: false };
  if (cost === "bonus") return { ...currentActions, bonus: false };
  if (cost === "reaction") return { ...currentActions, reaction: false };
  return currentActions;
}

/**
 * Get the attack modifier for a character.
 */
export function getAttackModifier(actor, action, resolvedAction) {
  if (!actor) return 0;
  
  const profBonus = actor.proficiency_bonus || 2;
  const strMod = abilityModifier(actor.attributes?.str || 10);
  const dexMod = abilityModifier(actor.attributes?.dex || 10);
  
  // Spell attack
  if (resolvedAction?.attackType === "spell") {
    const spellAbility = getSpellcastingAbility(actor);
    const abilityMod = abilityModifier(actor.attributes?.[spellAbility] || 10);
    return profBonus + abilityMod;
  }
  
  // Monster action with explicit attack bonus
  if (action?.attack_bonus !== undefined) {
    return action.attack_bonus;
  }
  
  // Weapon attack
  const weapon = resolvedAction?.weapon || action?.weapon;
  const isRanged = weapon?.category?.includes("Ranged") || weapon?.properties?.includes("Finesse");
  const abilityMod = isRanged ? dexMod : strMod;
  
  return profBonus + abilityMod;
}

/**
 * Get the spell save DC for a caster.
 */
export function getSpellSaveDC(actor) {
  if (!actor) return 13;
  const profBonus = actor.proficiency_bonus || proficiencyBonus(actor.level || 1);
  const spellAbility = getSpellcastingAbility(actor);
  const abilMod = abilityModifier(actor.attributes?.[spellAbility] || 10);
  return 8 + profBonus + abilMod;
}

/**
 * Get the spellcasting ability for a class.
 */
export function getSpellcastingAbility(actor) {
  const charClass = actor?.class || actor?.stats?.class || "";
  return SPELLCASTING_ABILITY[charClass] || "cha";
}

/**
 * Get the skill modifier for a skill check.
 */
export function getSkillModifier(actor, skillName) {
  if (!actor) return 0;

  const ability = SKILL_ABILITIES[skillName] || "str";
  const abilityMod = abilityModifier(actor.attributes?.[ability] || 10);
  const profBonus = actor.proficiency_bonus || proficiencyBonus(actor.level || 1);

  const skills = actor.skills || {};
  const expertise = actor.expertise || [];

  const isProficient = skills[skillName];
  const hasExpertise = expertise.includes(skillName);

  if (hasExpertise) return abilityMod + (profBonus * 2);
  if (isProficient) return abilityMod + profBonus;
  return abilityMod;
}

/**
 * Get the saving throw modifier for a target. Uses CLASS_SAVING_THROWS
 * from the registry when the target has a class field but no explicit
 * saving_throws proficiency map.
 */
export function getSaveModifier(target, saveAbility) {
  if (!target) return 0;

  const abilMod = abilityModifier(target.attributes?.[saveAbility] || 10);
  const profBonus = target.proficiency_bonus || proficiencyBonus(target.level || 1);

  // Check explicit saving_throws map first (character sheet data).
  const savingThrows = target.saving_throws || {};
  let isProficient = savingThrows[saveAbility];

  // Fall back to class-based proficiency from the registry if the
  // character has a class but no explicit saving_throws map.
  if (isProficient === undefined && target.class) {
    const classSaves = CLASS_SAVING_THROWS[target.class] || [];
    isProficient = classSaves.includes(saveAbility);
  }

  return isProficient ? abilMod + profBonus : abilMod;
}
