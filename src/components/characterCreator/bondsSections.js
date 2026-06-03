// Pure logic for the conditional Bonds & Allies tome (rendered inside the
// Class step). Decides WHICH sections apply to a character from class /
// subclass / level / pact boon / known spells. Kept UI-free so it's unit-
// testable; ClassStep imports it and renders each section by `type`.

// Every spell name the character knows/prepared, flattened from the
// per-level buckets (cantrips, level1…level9, prepared, spellbook).
export function knownSpellNames(data) {
  const out = [];
  const spells = data?.spells || {};
  for (const v of Object.values(spells)) {
    if (Array.isArray(v)) for (const s of v) out.push(typeof s === "string" ? s : s?.name);
  }
  return out.filter(Boolean).map((n) => n.toLowerCase());
}

export function hasSpell(data, name) {
  return knownSpellNames(data).includes(String(name).toLowerCase());
}

/**
 * Conditional Bonds & Allies sections — returns ONLY the sections that
 * apply; an empty array means the whole tome is hidden (no empty Bonds
 * section for a Fighter). Each entry has a `type`:
 *   'flavor'           — name + bio card (AllyCard); persists to
 *                        characterData.allies[key]. The deity flavor is
 *                        structured so the upcoming custom-deity feature
 *                        can replace this card without touching the step.
 *   'patron'           — read-only display of the patron (Warlock subclass)
 *   'mount-flag'       — informational note (no picker)
 *   'companion-picker' — the existing CompanionPicker (familiar), reused
 *                        as-is and already level/boon-gated (Phase 2)
 *
 * @param cls  the class data object (needs `.name`, `.subclasses`)
 * @param data characterData
 */
export function bondsForClass(cls, data = {}) {
  const sections = [];
  const name = cls?.name;
  const level = Number(data.level) || 1;
  const subclass = data.subclass || "";
  const pactBoon = data?.feature_choices?.["Warlock-3-Pact Boon"] || "";
  const isChain = pactBoon.toLowerCase().includes("chain");
  const isBeastMaster = subclass.toLowerCase().includes("beast");

  // Deity / faith — Cleric & Paladin (flavor field for now).
  if (name === "Cleric" || name === "Paladin") {
    sections.push({
      type: "flavor",
      key: "deity",
      label: "Your Deity",
      kicker: name === "Paladin"
        ? "The power your oath is sworn to"
        : "The god whose miracles you channel",
      placeholder: "Bahamut, the Dawnflower, the Silent Watcher...",
      descPlaceholder: "What does your deity stand for? What rites do you keep?",
    });
  }

  // Patron — Warlock: read-only (the subclass, chosen on this step).
  if (name === "Warlock") {
    sections.push({ type: "patron", key: "patron" });
  }

  // Druid circle — minimal optional flavor.
  if (name === "Druid") {
    sections.push({
      type: "flavor",
      key: "circle",
      label: "Your Druidic Circle",
      kicker: "The grove or order that taught you",
      placeholder: "Circle of the Iron Birch, the Tidal Court...",
      descPlaceholder: "Where do you gather? What rites do you observe?",
    });
  }

  // Pact familiar — Warlock + Pact of the Chain + level ≥ 3 (Blade/Tome
  // → none). Uses the existing CompanionPicker.
  if (name === "Warlock" && isChain && level >= 3) {
    sections.push({ type: "companion-picker", key: "pact-familiar" });
  }

  // Arcane familiar — anyone who actually took Find Familiar (never
  // automatic; Warlock-Chain is covered above, not here).
  if (!(name === "Warlock" && isChain) && hasSpell(data, "Find Familiar")) {
    sections.push({ type: "companion-picker", key: "arcane-familiar" });
  }

  // Mount — Paladin with Find Steed (a level-5 spell): a flag, not a
  // picker (Find Steed is cast in play, not chosen at creation).
  if (name === "Paladin" && (hasSpell(data, "Find Steed") || level >= 5)) {
    sections.push({ type: "mount-flag", key: "mount" });
  }

  // Animal companion — Beast Master ranger only (subclass + level 3).
  // Non-SRD → dormant (SRD ships only Hunter). The condition is NOT
  // hard-coded off, so it activates automatically if Beast Master returns.
  if (name === "Ranger" && isBeastMaster && level >= 3) {
    sections.push({
      type: "flavor",
      key: "companion",
      label: "Animal Companion",
      kicker: "Beast Master ranger — bonded at level 3",
      placeholder: "Rangefur, Talonshine, Old Boar...",
      descPlaceholder: "How did they bond? What's their personality?",
    });
  }

  return sections;
}
