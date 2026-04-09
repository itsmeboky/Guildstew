import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const SCHOOLS = [
  { value: "abjuration", label: "Abjuration", color: "#3B82F6" },
  { value: "conjuration", label: "Conjuration", color: "#10B981" },
  { value: "divination", label: "Divination", color: "#8B5CF6" },
  { value: "enchantment", label: "Enchantment", color: "#EC4899" },
  { value: "evocation", label: "Evocation", color: "#EF4444" },
  { value: "illusion", label: "Illusion", color: "#06B6D4" },
  { value: "necromancy", label: "Necromancy", color: "#6366F1" },
  { value: "transmutation", label: "Transmutation", color: "#F59E0B" }
];

export default function SpellEditor({ spell, entries, onSave, onCancel }) {
  const [formData, setFormData] = useState(spell || {
    name: "",
    school: "evocation",
    level: 0,
    casting_time: "1 action",
    range: "Self",
    components: { verbal: false, somatic: false, material: false, materials_needed: "" },
    duration: "Instantaneous",
    description: "",
    at_higher_levels: "",
    entry_id: "",
    discovered: true
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a spell name");
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8 overflow-y-auto">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-3xl w-full p-8 my-8">
        <h2 className="text-3xl font-bold mb-6">{spell?.id ? 'Edit Spell' : 'Create Spell'}</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Spell Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Fireball"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">School of Magic</label>
              <select
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                {SCHOOLS.map(school => (
                  <option key={school.value} value={school.value}>{school.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                  <option key={level} value={level}>{level === 0 ? 'Cantrip' : `Level ${level}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Casting Time</label>
              <Input
                value={formData.casting_time}
                onChange={(e) => setFormData({ ...formData, casting_time: e.target.value })}
                placeholder="1 action"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Range</label>
              <Input
                value={formData.range}
                onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                placeholder="60 feet"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Components</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.components?.verbal || false}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    components: { ...formData.components, verbal: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Verbal (V)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.components?.somatic || false}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    components: { ...formData.components, somatic: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Somatic (S)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.components?.material || false}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    components: { ...formData.components, material: e.target.checked }
                  })}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Material (M)</span>
              </label>
            </div>
            {formData.components?.material && (
              <Input
                value={formData.components.materials_needed || ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  components: { ...formData.components, materials_needed: e.target.value }
                })}
                placeholder="Materials needed..."
                className="bg-[#2A3441] border-gray-700 text-white mt-2 text-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Duration</label>
            <Input
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Concentration, up to 1 minute"
              className="bg-[#2A3441] border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the spell's effects..."
              className="bg-[#2A3441] border-gray-700 text-white h-32"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">At Higher Levels (optional)</label>
            <Textarea
              value={formData.at_higher_levels || ""}
              onChange={(e) => setFormData({ ...formData, at_higher_levels: e.target.value })}
              placeholder="Effects when cast using a higher-level spell slot..."
              className="bg-[#2A3441] border-gray-700 text-white h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Link to Lore Entry (optional)</label>
            <select
              value={formData.entry_id || ""}
              onChange={(e) => setFormData({ ...formData, entry_id: e.target.value || null })}
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
              checked={formData.discovered !== false}
              onChange={(e) => setFormData({ ...formData, discovered: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="discovered" className="text-sm text-gray-300">
              Visible to players
            </label>
            {formData.discovered !== false ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
          </div>

          <div className="flex gap-2 pt-4">
            <button 
              onClick={handleSave} 
              className="flex-1 px-4 py-2 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: '#FF5722' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
            >
              <Save className="w-4 h-4" />
              Save Spell
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