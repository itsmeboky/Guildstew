import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BookOpen, Swords, Hammer, Heart, Beer, Trophy } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

/**
 * Guild Hall → Downtime Activities.
 *
 * Each upgrade category unlocks a between-session activity. The GM
 * adjudicates the outcome narratively — this panel just surfaces
 * what's available, lets a character pick one, and records the
 * choice on characters.last_downtime so the GM has a ledger.
 *
 * Self-hides when none of the relevant upgrades are owned. The
 * Tavern activity (Carouse) additionally requires tier 2+, matching
 * the upgrade flow that activates at the Tavern upgrade.
 */

const ACTIVITIES = [
  {
    id: "research",
    label: "Research",
    icon: BookOpen,
    category: "library",
    tierRequired: 1,
    upgrades: ["basic_library", "scholars_archive", "grand_library"],
    description: "Pour over scrolls and tomes. The GM sets a topic; an INT check determines what you learn. A strong result may grant advantage on a future knowledge-gate check or reveal a clue.",
  },
  {
    id: "practice",
    label: "Practice",
    icon: Swords,
    category: "training_grounds",
    tierRequired: 1,
    upgrades: ["sparring_ring", "combat_arena", "war_room"],
    description: "Spar with training masters. Next session, you have advantage on your first attack roll.",
  },
  {
    id: "craft",
    label: "Craft",
    icon: Hammer,
    category: "workshop",
    tierRequired: 1,
    upgrades: ["basic_workshop", "artisans_hall", "master_forge"],
    description: "Work on a mundane item you have tool proficiency for. 5 gp of progress per day of downtime; GM tracks the ledger.",
  },
  {
    id: "recuperate",
    label: "Recuperate",
    icon: Heart,
    category: "infirmary",
    tierRequired: 1,
    upgrades: ["healers_corner", "medical_ward", "temple_of_restoration"],
    description: "Rest in the infirmary. Remove 1 extra level of exhaustion beyond what the long rest gave. Temple of Restoration can also remove one condition.",
  },
  {
    id: "carouse",
    label: "Carouse",
    icon: Beer,
    category: "tavern",
    tierRequired: 2,
    upgrades: ["tavern", "grand_tavern"],
    description: "Spend 10–100 gp socializing. Roll a CHA check — high: useful contact or rumor; low: you wake up somewhere unexpected. The GM narrates.",
  },
  {
    id: "reflect",
    label: "Reflect",
    icon: Trophy,
    category: "trophy_room",
    tierRequired: 1,
    upgrades: ["display_case", "hall_of_heroes", "legendary_gallery"],
    description: "Walk the gallery and take stock. Small bonus to legend title progress this session.",
  },
];

export default function GuildHallDowntimeSection({ campaign, purchasedUpgrades = [], canEdit }) {
  const unlocked = ACTIVITIES.filter((a) => a.upgrades.some((id) => purchasedUpgrades.includes(id)));
  if (unlocked.length === 0) return null;

  const campaignId = campaign?.id;
  const { data: characters = [], refetch } = useQuery({
    queryKey: ["guildHallDowntime", "characters", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("characters")
        .select("id, name, last_downtime, training_progress")
        .eq("campaign_id", campaignId);
      if (error) { console.error("characters load failed:", error); return []; }
      return data || [];
    },
    enabled: !!campaignId,
    initialData: [],
  });

  const [characterId, setCharacterId] = useState("");
  const [pending, setPending] = useState(false);

  const doActivity = async (activity) => {
    if (!characterId) {
      toast.error("Pick a character first.");
      return;
    }
    setPending(true);
    try {
      const stamp = {
        activity_id: activity.id,
        label: activity.label,
        category: activity.category,
        at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("characters")
        .update({ last_downtime: stamp })
        .eq("id", characterId);
      if (error) throw error;
      refetch();
      const name = characters.find((c) => c.id === characterId)?.name || "Character";
      toast.success(`${name} took the ${activity.label} downtime. GM will adjudicate.`);
    } catch (err) {
      toast.error(err?.message || "Couldn't record the downtime activity.");
    } finally {
      setPending(false);
    }
  };

  const selectedCharacter = characters.find((c) => c.id === characterId) || null;

  return (
    <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white">Downtime Activities</h3>
        <p className="text-xs text-slate-400">
          Between-session activities your Guild Hall unlocks. The GM adjudicates the result.
        </p>
      </div>

      <div>
        <Label className="text-xs text-slate-300 font-semibold mb-1 block">Character</Label>
        <Select value={characterId} onValueChange={setCharacterId} disabled={!canEdit && characters.length > 0}>
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white">
            <SelectValue placeholder="Pick a character…" />
          </SelectTrigger>
          <SelectContent>
            {characters.length === 0 ? (
              <div className="px-2 py-1 text-xs text-slate-400">No characters in campaign.</div>
            ) : characters.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name || "Unnamed"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCharacter?.last_downtime?.label && (
          <p className="text-[10px] text-slate-500 mt-1 italic">
            Last activity: {selectedCharacter.last_downtime.label}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {unlocked.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.id} className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-[#37F2D1]" />
                <h4 className="text-sm font-bold text-white">{a.label}</h4>
              </div>
              <p className="text-xs text-slate-300">{a.description}</p>
              <Button
                type="button"
                size="sm"
                onClick={() => doActivity(a)}
                disabled={pending || !characterId}
                className="mt-auto bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold w-full"
              >
                Do this downtime
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
