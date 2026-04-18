import { CONSENT_TOPICS, topicLabel } from "@/data/consentTopics";

/**
 * Canonical rating labels. Maps the internal color codes used by the
 * consent system to the human-readable names referenced in the spec.
 * Falls back to the raw value so unexpected ratings still render.
 */
const RATING_LABELS = {
  green:  "Family Friendly",
  yellow: "Mature Themes",
  orange: "Graphic Violence",
  red:    "Adult Content",
};
const RATING_ICON = {
  green:  "🟢",
  yellow: "🟡",
  orange: "🟠",
  red:    "🔴",
};

export function ratingLabel(value) {
  return RATING_LABELS[value] || value || "Unrated";
}

export function ratingIcon(value) {
  return RATING_ICON[value] || "🎭";
}

/**
 * Normalises the campaign side's content-settings map into the
 * "will_appear / may_appear / wont_appear" vocabulary the conflict
 * check wants. Accepts two shapes:
 *
 *   1. New-style `content_settings` with the vocabulary baked in.
 *   2. Legacy `consent_checklist` keyed by topic label / id with
 *      green / yellow / red values (green = will appear, yellow =
 *      may appear, red = won't appear).
 *
 * Topic keys are canonicalised through the topic catalog so legacy
 * rows keyed by human label still compare correctly.
 */
function normalizeCampaignSettings(settings, fallbackChecklist) {
  const out = {};
  const merge = (source, mapper) => {
    if (!source || typeof source !== "object") return;
    for (const [rawKey, rawValue] of Object.entries(source)) {
      const key = canonicalTopicKey(rawKey);
      const mapped = mapper(rawValue);
      if (key && mapped) out[key] = mapped;
    }
  };

  // content_settings wins when both are present.
  merge(settings, (v) => {
    if (v === "will_appear" || v === "may_appear" || v === "wont_appear") return v;
    if (v === "green")  return "will_appear";
    if (v === "yellow") return "may_appear";
    if (v === "red")    return "wont_appear";
    return null;
  });
  merge(fallbackChecklist, (v) => {
    if (v === "green")  return "will_appear";
    if (v === "yellow") return "may_appear";
    if (v === "red")    return "wont_appear";
    return null;
  });
  return out;
}

/**
 * Same idea for the player side — accept either the
 * "allowed / handle_with_care / not_allowed" vocabulary or the
 * green / yellow / red shorthand legacy rows might use.
 */
function normalizePlayerPrefs(prefs) {
  const out = {};
  if (!prefs || typeof prefs !== "object") return out;
  for (const [rawKey, rawValue] of Object.entries(prefs)) {
    const key = canonicalTopicKey(rawKey);
    if (!key) continue;
    let v = rawValue;
    if (v === "green")  v = "allowed";
    if (v === "yellow") v = "handle_with_care";
    if (v === "red")    v = "not_allowed";
    if (v === "allowed" || v === "handle_with_care" || v === "not_allowed") {
      out[key] = v;
    }
  }
  return out;
}

/**
 * Legacy rows sometimes store the topic's display label as the key.
 * Snap those back to the canonical id so equality comparisons work.
 */
function canonicalTopicKey(rawKey) {
  if (!rawKey) return null;
  // Already an id? Keep it. Otherwise try a label → id lookup.
  const byId = topicLabel(rawKey);
  if (byId !== rawKey) return rawKey;
  const hit = CONSENT_TOPICS.find(
    (t) => t.label.toLowerCase() === String(rawKey).toLowerCase(),
  );
  return hit?.id || rawKey;
}

/**
 * Compare a player's preferences against a campaign's content
 * settings. A conflict is reported only for topics the campaign is
 * planning to feature (will_appear or may_appear). Returns two
 * arrays of display labels so the dialog can render them directly.
 */
export function findConsentConflicts(playerPreferences, campaignSettings, fallbackChecklist) {
  const camp = normalizeCampaignSettings(campaignSettings, fallbackChecklist);
  const player = normalizePlayerPrefs(playerPreferences);
  const notAllowed = [];
  const handleWithCare = [];

  for (const [topicId, campVal] of Object.entries(camp)) {
    if (campVal !== "will_appear" && campVal !== "may_appear") continue;
    const playerVal = player[topicId];
    if (playerVal === "not_allowed") notAllowed.push(topicLabel(topicId));
    else if (playerVal === "handle_with_care") handleWithCare.push(topicLabel(topicId));
  }

  notAllowed.sort();
  handleWithCare.sort();
  return { notAllowed, handleWithCare };
}

/**
 * Whether the viewer is blocked entirely. Right now we block minors
 * from joining red-rated ("Adult Content") campaigns. Any other
 * combination returns false — callers should then check for
 * soft conflicts via `findConsentConflicts`.
 */
export function isBlockedFromCampaign({ campaign, profile }) {
  if (!campaign || !profile) return false;
  const rating = campaign.campaign_rating || campaign.consent_rating;
  if (!profile.is_minor) return false;
  if (rating === "red" || rating === "Adult Content") return true;
  return false;
}
