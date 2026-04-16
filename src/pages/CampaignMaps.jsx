import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Upload, ArrowLeft, ChevronLeft, ChevronRight, Edit, FileText } from "lucide-react";
import ReactQuill from 'react-quill';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import InteractiveMapViewer from "@/components/maps/InteractiveMapViewer";
import { toast } from "sonner";

export default function CampaignMaps() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const [currentMapIndex, setCurrentMapIndex] = useState(0);
  const [editingMap, setEditingMap] = useState(null);
  const [viewMode, setViewMode] = useState('viewer'); // 'viewer' or 'grid'
  const [showEntries, setShowEntries] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const entryQuillRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: maps } = useQuery({
    queryKey: ['campaignMaps', campaignId],
    queryFn: () => base44.entities.CampaignMap.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: []
  });

  const { data: allMapEntries } = useQuery({
    queryKey: ['mapEntries', campaignId],
    queryFn: () => base44.entities.MapEntry.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: []
  });

  const createMapMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignMap.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignMaps', campaignId] });
      setEditingMap(null);
    }
  });

  const updateMapMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampaignMap.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignMaps', campaignId] });
      setEditingMap(null);
    }
  });

  const deleteMapMutation = useMutation({
    mutationFn: (id) => base44.entities.CampaignMap.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignMaps', campaignId] });
      if (maps.length > 0 && currentMapIndex >= maps.length - 1) {
        setCurrentMapIndex(Math.max(0, maps.length - 2));
      }
    }
  });

  const handleCreateNew = () => {
    setEditingMap({ name: "", image_url: "", notes: "", hotspots: [] });
  };

  const handleSave = () => {
    if (editingMap.id) {
      updateMapMutation.mutate({ id: editingMap.id, data: editingMap });
    } else {
      createMapMutation.mutate(editingMap);
    }
  };

  const handleImageUpload = async (file) => {
    // Scope the upload under `<campaignId>/maps/` inside the
    // campaign-assets bucket so map images are grouped per-campaign
    // and easy to clean up when a campaign is deleted.
    const { file_url } = await base44.integrations.Core.UploadFile({
      file,
      bucket: 'campaign-assets',
      path: `${campaignId}/maps`,
    });
    setEditingMap({ ...editingMap, image_url: file_url });
  };

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.MapEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapEntries', campaignId] });
      setEditingEntry(null);
      toast.success("Entry created");
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MapEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapEntries', campaignId] });
      setEditingEntry(null);
      setSelectedEntry(null);
      toast.success("Entry updated");
    }
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.MapEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapEntries', campaignId] });
      setSelectedEntry(null);
      toast.success("Entry deleted");
    }
  });

  const handleUpdateHotspots = (hotspots) => {
    const currentMap = maps[currentMapIndex];
    if (currentMap) {
      updateMapMutation.mutate({ id: currentMap.id, data: { hotspots } });
    }
  };

  const handleSaveEntry = () => {
    if (!editingEntry.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (editingEntry.id) {
      updateEntryMutation.mutate({ id: editingEntry.id, data: editingEntry });
    } else {
      createEntryMutation.mutate({
        ...editingEntry,
        campaign_id: campaignId,
        map_id: currentMap.id
      });
    }
  };

  const currentMap = maps[currentMapIndex];
  const canNavigateLeft = currentMapIndex > 0;
  const canNavigateRight = currentMapIndex < maps.length - 1;
  const currentMapEntries = allMapEntries.filter(e => e.map_id === currentMap?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          onClick={() => navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`)}
          variant="ghost"
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign
        </Button>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Campaign Maps</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode(viewMode === 'viewer' ? 'grid' : 'viewer')}
              variant="outline"
              className="border-gray-700"
            >
              {viewMode === 'viewer' ? 'Grid View' : 'Interactive View'}
            </Button>
            <Button onClick={handleCreateNew} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
              <Plus className="w-5 h-5 mr-2" />
              Add Map
            </Button>
          </div>
        </div>

        {/* Interactive Viewer Mode */}
        {viewMode === 'viewer' && maps.length > 0 && currentMap && (
          <div className="space-y-4">
            {/* Navigation */}
            <div className="flex items-center justify-between bg-[#2A3441] rounded-xl p-4">
              <Button
                onClick={() => setCurrentMapIndex(currentMapIndex - 1)}
                disabled={!canNavigateLeft}
                variant="ghost"
                className="text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold">{currentMap.name}</h2>
                <p className="text-sm text-gray-400">
                  Map {currentMapIndex + 1} of {maps.length}
                </p>
              </div>

              <Button
                onClick={() => setCurrentMapIndex(currentMapIndex + 1)}
                disabled={!canNavigateRight}
                variant="ghost"
                className="text-white disabled:opacity-30"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>

            {/* Interactive Map */}
            <InteractiveMapViewer
              map={currentMap}
              entries={currentMapEntries}
              canEdit={true}
              onUpdateHotspots={handleUpdateHotspots}
              onNavigateToEntry={(entryId) => {
                const entry = currentMapEntries.find(e => e.id === entryId);
                if (entry) {
                  setSelectedEntry(entry);
                }
              }}
            />

            {/* Notes */}
            {currentMap.notes && (
              <div className="bg-[#2A3441] rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Notes</h3>
                <div 
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentMap.notes }}
                />
              </div>
            )}

            {/* Entries Section */}
            <div className="bg-[#2A3441] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Map Entries
                </h3>
                <Button
                  onClick={() => setEditingEntry({ title: '', content: '' })}
                  size="sm"
                  className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Entry
                </Button>
              </div>
              {currentMapEntries.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {currentMapEntries.map(entry => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="bg-[#1E2430] rounded-lg p-3 cursor-pointer hover:bg-[#1E2430]/80 transition-colors"
                    >
                      <h4 className="font-semibold text-sm">{entry.title}</h4>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No entries yet. Create entries to link to map hotspots.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => setEditingMap(currentMap)}
                variant="outline"
                className="border-gray-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Map Details
              </Button>
              <Button
                onClick={() => deleteMapMutation.mutate(currentMap.id)}
                variant="outline"
                className="text-red-400 border-red-400/50 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Map
              </Button>
            </div>
          </div>
        )}

        {viewMode === 'viewer' && maps.length === 0 && (
          <div className="bg-[#2A3441] rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">No maps yet. Add your first map to get started!</p>
            <Button onClick={handleCreateNew} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
              <Plus className="w-5 h-5 mr-2" />
              Add Map
            </Button>
          </div>
        )}

        {/* Grid View Mode */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-3 gap-6">
            {maps.map((map, index) => (
              <div
                key={map.id}
                onClick={() => {
                  setCurrentMapIndex(index);
                  setViewMode('viewer');
                }}
                className="bg-[#2A3441] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              >
                <img src={map.image_url} alt={map.name} className="w-full h-64 object-cover" />
                <div className="p-4">
                  <h3 className="font-bold text-lg">{map.name}</h3>
                  {map.hotspots && map.hotspots.length > 0 && (
                    <p className="text-sm text-gray-400 mt-1">{map.hotspots.length} hotspots</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Entry Modal */}
        {selectedEntry && !editingEntry && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
            <div className="bg-[#2A3441] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-3xl font-bold">{selectedEntry.title}</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setEditingEntry(selectedEntry);
                      setSelectedEntry(null);
                    }}
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => deleteEntryMutation.mutate(selectedEntry.id)}
                    variant="outline"
                    className="text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button onClick={() => setSelectedEntry(null)} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEntry.content || '<p class="text-gray-400">No content yet.</p>' }}
              />
            </div>
          </div>
        )}

        {/* Edit Entry Modal */}
        {editingEntry && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
            <div className="bg-[#2A3441] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
              <h2 className="text-3xl font-bold mb-6">{editingEntry.id ? 'Edit Entry' : 'New Entry'}</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Entry title..."
                  value={editingEntry.title}
                  onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
                  className="bg-[#1E2430] border-gray-700 text-white"
                />
                <ReactQuill
                  ref={entryQuillRef}
                  theme="snow"
                  value={editingEntry.content || ""}
                  onChange={(content) => setEditingEntry({ ...editingEntry, content })}
                  className="bg-white text-black rounded-lg"
                  style={{ height: '400px', marginBottom: '50px' }}
                />
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setEditingEntry(null)} variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEntry} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                    Save Entry
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Map Modal */}
        {editingMap && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
            <div className="bg-[#2A3441] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold">{editingMap.id ? 'Edit Map' : 'Add Map'}</h2>

                <div>
                  <label className="block text-sm font-semibold mb-2">Map Image</label>
                  {editingMap.image_url ? (
                    <img src={editingMap.image_url} alt="Map" className="w-full max-h-96 rounded-lg object-contain mb-2 bg-[#1E2430]" />
                  ) : (
                    <div className="w-full h-64 bg-[#1E2430] rounded-lg flex items-center justify-center mb-2">
                      <Upload className="w-16 h-16 text-gray-500" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Map Name</label>
                  <Input
                    value={editingMap.name}
                    onChange={(e) => setEditingMap({ ...editingMap, name: e.target.value })}
                    placeholder="Map Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Notes</label>
                  <ReactQuill
                    theme="snow"
                    value={editingMap.notes || ""}
                    onChange={(value) => setEditingMap({ ...editingMap, notes: value })}
                    className="bg-white text-black rounded-lg"
                    style={{ height: '300px', marginBottom: '50px' }}
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleSave} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                    Save Map
                  </Button>
                  <Button onClick={() => setEditingMap(null)} variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}