import AdventuringPartyContent from "@/components/session/content/AdventuringPartyContent";

/**
 * Player-facing Adventuring Party section. Reuses the shared
 * AdventuringPartyContent (which already does dual-role rendering
 * via isUserGM + ownsCharacter + canSeeNote, so player visibility
 * rules are honored at the query layer inside PlayerNotesTab).
 *
 * Quick Notes was originally stacked underneath here in #11 commit
 * 3, saving to a per-user JSONB blob on campaigns. That was wrong
 * — Quick Notes is the WRITE surface for player_notes (same table
 * the Notes tab below already reads), so it now lives in its own
 * sidebar entry as PlayerQuickNotesContent. Adventuring Party
 * stays read-only here.
 */
export default function PlayerAdventuringPartyContent({ campaignId, campaign }) {
  return <AdventuringPartyContent campaignId={campaignId} campaign={campaign} />;
}
