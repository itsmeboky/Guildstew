// D&D 5e JSON Schema definitions from https://github.com/BrianWendt/dnd5e_json_schema

export const CharacterSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "Character.schema.json",
  "title": "D&D 5e Character",
  "description": "JSON Schema for D&D 5e Character data",
  "type": "object",
  "required": ["player", "race"],
  "properties": {
    "nickname": { "type": "string" },
    "player": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "type": "string", "default": "NPC" },
        "id": { "type": "string", "description": "Wizards' DCI or other identifier." }
      }
    },
    "xp": { "type": "integer", "minimum": 0, "default": 0 },
    "race": { "type": "object" },
    "classes": { "type": "array", "items": { "type": "object" } },
    "background": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "type": "string" },
        "option": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "details": {
      "type": "object",
      "properties": {
        "age": { "type": "integer", "minimum": 0 },
        "eyes": { "type": "string" },
        "hair": { "type": "string" },
        "skin": { "type": "string" },
        "weight": { "type": "integer", "minimum": 0 },
        "height": { "type": "string" },
        "personality": { "type": "string" },
        "ideal": { "type": "string" },
        "bond": { "type": "string" },
        "flaw": { "type": "string" },
        "backstory": { "type": "string" },
        "physical": { "type": "string" }
      }
    },
    "weapon_proficiencies": { "type": "array", "items": { "type": "string" } },
    "armor_proficiencies": { "type": "array", "items": { "type": "string" } },
    "tool_proficiencies": { "type": "array", "items": { "type": "string" } },
    "feats": { "type": "array", "items": { "type": "object" } },
    "spells": { "type": "array", "items": { "type": "object" } },
    "weapons": { "type": "array", "items": { "type": "object" } },
    "equipment": { "type": "array", "items": { "type": "object" } },
    "treasure": {
      "type": "object",
      "properties": {
        "pp": { "type": "number", "default": 0 },
        "ep": { "type": "number", "default": 0 },
        "gp": { "type": "number", "default": 0 },
        "sp": { "type": "number", "default": 0 },
        "cp": { "type": "number", "default": 0 }
      }
    }
  }
};

export const SpellSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "Spell.schema.json",
  "description": "JSON Schema for D&D 5e Spell",
  "type": "object",
  "required": ["name", "description", "level", "casting_time", "range_area", "components", "duration"],
  "properties": {
    "name": { "type": "string" },
    "description": { "type": "string" },
    "higher_level": { "type": "string" },
    "level": { "type": "string" },
    "casting_time": { "type": "string", "default": "1 Action" },
    "range_area": { "type": "string" },
    "components": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["V", "S", "M", "F", "DF", "XP"]
      }
    },
    "material": { "type": "string" },
    "ritual": { "type": "boolean", "default": false },
    "concentration": { "type": "boolean", "default": false },
    "duration": { "type": "string" },
    "school": { "type": "string" },
    "attack_save": { "type": "string" },
    "damage_effect": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } }
  }
};

export const RaceSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "Race.schema.json",
  "title": "D&D 5e Race",
  "description": "JSON Schema for D&D 5e Creature Race",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string" },
    "subtype": { "type": "string" },
    "size": {
      "type": "string",
      "default": "Medium",
      "enum": ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]
    },
    "traits": { "type": "array", "items": { "type": "object" } },
    "actions": { "type": "array", "items": { "type": "object" } },
    "senses": { "type": "object" }
  }
};

export const ClassSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "Class.schema.json",
  "title": "D&D 5e Class",
  "description": "JSON Schema for D&D 5e Character Class",
  "type": "object",
  "required": ["name", "level"],
  "properties": {
    "name": { "type": "string" },
    "level": { "type": "integer", "minimum": 1 },
    "subtype": { "type": "string" },
    "hit_die": {
      "type": "integer",
      "enum": [1, 2, 4, 6, 8, 10, 12, 20]
    },
    "spellcasting": {
      "type": "string",
      "default": "",
      "enum": ["", "str", "dex", "con", "int", "wis", "cha"]
    },
    "features": { "type": "array", "items": { "type": "object" } }
  }
};

export const validateCharacter = (characterData) => {
  const errors = [];
  
  if (!characterData.name) errors.push("Character name is required");
  if (!characterData.race) errors.push("Race is required");
  if (!characterData.class) errors.push("Class is required");
  if (characterData.level < 1 || characterData.level > 20) {
    errors.push("Level must be between 1 and 20");
  }
  
  return { valid: errors.length === 0, errors };
};

export default {
  CharacterSchema,
  SpellSchema,
  RaceSchema,
  ClassSchema,
  validateCharacter
};