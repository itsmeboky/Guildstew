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
Step 4 (spell)           DONE — added concentration + ritual
                         booleans on BLANK_SPELL, the form (two
                         checkbox cards under Duration), the
                         serializer, and the hydrator (with
                         legacy-string sniff fallback).
Step 5 (class feature)   no changes — already complete.
Step 6 (save flow)       VERIFIED end-to-end:

  custom_monster → MyBrewsList.attachMutation copies
    `mods` (the full builder output, including actions array,
    multiattack, legendary actions, villain actions, lair
    actions, auras, traits) onto monsters.stats. Combat reads
    monster.stats.actions on NPC turns so every action the
    GM authored shows on the action bar without translation.
  custom_item → mods → campaign_items.properties (full blob)
    + name + type + rarity (lower_snake) + description + image.
    Item handlers downstream read .properties for the type-
    specific fields (damage, base_ac, charges, attunement, ...).
  custom_spell → individual SRD-shaped columns are explicitly
    populated (name, level, school, casting_time, range,
    components, duration, description, higher_level, classes,
    source). Step 6 added concentration + ritual booleans to
    this attach payload too — falls back to a regex sniff on
    the duration string when a legacy brew doesn't carry the
    explicit fields.
  custom_class_feature → mods → campaign_class_features.properties
    (full blob) + name + description + type + class_name (only
    when type === "Class Feature") + level. Combat resolves the
    feature's mechanical fields (effect_type, action cost,
    uses, recharge, damage_dice, etc.) off properties.

  All four attaches set is_system=false so the GM-authored row
  is never confused for a seeded SRD entry. Monster + class
  feature also stash the full mod blob alongside the
  type-specific columns, so a future schema migration can pull
  any extra fields the SRD-shaped columns don't capture.
