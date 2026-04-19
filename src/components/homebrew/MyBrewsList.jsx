import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Upload, Trash2, Share2, Star, Download, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CreateHomebrewDialog from "./CreateHomebrewDialog";

/**
 * My Brews list — shows every homebrew the current user created.
 * Each card supports Edit, Publish toggle, Delete, and Add-to-Campaign.
 *
 * The currentUser prop should provide { id } at minimum. We don't
 * fetch it ourselves because the parent page already has it.
 */
export default function MyBrewsList({ currentUser }) {
  const queryClient = useQueryClient();
  const userId = currentUser?.id;

  const { data: myBrews = [], isLoading } = useQuery({
    queryKey: ["myBrews", userId],
    queryFn: () => base44.entities.HomebrewRule.filter({ creator_id: userId }),
    enabled: !!userId,
    initialData: [],
  });

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [addingToCampaign, setAddingToCampaign] = useState(null);

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }) =>
      base44.entities.HomebrewRule.update(id, { is_published: publish }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["myBrews", userId] });
      toast.success(vars.publish ? "Published to The Brewery" : "Unpublished (now a draft)");
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to update publish state");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HomebrewRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBrews", userId] });
      toast.success("Homebrew deleted");
      setDeletingId(null);
    },
    onError: (err) => {
      toast.error(err?.message || "Delete failed");
      setDeletingId(null);
    },
  });

  if (!userId) {
    return (
      <div className="text-center py-12 text-slate-500">
        Sign in to see your brews.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Brews</h2>
          <p className="text-sm text-slate-400 mt-1">
            Your homebrew rules, items, monsters, and spells.
          </p>
        </div>
        {/* Header "Create Homebrew" button used to live here and
            duplicated the one in the Brewery page header. Removed —
            use the page-header button instead. */}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading…</div>
      ) : myBrews.length === 0 ? (
        <div className="bg-[#2A3441] rounded-xl p-10 text-center">
          <p className="text-slate-400 mb-4">You haven't brewed anything yet.</p>
          <Button
            onClick={() => setCreating(true)}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            Brew your first rule
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {myBrews.map((brew) => (
            <BrewCard
              key={brew.id}
              brew={brew}
              onEdit={() => setEditing(brew)}
              onPublishToggle={() => publishMutation.mutate({ id: brew.id, publish: !brew.is_published })}
              onDelete={() => setDeletingId(brew.id)}
              onAddToCampaign={() => setAddingToCampaign(brew)}
              busy={publishMutation.isPending}
            />
          ))}
        </div>
      )}

      <CreateHomebrewDialog
        open={creating || !!editing}
        brew={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
      />

      <AddToCampaignDialog
        brew={addingToCampaign}
        currentUser={currentUser}
        onClose={() => setAddingToCampaign(null)}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="bg-[#1E2430] border border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this homebrew?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This removes it from any campaigns it's installed on. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BrewCard({ brew, onEdit, onPublishToggle, onDelete, onAddToCampaign, busy }) {
  const avgRating = brew.rating_count > 0 ? (Number(brew.rating_total) / brew.rating_count).toFixed(1) : "—";
  const categoryLabel = formatCategory(brew.category);
  return (
    <div className="bg-[#2A3441] border border-[#111827] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {brew.cover_image_url ? (
          <img
            src={brew.cover_image_url}
            alt={brew.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-700"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#37F2D1]/30 to-[#8B5CF6]/30 flex items-center justify-center flex-shrink-0 text-xl">
            🧪
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-lg font-bold text-white hover:text-[#37F2D1] cursor-pointer truncate"
              onClick={onEdit}
              title="Edit"
            >
              {brew.title}
            </h3>
            <Badge className={brew.is_published
              ? "bg-[#22c55e] text-black hover:bg-[#22c55e]"
              : "bg-slate-600 text-slate-200 hover:bg-slate-600"}>
              {brew.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-slate-300 border-slate-600 text-[10px]">
              {categoryLabel}
            </Badge>
            <span className="text-[10px] text-slate-400">v{brew.version || "1.0.0"}</span>
          </div>
          {brew.description && (
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">{brew.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> {brew.downloads || 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="w-3 h-3" /> {avgRating}{brew.rating_count ? ` (${brew.rating_count})` : ""}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 min-w-[100px]">
          <Pencil className="w-3 h-3 mr-1" /> Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPublishToggle}
          disabled={busy}
          className={`flex-1 min-w-[100px] ${brew.is_published ? "text-amber-300" : "text-[#22c55e]"}`}
        >
          <Upload className="w-3 h-3 mr-1" />
          {brew.is_published ? "Unpublish" : "Publish"}
        </Button>
        <Button variant="outline" size="sm" onClick={onAddToCampaign} className="flex-1 min-w-[100px]">
          <Share2 className="w-3 h-3 mr-1" /> Add to Campaign
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function formatCategory(category) {
  switch (category) {
    case "combat_rules":    return "Combat Rules";
    case "rest_rules":      return "Rest Rules";
    case "character_rules": return "Character Rules";
    case "spell_modifiers": return "Spellcasting Rules";
    case "class_modifiers": return "Class Modifiers";
    case "item_rules":      return "Item Rules";
    case "custom_item":     return "Custom Item";
    case "custom_monster":  return "Custom Monster";
    case "custom_spell":    return "Custom Spell";
    case "custom_class_feature":
    case "custom_ability":  return "Custom Class Feature";
    default:                return category || "Other";
  }
}

/**
 * Add-to-Campaign dialog. Lists every campaign the current user owns
 * or co-DMs and shows a checkmark if the brew is already installed.
 * Clicking a campaign creates or deletes the `campaign_homebrew`
 * join row so the Campaign Settings → House Rules → Installed
 * Homebrew section picks it up.
 */
function AddToCampaignDialog({ brew, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const open = !!brew;
  const userId = currentUser?.id;

  const { data: campaigns = [] } = useQuery({
    queryKey: ["myGMCampaigns", userId],
    queryFn: async () => {
      if (!userId) return [];
      const owned = await base44.entities.Campaign.filter({ owner_id: userId }).catch(() => []);
      // Include campaigns where the user is a co-DM. Campaign rows have
      // optional co_dms array fields; filter them client-side since
      // our thin adapter only does equality filters.
      const all = await base44.entities.Campaign.list().catch(() => []);
      const coDM = all.filter((c) => {
        if (!Array.isArray(c.co_dms)) return false;
        return c.co_dms.includes(userId);
      });
      const map = new Map();
      for (const c of [...owned, ...coDM]) map.set(c.id, c);
      return Array.from(map.values());
    },
    enabled: open && !!userId,
    initialData: [],
  });

  const { data: installedRows = [] } = useQuery({
    queryKey: ["campaignsWithBrew", brew?.id],
    queryFn: () => base44.entities.CampaignHomebrew.filter({ homebrew_id: brew.id }),
    enabled: open && !!brew?.id,
    initialData: [],
  });
  const installedIds = useMemo(
    () => new Set(installedRows.map((r) => r.campaign_id)),
    [installedRows],
  );
  const installedRowByCampaign = useMemo(() => {
    const m = new Map();
    for (const r of installedRows) m.set(r.campaign_id, r);
    return m;
  }, [installedRows]);

  const attachMutation = useMutation({
    mutationFn: async ({ campaignId }) => {
      // Different brew categories land in different campaign
      // libraries: rule mods link through campaign_homebrew; custom
      // items drop into campaign_items with is_system=false so they
      // appear in the item library, loot pool, and equipment slots.
      if (brew.category === "custom_item") {
        const mods = brew.modifications || {};
        await base44.entities.CampaignItem.create({
          campaign_id: campaignId,
          name: mods.name || brew.title || "Custom Item",
          type: mods.type || "Wondrous Item",
          rarity: (mods.rarity || "Common").toLowerCase().replace(/ /g, "_"),
          description: mods.description || brew.description || "",
          properties: mods,
          image_url: mods.image_url || brew.cover_image_url || null,
          is_system: false,
        });
      } else if (brew.category === "custom_monster") {
        const mods = brew.modifications || {};
        await base44.entities.Monster.create({
          campaign_id: campaignId,
          name: mods.name || brew.title || "Custom Monster",
          description: mods.description || brew.description || "",
          stats: mods,
          image_url: mods.image_url || brew.cover_image_url || null,
          is_system: false,
          is_active: true,
        });
      } else if (brew.category === "custom_spell") {
        const mods = brew.modifications || {};
        await base44.entities.Spell.create({
          campaign_id: campaignId,
          name: mods.name || brew.title || "Custom Spell",
          level: Number(mods.level ?? 0),
          school: mods.school || "Evocation",
          casting_time: mods.casting_time || "1 action",
          range: mods.range || "",
          components: mods.components || "",
          duration: mods.duration || "Instantaneous",
          description: mods.description || brew.description || "",
          higher_level: mods.higher_level || mods.higher_levels || "",
          classes: Array.isArray(mods.classes) ? mods.classes : [],
          source: "homebrew",
          is_system: false,
        });
      } else if (brew.category === "custom_class_feature" || brew.category === "custom_ability") {
        const mods = brew.modifications || {};
        // The underlying table is campaign_class_features (formerly
        // campaign_abilities). Either entity key resolves to the
        // same table through the alias in entities.js.
        try {
          await base44.entities.CampaignClassFeature.create({
            campaign_id: campaignId,
            name: mods.name || brew.title || "Custom Class Feature",
            description: mods.description || brew.description || "",
            type: mods.type || "General Ability",
            class_name: mods.type === "Class Feature" ? (mods.class || null) : null,
            level: Number(mods.level) || 1,
            properties: mods,
            is_system: false,
          });
        } catch (err) {
          // Table may not exist in every environment yet. Surface a
          // friendlier error but still let the campaign_homebrew
          // join row get written so My Brews can show the install
          // checkmark.
          console.warn("CampaignClassFeature create failed:", err?.message || err);
          toast.error("campaign_class_features table unavailable — install recorded but row not created.");
        }
      }
      // Every attach path also records the install so MyBrews can
      // surface the checkmark.
      return base44.entities.CampaignHomebrew.create({
        campaign_id: campaignId,
        homebrew_id: brew.id,
        enabled: true,
        added_by: userId,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["campaignsWithBrew", brew?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrew", vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrewMods", vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignItems", vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["monsters", vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignMonsters", vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignSpells", vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["spells", vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaignAbilities", vars.campaignId] });
      toast.success("Added to campaign");
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to add to campaign");
    },
  });

  const detachMutation = useMutation({
    mutationFn: (joinId) => base44.entities.CampaignHomebrew.delete(joinId),
    onSuccess: (_, _joinId) => {
      queryClient.invalidateQueries({ queryKey: ["campaignsWithBrew", brew?.id] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrew"] });
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrewMods"] });
      toast.success("Removed from campaign");
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to remove from campaign");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Add "{brew?.title}" to campaign</DialogTitle>
        </DialogHeader>
        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            You aren't GM'ing any campaigns yet.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1">
            {campaigns.map((c) => {
              const isInstalled = installedIds.has(c.id);
              const joinRow = installedRowByCampaign.get(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (isInstalled && joinRow) detachMutation.mutate(joinRow.id);
                    else attachMutation.mutate({ campaignId: c.id });
                  }}
                  disabled={attachMutation.isPending || detachMutation.isPending}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors text-left ${
                    isInstalled
                      ? "bg-[#22c55e]/15 border-[#22c55e]/50 hover:bg-[#22c55e]/25"
                      : "bg-[#0b1220] border-slate-700 hover:border-[#37F2D1]"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {c.banner_url ? (
                      <img
                        src={c.banner_url}
                        alt=""
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-[#37F2D1]/20 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{c.title || "Untitled"}</div>
                      <div className="text-[10px] text-slate-400 truncate">{c.system || ""}</div>
                    </div>
                  </div>
                  {isInstalled ? (
                    <Check className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                  ) : (
                    <span className="text-[10px] font-semibold text-[#37F2D1]">Add</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
