import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Eye, EyeOff, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil"
];

const RELATIONSHIP_TYPES = [
  { value: "ally", label: "Ally", color: "#10b981" },
  { value: "enemy", label: "Enemy", color: "#ef4444" },
  { value: "rival", label: "Rival", color: "#f59e0b" },
  { value: "parent", label: "Parent", color: "#8b5cf6" },
  { value: "child", label: "Child", color: "#ec4899" },
  { value: "spouse", label: "Spouse", color: "#f472b6" },
  { value: "neutral", label: "Neutral", color: "#6b7280" }
];

export default function DeityEditor({ deity, deities, entries, onSave, onCancel }) {
  const [name, setName] = useState(deity?.name || "");
  const [title, setTitle] = useState(deity?.title || "");
  const [imageUrl, setImageUrl] = useState(deity?.image_url || "");
  const [domains, setDomains] = useState(deity?.domains || []);
  const [alignment, setAlignment] = useState(deity?.alignment || "True Neutral");
  const [symbolUrl, setSymbolUrl] = useState(deity?.symbol_url || "");
  const [holyText, setHolyText] = useState(deity?.holy_text || "");
  const [description, setDescription] = useState(deity?.description || "");
  const [followers, setFollowers] = useState(deity?.followers || "");
  const [relationships, setRelationships] = useState(deity?.relationships || []);
  const [entryId, setEntryId] = useState(deity?.entry_id || "");
  const [discovered, setDiscovered] = useState(deity?.discovered !== false);
  const [uploadingSymbol, setUploadingSymbol] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  const handleSymbolUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingSymbol(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSymbolUrl(file_url);
      toast.success("Symbol uploaded");
    } catch (error) {
      toast.error("Failed to upload symbol");
    } finally {
      setUploadingSymbol(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddDomain = () => {
    if (newDomain.trim() && !domains.includes(newDomain.trim())) {
      setDomains([...domains, newDomain.trim()]);
      setNewDomain("");
    }
  };

  const handleAddRelationship = () => {
    setRelationships([...relationships, { deity_id: "", relationship_type: "neutral", description: "" }]);
  };

  const handleUpdateRelationship = (index, field, value) => {
    const updated = [...relationships];
    updated[index][field] = value;
    setRelationships(updated);
  };

  const handleRemoveRelationship = (index) => {
    setRelationships(relationships.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a deity name");
      return;
    }

    const dataToSave = {
      ...(deity?.id && { id: deity.id }),
      name,
      title,
      image_url: imageUrl || null,
      domains,
      alignment,
      symbol_url: symbolUrl || null,
      holy_text: holyText,
      description,
      followers,
      relationships: relationships.filter(r => r.deity_id),
      entry_id: entryId || null,
      discovered
    };

    onSave(dataToSave);
  };

  const availableDeities = deities?.filter(d => d.id !== deity?.id) || [];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
        <h2 className="text-3xl font-bold mb-6">{deity?.id ? 'Edit Deity' : 'Create Deity'}</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">Deity Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Solara, Goddess of the Sun"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold mb-2">Divine Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="The Eternal Flame, The Dawn Bringer"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            {/* Domains */}
            <div>
              <label className="block text-sm font-semibold mb-2">Domains</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDomain())}
                  placeholder="e.g., War, Death, Nature"
                  className="bg-[#2A3441] border-gray-700 text-white flex-1"
                />
                <Button onClick={handleAddDomain} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {domains.map((domain, index) => (
                  <span key={index} className="bg-[#37F2D1]/20 text-[#37F2D1] px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {domain}
                    <button onClick={() => setDomains(domains.filter((_, i) => i !== index))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div>
              <label className="block text-sm font-semibold mb-2">Alignment</label>
              <select
                value={alignment}
                onChange={(e) => setAlignment(e.target.value)}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                {ALIGNMENTS.map(align => (
                  <option key={align} value={align}>{align}</option>
                ))}
              </select>
            </div>

            {/* Deity Image */}
            <div>
              <label className="block text-sm font-semibold mb-2">Deity Image / Portrait</label>
              {imageUrl ? (
                <div className="relative w-full h-48 bg-[#1E2430] rounded-lg overflow-hidden border border-gray-700">
                  <img src={imageUrl} alt="Deity" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="deity-image-upload"
                  />
                  <label
                    htmlFor="deity-image-upload"
                    className="flex items-center justify-center gap-2 w-full h-32 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                  </label>
                </div>
              )}
            </div>

            {/* Symbol */}
            <div>
              <label className="block text-sm font-semibold mb-2">Divine Symbol</label>
              {symbolUrl ? (
                <div className="relative w-full h-32 bg-[#1E2430] rounded-lg overflow-hidden border border-gray-700">
                  <img src={symbolUrl} alt="Symbol" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setSymbolUrl("")}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSymbolUpload}
                    className="hidden"
                    id="deity-symbol-upload"
                  />
                  <label
                    htmlFor="deity-symbol-upload"
                    className="flex items-center justify-center gap-2 w-full h-24 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 text-sm">{uploadingSymbol ? "Uploading..." : "Upload"}</span>
                  </label>
                </div>
              )}
            </div>

            {/* Holy Text */}
            <div>
              <label className="block text-sm font-semibold mb-2">Holy Text / Scripture</label>
              <Input
                value={holyText}
                onChange={(e) => setHolyText(e.target.value)}
                placeholder="The Book of Radiance"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-2">Description & Lore</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Myths, teachings, and divine nature..."
                className="bg-[#2A3441] border-gray-700 text-white"
                rows={4}
              />
            </div>

            {/* Followers */}
            <div>
              <label className="block text-sm font-semibold mb-2">Followers & Worshippers</label>
              <Textarea
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="Typical worshippers, clergy, practices..."
                className="bg-[#2A3441] border-gray-700 text-white"
                rows={3}
              />
            </div>

            {/* Relationships */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Divine Relationships</label>
                <Button onClick={handleAddRelationship} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {relationships.map((rel, index) => (
                  <div key={index} className="bg-[#2A3441] rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={rel.deity_id}
                        onChange={(e) => handleUpdateRelationship(index, 'deity_id', e.target.value)}
                        className="flex-1 bg-[#1E2430] border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      >
                        <option value="">Select deity</option>
                        {availableDeities.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <select
                        value={rel.relationship_type}
                        onChange={(e) => handleUpdateRelationship(index, 'relationship_type', e.target.value)}
                        className="bg-[#1E2430] border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      >
                        {RELATIONSHIP_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveRelationship(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      value={rel.description || ""}
                      onChange={(e) => handleUpdateRelationship(index, 'description', e.target.value)}
                      placeholder="Describe this relationship..."
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Link to Entry */}
            <div>
              <label className="block text-sm font-semibold mb-2">Link to Lore Entry</label>
              <select
                value={entryId}
                onChange={(e) => setEntryId(e.target.value)}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">No linked entry</option>
                {entries?.map(entry => (
                  <option key={entry.id} value={entry.id}>{entry.title}</option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deity-discovered"
                checked={discovered}
                onChange={(e) => setDiscovered(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="deity-discovered" className="text-sm text-gray-300">
                Visible to players
              </label>
              {discovered ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button 
            onClick={handleSave} 
            className="flex-1 px-4 py-2 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{ backgroundColor: '#FF5722' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
          >
            <Save className="w-4 h-4" />
            Save Deity
          </button>
          <button 
            onClick={onCancel} 
            className="flex-1 px-4 py-2 rounded-lg text-white font-semibold border-2 transition-colors"
            style={{ backgroundColor: '#FF5722', borderColor: '#FF5722' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FF6B3D'; e.currentTarget.style.borderColor = '#FF6B3D'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FF5722'; e.currentTarget.style.borderColor = '#FF5722'; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}