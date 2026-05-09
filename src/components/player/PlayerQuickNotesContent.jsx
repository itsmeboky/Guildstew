import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StickyNote } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { NoteForm } from "@/components/party/PlayerNotesTab";

const NO_CHARACTER_VALUE = "__general__";

/**
 * PlayerQuickNotesContent — write surface for player notes inside the
 * sidebar. The READ surface for the same rows is PlayerNotesTab in
 * Adventuring Party (filtered through canSeeNote). One table,
 * `player_notes`, two views.
 *
 * Mirrors the GM's Quick Notes pattern (own sidebar nav item) but
 * targets the per-character notes table instead of a flat textarea
 * blob, so notes appear in the existing party-notes view without a
 * second sync path.
 *
 * Defaults the "filed under" selector to the player's own attached
 * character; offers other party members + a "no character" option
 * for general session jot-downs (those still need a character_id
 * row in the table — we file them under the player's own character
 * with a visibility of gm_only by default so they aren't surfaced
 * on someone else's notes tab unintentionally).
 */
export default function PlayerQuickNotesContent({ campaignId, user, myCharacter }) {
  const queryClient = useQueryClient();
  const [resetKey, setResetKey] = useState(0);

  const { data: characters = [] } = useQuery({
    queryKey: ["campaignCharacters", campaignId],
    queryFn: () => base44.entities.Character
      .filter({ campaign_id: campaignId })
      .catch(() => []),
    enabled: !!campaignId,
    initialData: [],
  });

  const partyCharacters = useMemo(
    () => (characters || []).filter((c) => c?.name),
    [characters],
  );

  const [characterId, setCharacterId] = useState(myCharacter?.id || NO_CHARACTER_VALUE);

  const targetCharacter = useMemo(() => {
    if (characterId === NO_CHARACTER_VALUE) return myCharacter || partyCharacters[0] || null;
    return partyCharacters.find((c) => c.id === characterId) || myCharacter || null;
  }, [characterId, partyCharacters, myCharacter]);

  const createMutation = useMutation({
    mutationFn: (entry) => base44.entities.PlayerNote.create({
      campaign_id: campaignId,
      character_id: targetCharacter?.id,
      author_id: user?.id || null,
      title: entry.title,
      content: entry.content,
      visibility: entry.visibility,
      visible_to_players: entry.visible_to_players || [],
      image_url: entry.image_url || null,
    }),
    onSuccess: () => {
      // Both query keys: PlayerNotesTab keys by character.id, the
      // sidebar might one day key by campaign — invalidate both
      // shapes so wherever the read surface is, it picks up.
      queryClient.invalidateQueries({ queryKey: ["playerNotes"] });
      toast.success("Note saved.");
      setResetKey((k) => k + 1); // force NoteForm to remount with empty fields
    },
    onError: (err) => toast.error(err?.message || "Couldn't save that note."),
  });

  if (!targetCharacter) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm italic p-8">
        Attach a character to this campaign before jotting notes.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <header className="flex items-center gap-3 flex-wrap">
        <StickyNote className="w-5 h-5 text-[#37F2D1]" />
        <div className="flex-1 min-w-[120px]">
          <h2 className="text-lg font-bold text-white">Quick Notes</h2>
          <p className="text-xs text-slate-500">
            Saves to your party notes. Pick a character to file under, choose who can see it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 uppercase tracking-widest">Filed under</label>
          <Select value={characterId} onValueChange={setCharacterId}>
            <SelectTrigger className="bg-[#0f1219] border-slate-700 text-white h-9 text-sm min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {myCharacter?.id && (
                <SelectItem value={myCharacter.id}>{myCharacter.name} (you)</SelectItem>
              )}
              {partyCharacters
                .filter((c) => c.id !== myCharacter?.id)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <NoteForm
        key={resetKey}
        character={targetCharacter}
        onCancel={() => setResetKey((k) => k + 1)}
        onSave={(entry) => createMutation.mutate(entry)}
      />
    </div>
  );
}
