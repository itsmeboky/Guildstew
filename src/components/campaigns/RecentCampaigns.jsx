import React from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RecentCampaigns({ campaigns }) {
  return (
    <div className="bg-[#2A3441] rounded-2xl p-6">
      <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">
        Recently Played Campaigns
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            to={createPageUrl("ActiveCampaign") + `?id=${campaign.id}`}
            className="group relative"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 group-hover:scale-105 transition-transform">
              <img
                src={campaign.cover_image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300&h=300&fit=crop'}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs mt-2 text-center truncate font-medium">{campaign.title}</p>
          </Link>
        ))}
      </div>

      {campaigns.length === 0 && (
        <p className="text-gray-500 text-center py-8 text-sm">No campaigns yet</p>
      )}
    </div>
  );
}