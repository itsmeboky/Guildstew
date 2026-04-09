import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Mountain, TreePine, Flame, Building2, Home, Waves, Wheat, Droplets, Snowflake, Castle, Landmark, Anchor } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const iconOptions = [
  { value: "mountain", icon: Mountain, label: "Mountain" },
  { value: "forest", icon: TreePine, label: "Forest" },
  { value: "desert", icon: Flame, label: "Desert" },
  { value: "coastal", icon: Anchor, label: "Coastal" },
  { value: "village", icon: Home, label: "Village" },
  { value: "ocean", icon: Waves, label: "Ocean" },
  { value: "plains", icon: Wheat, label: "Plains" },
  { value: "swamp", icon: Droplets, label: "Swamp" },
  { value: "tundra", icon: Snowflake, label: "Tundra" },
  { value: "volcano", icon: Mountain, label: "Volcano" },
  { value: "castle", icon: Castle, label: "Kingdoms" },
  { value: "ruins", icon: Landmark, label: "Ruins" }
];

export default function RegionEditor({ region, onSave, onCancel }) {
  const [name, setName] = useState(region?.name || "");
  const [imageUrl, setImageUrl] = useState(region?.image_url || "");
  const [icon, setIcon] = useState(region?.icon || "mountain");
  const [climate, setClimate] = useState(region?.climate || "");
  const [weather, setWeather] = useState(region?.weather || "");
  const [biomes, setBiomes] = useState(region?.biomes || "");
  const [population, setPopulation] = useState(region?.population || "");
  const [dangerRating, setDangerRating] = useState(region?.danger_rating || "");
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a region name");
      return;
    }

    onSave({
      ...(region?.id && { id: region.id }),
      name,
      image_url: imageUrl,
      icon,
      climate,
      weather,
      biomes,
      population,
      danger_rating: dangerRating
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-[#1E2430] border border-[#2A3441] rounded-xl p-8 max-w-2xl w-full mx-4 my-8">
        <h2 className="text-2xl font-bold mb-6">{region ? "Edit Region" : "Create Region"}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Region Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#2A3441] border-gray-700 text-white"
              placeholder="Enter region name..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Header Image</label>
            {imageUrl && (
              <div className="mb-2 relative w-full h-32 rounded-lg overflow-hidden">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="region-image"
            />
            <label
              htmlFor="region-image"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A3441] text-white rounded-lg cursor-pointer hover:bg-[#37F2D1] hover:text-[#1E2430] transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : imageUrl ? "Change Image" : "Upload Image"}
            </label>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Region Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {iconOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setIcon(opt.value)}
                    className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                      icon === opt.value 
                        ? 'bg-[#37F2D1] text-[#1E2430]' 
                        : 'bg-[#2A3441] text-white hover:bg-[#37F2D1] hover:text-[#1E2430]'
                    }`}
                    type="button"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Region Climate</label>
            <Input
              value={climate}
              onChange={(e) => setClimate(e.target.value)}
              className="bg-[#2A3441] border-gray-700 text-white"
              placeholder="e.g., Temperate, Tropical..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Region Weather</label>
            <Input
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="bg-[#2A3441] border-gray-700 text-white"
              placeholder="e.g., Frequent storms, Clear skies..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Biomes</label>
            <Input
              value={biomes}
              onChange={(e) => setBiomes(e.target.value)}
              className="bg-[#2A3441] border-gray-700 text-white"
              placeholder="e.g., Forests, Mountains..."
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Total Population</label>
            <Input
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              className="bg-[#2A3441] border-gray-700 text-white"
              placeholder="e.g., 50,000"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Danger Rating</label>
            <Input
              value={dangerRating}
              onChange={(e) => setDangerRating(e.target.value)}
              className="bg-[#2A3441] border-gray-700 text-white"
              placeholder="e.g., Low, Medium, High..."
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-white font-semibold transition-colors"
              style={{ backgroundColor: '#FF5722' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-white font-semibold transition-colors"
              style={{ backgroundColor: '#37F2D1' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2dd9bd'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#37F2D1'}
            >
              {region ? "Update Region" : "Create Region"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}