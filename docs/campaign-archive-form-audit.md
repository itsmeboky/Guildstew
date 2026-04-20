Campaign Archives creation-form audit
=====================================

Distinct from src/components/homebrew/CreateHomebrewDialog.jsx
(Brewery + MyBrewsList surface). These are the in-archive
creators the GM hits from the individual archive pages.

Pages
-----

  src/pages/CampaignMonsters.jsx   — "+ New Monster" button;
     opens an inline NewMonsterDialog at line 791 of the same
     file. Renders: Name, Type (free text), CR, AC, HP,
     Description. Stops there.
     Missing: size, alignment, speed, six ability scores,
     saving-throw proficiencies, skills, damage
     resistances/immunities/vulnerabilities, condition
     immunities, senses, languages, image upload, and the full
     actions array (attacks, reach, damage dice, damage type).
     Actions are the highest-impact gap — the combat action
     bar reads monsters.stats.actions.

  src/pages/CampaignItems.jsx      — "+ New Item" button; opens
     inline EditItemDialog at line 572. Renders: Image, Name,
     Type (free text — not a typed dropdown), Rarity, Cost,
     Description. No type-conditional sections.
     Missing: weapon damage / damage type / properties / range
     / weapon category; armor base AC / armor type / max DEX /
     STR requirement / stealth disadvantage; potion effect /
     healing dice / duration; wondrous attunement / charges /
     recharge.

  src/pages/CampaignSpells.jsx     — NO "+ New Spell" button
     at all. The page is a split-panel reader over SRD +
     homebrew spells. Creation must be added from scratch.

  src/pages/CampaignAbilities.jsx  — NO create button either.
     The page reads campaign_class_features and renders each
     class's feature list, but there's no authoring dialog.

Plan per subsequent step
------------------------

  Step 2  expand NewMonsterDialog inline in CampaignMonsters
          with all missing fields + repeatable action cards.
  Step 3  expand EditItemDialog inline in CampaignItems with
          type-conditional sections (Weapon / Armor / Potion /
          Wondrous) and a proper type dropdown.
  Step 4  add a NewSpellDialog to CampaignSpells + wire a
          "+ New Spell" button for GMs. Full spell form with
          V/S/M components, concentration + ritual toggles,
          higher-level textarea, class multi-select.
  Step 5  add a NewFeatureDialog to CampaignAbilities + a
          create button. Fields: name, description, class,
          level, type, plus the mechanical-effect block
          (effect type, damage dice, action cost, uses,
          recharge).
  Step 6  regression-check the save path end-to-end: saved
          rows land in monsters / campaign_items / spells /
          campaign_class_features with is_system=false and
          the right campaign_id, and monster actions reach
          monsters.stats.actions so combat picks them up.

Step 6 verification
-------------------

All four archive pages now save through a mutation that writes
to the canonical campaign table with the required provenance
stamps.

  CampaignMonsters (NewMonsterDialog)
    base44.entities.Monster.create(payload) — where payload
    carries { name, description, image_url, stats: {…full
    stat block…} }. The wrapping useMutation attaches
    campaign_id, is_system=false, created_by, created_at.
    Combat's NPC-turn loop reads monster.stats.actions and
    lights up the action bar with each authored action's
    name / attack_bonus / damage / damage_type / reach —
    unchanged from how SRD monsters flow.

  CampaignItems (EditItemDialog)
    base44.entities.CampaignItem.create(data) wrapping sets
    campaign_id + is_system=false. Full draft (including
    type-conditional fields: weapon damage / properties,
    armor AC / stealth flag, potion effect / healing dice,
    wondrous attunement / charges / recharge) lands on the
    row; downstream readers branch on the type field and
    pick up the right sub-block.

  CampaignSpells (NewSpellDialog)
    supabase.from("spells").insert({…}) with
    campaign_id + is_system=false + source="homebrew" +
    concentration + ritual booleans + the canonical SRD
    column shape (level, school, casting_time, range,
    components string, duration, description, higher_level,
    classes[]). Invalidates the homebrewSpells cache +
    sets the new row as selected detail.

  CampaignAbilities (NewFeatureDialog)
    supabase.from("campaign_class_features").insert({…}) with
    campaign_id + is_system=false + type + class_name (only
    when type === "Class Feature") + level + properties
    (mechanical blob: effect_type, cost, uses, recharge,
    damage_dice+type or healing_dice). Invalidates the
    homebrewClassFeatures cache + sets the new row as the
    selected detail.

Every create path sets is_system=false so the row is never
confused for a seeded SRD entry. The supabase `.select()
.single()` return on the spell + feature insert callbacks
means the new row immediately becomes the active detail
without a second round-trip. Nothing in the save path should
ever see is_system=true for an in-archive authored entry.
