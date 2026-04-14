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
    const cost = getSpellCost(spellName);
    
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
  if (action.type === "monster_action" || action.attack_bonus !== undefined || action.damage) {
    return {
      rollType: "attack",
      attackType: "monster",
      cost: "action",
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
 * @param {object} currentActions - { action: bool, bonus: bool, inspiration: bool }
 * @param {string} cost - "action", "bonus", "reaction", "free"
 * @returns {object} - updated actions state
 */
export function consumeActionCost(currentActions, cost) {
  if (cost === "free" || cost === "reaction") return currentActions;
  if (cost === "action") return { ...currentActions, action: false };
  if (cost === "bonus") return { ...currentActions, bonus: false };
  return currentActions;
}

/**
 * Get the attack modifier for a character.
 */
export function getAttackModifier(actor, action, resolvedAction) {
  if (!actor) return 0;
  
  const profBonus = actor.proficiency_bonus || 2;
  const strMod = Math.floor(((actor.attributes?.str || 10) - 10) / 2);
  const dexMod = Math.floor(((actor.attributes?.dex || 10) - 10) / 2);
  
  // Spell attack
  if (resolvedAction?.attackType === "spell") {
    const spellAbility = getSpellcastingAbility(actor);
    const abilityMod = Math.floor(((actor.attributes?.[spellAbility] || 10) - 10) / 2);
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
  const profBonus = actor.proficiency_bonus || 2;
  const spellAbility = getSpellcastingAbility(actor);
  const abilityMod = Math.floor(((actor.attributes?.[spellAbility] || 10) - 10) / 2);
  return 8 + profBonus + abilityMod;
}

/**
 * Get the spellcasting ability for a class.
 */
export function getSpellcastingAbility(actor) {
  const CLASS_SPELL_ABILITY = {
    Wizard: "int", Artificer: "int",
    Cleric: "wis", Druid: "wis", Ranger: "wis", Monk: "wis",
    Bard: "cha", Paladin: "cha", Sorcerer: "cha", Warlock: "cha",
  };
  
  const charClass = actor?.class || actor?.stats?.class || "";
  return CLASS_SPELL_ABILITY[charClass] || "cha";
}

/**
 * Get the skill modifier for a skill check.
 */
export function getSkillModifier(actor, skillName) {
  if (!actor) return 0;
  
  const SKILL_ABILITIES = {
    "Athletics": "str",
    "Acrobatics": "dex", "Sleight of Hand": "dex", "Stealth": "dex",
    "Arcana": "int", "History": "int", "Investigation": "int", "Nature": "int", "Religion": "int",
    "Animal Handling": "wis", "Insight": "wis", "Medicine": "wis", "Perception": "wis", "Survival": "wis",
    "Deception": "cha", "Intimidation": "cha", "Performance": "cha", "Persuasion": "cha",
  };
  
  const ability = SKILL_ABILITIES[skillName] || "str";
  const abilityMod = Math.floor(((actor.attributes?.[ability] || 10) - 10) / 2);
  const profBonus = actor.proficiency_bonus || 2;
  
  const skills = actor.skills || {};
  const expertise = actor.expertise || [];
  
  const isProficient = skills[skillName];
  const hasExpertise = expertise.includes(skillName);
  
  if (hasExpertise) return abilityMod + (profBonus * 2);
  if (isProficient) return abilityMod + profBonus;
  return abilityMod;
}

/**
 * Get the saving throw modifier for a target.
 */
export function getSaveModifier(target, saveAbility) {
  if (!target) return 0;
  
  const abilityMod = Math.floor(((target.attributes?.[saveAbility] || 10) - 10) / 2);
  const profBonus = target.proficiency_bonus || 2;
  
  const savingThrows = target.saving_throws || {};
  const isProficient = savingThrows[saveAbility];
  
  return isProficient ? abilityMod + profBonus : abilityMod;
}
