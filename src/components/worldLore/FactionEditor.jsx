import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Eye, EyeOff, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const FACTION_TYPES = [
  { value: "guild", label: "Guild", color: "#3b82f6" },
  { value: "noble_house", label: "Noble House", color: "#8b5cf6" },
  { value: "secret_society", label: "Secret Society", color: "#6366f1" },
  { value: "religious_order", label: "Religious Order", color: "#a855f7" },
  { value: "military", label: "Military", color: "#ef4444" },
  { value: "merchant", label: "Merchant", color: "#f59e0b" },
  { value: "criminal", label: "Criminal", color: "#dc2626" },
  { value: "political", label: "Political", color: "#10b981" },
  { value: "other", label: "Other", color: "#6b7280" }
];

const INFLUENCE_LEVELS = [
  { value: "minimal", label: "Minimal", color: "#6b7280" },
  { value: "local", label: "Local", color: "#3b82f6" },
  { value: "regional", label: "Regional", color: "#8b5cf6" },
  { value: "national", label: "National", color: "#f59e0b" },
  { value: "continental", label: "Continental", color: "#ef4444" },
  { value: "global", label: "Global", color: "#dc2626" }
];

export default function FactionEditor({ faction, entries, npcs, onSave, onCancel }) {
  const [name, setName] = useState(faction?.name || "");
  const [type, setType] = useState(faction?.type || "other");
  const [description, setDescription] = useState(faction?.description || "");
  const [imageUrl, setImageUrl] = useState(faction?.image_url || "");
  const [symbolUrl, setSymbolUrl] = useState(faction?.symbol_url || "");
  const [motto, setMotto] = useState(faction?.motto || "");
  const [hierarchy, setHierarchy] = useState(faction?.hierarchy || []);
  const [goals, setGoals] = useState(faction?.goals || []);
  const [influenceLevel, setInfluenceLevel] = useState(faction?.influence_level || "local");
  const [resources, setResources] = useState(faction?.resources || []);
  const [linkedNpcs, setLinkedNpcs] = useState(faction?.linked_npcs || []);
  const [keyMembers, setKeyMembers] = useState(faction?.key_members || []);
  const [entryId, setEntryId] = useState(faction?.entry_id || "");
  const [discovered, setDiscovered] = useState(faction?.discovered !== false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [newResource, setNewResource] = useState("");

  const handleImageUpload = async (e, type = 'symbol') => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'header') {
        setImageUrl(file_url);
        toast.success("Header image uploaded");
      } else {
        setSymbolUrl(file_url);
        toast.success("Symbol uploaded");
      }
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  const handleAddResource = () => {
    if (newResource.trim()) {
      setResources([...resources, newResource.trim()]);
      setNewResource("");
    }
  };

  const handleAddHierarchy = () => {
    setHierarchy([...hierarchy, { rank: "", title: "", description: "" }]);
  };

  const handleUpdateHierarchy = (index, field, value) => {
    const updated = [...hierarchy];
    updated[index][field] = value;
    setHierarchy(updated);
  };

  const handleRemoveHierarchy = (index) => {
    setHierarchy(hierarchy.filter((_, i) => i !== index));
  };

  const handleAddKeyMember = () => {
    setKeyMembers([...keyMembers, { name: "", rank: "", description: "" }]);
  };

  const handleUpdateKeyMember = (index, field, value) => {
    const updated = [...keyMembers];
    updated[index][field] = value;
    setKeyMembers(updated);
  };

  const handleRemoveKeyMember = (index) => {
    setKeyMembers(keyMembers.filter((_, i) => i !== index));
  };

  const handleAddLinkedNPC = () => {
    setLinkedNpcs([...linkedNpcs, { npc_id: "", rank: "", role_description: "" }]);
  };

  const handleUpdateLinkedNPC = (index, field, value) => {
    const updated = [...linkedNpcs];
    updated[index][field] = value;
    setLinkedNpcs(updated);
  };

  const handleRemoveLinkedNPC = (index) => {
    setLinkedNpcs(linkedNpcs.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a faction name");
      return;
    }

    const dataToSave = {
      ...(faction?.id && { id: faction.id }),
      name,
      type,
      description,
      image_url: imageUrl || null,
      symbol_url: symbolUrl || null,
      motto,
      hierarchy: hierarchy.filter(h => h.rank.trim()),
      goals,
      influence_level: influenceLevel,
      resources,
      linked_npcs: linkedNpcs.filter(n => n.npc_id),
      key_members: keyMembers.filter(m => m.name.trim()),
      player_reputations: faction?.player_reputations || {},
      entry_id: entryId || null,
      discovered
    };

    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-8">
        <h2 className="text-3xl font-bold mb-6">{faction?.id ? 'Edit Faction' : 'Create Faction'}</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Faction Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Silver Hand"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                {FACTION_TYPES.map(ft => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Influence Level</label>
              <select
                value={influenceLevel}
                onChange={(e) => setInfluenceLevel(e.target.value)}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                {INFLUENCE_LEVELS.map(il => (
                  <option key={il.value} value={il.value}>{il.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Motto / Creed</label>
              <Input
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder="For honor and glory"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Header Image (optional)</label>
              {imageUrl ? (
                <div className="relative w-full h-32 bg-[#1E2430] rounded-lg overflow-hidden border-2 border-gray-700">
                  <img src={imageUrl} alt="Header" className="w-full h-full object-cover" />
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
                    onChange={(e) => handleImageUpload(e, 'header')}
                    className="hidden"
                    id="faction-header-upload"
                  />
                  <label
                    htmlFor="faction-header-upload"
                    className="flex flex-col items-center justify-center gap-2 w-full h-24 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 text-sm">{uploadingImage ? "Uploading..." : "Upload Header Image"}</span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Faction Flag / Heraldry</label>
              {symbolUrl ? (
                <div className="relative w-full h-40 bg-[#1E2430] rounded-lg overflow-hidden border-2 border-gray-700">
                  <img src={symbolUrl} alt="Flag/Heraldry" className="w-full h-full object-contain p-2" />
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
                    onChange={(e) => handleImageUpload(e, 'symbol')}
                    className="hidden"
                    id="faction-symbol-upload"
                  />
                  <label
                    htmlFor="faction-symbol-upload"
                    className="flex flex-col items-center justify-center gap-2 w-full h-32 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-gray-400 text-sm">{uploadingImage ? "Uploading..." : "Upload Flag or Heraldry"}</span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Purpose and background..."
                className="bg-[#2A3441] border-gray-700 text-white"
                rows={4}
              />
            </div>

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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="faction-discovered"
                checked={discovered}
                onChange={(e) => setDiscovered(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="faction-discovered" className="text-sm text-gray-300">
                Visible to players
              </label>
              {discovered ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
            </div>
          </div>

          {/* Middle Column - Goals & Resources */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Goals & Objectives</label>
              </div>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGoal())}
                  placeholder="Add a goal..."
                  className="bg-[#2A3441] border-gray-700 text-white text-sm flex-1"
                />
                <Button onClick={handleAddGoal} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {goals.map((goal, index) => (
                  <div key={index} className="flex items-center gap-2 bg-[#2A3441] px-3 py-2 rounded text-sm">
                    <span className="flex-1 text-gray-300">{goal}</span>
                    <button onClick={() => setGoals(goals.filter((_, i) => i !== index))} className="text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Resources</label>
              </div>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newResource}
                  onChange={(e) => setNewResource(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddResource())}
                  placeholder="Gold, weapons, etc..."
                  className="bg-[#2A3441] border-gray-700 text-white text-sm flex-1"
                />
                <Button onClick={handleAddResource} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {resources.map((resource, index) => (
                  <div key={index} className="flex items-center gap-2 bg-[#2A3441] px-3 py-2 rounded text-sm">
                    <span className="flex-1 text-gray-300">{resource}</span>
                    <button onClick={() => setResources(resources.filter((_, i) => i !== index))} className="text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Hierarchy</label>
                <Button onClick={handleAddHierarchy} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {hierarchy.map((h, index) => (
                  <div key={index} className="bg-[#2A3441] rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={h.rank}
                        onChange={(e) => handleUpdateHierarchy(index, 'rank', e.target.value)}
                        placeholder="Rank #"
                        className="bg-[#1E2430] border-gray-700 text-white text-sm w-20"
                      />
                      <Input
                        value={h.title}
                        onChange={(e) => handleUpdateHierarchy(index, 'title', e.target.value)}
                        placeholder="Title"
                        className="bg-[#1E2430] border-gray-700 text-white text-sm flex-1"
                      />
                      <button onClick={() => handleRemoveHierarchy(index)} className="text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      value={h.description}
                      onChange={(e) => handleUpdateHierarchy(index, 'description', e.target.value)}
                      placeholder="Description..."
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Linked NPCs & Key Members */}
          <div className="space-y-4">
            {/* Linked NPCs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Linked Campaign NPCs</label>
                <Button onClick={handleAddLinkedNPC} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {linkedNpcs.map((linkedNpc, index) => (
                  <div key={index} className="bg-[#2A3441] rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-start">
                      <select
                        value={linkedNpc.npc_id}
                        onChange={(e) => handleUpdateLinkedNPC(index, 'npc_id', e.target.value)}
                        className="flex-1 bg-[#1E2430] border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      >
                        <option value="">Select NPC</option>
                        {npcs?.map(npc => (
                          <option key={npc.id} value={npc.id}>{npc.name}</option>
                        ))}
                      </select>
                      <button onClick={() => handleRemoveLinkedNPC(index)} className="text-red-400 mt-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      value={linkedNpc.rank}
                      onChange={(e) => handleUpdateLinkedNPC(index, 'rank', e.target.value)}
                      placeholder="Rank/Position"
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                    />
                    <Textarea
                      value={linkedNpc.role_description}
                      onChange={(e) => handleUpdateLinkedNPC(index, 'role_description', e.target.value)}
                      placeholder="Role description..."
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Key Members (non-NPC) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Other Key Members</label>
                <Button onClick={handleAddKeyMember} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {keyMembers.map((member, index) => (
                  <div key={index} className="bg-[#2A3441] rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-start">
                      <Input
                        value={member.name}
                        onChange={(e) => handleUpdateKeyMember(index, 'name', e.target.value)}
                        placeholder="Name"
                        className="bg-[#1E2430] border-gray-700 text-white text-sm flex-1"
                      />
                      <button onClick={() => handleRemoveKeyMember(index)} className="text-red-400 mt-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      value={member.rank}
                      onChange={(e) => handleUpdateKeyMember(index, 'rank', e.target.value)}
                      placeholder="Rank/Position"
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                    />
                    <Textarea
                      value={member.description}
                      onChange={(e) => handleUpdateKeyMember(index, 'description', e.target.value)}
                      placeholder="Description..."
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
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
            Save Faction
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