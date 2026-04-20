CreateHomebrewDialog audit
==========================

Forms inspected (src/components/homebrew/CreateHomebrewDialog.jsx):

  CustomMonsterForm        line 2204
  CustomItemForm           line 1478
  CustomSpellForm          line 5158
  CustomClassFeatureForm   line 5496

BLANK templates:

  BLANK_MONSTER_ACTION     line 394
  BLANK_MONSTER            line 444
  BLANK_SPELL              line 485
  BLANK_CLASS_FEATURE      line 525
  BLANK_ITEM               line 628

──────────────────────────────────────────────────────────────────
CustomMonsterForm
──────────────────────────────────────────────────────────────────

Has every field the spec calls for, plus more:
  * Identity         name, CR, size, creature_type, alignment
  * Defense          armor_class, hit_points (dice text), speed
  * Stats            all 6 abilities (str/dex/con/int/wis/cha)
  * Proficiencies    saves (chip multi-select), skills
  * Damage           resistances, immunities, vulnerabilities
  * Status           condition_immunities
  * Senses + languages text fields
  * Image upload + description
  * Multiattack block (sub-attacks list)
  * Actions / Bonus Actions / Reactions / Legendary Actions /
    Lair Actions / Auras (each a MonsterActionList)
  * Per action     name, description, action_type
    (melee_attack / ranged_attack / saving_throw / healing /
    no_roll), action_cost, recharge, reaction_trigger,
    attack_bonus, damage, damage_type, reach,
    bonus_damage_dice + type rider, save ability + DC + half_on_save,
    AoE shape + size + target_count, applies_condition with
    save / DC / end / duration, healing_dice + healing_flat
  * Legendary actions per round + legendary resistances
  * Tier 3       villain_actions (MCDM-style, mutually exclusive
    with legendary) + per-action triggers

Verdict: COMPLETE. No gaps relative to the spec.

──────────────────────────────────────────────────────────────────
CustomItemForm
──────────────────────────────────────────────────────────────────

  * Identity         name, type, rarity, description, image, weight, cost
  * Type-conditional sections render based on item.type:
      Weapon       damage, damage_type, properties, range,
                   weapon_category, versatile_damage, magic_bonus,
                   bonus_damage_dice, bonus_damage_type
      Armor        base_ac (or AC bonus for shields), armor_type,
                   str_requirement, stealth_disadvantage,
                   max_dex_bonus, magic_bonus
      Potion       potion_effect, healing_dice, effect_description,
                   duration
      Wondrous     requires_attunement, charges, recharge, bonus_to,
                   condition_applied, save_ability, save_dc,
                   effect_description
      Scroll       scroll_spell, scroll_level
  * Tier 3       curse + sentience blocks for any attunable item

Verdict: COMPLETE. No gaps relative to the spec.

──────────────────────────────────────────────────────────────────
CustomSpellForm
──────────────────────────────────────────────────────────────────

  * Identity         name, level (0–9), school
  * Casting          casting_time, range, duration
  * Components       V / S / M checkboxes + material text field
  * Description + At Higher Levels textareas
  * Classes          multi-select (chip toggles)
  * Effect type      Damage / Healing / Condition / Buff / Debuff /
                     Utility — conditional fields per branch
  * Damage           damage_dice, damage_type, resolution
                     (save/attack), save ability, half_on_save,
                     cantrip_scaling, upcast_per_level
  * Healing          healing_dice, add_spell_mod, upcast_per_level
  * Condition        condition_applied, condition_save,
                     condition_duration
  * Tier 3       alternative_costs, save_tiers

Gaps vs. spec:
  * No explicit `concentration` toggle — encoded in the duration
    text today ("Concentration, up to 1 minute").
  * No explicit `ritual` toggle.

Step 4 will add both as proper boolean fields so the combat layer
can branch on them without parsing the duration string.

──────────────────────────────────────────────────────────────────
CustomClassFeatureForm
──────────────────────────────────────────────────────────────────

  * Identity         name, type (Class Feature / Racial Feature /
                     General Ability), class, level, description, image
  * Action economy   cost, uses, recharge, reaction_trigger
  * Effect type      Utility / Damage / Healing / Condition /
                     Resource — conditional fields per branch
  * Damage           damage_dice, damage_type, save_ability,
                     half_on_save, resolution
  * Healing          healing_dice, add_level, add_ability_mod
  * Condition        condition_applied, condition_save,
                     condition_dc_source + condition_dc_fixed,
                     condition_duration
  * Resource         resource_restored, resource_amount
  * Scaling die      enabled + base_die + progression list + usage
  * Feature DC       override block for save calculations
  * Tier 3       menu_feature, trigger, additional_effects

Verdict: COMPLETE. No gaps relative to the spec.

──────────────────────────────────────────────────────────────────
Save flow
──────────────────────────────────────────────────────────────────

CreateHomebrewDialog → base44.entities.HomebrewRule.create writes
to the homebrew_rules table. The MyBrewsList "Add to Campaign"
flow handles the second step: it reads the saved homebrew_rules
row + copies into the matching campaign table:

  custom_monster        → monsters (stats: <full mod blob>,
                          is_system: false, is_active: true)
  custom_item           → campaign_items (properties: <full mod>,
                          is_system: false)
  custom_spell          → spells (canonical SRD shape +
                          source: "homebrew", is_system: false)
  custom_class_feature  → campaign_class_features (properties:
                          <full mod>, is_system: false)

Monster `actions` survive the round-trip because the entire mod
blob is stashed under `stats` — combat reads
monster.stats.actions when resolving NPC turns.

Verdict: WORKS. Step 6 will add a verification block + tighten
the save target for the corner case where MyBrewsList's
attach-to-campaign is bypassed.

──────────────────────────────────────────────────────────────────
Action plan
──────────────────────────────────────────────────────────────────

Step 2 (monster)         no changes — already complete.
Step 3 (item)            no changes — already complete.
Step 4 (spell)           add concentration + ritual booleans.
Step 5 (class feature)   no changes — already complete.
Step 6 (save flow)       verify + document the homebrew_rules
                         → campaign-table copy path; ensure the
                         monster `actions` array reaches
                         monsters.stats.actions on attach.
