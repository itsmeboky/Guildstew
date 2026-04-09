import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Clock } from "lucide-react";

export default function CampaignGrid({ campaigns, grayscale }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">No campaigns found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          to={createPageUrl("CampaignView") + `?id=${campaign.id}`}
          className="group"
        >
          <div className="bg-[#2A3441] rounded-2xl overflow-hidden hover:ring-2 hover:ring-[#37F2D1] transition-all">
            <div className="aspect-video overflow-hidden">
              <img
                src={campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&h=300&fit=crop'}
                alt={campaign.title}
                className={`w-full h-full object-cover group-hover:scale-110 transition-transform ${grayscale ? 'grayscale' : ''}`}
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2 truncate">{campaign.title}</h3>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{campaign.description || 'No description'}</p>
              
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{campaign.player_ids?.length || 0} players</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{campaign.total_hours || 0}h</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}