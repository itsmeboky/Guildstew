/**
 * Companion catalog — Find Familiar, Find Steed, and Pact of the
 * Chain options, plus the resolution helper that picks the right
 * list for a given class/subclass.
 *
 * Ranger Beast Master companions aren't here — they're any beast of
 * CR 1/4 or lower, which is too wide to hand-seed. The picker queries
 * Supabase (dnd5e_monsters filtered by creature_type='Beast' AND
 * challenge_rating <= 0.25) at open-time instead. `hasBeastCompanion`
 * + `isBeastCompanionClass` gate that path.
 *
 * Stat fields match the companions table shape:
 *   { species, ac, hp, speed, creature_type }
 * The full entry adds `image` (portrait URL) and `description`.
 *
 * Image assets live under the campaign-assets bucket so a fresh DB
 * still renders portraits. The fallback slot is a neutral silhouette.
 */

const ART_BASE =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/companions";

function c(entry) {
  return {
    image: `${ART_BASE}/${entry.image || "placeholder.png"}`,
    ...entry,
  };
}

export const FIND_FAMILIAR = [
  c({ id: "familiar-bat",            species: "Bat",             creature_type: "beast", ac: 12, hp: 1, speed: 5,  fly: 30, description: "Keen hearing. Blindsight 60 ft." }),
  c({ id: "familiar-cat",            species: "Cat",             creature_type: "beast", ac: 12, hp: 2, speed: 40, description: "Keen smell. Jumping climbers." }),
  c({ id: "familiar-crab",           species: "Crab",            creature_type: "beast", ac: 11, hp: 2, speed: 20, swim: 20, description: "Amphibious. Stealthy in reefs." }),
  c({ id: "familiar-frog",           species: "Frog",            creature_type: "beast", ac: 11, hp: 1, speed: 20, swim: 20, description: "Amphibious. Keen standing leap." }),
  c({ id: "familiar-hawk",           species: "Hawk",            creature_type: "beast", ac: 13, hp: 1, speed: 10, fly: 60, description: "Keen sight. Air ace." }),
  c({ id: "familiar-lizard",         species: "Lizard",          creature_type: "beast", ac: 10, hp: 2, speed: 20, climb: 20, description: "Scurry across walls and ceilings." }),
  c({ id: "familiar-octopus",        species: "Octopus",         creature_type: "beast", ac: 12, hp: 3, speed: 5,  swim: 30, description: "Hold breath. Ink cloud on demand." }),
  c({ id: "familiar-owl",            species: "Owl",             creature_type: "beast", ac: 11, hp: 1, speed: 5,  fly: 60, description: "Flyby. Keen hearing + sight." }),
  c({ id: "familiar-poisonous-snake",species: "Poisonous Snake", creature_type: "beast", ac: 13, hp: 2, speed: 30, swim: 30, description: "Venomous bite. Blindsight 10 ft." }),
  c({ id: "familiar-fish",           species: "Quipper (Fish)",  creature_type: "beast", ac: 13, hp: 1, speed: 0,  swim: 40, description: "Blood frenzy underwater." }),
  c({ id: "familiar-rat",            species: "Rat",             creature_type: "beast", ac: 10, hp: 1, speed: 20, description: "Keen smell. Slips through cracks." }),
  c({ id: "familiar-raven",          species: "Raven",           creature_type: "beast", ac: 12, hp: 1, speed: 10, fly: 50, description: "Mimicry. Keen sight." }),
  c({ id: "familiar-sea-horse",      species: "Sea Horse",       creature_type: "beast", ac: 11, hp: 1, speed: 0,  swim: 20, description: "Waterbreather with a knack for hiding in kelp." }),
  c({ id: "familiar-spider",         species: "Spider",          creature_type: "beast", ac: 12, hp: 1, speed: 20, climb: 20, description: "Web walker. Spider climb." }),
  c({ id: "familiar-weasel",         species: "Weasel",          creature_type: "beast", ac: 13, hp: 1, speed: 30, description: "Keen hearing + smell." }),
];

// Pact of the Chain upgrades the familiar list with three fey/fiendish
// options and the classic pseudodragon. Stats are the 5e SRD values.
export const PACT_OF_CHAIN_FAMILIARS = [
  c({ id: "familiar-imp",          species: "Imp",          creature_type: "fiend",     ac: 13, hp: 10, speed: 20, fly: 40, description: "Shapechanger. Devil's sight. Sting (poison)." }),
  c({ id: "familiar-pseudodragon", species: "Pseudodragon", creature_type: "dragon",    ac: 13, hp: 7,  speed: 15, fly: 60, description: "Limited telepathy. Magic Resistance. Sting (poison)." }),
  c({ id: "familiar-quasit",       species: "Quasit",       creature_type: "fiend",     ac: 13, hp: 7,  speed: 40, description: "Shapechanger. Scare (1/day). Claws (poison)." }),
  c({ id: "familiar-sprite",       species: "Sprite",       creature_type: "fey",       ac: 15, hp: 2,  speed: 10, fly: 40, description: "Invisibility. Heart Sight. Shortbow." }),
];

export const FIND_STEED = [
  c({ id: "steed-warhorse", species: "Warhorse", creature_type: "beast", ac: 11, hp: 19, speed: 60, description: "Trampling charge. Reliable combat mount." }),
  c({ id: "steed-pony",     species: "Pony",     creature_type: "beast", ac: 10, hp: 11, speed: 40, description: "Compact and surefooted. Good for small riders." }),
  c({ id: "steed-camel",    species: "Camel",    creature_type: "beast", ac: 9,  hp: 15, speed: 50, description: "Desert endurance. Carries heavy loads across wastes." }),
  c({ id: "steed-elk",      species: "Elk",      creature_type: "beast", ac: 10, hp: 13, speed: 50, description: "Ram charge. Woodland pathfinder." }),
  c({ id: "steed-mastiff",  species: "Mastiff",  creature_type: "beast", ac: 12, hp: 5,  speed: 40, description: "Keen hearing + smell. Loyal ground hound." }),
];

/**
 * Which flavor of picker a class/subclass should see. Returns null
 * when the class doesn't have a companion slot at character-creation
 * time (most classes). The `chain` and `beast_master` flags drive
 * list composition in the picker.
 */
export function resolveCompanionContext({ className, subclass }) {
  if (className === "Wizard") {
    return { kind: "familiar", title: "Familiar", description: "Your magical companion that serves and scouts for you.", list: FIND_FAMILIAR };
  }
  if (className === "Warlock") {
    // Without Pact of the Chain, warlocks still flavor a patron but
    // don't get a creature statblock — surface the familiar list so
    // the player can still pick an option, and upgrade it when
    // Chain is chosen.
    const isChain = (subclass || "").toLowerCase().includes("chain");
    return {
      kind: isChain ? "familiar_chain" : "familiar",
      title: "Familiar",
      description: isChain
        ? "Pact of the Chain unlocks imp, pseudodragon, quasit, and sprite in addition to the standard familiar list."
        : "Pick a familiar. Pact of the Chain will unlock fiendish, fey, and draconic options.",
      list: isChain ? [...FIND_FAMILIAR, ...PACT_OF_CHAIN_FAMILIARS] : FIND_FAMILIAR,
    };
  }
  if (className === "Paladin") {
    return { kind: "steed", title: "Mount", description: "Your loyal steed that accompanies you in battle.", list: FIND_STEED };
  }
  if (className === "Ranger") {
    const isBeastMaster = (subclass || "").toLowerCase().includes("beast");
    return {
      kind: isBeastMaster ? "beast_master" : "beast",
      title: "Animal Companion",
      description: isBeastMaster
        ? "Beast Master lets you bond with any beast of CR 1/4 or lower. Pick from the filtered SRD list or supply a custom beast."
        : "Rangers can keep an animal companion even without the Beast Master subclass — pick something that fits your theme.",
      list: isBeastMaster ? [] : FIND_FAMILIAR.filter((f) => f.creature_type === "beast"),
    };
  }
  if (className === "Druid") {
    return {
      kind: "beast",
      title: "Animal Companion",
      description: "A creature of nature bonded to you — useful as a flavor pet outside of Wild Shape.",
      list: FIND_FAMILIAR.filter((f) => f.creature_type === "beast"),
    };
  }
  return null;
}
