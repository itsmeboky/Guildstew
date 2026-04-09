import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Home, Upload, Sparkles, Loader2, ChevronRight, Check, Coins } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
    await base44.entities.GuildHall.update(guildHall.id, { deed_cost: deedCost });
    onRefresh();
    toast.success("Deed cost set");
  };

  const handleGrantDeed = async () => {
    await base44.entities.GuildHall.update(guildHall.id, { deed_purchased: true });
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
    
    await base44.entities.GuildHall.update(guildHall.id, updates);
    setContribution(0);
    onRefresh();
  };

  const handleGenerateOptions = async () => {
    setGeneratingOptions(true);
    try {
      const prompt = `Generate 6 unique fantasy guild hall options for a D&D campaign:
      - 2 cheap/rundown options (100-500 gold)
      - 2 middle-tier options (500-2000 gold)
      - 2 expensive/luxurious options (2000-10000 gold)
      
      For each, provide: name, vivid description (2-3 sentences), cost, and tier (cheap/middle/expensive)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  cost: { type: "number" },
                  tier: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Generate images and create options
      for (const opt of result.options) {
        const imagePrompt = `Fantasy D&D guild hall: ${opt.name}. ${opt.description}. High quality, detailed illustration.`;
        const { url } = await base44.integrations.Core.GenerateImage({ prompt: imagePrompt });
        
        await base44.entities.GuildHallOption.create({
          campaign_id: campaign.id,
          name: opt.name,
          description: opt.description,
          image_url: url,
          cost: opt.cost,
          tier: opt.tier,
          is_ai_generated: true
        });
      }

      onRefresh();
      toast.success("6 guild hall options generated!");
    } catch (error) {
      toast.error("Failed to generate options");
    } finally {
      setGeneratingOptions(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewOption({ ...newOption, image_url: file_url });
      toast.success("Image uploaded");
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

    await base44.entities.GuildHallOption.create({
      campaign_id: campaign.id,
      ...newOption
    });
    
    setCreatingOption(false);
    setNewOption({ name: "", description: "", image_url: "", cost: 0 });
    onRefresh();
    toast.success("Guild hall option created");
  };

  const handleSelectOption = async (optionId) => {
    await base44.entities.GuildHall.update(guildHall.id, { current_option_id: optionId });
    onRefresh();
    toast.success("Guild hall selected!");
  };

  // Step 1: Deed Purchase
  if (!guildHall?.deed_purchased) {
    return (
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-8 border border-cyan-400/30">
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
                className="bg-[#1E2430] border-gray-700 text-white"
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
                    // Delete all generated options
                    const allOptions = await base44.entities.GuildHallOption.filter({ campaign_id: campaign.id });
                    for (const opt of allOptions) {
                      await base44.entities.GuildHallOption.delete(opt.id);
                    }
                    // Delete the guild hall
                    await base44.entities.GuildHall.delete(guildHall.id);
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
              <div className="h-4 bg-[#1E2430] rounded-full overflow-hidden">
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
                className="bg-[#1E2430] border-gray-700 text-white"
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
        <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
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
              <Button onClick={() => setCreatingOption(true)} variant="outline" className="border-gray-700 text-white">
                Create Custom Option
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {options?.map(option => (
              <div key={option.id} className="bg-[#1E2430] rounded-xl overflow-hidden border border-gray-700 hover:border-[#37F2D1] transition-all">
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
            <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl p-6 max-w-lg w-full">
              <h3 className="text-2xl font-bold mb-4">Create Guild Hall Option</h3>
              <div className="space-y-3">
                <Input
                  placeholder="Hall name"
                  value={newOption.name}
                  onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                  className="bg-[#2A3441] border-gray-700 text-white"
                />
                <Textarea
                  placeholder="Description"
                  value={newOption.description}
                  onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                  className="bg-[#2A3441] border-gray-700 text-white"
                  rows={3}
                />
                <Input
                  type="number"
                  placeholder="Cost in gold"
                  value={newOption.cost}
                  onChange={(e) => setNewOption({ ...newOption, cost: parseInt(e.target.value) || 0 })}
                  className="bg-[#2A3441] border-gray-700 text-white"
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
                      className="flex flex-col items-center justify-center w-full h-32 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1]"
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

  // Step 3: Manage Upgrades
  const availableUpgrades = [
    { id: "finding_work", name: "Job Board", description: "Access to guild contracts and quests", cost: 500 },
    { id: "training", name: "Training Facilities", description: "Learn new skills from guild masters", cost: 1000 },
    { id: "resources", name: "Supply Access", description: "Discounted equipment and supplies", cost: 750 },
    { id: "networking", name: "Common Room", description: "Network with other adventurers", cost: 300 },
    { id: "library", name: "Guild Library", description: "Research and lore archives", cost: 1200 }
  ];

  const purchasedUpgrades = guildHall?.upgrades || [];

  const handlePurchaseUpgrade = async (upgradeId, cost) => {
    if (purchasedUpgrades.includes(upgradeId)) return;
    
    const newUpgrades = [...purchasedUpgrades, upgradeId];
    await base44.entities.GuildHall.update(guildHall.id, { 
      upgrades: newUpgrades,
      upgrade_level: newUpgrades.length
    });
    onRefresh();
    toast.success("Upgrade purchased!");
  };

  return (
    <div className="space-y-6">
      {/* Current Hall */}
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl overflow-hidden border border-cyan-400/30">
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
                    await base44.entities.GuildHall.update(guildHall.id, {
                      current_option_id: null,
                      upgrades: [],
                      upgrade_level: 0,
                      deed_purchased: false
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
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30 flex items-center justify-between">
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

      {/* Upgrades */}
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
        <h3 className="text-2xl font-bold text-white mb-6">Guild Hall Upgrades</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableUpgrades.map(upgrade => {
            const isPurchased = purchasedUpgrades.includes(upgrade.id);
            return (
              <div
                key={upgrade.id}
                className={`bg-[#1E2430] rounded-lg p-4 border ${
                  isPurchased ? 'border-green-500' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white">{upgrade.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{upgrade.description}</p>
                  </div>
                  {isPurchased && <Check className="w-5 h-5 text-green-500" />}
                </div>
                


                {!isPurchased && (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[#37F2D1] font-bold">{upgrade.cost} GP</span>
                    <Button
                      onClick={() => handlePurchaseUpgrade(upgrade.id, upgrade.cost)}
                      size="sm"
                      className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                    >
                      Purchase
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}