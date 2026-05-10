/**
 * D&D 5e conditions reference + mechanical effect resolver.
 *
 * Conditions on a combatant are tracked as an array of string names
 * (e.g. ["Poisoned", "Prone"]). Each entry in CONDITIONS lists the
 * mechanical side-effects keyed by a small DSL so the combat dice
 * window can enforce / flag them.
 *
 * Mechanical entry shape:
 *   { type: <rule>, on?: <roll category>, saves?: [...], reason: <label> }
 *
 * Rule types:
 *   disadvantage              — disadvantage on OWN rolls of `on`
 *   advantage                 — advantage on OWN rolls of `on`
 *   disadvantage_against      — attacks / rolls AGAINST this target are disadvantaged
 *   advantage_against         — attacks / rolls AGAINST this target are advantaged
 *   no_actions                — combatant can't take actions
 *   no_reactions              — combatant can't take reactions
 *   speed_zero                — movement speed is 0
 *   auto_fail_save            — auto-fails saves in `saves` array
 *   auto_crit_melee           — melee hits against this target auto-crit
 *   resistance_all            — resistance to all damage
 *   cant_attack               — can't attack `target` (e.g. Charmed vs charmer)
 */

export const CONDITION_COLORS = {
  Blinded: "#3b82f6",
  Charmed: "#ec4899",
  Deafened: "#6b7280",
  Frightened: "#a855f7",
  Grappled: "#d97706",
  Incapacitated: "#ca8a04",
  Invisible: "#e2e8f0",
  Paralyzed: "#38bdf8",
  Petrified: "#9ca3af",
  Poisoned: "#22c55e",
  Prone: "#f97316",
  Restrained: "#dc2626",
  Stunned: "#facc15",
  Unconscious: "#1e293b",
  Dodging: "#37F2D1",
  Raging: "#ef4444",
  Reckless: "#f97316",
};

export const CONDITIONS = {
  Blinded: {
    description: "Can't see. Auto-fail sight-based checks.",
    mechanical: [
      { type: "disadvantage", on: "attack_rolls", reason: "Blinded" },
      { type: "advantage_against", on: "attack_rolls", reason: "Attacker can't be seen" },
    ],
  },
  Charmed: {
    description: "Can't attack the charmer. Charmer has advantage on social checks.",
    mechanical: [
      { type: "cant_attack", target: "charmer", reason: "Charmed" },
    ],
  },
  Deafened: {
    description: "Can't hear. Auto-fail hearing-based checks.",
    mechanical: [],
  },
  Frightened: {
    description: "Disadvantage on ability checks and attacks while source is visible.",
    mechanical: [
      { type: "disadvantage", on: "attack_rolls", reason: "Frightened" },
      { type: "disadvantage", on: "ability_checks", reason: "Frightened" },
    ],
  },
  Grappled: {
    description: "Speed is 0. Can't benefit from speed bonuses.",
    mechanical: [
      { type: "speed_zero", reason: "Grappled" },
    ],
  },
  Incapacitated: {
    description: "Can't take actions or reactions.",
    mechanical: [
      { type: "no_actions", reason: "Incapacitated" },
      { type: "no_reactions", reason: "Incapacitated" },
    ],
  },
  Invisible: {
    description: "Impossible to see without magic. Advantage on attacks, attacks against have disadvantage.",
    mechanical: [
      { type: "advantage", on: "attack_rolls", reason: "Invisible" },
      { type: "disadvantage_against", on: "attack_rolls", reason: "Can't see attacker" },
    ],
  },
  Paralyzed: {
    description: "Incapacitated, can't move or speak. Auto-fail STR/DEX saves. Attacks have advantage. Melee hits are auto-crits.",
    mechanical: [
      { type: "no_actions", reason: "Paralyzed" },
      { type: "no_reactions", reason: "Paralyzed" },
      { type: "auto_fail_save", saves: ["str", "dex"], reason: "Paralyzed" },
      { type: "advantage_against", on: "attack_rolls", reason: "Paralyzed" },
      { type: "auto_crit_melee", reason: "Paralyzed — melee hits are critical" },
    ],
  },
  Petrified: {
    description: "Turned to stone. Incapacitated, unaware. Resistance to all damage. Auto-fail STR/DEX saves.",
    mechanical: [
      { type: "no_actions", reason: "Petrified" },
      { type: "resistance_all", reason: "Petrified" },
      { type: "auto_fail_save", saves: ["str", "dex"], reason: "Petrified" },
    ],
  },
  Poisoned: {
    description: "Disadvantage on attack rolls and ability checks.",
    mechanical: [
      { type: "disadvantage", on: "attack_rolls", reason: "Poisoned" },
      { type: "disadvantage", on: "ability_checks", reason: "Poisoned" },
    ],
  },
  Prone: {
    description: "Disadvantage on attacks. Melee attacks against have advantage, ranged have disadvantage.",
    mechanical: [
      { type: "disadvantage", on: "attack_rolls", reason: "Prone" },
      { type: "advantage_against", on: "melee_attacks", reason: "Prone" },
      { type: "disadvantage_against", on: "ranged_attacks", reason: "Prone" },
    ],
  },
  Restrained: {
    description: "Speed 0. Disadvantage on attacks. Attacks against have advantage. Disadvantage on DEX saves.",
    mechanical: [
      { type: "speed_zero", reason: "Restrained" },
      { type: "disadvantage", on: "attack_rolls", reason: "Restrained" },
      { type: "advantage_against", on: "attack_rolls", reason: "Restrained" },
      { type: "disadvantage", on: "dex_saves", reason: "Restrained" },
    ],
  },
  Stunned: {
    description: "Incapacitated, can't move. Auto-fail STR/DEX saves. Attacks against have advantage.",
    mechanical: [
      { type: "no_actions", reason: "Stunned" },
      { type: "auto_fail_save", saves: ["str", "dex"], reason: "Stunned" },
      { type: "advantage_against", on: "attack_rolls", reason: "Stunned" },
    ],
  },
  Unconscious: {
    description: "Incapacitated, can't move or speak, unaware. Auto-fail STR/DEX saves. Attacks have advantage. Melee hits are auto-crits.",
    mechanical: [
      { type: "no_actions", reason: "Unconscious" },
      { type: "auto_fail_save", saves: ["str", "dex"], reason: "Unconscious" },
      { type: "advantage_against", on: "attack_rolls", reason: "Unconscious" },
      { type: "auto_crit_melee", reason: "Unconscious — melee hits are critical" },
    ],
  },
  Dodging: {
    description: "Attacks against have disadvantage. Advantage on DEX saves. Ends at start of next turn.",
    mechanical: [
      { type: "disadvantage_against", on: "attack_rolls", reason: "Dodging" },
      { type: "advantage", on: "dex_saves", reason: "Dodging" },
    ],
    autoExpire: "start_of_next_turn",
  },
  Raging: {
    description: "Advantage on STR checks and saves. Resistance to physical damage. Bonus melee damage. Can't cast spells.",
    mechanical: [
      { type: "advantage", on: "str_checks", reason: "Raging" },
      { type: "advantage", on: "str_saves", reason: "Raging" },
    ],
  },
  Reckless: {
    description: "Advantage on all STR melee attacks this turn. Attacks against you have advantage until your next turn.",
    mechanical: [
      { type: "advantage", on: "attack_rolls", reason: "Reckless Attack" },
      { type: "advantage_against", on: "attack_rolls", reason: "Reckless — attacks against have advantage" },
    ],
    autoExpire: "start_of_next_turn",
  },
};

/**
 * Does any of the combatant's conditions include a `no_actions` rule?
 * Used by the GM panel to swap the action bar out for an "can't act"
 * card and to auto-advance the turn.
 */
export function isIncapacitated(conditionNames = []) {
  for (const name of conditionNames) {
    const cond = CONDITIONS[name];
    if (!cond) continue;
    if (cond.mechanical.some((m) => m.type === "no_actions")) return true;
  }
  return false;
}

/**
 * Return the first no_actions condition (so the UI can say "paralyzed"
 * rather than just "incapacitated" when both would apply).
 */
export function getNoActionConditionName(conditionNames = []) {
  for (const name of conditionNames) {
    const cond = CONDITIONS[name];
    if (!cond) continue;
    if (cond.mechanical.some((m) => m.type === "no_actions")) return name;
  }
  return null;
}

/**
 * Given an actor, target, roll type, and attack mode, determine how
 * conditions modify the roll. Returns advantage/disadvantage flags,
 * auto-crit / auto-fail flags, and a list of human-readable warnings.
 *
 * Advantage and disadvantage cancel out (5e rule: one of each = none).
 *
 * rollType: "attack" | "skill_check" | "saving_throw"
 * attackMode: "melee" | "ranged" | "unarmed" (only relevant for attack)
 * saveAbility: "str" | "dex" | "con" | ... (only relevant for saving_throw)
 *              special value "concentration" flags a concentration save.
 */
export function getConditionModifiers(actor, target, rollType, attackMode, saveAbility = null) {
  const warnings = [];
  let hasAdvantage = false;
  let hasDisadvantage = false;
  let isAutoCrit = false;
  let isAutoFail = false;

  const actorConditions = actor?.conditions || [];
  const targetConditions = target?.conditions || [];

  // Helpers to read feats / class / level from any of the shapes a
  // character row might arrive in (live sheet, combat_data.order
  // entry, legacy stats block).
  const actorFeats = Array.isArray(actor?.feats)
    ? actor.feats
    : Array.isArray(actor?.features)
      ? actor.features
      : Array.isArray(actor?.class_features)
        ? actor.class_features
        : Array.isArray(actor?.metadata?.feats)
          ? actor.metadata.feats
          : [];
  const hasFeat = (name) => actorFeats.some((f) => {
    const n = typeof f === 'string' ? f : f?.name;
    return typeof n === 'string' && n.toLowerCase() === name.toLowerCase();
  });
  const actorClass = (actor?.class || actor?.stats?.class || '').toString();
  const actorLevel = actor?.level || actor?.stats?.level || 1;
  const actorExhaustion = actor?.exhaustion || 0;
  const normalizedSave = (saveAbility || '').toString().toLowerCase();

  // --- Actor conditions (affect their own rolls) ---
  for (const condName of actorConditions) {
    const cond = CONDITIONS[condName];
    if (!cond) continue;
    for (const m of cond.mechanical) {
      if (m.type === "disadvantage" && m.on === "attack_rolls" && rollType === "attack") {
        hasDisadvantage = true;
        warnings.push(`${actor?.name || "Actor"} has disadvantage on attacks (${m.reason})`);
      }
      if (m.type === "advantage" && m.on === "attack_rolls" && rollType === "attack") {
        hasAdvantage = true;
        warnings.push(`${actor?.name || "Actor"} has advantage on attacks (${m.reason})`);
      }
      if (m.type === "disadvantage" && m.on === "ability_checks" && rollType === "skill_check") {
        hasDisadvantage = true;
        warnings.push(`${actor?.name || "Actor"} has disadvantage on checks (${m.reason})`);
      }
      if (m.type === "advantage" && m.on === "dex_saves" && rollType === "saving_throw") {
        hasAdvantage = true;
        warnings.push(`${actor?.name || "Actor"} has advantage on DEX saves (${m.reason})`);
      }
      if (m.type === "disadvantage" && m.on === "dex_saves" && rollType === "saving_throw") {
        hasDisadvantage = true;
        warnings.push(`${actor?.name || "Actor"} has disadvantage on DEX saves (${m.reason})`);
      }
      if (m.type === "no_actions") {
        warnings.push(`${actor?.name || "Actor"} can't take actions (${m.reason})!`);
      }
    }
  }

  // --- Target conditions (affect rolls AGAINST this target) ---
  for (const condName of targetConditions) {
    const cond = CONDITIONS[condName];
    if (!cond) continue;
    for (const m of cond.mechanical) {
      if (m.type === "advantage_against" && m.on === "attack_rolls" && rollType === "attack") {
        hasAdvantage = true;
        warnings.push(`Advantage against ${target?.name || "target"} (${m.reason})`);
      }
      if (m.type === "disadvantage_against" && m.on === "attack_rolls" && rollType === "attack") {
        hasDisadvantage = true;
        warnings.push(`Disadvantage against ${target?.name || "target"} (${m.reason})`);
      }
      if (
        m.type === "advantage_against" &&
        m.on === "melee_attacks" &&
        rollType === "attack" &&
        (attackMode === "melee" || attackMode === "unarmed")
      ) {
        hasAdvantage = true;
        warnings.push(`Advantage on melee against ${target?.name || "target"} (${m.reason})`);
      }
      if (
        m.type === "disadvantage_against" &&
        m.on === "ranged_attacks" &&
        rollType === "attack" &&
        attackMode === "ranged"
      ) {
        hasDisadvantage = true;
        warnings.push(`Disadvantage on ranged against ${target?.name || "target"} (${m.reason})`);
      }
      if (
        m.type === "auto_crit_melee" &&
        rollType === "attack" &&
        (attackMode === "melee" || attackMode === "unarmed")
      ) {
        isAutoCrit = true;
        warnings.push(`Auto-crit on melee hit (${m.reason})`);
      }
      if (m.type === "auto_fail_save" && rollType === "saving_throw") {
        // Future: check save ability vs m.saves. For now, flag any
        // auto-fail save on a target — the GM can see the reason.
        isAutoFail = true;
        warnings.push(
          `${target?.name || "Target"} auto-fails ${m.saves?.join("/") || "this"} saves (${m.reason})`,
        );
      }
    }
  }

  // --- Feats (Tier 3) ---
  // War Caster: advantage on concentration saving throws.
  if (hasFeat('War Caster') && rollType === 'saving_throw' && normalizedSave === 'concentration') {
    hasAdvantage = true;
    warnings.push(`${actor?.name || 'Actor'} has advantage on concentration saves (War Caster)`);
  }

  // --- Class passives (Tier 3) ---
  // Barbarian Danger Sense (level 2+): advantage on DEX saves unless
  // Blinded, Deafened, or Incapacitated.
  if (/barbarian/i.test(actorClass) && actorLevel >= 2 && rollType === 'saving_throw') {
    const isDexSave = normalizedSave === 'dex';
    const blocked =
      actorConditions.includes('Blinded') ||
      actorConditions.includes('Deafened') ||
      actorConditions.includes('Incapacitated');
    if (isDexSave && !blocked) {
      hasAdvantage = true;
      warnings.push(`${actor?.name || 'Actor'} has advantage on DEX saves (Danger Sense)`);
    }
  }

  // --- Exhaustion (Tier 3) ---
  // Cumulative per 5e PHB p.291.
  if (actorExhaustion >= 1 && rollType === 'skill_check') {
    hasDisadvantage = true;
    warnings.push(`${actor?.name || 'Actor'} has disadvantage on checks (Exhaustion ${actorExhaustion})`);
  }
  if (actorExhaustion >= 3 && rollType === 'attack') {
    hasDisadvantage = true;
    warnings.push(`${actor?.name || 'Actor'} has disadvantage on attacks (Exhaustion ${actorExhaustion})`);
  }
  if (actorExhaustion >= 3 && rollType === 'saving_throw') {
    hasDisadvantage = true;
    warnings.push(`${actor?.name || 'Actor'} has disadvantage on saves (Exhaustion ${actorExhaustion})`);
  }
  if (actorExhaustion >= 2) {
    warnings.push(`${actor?.name || 'Actor'}'s speed is halved (Exhaustion ${actorExhaustion})`);
  }
  if (actorExhaustion >= 4) {
    warnings.push(`${actor?.name || 'Actor'}'s HP maximum is halved (Exhaustion ${actorExhaustion})`);
  }
  if (actorExhaustion >= 5) {
    warnings.push(`${actor?.name || 'Actor'}'s speed is 0 (Exhaustion ${actorExhaustion})`);
  }
  if (actorExhaustion >= 6) {
    warnings.push(`${actor?.name || 'Actor'} dies from exhaustion!`);
  }

  // 5e rule: Advantage + Disadvantage → roll normally.
  if (hasAdvantage && hasDisadvantage) {
    hasAdvantage = false;
    hasDisadvantage = false;
    warnings.push("Advantage and disadvantage cancel out — rolling normally");
  }

  return { hasAdvantage, hasDisadvantage, isAutoCrit, isAutoFail, warnings };
}
