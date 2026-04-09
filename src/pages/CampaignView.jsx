import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Upload, Users, Map, BookOpen, Scroll, Package, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function CampaignView() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const [uploadingSection, setUploadingSection] = useState(null);

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const campaigns = await base44.entities.Campaign.list();
      return campaigns.find(c => c.id === campaignId);
    },
    enabled: !!campaignId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isGM = campaign?.game_master_id === user?.id;

  const sections = [
    {
      title: "NPCs",
      icon: Users,
      imageUrl: campaign?.npcs_image_url,
      field: "npcs_image_url",
      link: createPageUrl("CampaignNPCs") + `?id=${campaignId}`
    },
    {
      title: "Items",
      icon: Package,
      imageUrl: campaign?.items_image_url,
      field: "items_image_url",
      link: createPageUrl("CampaignItems") + `?id=${campaignId}`
    },
    {
      title: "Maps",
      icon: Map,
      imageUrl: campaign?.maps_image_url,
      field: "maps_image_url",
      link: createPageUrl("CampaignMaps") + `?id=${campaignId}`
    },
    {
      title: "World Lore",
      icon: BookOpen,
      imageUrl: campaign?.world_lore_image_url,
      field: "world_lore_image_url",
      link: createPageUrl("CampaignWorldLore") + `?id=${campaignId}`,
      large: true
    },
    {
      title: "Homebrew",
      icon: Scroll,
      imageUrl: campaign?.homebrew_image_url,
      field: "homebrew_image_url",
      link: createPageUrl("CampaignHomebrew") + `?id=${campaignId}`,
      large: true
    }
  ];

  const handleImageUpload = async (field, file) => {
    setUploadingSection(field);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Campaign.update(campaignId, { [field]: file_url });
    setUploadingSection(null);
  };

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading campaign...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-48 bg-[#1E2430] p-4 space-y-2">
        <Link 
          to={createPageUrl("Play")}
          className="bg-[#37F2D1] text-[#1E2430] font-bold text-lg px-6 py-4 flex items-center justify-center gap-3 hover:bg-[#2dd9bd] transition-colors rounded-lg mb-4"
        >
          <Play className="w-5 h-5 fill-current" />
          LAUNCH
        </Link>

        <Link to={createPageUrl("YourProfile")} className="block text-sm text-gray-300 hover:text-white py-2">
          Your Profile
        </Link>
        
        {isGM && (
          <>
            <div className="block text-sm font-semibold text-white py-2 border-b border-gray-700 mb-2 mt-4">
              GM Panel
            </div>
            <Link 
              to={createPageUrl("TacticianBoard") + `?id=${campaignId}`}
              className="block text-sm text-gray-300 hover:text-white py-2"
            >
              Tactician Board
            </Link>
            <Link 
              to={createPageUrl("PlayerTheatre") + `?id=${campaignId}`}
              className="block text-sm text-gray-300 hover:text-white py-2"
            >
              Player Theatre
            </Link>
          </>
        )}
        
        <Link 
          to={createPageUrl("CampaignManagement") + `?id=${campaignId}`}
          className="block text-sm text-gray-300 hover:text-white py-2"
        >
          Players
        </Link>
        <div className="block text-sm text-gray-300 py-2">World</div>
        <div className="block text-sm text-gray-300 py-2">Notes</div>
        <div className="block text-sm text-gray-300 py-2">Campaign Stats</div>
        <div className="block text-sm text-gray-300 py-2">Campaign Settings</div>
      </aside>

      <main className="flex-1 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: campaign.cover_image_url
              ? `url(${campaign.cover_image_url})`
              : 'url(https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=800&fit=crop)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E2430]/80 via-[#2A3441]/70 to-[#1E2430]/80" />
        </div>

        <div className="relative z-10 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
                {campaign.title}
              </h1>
              <p className="text-2xl text-gray-200 tracking-wider drop-shadow-lg">
                ARCHIVES
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {sections.slice(0, 2).map((section) => (
                <SectionCard
                  key={section.title}
                  section={section}
                  isGM={isGM}
                  onImageUpload={handleImageUpload}
                  uploading={uploadingSection === section.field}
                />
              ))}
              <div className="col-span-2">
                <SectionCard
                  section={sections[2]}
                  isGM={isGM}
                  onImageUpload={handleImageUpload}
                  uploading={uploadingSection === sections[2].field}
                />
              </div>
              {sections.slice(3).map((section) => (
                <SectionCard
                  key={section.title}
                  section={section}
                  isGM={isGM}
                  onImageUpload={handleImageUpload}
                  uploading={uploadingSection === section.field}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionCard({ section, isGM, onImageUpload, uploading }) {
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (file) {
      onImageUpload(section.field, file);
    }
  };

  const handleClick = (e) => {
    // If GM is clicking to upload, don't navigate
    if (isGM && e.target.tagName !== 'INPUT') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      
      // If clicking on bottom 20% of card and it's GM, show upload
      if (clickY > rect.height * 0.8) {
        document.getElementById(`upload-${section.field}`)?.click();
        return;
      }
    }
    
    // Otherwise navigate
    navigate(section.link);
  };

  return (
    <div 
      className="bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden h-64 relative group cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={handleClick}
    >
      {section.imageUrl ? (
        <img
          src={section.imageUrl}
          alt={section.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <section.icon className="w-16 h-16 text-gray-400" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
        <h3 className="text-3xl font-bold text-white drop-shadow-lg">
          {section.title}
        </h3>
        {isGM && (
          <p className="text-xs text-white/60 mt-1">Click bottom to upload image</p>
        )}
      </div>

      {uploading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <p className="text-white font-semibold">Uploading...</p>
        </div>
      )}

      {isGM && (
        <input
          type="file"
          id={`upload-${section.field}`}
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      )}
    </div>
  );
}