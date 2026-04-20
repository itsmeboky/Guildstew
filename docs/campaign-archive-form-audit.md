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
