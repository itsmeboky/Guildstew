// Starting-kit item resolution (pure, UI-free so it's unit-testable).
//
// Starting-equipment options are free-text and often compound, e.g.
// "Leather armor + longbow + 20 arrows", "Warhammer (if proficient)",
// "2 Handaxes". These helpers turn an option string into clean,
// structured inventory items: split on "+", parse a leading stack count,
// strip the "(if proficient)" caveat, and resolve the name against the
// SRD equipment list (via the injected `lookup`) to recover a real name /
// weight / type. Items that don't resolve (true placeholders like
// "Martial weapon") are kept as gear with their cleaned name. Every kit
// item is tagged `source: 'starting-kit'` so re-applying the kit replaces
// rather than duplicates, and so it can be cleared when the player rolls
// gold instead.

export function parseQuantity(token) {
  const m = /^(\d+)\s+(.+)$/.exec(String(token).trim());
  if (m) return { quantity: parseInt(m[1], 10) || 1, name: m[2].trim() };
  return { quantity: 1, name: String(token).trim() };
}

export function cleanItemName(name) {
  return String(name).replace(/\s*\(if proficient\)\s*/gi, "").trim();
}

// Normalised inventory `type` from a resolved SRD item (or null).
export function classifyType(srd) {
  const cat = String(srd?.category || "").toLowerCase();
  if (cat === "armor") return /shield/i.test(srd?.armorCategory || "") ? "shield" : "armor";
  if (cat === "weapon") return "weapon";
  return "gear";
}

export function resolveKitToken(rawToken, lookup) {
  const { quantity, name } = parseQuantity(rawToken);
  const clean = cleanItemName(name);
  const srd = lookup ? lookup(clean) : null;
  const type = classifyType(srd);
  const item = {
    name: srd ? srd.name : clean,
    quantity,
    weight: srd ? Number(srd.weight) || 0 : 0,
    description: "",
    type,
    source: "starting-kit",
  };
  if (type === "armor" || type === "shield") item.armorCategory = srd.armorCategory;
  return item;
}

export function expandKitOption(option, lookup) {
  return String(option)
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => resolveKitToken(token, lookup));
}

// Build the full structured kit from fixed items + chosen options.
export function buildStartingKit(fixedItems, selectedChoices, lookup) {
  const tokens = [
    ...(Array.isArray(fixedItems) ? fixedItems : []),
    ...(Array.isArray(selectedChoices) ? selectedChoices.filter(Boolean) : []),
  ];
  return tokens.flatMap((opt) => expandKitOption(opt, lookup));
}
