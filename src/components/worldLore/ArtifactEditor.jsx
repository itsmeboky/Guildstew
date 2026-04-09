import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Upload, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ArtifactEditor({ artifact, entries, onSave, onCancel }) {
  const [name, setName] = useState(artifact?.name || "");
  const [description, setDescription] = useState(artifact?.description || "");
  const [imageUrl, setImageUrl] = useState(artifact?.image_url || "");
  const [hotspots, setHotspots] = useState(artifact?.hotspots || []);
  const [states, setStates] = useState(artifact?.states || []);
  const [discoveryLevel, setDiscoveryLevel] = useState(artifact?.discovery_level || 0);
  const [properties, setProperties] = useState(artifact?.properties || { rarity: "", attunement: "", powers: [] });
  const [entryId, setEntryId] = useState(artifact?.lore_entry_id || "");
  const [discovered, setDiscovered] = useState(artifact?.discovered !== false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [placingHotspot, setPlacingHotspot] = useState(false);
  const [newHotspot, setNewHotspot] = useState(null);

  const handleImageUpload = async (type = 'main', stateIndex = null) => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      setUploadingImage(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        if (type === 'main') {
          setImageUrl(file_url);
        } else if (type === 'state' && stateIndex !== null) {
          const updatedStates = [...states];
          updatedStates[stateIndex].image_url = file_url;
          setStates(updatedStates);
        }
        
        toast.success("Image uploaded");
      } catch (error) {
        toast.error("Failed to upload image");
      } finally {
        setUploadingImage(false);
      }
    };
  };

  const handleImageClick = (e) => {
    if (!placingHotspot) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setNewHotspot({ x, y, title: "", description: "", discovered: false });
    setPlacingHotspot(false);
  };

  const addHotspot = () => {
    if (!newHotspot?.title) {
      toast.error("Please enter a hotspot title");
      return;
    }
    setHotspots([...hotspots, newHotspot]);
    setNewHotspot(null);
  };

  const removeHotspot = (index) => {
    setHotspots(hotspots.filter((_, i) => i !== index));
  };

  const addState = () => {
    setStates([...states, { name: "", image_url: "", description: "" }]);
  };

  const updateState = (index, field, value) => {
    const updated = [...states];
    updated[index][field] = value;
    setStates(updated);
  };

  const removeState = (index) => {
    setStates(states.filter((_, i) => i !== index));
  };

  const addPower = () => {
    setProperties({
      ...properties,
      powers: [...(properties.powers || []), { name: "", description: "" }]
    });
  };

  const updatePower = (index, field, value) => {
    const updated = [...properties.powers];
    updated[index][field] = value;
    setProperties({ ...properties, powers: updated });
  };

  const removePower = (index) => {
    setProperties({
      ...properties,
      powers: properties.powers.filter((_, i) => i !== index)
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter an artifact name");
      return;
    }

    onSave({
      ...(artifact?.id && { id: artifact.id }),
      name,
      description,
      image_url: imageUrl || null,
      hotspots,
      states,
      discovery_level: discoveryLevel,
      properties,
      lore_entry_id: entryId || null,
      discovered
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-6xl w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl font-bold mb-6">{artifact?.id ? 'Edit Artifact' : 'Create Artifact'}</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Artifact Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Crown of Eternity"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Primary Image</label>
              {imageUrl ? (
                <div className="relative">
                  <img 
                    src={imageUrl} 
                    alt="Artifact" 
                    onClick={handleImageClick}
                    className={`w-full rounded-lg border-2 ${placingHotspot ? 'border-[#37F2D1] cursor-crosshair' : 'border-gray-700'}`}
                  />
                  {placingHotspot && (
                    <div className="absolute top-2 left-2 bg-[#37F2D1] text-[#1E2430] px-3 py-1 rounded-lg text-sm font-semibold">
                      Click on image to place hotspot
                    </div>
                  )}
                  <button
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>

                  {/* Render hotspots */}
                  {hotspots.map((hotspot, idx) => (
                    <div
                      key={idx}
                      className="absolute w-6 h-6 bg-[#37F2D1] border-2 border-white rounded-full"
                      style={{
                        left: `${hotspot.x}%`,
                        top: `${hotspot.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      title={hotspot.title}
                    />
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => handleImageUpload('main')}
                  disabled={uploadingImage}
                  className="w-full h-64 flex flex-col items-center justify-center gap-2 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-gray-400">{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                </button>
              )}
            </div>

            {imageUrl && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setPlacingHotspot(!placingHotspot)}
                  className={`flex-1 ${placingHotspot ? 'bg-[#37F2D1] text-[#1E2430]' : 'bg-[#2A3441] text-white'}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {placingHotspot ? 'Cancel' : 'Add Hotspot'}
                </Button>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ancient lore and history of this artifact..."
                className="bg-[#2A3441] border-gray-700 text-white h-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">Rarity</label>
                <select
                  value={properties.rarity}
                  onChange={(e) => setProperties({ ...properties, rarity: e.target.value })}
                  className="w-full bg-[#2A3441] border border-gray-700 text-white rounded-lg px-3 py-2"
                >
                  <option value="">Select...</option>
                  <option value="Common">Common</option>
                  <option value="Uncommon">Uncommon</option>
                  <option value="Rare">Rare</option>
                  <option value="Very Rare">Very Rare</option>
                  <option value="Legendary">Legendary</option>
                  <option value="Artifact">Artifact</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Discovery Level (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discoveryLevel}
                  onChange={(e) => setDiscoveryLevel(parseInt(e.target.value) || 0)}
                  className="bg-[#2A3441] border-gray-700 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Link to Lore Entry (optional)</label>
              <select
                value={entryId}
                onChange={(e) => setEntryId(e.target.value)}
                className="w-full bg-[#2A3441] border border-gray-700 text-white rounded-lg px-3 py-2"
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

          {/* Right Column */}
          <div className="space-y-4">
            {/* Hotspots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Hotspots</label>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto bg-[#2A3441] rounded-lg p-3">
                {hotspots.map((hotspot, idx) => (
                  <div key={idx} className="bg-[#1E2430] rounded-lg p-2 border border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white">{hotspot.title}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={hotspot.discovered}
                          onChange={(e) => {
                            const updated = [...hotspots];
                            updated[idx].discovered = e.target.checked;
                            setHotspots(updated);
                          }}
                          className="rounded"
                          title="Discovered"
                        />
                        <button onClick={() => removeHotspot(idx)} className="text-red-400 hover:text-red-300">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{hotspot.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* New Hotspot Form */}
            {newHotspot && (
              <div className="bg-[#37F2D1]/10 border border-[#37F2D1] rounded-lg p-3 space-y-2">
                <Input
                  placeholder="Hotspot title"
                  value={newHotspot.title}
                  onChange={(e) => setNewHotspot({ ...newHotspot, title: e.target.value })}
                  className="bg-[#1E2430] border-gray-700 text-white text-sm"
                />
                <Textarea
                  placeholder="Hotspot description"
                  value={newHotspot.description}
                  onChange={(e) => setNewHotspot({ ...newHotspot, description: e.target.value })}
                  className="bg-[#1E2430] border-gray-700 text-white text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={addHotspot} size="sm" className="flex-1 bg-[#37F2D1] text-[#1E2430]">
                    Add
                  </Button>
                  <Button onClick={() => setNewHotspot(null)} size="sm" variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* States */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">States (Before/After)</label>
                <Button onClick={addState} size="sm" className="bg-[#37F2D1] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {states.map((state, idx) => (
                  <div key={idx} className="bg-[#2A3441] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder="State name"
                        value={state.name}
                        onChange={(e) => updateState(idx, 'name', e.target.value)}
                        className="bg-[#1E2430] border-gray-700 text-white text-sm flex-1"
                      />
                      <button
                        onClick={() => handleImageUpload('state', idx)}
                        className="px-3 py-2 bg-[#1E2430] text-white rounded-lg hover:bg-[#37F2D1] hover:text-[#1E2430] transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeState(idx)} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {state.image_url && (
                      <img src={state.image_url} alt={state.name} className="w-full h-24 object-cover rounded mb-2" />
                    )}
                    <Textarea
                      placeholder="State description"
                      value={state.description}
                      onChange={(e) => updateState(idx, 'description', e.target.value)}
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Powers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Powers & Abilities</label>
                <Button onClick={addPower} size="sm" className="bg-[#37F2D1] text-[#1E2430]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {properties.powers?.map((power, idx) => (
                  <div key={idx} className="bg-[#2A3441] rounded-lg p-2 space-y-1">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Power name"
                        value={power.name}
                        onChange={(e) => updatePower(idx, 'name', e.target.value)}
                        className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      />
                      <button onClick={() => removePower(idx)} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Textarea
                      placeholder="Description"
                      value={power.description}
                      onChange={(e) => updatePower(idx, 'description', e.target.value)}
                      className="bg-[#1E2430] border-gray-700 text-white text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} className="flex-1 bg-[#FF5722] hover:bg-[#FF6B3D] text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Artifact
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}