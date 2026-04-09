import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Upload, Trash2, Plus, Eye, EyeOff, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function MonsterEditor({ monster, characters, entries, onSave, onCancel }) {
  const [name, setName] = useState(monster?.name || "");
  const [imageUrl, setImageUrl] = useState(monster?.image_url || "");
  const [description, setDescription] = useState(monster?.description || "");
  const [stats, setStats] = useState(monster?.stats || {
    challenge_rating: "",
    armor_class: 10,
    hit_points: "",
    speed: "30 ft.",
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    skills: "",
    senses: "",
    languages: "",
    abilities: [],
    actions: []
  });
  const [encounteredBy, setEncounteredBy] = useState(monster?.encountered_by || []);
  const [entryId, setEntryId] = useState(monster?.entry_id || "");
  const [discovered, setDiscovered] = useState(monster?.discovered !== false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

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

  const handleGenerateImage = async () => {
    if (!name.trim()) {
      toast.error("Please enter a monster name first");
      return;
    }

    setGeneratingImage(true);
    try {
      const prompt = `A ${name} from Dungeons and Dragons, ${description || 'fantasy creature'}, high quality fantasy art style, detailed illustration, professional artwork`;
      const { url } = await base44.integrations.Core.GenerateImage({ prompt });
      setImageUrl(url);
      toast.success("Image generated");
    } catch (error) {
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a monster name");
      return;
    }

    onSave({
      ...(monster?.id && { id: monster.id }),
      name,
      image_url: imageUrl || null,
      description,
      stats,
      encountered_by: encounteredBy,
      entry_id: entryId || null,
      discovered
    });
  };

  const toggleCharacterEncounter = (characterId) => {
    if (encounteredBy.includes(characterId)) {
      setEncounteredBy(encounteredBy.filter(id => id !== characterId));
    } else {
      setEncounteredBy([...encounteredBy, characterId]);
    }
  };

  const addAbility = () => {
    setStats({
      ...stats,
      abilities: [...(stats.abilities || []), { name: "", description: "" }]
    });
  };

  const updateAbility = (index, field, value) => {
    const updated = [...stats.abilities];
    updated[index][field] = value;
    setStats({ ...stats, abilities: updated });
  };

  const removeAbility = (index) => {
    setStats({
      ...stats,
      abilities: stats.abilities.filter((_, i) => i !== index)
    });
  };

  const addAction = () => {
    setStats({
      ...stats,
      actions: [...(stats.actions || []), { name: "", description: "" }]
    });
  };

  const updateAction = (index, field, value) => {
    const updated = [...stats.actions];
    updated[index][field] = value;
    setStats({ ...stats, actions: updated });
  };

  const removeAction = (index) => {
    setStats({
      ...stats,
      actions: stats.actions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-5xl w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold mb-6">{monster?.id ? 'Edit Monster' : 'Create Monster'}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Monster Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Werewolf"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold mb-2">Monster Image</label>
              {imageUrl ? (
                <div className="relative w-full h-64 bg-[#1E2430] rounded-lg overflow-hidden border border-gray-700">
                  <img src={imageUrl} alt="Monster" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="monster-image-upload"
                  />
                  <label
                    htmlFor="monster-image-upload"
                    className="flex items-center justify-center gap-2 w-full h-32 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                  </label>
                  <Button
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !name.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {generatingImage ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
              )}
            </div>

            {/* Basic Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Challenge Rating</label>
                <Input
                  value={stats.challenge_rating}
                  onChange={(e) => setStats({ ...stats, challenge_rating: e.target.value })}
                  placeholder="1/4, 1, 5, etc."
                  className="bg-[#2A3441] border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Armor Class</label>
                <Input
                  type="number"
                  value={stats.armor_class}
                  onChange={(e) => setStats({ ...stats, armor_class: parseInt(e.target.value) || 10 })}
                  className="bg-[#2A3441] border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Hit Points</label>
                <Input
                  value={stats.hit_points}
                  onChange={(e) => setStats({ ...stats, hit_points: e.target.value })}
                  placeholder="45 (6d8 + 18)"
                  className="bg-[#2A3441] border-gray-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Speed</label>
                <Input
                  value={stats.speed}
                  onChange={(e) => setStats({ ...stats, speed: e.target.value })}
                  placeholder="30 ft., climb 30 ft."
                  className="bg-[#2A3441] border-gray-700 text-white text-sm"
                />
              </div>
            </div>

            {/* Ability Scores */}
            <div>
              <label className="block text-sm font-semibold mb-2">Ability Scores</label>
              <div className="grid grid-cols-6 gap-2">
                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(ability => (
                  <div key={ability}>
                    <label className="block text-xs text-gray-400 mb-1 uppercase">{ability}</label>
                    <Input
                      type="number"
                      value={stats[ability]}
                      onChange={(e) => setStats({ ...stats, [ability]: parseInt(e.target.value) || 10 })}
                      className="bg-[#2A3441] border-gray-700 text-white text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description / Lore</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Origins, behavior, and background..."
                className="bg-[#2A3441] border-gray-700 text-white h-32"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Abilities */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Abilities</label>
                <Button onClick={addAbility} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.abilities?.map((ability, idx) => (
                  <div key={idx} className="bg-[#2A3441] rounded-lg p-2 space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={ability.name}
                        onChange={(e) => updateAbility(idx, 'name', e.target.value)}
                        placeholder="Ability name"
                        className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      />
                      <button onClick={() => removeAbility(idx)} className="text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Textarea
                      value={ability.description}
                      onChange={(e) => updateAbility(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Actions</label>
                <Button onClick={addAction} size="sm" className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.actions?.map((action, idx) => (
                  <div key={idx} className="bg-[#2A3441] rounded-lg p-2 space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={action.name}
                        onChange={(e) => updateAction(idx, 'name', e.target.value)}
                        placeholder="Action name"
                        className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      />
                      <button onClick={() => removeAction(idx)} className="text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Textarea
                      value={action.description}
                      onChange={(e) => updateAction(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Characters Who Have Encountered */}
            <div>
              <label className="block text-sm font-semibold mb-2">Characters Who Have Encountered</label>
              <div className="space-y-1 max-h-48 overflow-y-auto bg-[#2A3441] rounded-lg p-3">
                {characters?.map(char => (
                  <label key={char.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#1E2430] p-2 rounded">
                    <input
                      type="checkbox"
                      checked={encounteredBy.includes(char.id)}
                      onChange={() => toggleCharacterEncounter(char.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-white">{char.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Link to Lore Entry (optional)</label>
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
                id="discovered"
                checked={discovered}
                onChange={(e) => setDiscovered(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="discovered" className="text-sm text-gray-300">
                Visible to players
              </label>
              {discovered ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Monster
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}