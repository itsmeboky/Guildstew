import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Upload, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LazyImage from "@/components/ui/LazyImage";

export default function CampaignArchives() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId
  });

  const isGM = user?.id === campaign?.game_master_id || campaign?.co_dm_ids?.includes(user?.id);

  const updateImageMutation = useMutation({
    mutationFn: async ({ field, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.Campaign.update(campaignId, { [field]: file_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    }
  });

  const handleImageUpload = (field, file) => {
    if (file) {
      updateImageMutation.mutate({ field, file });
    }
  };

  // Hub cards. Maps and World Lore moved off this page (Maps live
  // under World Lore > Regions & Maps; Homebrew no longer gets its
  // own tab — SRD + homebrew now mix inside each category). The
  // *_image_url field name for Monsters / Spells / Abilities is
  // new and will be null on existing campaigns until the GM uploads
  // a cover, which is fine — the card falls back to the default
  // gradient.
  const sections = [
    { title: "NPCs",      field: "npcs_image_url",      page: "CampaignNPCs" },
    { title: "Items",     field: "items_image_url",     page: "CampaignItems" },
    { title: "Monsters",  field: "monsters_image_url",  page: "CampaignMonsters" },
    { title: "Spells",    field: "spells_image_url",    page: "CampaignSpells" },
    { title: "Abilities", field: "abilities_image_url", page: "CampaignAbilities" },
  ];

  if (!campaign) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div 
      className="min-h-screen p-8 relative"
      style={{
        backgroundImage: campaign.archives_background_url 
          ? `url(${campaign.archives_background_url})`
          : 'linear-gradient(to bottom right, #0f1419, #1a1f2e, #0f1419)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {campaign.archives_background_url && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      <div className="max-w-4xl mx-auto relative z-10">
        <Button
          onClick={() => navigate(createPageUrl(isGM ? "CampaignGMPanel" : "CampaignPanel") + `?id=${campaignId}`)}
          variant="ghost"
          className="mb-8 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {isGM ? "GM Panel" : "Campaign Lobby"}
        </Button>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div
              key={section.field}
              onClick={() => navigate(createPageUrl(section.page) + `?id=${campaignId}`)}
              className="relative h-64 rounded-xl overflow-hidden cursor-pointer group"
              style={{ 
                marginLeft: index % 2 === 0 ? '0' : '3rem',
                marginRight: index % 2 === 0 ? '3rem' : '0'
              }}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                {campaign[section.field] ? (
                  <LazyImage 
                    src={campaign[section.field]} 
                    alt={section.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    style={{
                      transform: campaign[section.field.replace('_url', '_position')] && campaign[section.field.replace('_url', '_zoom')]
                        ? `translate(${campaign[section.field.replace('_url', '_position')].x}px, ${campaign[section.field.replace('_url', '_position')].y}px) scale(${campaign[section.field.replace('_url', '_zoom')]})`
                        : 'none',
                      transformOrigin: 'center center'
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#2A3441] to-[#1E2430] flex items-center justify-center">
                    <Upload className="w-16 h-16 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Corner Decorations */}
              <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-400/50" />
              <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-400/50" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-cyan-400/50" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-400/50" />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-1">{section.title}</h3>
                      <p className="text-sm text-gray-300 uppercase tracking-widest">
                        {section.title === 'NPCs' ? 'The Cast Beyond the Party' : 
                         section.title === 'Items' ? 'Forged & Found Compendium' : 
                         section.title === 'Maps' ? 'Boundaries of the Unknown' : 
                         section.title === 'World Lore' ? 'Chronicles of the Realm' : 
                         section.title === 'Homebrew' ? 'The Creator\'s Codex' : 
                         'Campaign Archives'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-4 max-w-2xl">
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {section.field === 'npcs_image_url' && "Manage non-player characters, their stats, abilities, and notes. Build a comprehensive NPC library for your campaign."}
                    {section.field === 'items_image_url' && "Create and organize magical items, weapons, and artifacts. Track rarity, stats, and special properties."}
                    {section.field === 'maps_image_url' && "Upload and manage battle maps and world maps. Add notes and grid settings for tactical encounters."}
                    {section.field === 'world_lore_image_url' && "Document your world's history, cultures, and lore. Build an immersive setting for your players."}
                    {section.field === 'homebrew_image_url' && "Create custom rules, classes, and mechanics. Customize your campaign with unique homebrew content."}
                  </p>
                </div>
              </div>


            </div>
          ))}
        </div>
      </div>
    </div>
  );
}