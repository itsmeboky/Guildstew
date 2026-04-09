import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X, Link as LinkIcon, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";

export default function ConstellationEditor({ constellation, entries, onSave, onCancel }) {
  const [name, setName] = useState(constellation?.name || "");
  const [description, setDescription] = useState(constellation?.description || "");
  const [stars, setStars] = useState(constellation?.stars || []);
  const [connections, setConnections] = useState(constellation?.connections || []);
  const [entryId, setEntryId] = useState(constellation?.entry_id || "");
  const [discovered, setDiscovered] = useState(constellation?.discovered !== false);
  const [selectedStars, setSelectedStars] = useState([]);
  const [isAddingStar, setIsAddingStar] = useState(false);
  const [newStarSize, setNewStarSize] = useState(3);
  const [newStarColor, setNewStarColor] = useState("#FFFFFF");
  const [dragStart, setDragStart] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const canvasRef = useRef(null);

  const starColors = [
    "#FFFFFF", "#FFF4E6", "#FFE4B5", "#FFD700", "#87CEEB",
    "#4169E1", "#8A2BE2", "#FF1493", "#FF6347", "#32CD32"
  ];

  const handleCanvasClick = (e) => {
    if (!isAddingStar) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newStar = {
      x,
      y,
      size: newStarSize,
      color: newStarColor,
      name: `Star ${stars.length + 1}`
    };

    setStars([...stars, newStar]);
    toast.success("Star added");
  };

  const handleStarMouseDown = (index, e) => {
    e.stopPropagation();
    setDragStart(index);
    setSelectedStars([index]);
  };

  const handleMouseMove = (e) => {
    if (dragStart === null || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setDragPosition({ x, y });
  };

  const handleStarMouseUp = (index, e) => {
    e.stopPropagation();
    
    if (dragStart !== null && dragStart !== index) {
      const newConnection = [dragStart, index].sort((a, b) => a - b);
      if (!connections.some(c => c[0] === newConnection[0] && c[1] === newConnection[1])) {
        setConnections([...connections, newConnection]);
        toast.success("Stars connected");
      }
    }

    setDragStart(null);
    setDragPosition(null);
    setSelectedStars([]);
  };

  const handleCanvasMouseUp = () => {
    setDragStart(null);
    setDragPosition(null);
    setSelectedStars([]);
  };

  const handleDeleteStar = (index) => {
    setStars(stars.filter((_, i) => i !== index));
    setConnections(connections.filter(c => !c.includes(index)).map(c => 
      c.map(i => i > index ? i - 1 : i)
    ));
    setSelectedStars([]);
    toast.success("Star deleted");
  };

  const handleDeleteConnection = (connIndex) => {
    setConnections(connections.filter((_, i) => i !== connIndex));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a constellation name");
      return;
    }

    if (stars.length === 0) {
      toast.error("Please add at least one star");
      return;
    }

    const dataToSave = {
      ...(constellation?.id && { id: constellation.id }),
      name,
      description,
      stars,
      connections: connections.map(conn => conn.map(idx => String(idx))),
      entry_id: entryId || null,
      discovered
    };

    console.log("Saving constellation:", dataToSave);
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
      <div className="bg-[#1E2430] border border-[#37F2D1] rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-8">
        <h2 className="text-3xl font-bold mb-6">{constellation?.id ? 'Edit Constellation' : 'Create Constellation'}</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAddingStar(!isAddingStar)}
                className="px-3 py-1.5 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-colors"
                style={{ backgroundColor: isAddingStar ? '#EF4444' : '#FF5722' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isAddingStar ? '#DC2626' : '#FF6B3D'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isAddingStar ? '#EF4444' : '#FF5722'}
              >
                {isAddingStar ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isAddingStar ? "Cancel" : "Add Star"}
              </button>

              {isAddingStar && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Size:</span>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      value={newStarSize}
                      onChange={(e) => setNewStarSize(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-white">{newStarSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Color:</span>
                    <div className="flex gap-1">
                      {starColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewStarColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            newStarColor === color ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className={`relative w-full aspect-video bg-gradient-to-b from-[#0a0a1a] to-[#1a1a3a] rounded-lg border-2 ${
                isAddingStar ? 'border-[#37F2D1] cursor-crosshair' : 'border-gray-700'
              } overflow-hidden`}
            >
              {/* Starfield background */}
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(2px 2px at 20% 30%, white, transparent),
                                  radial-gradient(1px 1px at 60% 70%, white, transparent),
                                  radial-gradient(1px 1px at 50% 50%, white, transparent),
                                  radial-gradient(2px 2px at 80% 10%, white, transparent),
                                  radial-gradient(1px 1px at 90% 60%, white, transparent)`,
                backgroundSize: '200% 200%',
                opacity: 0.3
              }} />

              {/* Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {connections.map((conn, i) => {
                  const star1 = stars[conn[0]];
                  const star2 = stars[conn[1]];
                  if (!star1 || !star2) return null;

                  return (
                    <g key={i}>
                      <line
                        x1={`${star1.x}%`}
                        y1={`${star1.y}%`}
                        x2={`${star2.x}%`}
                        y2={`${star2.y}%`}
                        stroke="rgba(55, 242, 209, 0.5)"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}
                
                {/* Drag line */}
                {dragStart !== null && dragPosition && stars[dragStart] && (
                  <line
                    x1={`${stars[dragStart].x}%`}
                    y1={`${stars[dragStart].y}%`}
                    x2={`${dragPosition.x}%`}
                    y2={`${dragPosition.y}%`}
                    stroke="rgba(55, 242, 209, 0.8)"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                )}
              </svg>

              {/* Stars */}
              {stars.map((star, index) => (
                <div
                  key={index}
                  className="absolute group"
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div
                    onMouseDown={(e) => handleStarMouseDown(index, e)}
                    onMouseUp={(e) => handleStarMouseUp(index, e)}
                    className={`cursor-pointer transition-all ${
                      selectedStars.includes(index) ? 'scale-150 ring-2 ring-[#37F2D1]' : ''
                    }`}
                    style={{
                      width: `${star.size * 2}px`,
                      height: `${star.size * 2}px`,
                      backgroundColor: star.color,
                      borderRadius: '50%',
                      boxShadow: `0 0 ${star.size * 2}px ${star.color}`
                    }}
                  />
                  {!isAddingStar && dragStart === null && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStar(index);
                      }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-400">
              {isAddingStar ? "Click on the canvas to place stars" : "Click and drag between stars to connect them"}
            </p>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Constellation Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Great Dragon"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="bg-[#2A3441] border-gray-700 text-white"
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

            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Stats:</p>
              <p className="text-xs text-gray-500">Stars: {stars.length}</p>
              <p className="text-xs text-gray-500">Connections: {connections.length}</p>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <button 
                onClick={handleSave} 
                className="w-full px-4 py-2 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ backgroundColor: '#FF5722' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FF6B3D'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF5722'}
              >
                <Save className="w-4 h-4" />
                Save Constellation
              </button>
              <button 
                onClick={onCancel} 
                className="w-full px-4 py-2 rounded-lg text-white font-semibold border-2 transition-colors"
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
    </div>
  );
}