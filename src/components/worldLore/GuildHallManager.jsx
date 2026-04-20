import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Home, Upload, Sparkles, Loader2, ChevronRight, Check, Coins, Lock } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Thin Supabase helpers so the downstream handlers read clearly.
// The base44 entity shim resolved to the same tables; inlining the
// queries here makes the DB contract explicit for future auditors.
const updateGuildHall = (id, patch) =>
  supabase.from("guild_halls").update(patch).eq("id", id);
const deleteGuildHall = (id) =>
  supabase.from("guild_halls").delete().eq("id", id);
const listGuildHallOptions = (campaignId) =>
  supabase.from("guild_hall_options").select("*").eq("campaign_id", campaignId);
const createGuildHallOption = (row) =>
  supabase.from("guild_hall_options").insert(row);
const deleteGuildHallOption = (id) =>
  supabase.from("guild_hall_options").delete().eq("id", id);
import {
  GUILD_HALL_UPGRADES,
  UPGRADE_CATEGORIES,
  upgradesForCategory,
  isUpgradeAvailable,
  resolvePurchasedUpgrades,
  COMMON_ROOM_UPGRADE_ID,
} from "@/config/guildHallUpgrades";
import GuildHallTrainingSection from "./GuildHallTrainingSection";
import GuildHallDowntimeSection from "./GuildHallDowntimeSection";

export default function GuildHallManager({ campaign, guildHall, options, canEdit, onUpdate, onRefresh }) {
  const [deedCost, setDeedCost] = useState(guildHall?.deed_cost || 0);
  const [contribution, setContribution] = useState(0);
  const [generatingOptions, setGeneratingOptions] = useState(false);
  const [creatingOption, setCreatingOption] = useState(false);
  const [newOption, setNewOption] = useState({ name: "", description: "", image_url: "", cost: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);

  const currentOption = options?.find(o => o.id === guildHall?.current_option_id);
  const totalNeeded = guildHall?.deed_cost || 0;
  const totalContributed = guildHall?.total_contributed || 0;
  const progressPercent = totalNeeded > 0 ? Math.min((totalContributed / totalNeeded) * 100, 100) : 0;

  const handleSetDeedCost = async () => {
    await updateGuildHall(guildHall.id, { deed_cost: deedCost });
    onRefresh();
    toast.success("Deed cost set");
  };

  const handleGrantDeed = async () => {
    await updateGuildHall(guildHall.id, { deed_purchased: true });
    onRefresh();
    toast.success("Deed granted to players!");
  };

  const handleContribute = async () => {
    if (contribution <= 0) return;
    const newTotal = totalContributed + contribution;
    const updates = { total_contributed: newTotal };

    if (newTotal >= totalNeeded && !guildHall.deed_purchased) {
      updates.deed_purchased = true;
      toast.success("Deed purchased! 🎉");
    }

    await updateGuildHall(guildHall.id, updates);
    setContribution(0);
    onRefresh();
  };

  const handleGenerateOptions = async () => {
    // TODO: migrate to Next.js API route. The prior Base44-integrated
    // LLM + image-generation pipeline was removed with the Supabase
    // cut-over; wiring AI-sourced guild hall options will land when
    // the server-side generation endpoint is rebuilt.
    toast.error("AI guild hall generation is temporarily unavailable. Create options manually below.");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // TODO: migrate to Next.js API route. Use the shared uploadFile
      // helper (@/utils/uploadFile) once the Supabase bucket flow is
      // wired for guild-hall images. Until then, surface a friendly
      // toast and let the GM paste a URL by hand.
      toast.error("Image upload temporarily unavailable — paste an image URL in the Image URL field instead.");
    } catch (error) {
      toast.error("Failed to upload");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateOption = async () => {
    if (!newOption.name || !newOption.cost) {
      toast.error("Please fill in name and cost");
      return;
    }

    await createGuildHallOption({
      campaign_id: campaign.id,
      ...newOption,
    });

    setCreatingOption(false);
    setNewOption({ name: "", description: "", image_url: "", cost: 0 });
    onRefresh();
    toast.success("Guild hall option created");
  };

  const handleSelectOption = async (optionId) => {
    await updateGuildHall(guildHall.id, { current_option_id: optionId });
    onRefresh();
    toast.success("Guild hall selected!");
  };

  // Step 1: Deed Purchase
  if (!guildHall?.deed_purchased) {
    return (
      <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl p-8 border border-cyan-400/30">
        <div className="text-center mb-8">
          <Home className="w-16 h-16 text-[#37F2D1] mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Guild Hall</h2>
          <p className="text-gray-400">Establish your adventuring party's headquarters</p>
        </div>

        {canEdit ? (
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Deed Cost (Gold)</label>
              <Input
                type="number"
                value={deedCost}
                onChange={(e) => setDeedCost(parseInt(e.target.value) || 0)}
                className="bg-[#1a1f2e] border-slate-700 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSetDeedCost} className="flex-1 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                Set Cost
              </Button>
              <Button onClick={handleGrantDeed} className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white">
                Grant Deed
              </Button>
            </div>
            {guildHall && (
              <Button
                onClick={async () => {
                  if (confirm("Revoke deed and delete all guild hall data? Players will start from zero.")) {
                    // Delete all generated options, then the hall itself.
                    const { data: allOptions } = await listGuildHallOptions(campaign.id);
                    for (const opt of allOptions || []) {
                      await deleteGuildHallOption(opt.id);
                    }
                    await deleteGuildHall(guildHall.id);
                    onRefresh();
                    toast.success("Guild hall completely reset");
                  }
                }}
                variant="destructive"
                className="w-full mt-2"
              >
                Revoke Deed & Delete All
              </Button>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm font-bold text-[#37F2D1]">{totalContributed} / {totalNeeded} GP</span>
              </div>
              <div className="h-4 bg-[#1a1f2e] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#37F2D1] to-[#2dd9bd]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount to contribute"
                value={contribution}
                onChange={(e) => setContribution(parseInt(e.target.value) || 0)}
                className="bg-[#1a1f2e] border-slate-700 text-white"
              />
              <Button onClick={handleContribute} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                Contribute
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Choose Hall
  if (!guildHall?.current_option_id) {
    return (
      <div className="space-y-6">
        <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
          <h2 className="text-3xl font-bold text-white mb-4">Choose Your Guild Hall</h2>
          
          {canEdit && (
            <div className="flex gap-2 mb-6">
              <Button
                onClick={handleGenerateOptions}
                disabled={generatingOptions}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                {generatingOptions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Generate 6 Options
                  </>
                )}
              </Button>
              <Button onClick={() => setCreatingOption(true)} variant="outline" className="border-slate-700 text-white">
                Create Custom Option
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {options?.map(option => (
              <div key={option.id} className="bg-[#1a1f2e] rounded-xl overflow-hidden border border-slate-700 hover:border-[#37F2D1] transition-all">
                {option.image_url && (
                  <img src={option.image_url} alt={option.name} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white mb-2">{option.name}</h3>
                  <p className="text-sm text-gray-400 mb-3">{option.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#37F2D1] font-bold">{option.cost} GP</span>
                    <Button
                      onClick={() => handleSelectOption(option.id)}
                      size="sm"
                      className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {options?.length === 0 && !canEdit && (
            <p className="text-center text-gray-400 py-12">No guild hall options available yet. Ask your GM!</p>
          )}
        </div>

        {creatingOption && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f2e] border border-[#37F2D1] rounded-xl p-6 max-w-lg w-full">
              <h3 className="text-2xl font-bold mb-4">Create Guild Hall Option</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Hall name"
                  value={newOption.name}
                  onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                  className="bg-[#0f1219] border-slate-600 text-white"
                />
                <Textarea
                  placeholder="Description"
                  value={newOption.description}
                  onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                  className="bg-[#0f1219] border-slate-600 text-white"
                  rows={3}
                />
                <Input
                  type="number"
                  placeholder="Cost in gold"
                  value={newOption.cost}
                  onChange={(e) => setNewOption({ ...newOption, cost: parseInt(e.target.value) || 0 })}
                  className="bg-[#0f1219] border-slate-600 text-white"
                />
                
                {newOption.image_url ? (
                  <img src={newOption.image_url} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="hall-image-upload"
                    />
                    <label
                      htmlFor="hall-image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 bg-[#0f1219] border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-[#37F2D1]"
                    >
                      <Upload className="w-6 h-6 text-gray-400 mb-2" />
                      <span className="text-gray-400 text-sm">{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                    </label>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleCreateOption} className="flex-1 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                    Create
                  </Button>
                  <Button onClick={() => setCreatingOption(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Step 3+: upgrades come from the config in
  // src/config/guildHallUpgrades.js — 8 categories × 3 tiers, each
  // card either OWNED / available / locked by prerequisite.
  const purchasedUpgrades = guildHall?.upgrades || [];
  const gpAvailable = Number(guildHall?.coffers?.gp) || 0;

  // Seed the free Common Room exactly once per hall so the party
  // always starts with "long rest allowed" at their HQ. Skips when
  // the hall's already got it or there's no coffers shape yet (still
  // on deed-purchase step).
  React.useEffect(() => {
    if (!guildHall?.id) return;
    if (purchasedUpgrades.includes(COMMON_ROOM_UPGRADE_ID)) return;
    const seeded = [...purchasedUpgrades, COMMON_ROOM_UPGRADE_ID];
    updateGuildHall(guildHall.id, {
      upgrades: seeded,
      upgrade_level: seeded.length,
    }).then(() => onRefresh?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildHall?.id]);

  const handlePurchaseUpgrade = async (upgradeId) => {
    const upgrade = GUILD_HALL_UPGRADES[upgradeId];
    if (!upgrade) return;
    if (purchasedUpgrades.includes(upgradeId)) return;
    if (!isUpgradeAvailable(upgrade, purchasedUpgrades)) return;

    const cost = Number(upgrade.cost) || 0;
    if (cost > gpAvailable) {
      toast.error("Not enough gold in guild coffers.");
      return;
    }

    const newUpgrades = [...purchasedUpgrades, upgradeId];
    const newCoffers = {
      ...(guildHall.coffers || {}),
      gp: gpAvailable - cost,
    };
    try {
      await updateGuildHall(guildHall.id, {
        upgrades: newUpgrades,
        upgrade_level: newUpgrades.length,
        coffers: newCoffers,
      });
      onRefresh();
      toast.success(`Purchased ${upgrade.name}!`);
    } catch (err) {
      toast.error(err?.message || "Failed to purchase upgrade.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Hall */}
      <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl overflow-hidden border border-cyan-400/30">
        {currentOption?.image_url && (
          <img src={currentOption.image_url} alt={currentOption.name} className="w-full h-64 object-cover" />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">{currentOption?.name || "Your Guild Hall"}</h2>
              <p className="text-gray-400 mb-4">{currentOption?.description}</p>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-400">Established</span>
              </div>
            </div>
            {canEdit && (
              <Button
                onClick={async () => {
                  if (confirm("Reset guild hall selection? Upgrades will be lost.")) {
                    await updateGuildHall(guildHall.id, {
                      current_option_id: null,
                      upgrades: [],
                      upgrade_level: 0,
                      deed_purchased: false,
                    });
                    onRefresh();
                    toast.success("Guild hall reset");
                  }
                }}
                variant="destructive"
                size="sm"
              >
                Reset Selection
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Guild Coffers */}
      <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30">
            <Coins className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Guild Coffers</h3>
            <p className="text-sm text-gray-400">Funds available for guild expenses</p>
          </div>
        </div>
        <div className="flex gap-4 text-right">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-slate-200">{guildHall.coffers?.pp || 0}</span>
            <span className="text-[10px] text-slate-500 uppercase">PP</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-yellow-400">{guildHall.coffers?.gp || 0}</span>
            <span className="text-[10px] text-yellow-600 uppercase">GP</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-slate-400">{guildHall.coffers?.ep || 0}</span>
            <span className="text-[10px] text-slate-600 uppercase">EP</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-slate-300">{guildHall.coffers?.sp || 0}</span>
            <span className="text-[10px] text-slate-500 uppercase">SP</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-orange-400">{guildHall.coffers?.cp || 0}</span>
            <span className="text-[10px] text-orange-600 uppercase">CP</span>
          </div>
        </div>
      </div>

      {/* Upgrades — 8 categories × 3 tiers from the config. Each
          category renders a labeled header row and three cards in a
          horizontal progression. A card is:
            - owned     → teal border + OWNED badge, no buy button
            - available → amber border + "Buy — N gp" button
                          (not owned, prerequisite met or none)
            - locked    → greyed + lock icon + "Requires: X"
          Purchase logic hangs on the Buy button; step 4 ties it to
          the gold check in coffers. */}
      <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 space-y-6">
        <h3 className="text-2xl font-bold text-white">Guild Hall Upgrades</h3>
        {UPGRADE_CATEGORIES.map((cat) => {
          const tiers = upgradesForCategory(cat.key);
          return (
            <div key={cat.key} className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                <div>
                  <h4 className="text-lg font-bold text-white">{cat.label}</h4>
                  <p className="text-xs text-slate-400">{cat.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tiers.map((upgrade) => {
                  const owned = purchasedUpgrades.includes(upgrade.id);
                  const available = !owned && isUpgradeAvailable(upgrade, purchasedUpgrades);
                  const locked = !owned && !available;
                  const prereq = upgrade.prerequisite ? GUILD_HALL_UPGRADES[upgrade.prerequisite] : null;

                  const borderClass = owned
                    ? "border-[#37F2D1]/50"
                    : available
                      ? "border-amber-600/50"
                      : "border-slate-700/50";
                  const opacityClass = locked ? "opacity-50" : "";

                  return (
                    <div
                      key={upgrade.id}
                      className={`bg-[#1a1f2e] rounded-lg p-4 border flex flex-col gap-2 ${borderClass} ${opacityClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                          Tier {upgrade.tier}
                        </span>
                        {owned && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#050816] bg-[#37F2D1] rounded px-1.5 py-0.5">
                            <Check className="w-3 h-3" /> Owned
                          </span>
                        )}
                        {locked && (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <h5 className="text-base font-bold text-white leading-tight">{upgrade.name}</h5>
                      <p className="text-xs text-slate-400">{upgrade.description}</p>
                      <p className="text-xs text-[#37F2D1] italic">{upgrade.effect}</p>
                      {locked && prereq && (
                        <p className="text-[10px] text-amber-300 mt-auto">
                          Requires: {prereq.name}
                        </p>
                      )}
                      {available && (
                        <div className="mt-auto pt-2">
                          <Button
                            onClick={() => handlePurchaseUpgrade(upgrade.id)}
                            disabled={!canEdit}
                            size="sm"
                            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold"
                          >
                            Buy — {upgrade.cost} gp
                          </Button>
                        </div>
                      )}
                      {owned && upgrade.cost > 0 && (
                        <div className="mt-auto pt-2 text-[10px] text-slate-500">
                          Built for {upgrade.cost} gp
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Training — gated to campaigns with at least one
          training-related upgrade; self-hides otherwise. */}
      <GuildHallTrainingSection
        campaign={campaign}
        purchasedUpgrades={purchasedUpgrades}
        canEdit={canEdit}
      />

      {/* Downtime Activities — self-hides when none of the
          category upgrades are owned. */}
      <GuildHallDowntimeSection
        campaign={campaign}
        purchasedUpgrades={purchasedUpgrades}
        canEdit={canEdit}
      />

      {/* Active effects summary — flat list of every purchased
          upgrade's human-readable effect text, prefixed with the
          category icon and suffixed with "(Upgrade Name)" so the
          party can tell at a glance which upgrade granted what. */}
      <ActiveEffectsSummary purchasedIds={purchasedUpgrades} />
    </div>
  );
}

function ActiveEffectsSummary({ purchasedIds }) {
  const upgrades = resolvePurchasedUpgrades(purchasedIds);
  if (upgrades.length === 0) return null;
  const iconFor = (categoryKey) =>
    UPGRADE_CATEGORIES.find((c) => c.key === categoryKey)?.icon || "•";
  return (
    <div className="bg-[#0f1219]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
      <h3 className="text-xl font-bold text-white mb-3">Active Guild Hall Effects</h3>
      <ul className="space-y-1.5">
        {upgrades.map((u) => (
          <li key={u.id} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="text-base leading-5" aria-hidden="true">{iconFor(u.category)}</span>
            <span>
              {u.effect}
              <span className="text-slate-500"> ({u.name})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}