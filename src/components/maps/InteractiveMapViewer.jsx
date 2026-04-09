import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, X, MapPin, Eye, Mountain, Home, Castle, Ship, Landmark, Trees, Waves, Flame, Skull, Star, Flag, Compass, Anchor } from "lucide-react";
import { toast } from "sonner";

export default function InteractiveMapViewer({ map, entries, canEdit, onUpdateHotspots, onNavigateToEntry }) {
  const [hotspots, setHotspots] = useState(map?.hotspots || []);
  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [editingHotspot, setEditingHotspot] = useState(null);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [newHotspot, setNewHotspot] = useState({ x: 50, y: 50, name: '', description: '', entry_id: '', color: '#37F2D1', icon: 'MapPin' });
  const [showLegend, setShowLegend] = useState(true);

  const colors = [
    '#37F2D1', '#FF5722', '#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800',
    '#E91E63', '#00BCD4', '#8BC34A', '#FFC107', '#795548', '#607D8B', '#F44336',
    '#3F51B5', '#009688', '#CDDC39', '#FF6F00', '#D32F2F', '#1976D2'
  ];

  const iconOptions = [
    { name: 'MapPin', icon: MapPin, label: 'Pin' },
    { name: 'Mountain', icon: Mountain, label: 'Mountain' },
    { name: 'Home', icon: Home, label: 'Settlement' },
    { name: 'Castle', icon: Castle, label: 'Castle' },
    { name: 'Ship', icon: Ship, label: 'Port' },
    { name: 'Landmark', icon: Landmark, label: 'Landmark' },
    { name: 'Trees', icon: Trees, label: 'Forest' },
    { name: 'Waves', icon: Waves, label: 'Water' },
    { name: 'Flame', icon: Flame, label: 'Danger' },
    { name: 'Skull', icon: Skull, label: 'Ruins' },
    { name: 'Star', icon: Star, label: 'Special' },
    { name: 'Flag', icon: Flag, label: 'Territory' },
    { name: 'Compass', icon: Compass, label: 'Quest' },
    { name: 'Anchor', icon: Anchor, label: 'Harbor' }
  ];

  const getIconComponent = (iconName) => {
    const option = iconOptions.find(opt => opt.name === iconName);
    return option ? option.icon : MapPin;
  };

  const handleMapClick = (e) => {
    if (!isAddingHotspot || !canEdit) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewHotspot({ ...newHotspot, x, y });
  };

  const handleAddHotspot = () => {
    if (!newHotspot.name.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    const updatedHotspots = [...hotspots, { ...newHotspot, id: Date.now().toString() }];
    setHotspots(updatedHotspots);
    onUpdateHotspots(updatedHotspots);
    setNewHotspot({ x: 50, y: 50, name: '', description: '', entry_id: '', color: '#37F2D1', icon: 'MapPin' });
    setIsAddingHotspot(false);
    toast.success("Hotspot added");
  };

  const handleUpdateHotspot = () => {
    const updatedHotspots = hotspots.map(h => h.id === editingHotspot.id ? editingHotspot : h);
    setHotspots(updatedHotspots);
    onUpdateHotspots(updatedHotspots);
    setEditingHotspot(null);
    toast.success("Hotspot updated");
  };

  const handleDeleteHotspot = (id) => {
    const updatedHotspots = hotspots.filter(h => h.id !== id);
    setHotspots(updatedHotspots);
    onUpdateHotspots(updatedHotspots);
    setEditingHotspot(null);
    toast.success("Hotspot deleted");
  };

  if (!map?.image_url) {
    return (
      <div className="bg-[#2A3441] rounded-xl p-12 text-center border-2 border-dashed border-gray-700">
        <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">No map image available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      {canEdit && (
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setIsAddingHotspot(!isAddingHotspot)}
            className={isAddingHotspot ? "bg-red-500 hover:bg-red-600" : "bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"}
          >
            {isAddingHotspot ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {isAddingHotspot ? "Cancel" : "Add Hotspot"}
          </Button>
          <Button
            onClick={() => setShowLegend(!showLegend)}
            variant="outline"
            className="border-gray-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showLegend ? "Hide" : "Show"} Legend
          </Button>
        </div>
      )}

      {/* Add Hotspot Form */}
      {isAddingHotspot && canEdit && (
        <div className="bg-[#1E2430] rounded-lg p-4 mb-4 border border-[#37F2D1]">
          <p className="text-sm text-gray-400 mb-3">Click on the map to place your hotspot</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Location name..."
                value={newHotspot.name}
                onChange={(e) => setNewHotspot({ ...newHotspot, name: e.target.value })}
                className="bg-[#2A3441] border-gray-700 text-white"
              />
              <select
                value={newHotspot.entry_id}
                onChange={(e) => setNewHotspot({ ...newHotspot, entry_id: e.target.value })}
                className="bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Link to entry (optional)</option>
                {entries?.map(entry => (
                  <option key={entry.id} value={entry.id}>{entry.title}</option>
                ))}
              </select>
            </div>
            <Input
              placeholder="Description (optional)..."
              value={newHotspot.description}
              onChange={(e) => setNewHotspot({ ...newHotspot, description: e.target.value })}
              className="bg-[#2A3441] border-gray-700 text-white"
            />
            <div>
              <span className="text-sm text-gray-400 mb-2 block">Icon:</span>
              <div className="flex gap-2 flex-wrap">
                {iconOptions.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    onClick={() => setNewHotspot({ ...newHotspot, icon: name })}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                      newHotspot.icon === name ? 'border-[#37F2D1] bg-[#37F2D1]/20' : 'border-gray-700 hover:border-gray-500'
                    }`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-400 mb-2 block">Color:</span>
              <div className="flex gap-2 flex-wrap">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewHotspot({ ...newHotspot, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newHotspot.color === color ? 'border-white ring-2 ring-white/50' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleAddHotspot}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] w-full"
              size="sm"
            >
              Add Hotspot
            </Button>
          </div>
        </div>
      )}

      {/* Map with Hotspots */}
      <div className="relative">
        <div
          className={`relative w-full rounded-lg overflow-hidden border-2 ${
            isAddingHotspot ? 'border-[#37F2D1] cursor-crosshair' : 'border-gray-700'
          }`}
          onClick={handleMapClick}
        >
          <img
            src={map.image_url}
            alt={map.name}
            className="w-full h-auto"
            style={{ pointerEvents: isAddingHotspot ? 'none' : 'auto' }}
          />

          {/* Hotspots */}
          {hotspots.map(hotspot => {
            const HotspotIcon = getIconComponent(hotspot.icon);
            const linkedEntry = entries?.find(e => e.id === hotspot.entry_id);

            return (
              <div
                key={hotspot.id}
                className="absolute"
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div
                  className={`relative cursor-pointer transition-all ${
                    hoveredHotspot?.id === hotspot.id ? 'scale-125' : ''
                  }`}
                  onMouseEnter={() => setHoveredHotspot(hotspot)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canEdit && !isAddingHotspot) {
                      setEditingHotspot(hotspot);
                    } else if (linkedEntry && onNavigateToEntry) {
                      onNavigateToEntry(linkedEntry.id);
                    }
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: hotspot.color }}
                  >
                    <HotspotIcon className="w-4 h-4 text-white" />
                  </div>

                  {hoveredHotspot?.id === hotspot.id && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/90 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10">
                      <div className="font-semibold">{hotspot.name}</div>
                      {linkedEntry && (
                        <div className="text-xs text-[#37F2D1] mt-1">→ {linkedEntry.title}</div>
                      )}
                      {hotspot.description && (
                        <div className="text-xs text-gray-300 mt-1">{hotspot.description}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {showLegend && hotspots.length > 0 && (
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 max-w-xs">
            <h3 className="text-white font-bold mb-2 text-sm">Map Legend</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {hotspots.map(hotspot => {
                const HotspotIcon = getIconComponent(hotspot.icon);
                return (
                  <div key={hotspot.id} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-4 h-4 rounded-full border border-white flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: hotspot.color }}
                    >
                      <HotspotIcon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white">{hotspot.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Hotspot Dialog */}
      {editingHotspot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Edit Hotspot</h2>
            <div className="space-y-4">
              <Input
                placeholder="Location name..."
                value={editingHotspot.name}
                onChange={(e) => setEditingHotspot({ ...editingHotspot, name: e.target.value })}
                className="bg-[#2A3441] border-gray-700 text-white"
              />
              <select
                value={editingHotspot.entry_id || ''}
                onChange={(e) => setEditingHotspot({ ...editingHotspot, entry_id: e.target.value })}
                className="w-full bg-[#2A3441] border border-gray-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Link to entry (optional)</option>
                {entries?.map(entry => (
                  <option key={entry.id} value={entry.id}>{entry.title}</option>
                ))}
              </select>
              <Input
                placeholder="Description (optional)..."
                value={editingHotspot.description || ''}
                onChange={(e) => setEditingHotspot({ ...editingHotspot, description: e.target.value })}
                className="bg-[#2A3441] border-gray-700 text-white"
              />
              <div>
                <span className="text-sm text-gray-400 mb-2 block">Icon:</span>
                <div className="flex gap-2 flex-wrap">
                  {iconOptions.map(({ name, icon: Icon, label }) => (
                    <button
                      key={name}
                      onClick={() => setEditingHotspot({ ...editingHotspot, icon: name })}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all ${
                        editingHotspot.icon === name ? 'border-[#37F2D1] bg-[#37F2D1]/20' : 'border-gray-700 hover:border-gray-500'
                      }`}
                      title={label}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-400 mb-2 block">Color:</span>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditingHotspot({ ...editingHotspot, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingHotspot.color === color ? 'border-white ring-2 ring-white/50' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  onClick={() => handleDeleteHotspot(editingHotspot.id)}
                  variant="outline"
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={() => setEditingHotspot(null)}
                  variant="ghost"
                  className="text-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateHotspot}
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}