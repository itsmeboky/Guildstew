/**
 * Canonical consent-checklist topics. Used by both the GM-side
 * campaign content_settings editor and the player-side
 * content_preferences profile (when/if wired). Drawn from common
 * TTRPG safety-tool lists (Lines & Veils, X-Card, Script Change).
 *
 * Each entry has a stable `id` (the JSONB key, never renamed) plus
 * a display `label`. Keep the id snake_case so the map Object.keys
 * stay readable.
 */
export const CONSENT_TOPICS = [
  { id: "sexual_content_explicit",   label: "Sexual content (explicit)",  triggersRating: "red" },
  { id: "sexual_content_fade",       label: "Sexual content (fade-to-black)" },
  { id: "sexual_violence",           label: "Sexual violence (any)",      triggersRating: "red" },
  { id: "graphic_violence",          label: "Graphic violence",           triggersRating: "orange" },
  { id: "torture",                   label: "Torture",                    triggersRating: "orange" },
  { id: "gore",                      label: "Corpses / gore",             triggersRating: "orange" },
  { id: "blood_graphic",             label: "Blood (graphic)",            triggersRating: "orange" },
  { id: "eye_trauma",                label: "Eye trauma",                 triggersRating: "orange" },
  { id: "body_horror",               label: "Body horror",                triggersRating: "orange" },
  { id: "horror_themes",             label: "Horror themes",              triggersRating: "orange" },
  { id: "self_harm",                 label: "Self-harm" },
  { id: "suicide",                   label: "Suicide" },
  { id: "child_endangerment",        label: "Child endangerment" },
  { id: "childhood_violence",        label: "Childhood violence",         triggersRating: "orange" },
  { id: "animal_violence",           label: "Animal violence",            triggersRating: "orange" },
  { id: "domestic_violence",         label: "Domestic violence",          triggersRating: "orange" },
  { id: "substance_abuse",           label: "Substance abuse" },
  { id: "mental_illness",            label: "Mental illness" },
  { id: "discrimination",            label: "Discrimination / bigotry" },
  { id: "religious_themes",          label: "Religious themes" },
  { id: "insects",                   label: "Spiders / insects" },
  { id: "claustrophobia",            label: "Claustrophobia / confinement" },
  { id: "drowning",                  label: "Drowning" },
];

/** Look up a human label by id. Falls back to the id itself. */
export function topicLabel(id) {
  const hit = CONSENT_TOPICS.find((t) => t.id === id);
  return hit?.label || id;
}
