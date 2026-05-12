/**
 * Forager engine type definitions.
 *
 * Pure JSDoc — this module exports nothing executable. Other files
 * pull these typedefs in via `@type` and `@param` references; the
 * trailing `export {}` keeps the file a module so the JSDoc resolver
 * can find the typedefs across files.
 */

/**
 * A 2D position on the map, in tile (or world) units.
 * @typedef {Object} Position2D
 * @property {number} x
 * @property {number} y
 */

/**
 * Ground material painted under a tile. Drives movement speed,
 * footstep sound, and concealment.
 * @typedef {Object} TerrainMaterial
 * @property {string} id
 * @property {number} speedModifier  Multiplier applied to entity movement speed (1 = normal).
 * @property {'soft'|'hard'|'liquid'|'silent'} footstepSound
 * @property {'none'|'partial'|'full'} concealment
 */

/**
 * One painted square of terrain.
 * @typedef {Object} Tile
 * @property {Position2D} position
 * @property {string} materialId  Reference to a TerrainMaterial.id.
 */

/**
 * Material a wall is built from. Drives line-of-sight, cover,
 * climbing, and fire behaviour.
 * @typedef {Object} WallMaterial
 * @property {string} id
 * @property {number} soundDampening  0 (sound passes through) to 1 (fully blocks sound).
 * @property {'none'|'partial'|'full'} sightBlocking
 * @property {'none'|'partial'|'full'} coverValue
 * @property {'low'|'medium'|'high'} fireResistance
 * @property {boolean} climbable
 */

/**
 * A wall segment between two points, with a material reference.
 * @typedef {Object} Wall
 * @property {string} id
 * @property {number} x1
 * @property {number} y1
 * @property {number} x2
 * @property {number} y2
 * @property {string} materialId
 * @property {string} [materialOverrideId]  Optional per-wall override of the building's default material.
 */

/**
 * A door placed at a point along a wall.
 * @typedef {Object} Door
 * @property {string} id
 * @property {string} wallId
 * @property {number} parameterAlongWall  0 (start of wall) to 1 (end of wall).
 * @property {'open'|'closed'|'locked'|'broken'} state
 * @property {string} materialId
 * @property {number} [lockDC]  DC for the lockpick check when state is 'locked'.
 */

/**
 * A window placed at a point along a wall.
 * @typedef {Object} Window
 * @property {string} id
 * @property {string} wallId
 * @property {number} parameterAlongWall  0 (start of wall) to 1 (end of wall).
 * @property {'open'|'closed'|'shuttered'|'broken'} state
 * @property {string} materialId
 */

/**
 * A building defined as a closed polygon, with walls, doors, and
 * windows hung on its perimeter.
 * @typedef {Object} Building
 * @property {string} id
 * @property {Position2D[]} shape  Corner points of the building footprint, in order.
 * @property {Wall[]} walls
 * @property {Door[]} doors
 * @property {Window[]} windows
 * @property {string} name
 * @property {string} description
 * @property {string} defaultMaterialId  WallMaterial.id used for any wall without an override.
 * @property {boolean} isSolid  When true, the interior is opaque (lore-blurb building); when false, the interior is painted and walkable.
 */

/**
 * One entry in an NPC's daily schedule.
 * @typedef {Object} ScheduleEntry
 * @property {number} atMin  Game-time minute since midnight (0–1439).
 * @property {string} [targetBuildingId]  Building the NPC is heading to.
 * @property {Position2D[]} [patrolPoints]  Waypoint loop for patrol behaviour.
 * @property {string} label  Human-readable description for the inspector.
 */

/**
 * A non-player character placed on a scene.
 * @typedef {Object} NPC
 * @property {string} id
 * @property {string} name
 * @property {'friendly'|'neutral'|'hostile'} kind
 * @property {Position2D} position
 * @property {ScheduleEntry[]} schedule
 * @property {string} [currentRoomId]  Building the NPC is presently inside, if any.
 * @property {string} [sourceCompendiumId]  Compendium entry the NPC pulls stats from (resolved at runtime).
 * @property {Object<string, number>} dispositionByPlayer  Player-id → disposition score map.
 */

/**
 * A light source that casts an illumination radius into a scene.
 * @typedef {Object} LightSource
 * @property {string} id
 * @property {Position2D} position
 * @property {number} radius
 * @property {string} color  Hex string, e.g. '#FFB347'.
 */

/**
 * A portal that moves the player from one scene to another.
 * @typedef {Object} SceneTransition
 * @property {string} id
 * @property {Position2D} position
 * @property {number} radius  Trigger radius around the portal point.
 * @property {string} toSceneId
 * @property {string} label
 */

/**
 * A single map scene — the unit of geography the simulation ticks
 * against. A campaign can have many scenes; each ticks independently.
 * @typedef {Object} Scene
 * @property {string} id
 * @property {string} name
 * @property {'day'|'dusk'|'night'|'fow'} ambientMode
 * @property {Tile[]} tiles
 * @property {Building[]} buildings
 * @property {Object[]} trees   Placeholder — Tree typedef arrives in a later phase.
 * @property {Object[]} bushes  Placeholder — Bush typedef arrives in a later phase.
 * @property {NPC[]} npcs
 * @property {LightSource[]} lights
 * @property {SceneTransition[]} transitions
 * @property {Wall[]} customWalls  Free-standing walls not attached to any building.
 */

export {};
