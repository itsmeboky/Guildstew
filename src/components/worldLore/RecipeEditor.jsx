import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Eye, EyeOff, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  { value: "potion", label: "Potion", color: "#8B5CF6" },
  { value: "weapon", label: "Weapon", color: "#EF4444" },
  { value: "armor", label: "Armor", color: "#3B82F6" },
  { value: "tool", label: "Tool", color: "#F59E0B" },
  { value: "construct", label: "Construct", color: "#10B981" },
  { value: "mechanism", label: "Mechanism", color: "#6366F1" },
  { value: "other", label: "Other", color: "#6B7280" }
];

const DIFFICULTIES = [
  { value: "trivial", label: "Trivial", color: "#10B981" },
  { value: "easy", label: "Easy", color: "#3B82F6" },
  { value: "medium", label: "Medium", color: "#F59E0B" },
  { value: "hard", label: "Hard", color: "#EF4444" },
  { value: "legendary", label: "Legendary", color: "#8B5CF6" }
];

export default function RecipeEditor({ recipe, entries, onSave, onCancel }) {
  const [name, setName] = useState(recipe?.name || "");
  const [description, setDescription] = useState(recipe?.description || "");
  const [imageUrl, setImageUrl] = useState(recipe?.image_url || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [category, setCategory] = useState(recipe?.category || "other");
  const [difficulty, setDifficulty] = useState(recipe?.difficulty || "medium");
  const [craftingTime, setCraftingTime] = useState(recipe?.crafting_time || "");
  const [materials, setMaterials] = useState(recipe?.required_materials || []);
  const [tools, setTools] = useState(recipe?.required_tools || []);
  const [skillChecks, setSkillChecks] = useState(recipe?.skill_checks || []);
  const [resultDescription, setResultDescription] = useState(recipe?.result_description || "");
  const [entryId, setEntryId] = useState(recipe?.entry_id || "");
  const [discovered, setDiscovered] = useState(recipe?.discovered !== false);

  const addMaterial = () => {
    setMaterials([...materials, { name: "", quantity: "", notes: "" }]);
  };

  const updateMaterial = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  const removeMaterial = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const addTool = () => {
    setTools([...tools, ""]);
  };

  const updateTool = (index, value) => {
    const updated = [...tools];
    updated[index] = value;
    setTools(updated);
  };

  const removeTool = (index) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const addSkillCheck = () => {
    setSkillChecks([...skillChecks, { skill: "", dc: 10, notes: "" }]);
  };

  const updateSkillCheck = (index, field, value) => {
    const updated = [...skillChecks];
    updated[index][field] = value;
    setSkillChecks(updated);
  };

  const removeSkillCheck = (index) => {
    setSkillChecks(skillChecks.filter((_, i) => i !== index));
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

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a recipe name");
      return;
    }

    const dataToSave = {
      ...(recipe?.id && { id: recipe.id }),
      name,
      description,
      image_url: imageUrl || null,
      category,
      difficulty,
      crafting_time: craftingTime,
      required_materials: materials.filter(m => m.name.trim()),
      required_tools: tools.filter(t => t.trim()),
      skill_checks: skillChecks.filter(sc => sc.skill.trim()),
      result_description: resultDescription,
      entry_id: entryId || null,
      discovered
    };

    onSave(dataToSave);
  };

  const selectedCategory = CATEGORIES.find(c => c.value === category);
  const selectedDifficulty = DIFFICULTIES.find(d => d.value === difficulty);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8 overflow-y-auto">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
        <h2 className="text-3xl font-bold mb-6">{recipe?.id ? 'Edit Recipe' : 'Create Recipe'}</h2>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Recipe Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Healing Potion"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Crafting Time</label>
              <Input
                value={craftingTime}
                onChange={(e) => setCraftingTime(e.target.value)}
                placeholder="1 hour"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      category === cat.value
                        ? 'ring-2 ring-white'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Difficulty</label>
              <div className="grid grid-cols-5 gap-2">
                {DIFFICULTIES.map(diff => (
                  <button
                    key={diff.value}
                    onClick={() => setDifficulty(diff.value)}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                      difficulty === diff.value
                        ? 'ring-2 ring-white'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: diff.color }}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this recipe creates..."
              className="bg-[#2A3441] border-gray-700 text-white"
              rows={2}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">Recipe Image</label>
            {imageUrl ? (
              <div className="relative w-full h-48 bg-[#1E2430] rounded-lg overflow-hidden border border-gray-700">
                <img src={imageUrl} alt="Recipe" className="w-full h-full object-cover" />
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
                  id="recipe-image-upload"
                />
                <label
                  htmlFor="recipe-image-upload"
                  className="flex items-center justify-center gap-2 w-full h-32 bg-[#2A3441] border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-[#37F2D1] transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                </label>
              </div>
            )}
          </div>

          {/* Materials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Required Materials</label>
              <Button onClick={addMaterial} size="sm" variant="outline" className="border-[#37F2D1] text-[#37F2D1]">
                <Plus className="w-4 h-4 mr-1" /> Add Material
              </Button>
            </div>
            <div className="space-y-2">
              {materials.map((material, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={material.name}
                    onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                    placeholder="Dragon Scale"
                    className="bg-[#2A3441] border-gray-700 text-white flex-1"
                  />
                  <Input
                    value={material.quantity}
                    onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                    placeholder="3"
                    className="bg-[#2A3441] border-gray-700 text-white w-20"
                  />
                  <Input
                    value={material.notes}
                    onChange={(e) => updateMaterial(index, 'notes', e.target.value)}
                    placeholder="Notes..."
                    className="bg-[#2A3441] border-gray-700 text-white flex-1"
                  />
                  <Button onClick={() => removeMaterial(index)} size="icon" variant="ghost" className="text-red-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Required Tools</label>
              <Button onClick={addTool} size="sm" variant="outline" className="border-[#37F2D1] text-[#37F2D1]">
                <Plus className="w-4 h-4 mr-1" /> Add Tool
              </Button>
            </div>
            <div className="space-y-2">
              {tools.map((tool, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={tool}
                    onChange={(e) => updateTool(index, e.target.value)}
                    placeholder="Alchemist's Supplies"
                    className="bg-[#2A3441] border-gray-700 text-white flex-1"
                  />
                  <Button onClick={() => removeTool(index)} size="icon" variant="ghost" className="text-red-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Checks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">Skill Checks</label>
              <Button onClick={addSkillCheck} size="sm" variant="outline" className="border-[#37F2D1] text-[#37F2D1]">
                <Plus className="w-4 h-4 mr-1" /> Add Check
              </Button>
            </div>
            <div className="space-y-2">
              {skillChecks.map((check, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={check.skill}
                    onChange={(e) => updateSkillCheck(index, 'skill', e.target.value)}
                    placeholder="Arcana"
                    className="bg-[#2A3441] border-gray-700 text-white flex-1"
                  />
                  <Input
                    type="number"
                    value={check.dc}
                    onChange={(e) => updateSkillCheck(index, 'dc', Number(e.target.value))}
                    placeholder="DC"
                    className="bg-[#2A3441] border-gray-700 text-white w-20"
                  />
                  <Input
                    value={check.notes}
                    onChange={(e) => updateSkillCheck(index, 'notes', e.target.value)}
                    placeholder="Notes..."
                    className="bg-[#2A3441] border-gray-700 text-white flex-1"
                  />
                  <Button onClick={() => removeSkillCheck(index)} size="icon" variant="ghost" className="text-red-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Result Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">Result Description</label>
            <Textarea
              value={resultDescription}
              onChange={(e) => setResultDescription(e.target.value)}
              placeholder="Details about the finished product..."
              className="bg-[#2A3441] border-gray-700 text-white"
              rows={3}
            />
          </div>

          {/* Link to Lore & Visibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Link to Lore Entry</label>
              <select
                value={entryId}
                onChange={(e) => setEntryId(e.target.value)}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">No linked entry</option>
                {entries?.filter(e => e.category === 'technology').map(entry => (
                  <option key={entry.id} value={entry.id}>{entry.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
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

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button 
              onClick={handleSave} 
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: '#FF5722' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
            >
              <Save className="w-4 h-4" />
              Save Recipe
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
    </div>
  );
}