import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload, Package, Search, Book, Sword, Shield, Backpack, Wrench, PawPrint, Coins, Wand2, Play, FileText, Map, BookOpen, Hammer, Settings, LogOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { allItemsWithEnchanted, itemCategories, itemsByCategory, itemIcons } from "@/components/dnd5e/itemData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categoryIcons = {
  weapons: Sword,
  armor: Shield,
  adventuringGear: Backpack,
  tools: Wrench,
  mounts: PawPrint,
  tradeGoods: Coins,
  magic: Wand2,
  trinkets: Package
};

export default function CampaignItems() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState("custom");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Homebrew items live in campaign_items (one row per campaign).
  // SRD items live in the shared dnd5e_items reference table (one
  // row per item, no campaign_id — the per-campaign seed trigger is
  // gone). Each side gets a _source tag for badge rendering.
  const { data: items } = useQuery({
    queryKey: ['homebrewItems', campaignId],
    queryFn: () => base44.entities.CampaignItem
      .filter({ campaign_id: campaignId })
      .then((rows) => (rows || []).map((i) => ({ ...i, _source: 'homebrew' }))),
    enabled: !!campaignId,
    initialData: []
  });

  const { data: srdItems } = useQuery({
    queryKey: ['srdItems'],
    queryFn: () => base44.entities.Dnd5eItem
      .list('name')
      .then((rows) => (rows || []).map((i) => ({ ...i, _source: 'srd' })))
      .catch(() => []),
    initialData: []
  });

  const createItemMutation = useMutation({
    mutationFn: (data) => base44.entities.CampaignItem.create({ ...data, campaign_id: campaignId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignItems', campaignId] });
      setEditingItem(null);
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampaignItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignItems', campaignId] });
      setSelectedItem(null);
      setEditingItem(null);
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.CampaignItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignItems', campaignId] });
      setSelectedItem(null);
    }
  });

  const handleCreateNew = () => {
    // Explicitly flag homebrew items as non-system so the seeded
    // read-only SRD items stay distinct from things the GM added.
    setEditingItem({ name: "", description: "", rarity: "common", type: "Item", is_system: false });
  };

  const handleSave = () => {
    if (editingItem.id) {
      updateItemMutation.mutate({ id: editingItem.id, data: editingItem });
    } else {
      createItemMutation.mutate(editingItem);
    }
  };

  const handleImageUpload = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditingItem({ ...editingItem, image_url: file_url });
  };

  const rarityColors = {
    common: "bg-gray-400",
    uncommon: "bg-green-400",
    rare: "bg-blue-400",
    very_rare: "bg-purple-400",
    legendary: "bg-orange-400",
    artifact: "bg-red-400"
  };

  const filteredLibraryItems = React.useMemo(() => {
    let filtered = srdItems || [];

    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name || "").toLowerCase().includes(q) ||
        (item.type || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [srdItems, searchQuery, selectedCategory]);

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(c => c[0]),
    enabled: !!campaignId
  });

  const isGM = user?.id === campaign?.game_master_id || campaign?.co_dm_ids?.includes(user?.id);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: campaign?.items_background_url 
          ? `url(${campaign.items_background_url})` 
          : 'linear-gradient(to bottom right, rgba(30, 36, 48, 0.4), rgba(42, 52, 65, 0.3), rgba(30, 36, 48, 0.4))',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {campaign?.items_background_url && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm pointer-events-none" />
      )}
      <div className="relative z-10">
      <div className="flex">
        {/* Left Sidebar Navigation */}
        <aside className="w-[240px] bg-gradient-to-br from-[#1E2430]/40 via-[#2A3441]/30 to-[#1E2430]/40 backdrop-blur-md border-r border-white/10 min-h-screen flex flex-col">
          {isGM ? (
            <Link
              to={createPageUrl("CampaignGMPanel") + `?id=${campaignId}`}
              className="bg-[#37F2D1] text-[#1E2430] font-bold text-lg px-6 py-4 flex items-center gap-3 hover:bg-[#2dd9bd] transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              START SESSION
            </Link>
          ) : (
            <Link
              to={createPageUrl("CampaignPanel") + `?id=${campaignId}`}
              className="bg-[#37F2D1] text-[#1E2430] font-bold text-lg px-6 py-4 flex items-center gap-3 hover:bg-[#2dd9bd] transition-colors"
            >
              <Play className="w-5 h-5 fill-current" />
              CAMPAIGN LOBBY
            </Link>
          )}

          <nav className="flex-1 pt-6 px-3 space-y-1">
            {isGM && (
              <Link
                to={createPageUrl("CampaignGMPanel") + `?id=${campaignId}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm font-semibold">GM Panel</span>
              </Link>
            )}

            <Link
              to={createPageUrl("CampaignUpdates") + `?id=${campaignId}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">Campaign Updates</span>
            </Link>

            <Link
              to={createPageUrl("CampaignArchives") + `?id=${campaignId}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">Campaign Archives</span>
            </Link>

            <Link
              to={createPageUrl("CampaignNPCs") + `?id=${campaignId}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-semibold">NPCs</span>
            </Link>

            <Link
              to={createPageUrl("CampaignItems") + `?id=${campaignId}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors bg-[#37F2D1]/20 backdrop-blur-sm text-[#37F2D1] shadow-lg shadow-[#37F2D1]/20"
            >
              <Package className="w-4 h-4" />
              <span className="text-sm font-semibold">Items</span>
            </Link>

            <Link
              to={createPageUrl("CampaignMaps") + `?id=${campaignId}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
            >
              <Map className="w-4 h-4" />
              <span className="text-sm font-semibold">Maps</span>
            </Link>

            <Link
              to={createPageUrl("CampaignWorldLore") + `?id=${campaignId}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-semibold">World Lore</span>
            </Link>

            <Link
              to={createPageUrl("CampaignHomebrew") + `?id=${campaignId}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
            >
              <Hammer className="w-4 h-4" />
              <span className="text-sm font-semibold">Homebrew</span>
            </Link>
          </nav>

          <div className="px-4 pb-6 space-y-2 border-t border-white/10 pt-4">
            <Link
              to={createPageUrl("Settings")}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group text-gray-400 hover:text-[#37F2D1] hover:bg-white/5 backdrop-blur-sm"
            >
              <Settings className="w-4 h-4 transition-all duration-300 group-hover:rotate-90 group-hover:scale-110" />
              <span className="text-sm">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 w-full group text-gray-400 hover:text-red-400 hover:bg-red-500/10 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold text-white">{campaign?.title || 'Campaign'} - Item Shop</h1>
              {isGM && (
                <Button onClick={handleCreateNew} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Item
                </Button>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="bg-[#2A3441]/50 backdrop-blur-sm border border-white/10">
                <TabsTrigger value="custom" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
                  <Package className="w-4 h-4 mr-2" />
                  Custom Items
                </TabsTrigger>
                <TabsTrigger value="library" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
                  <Book className="w-4 h-4 mr-2" />
                  D&D 5e Library ({allItemsWithEnchanted.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="custom">
                <div className="grid grid-cols-4 gap-6 max-h-[800px] overflow-y-auto pr-2">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-[#2A3441] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                >
                  {(item.icon_url || item.image_url) ? (
                    <img
                      src={item.icon_url || item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-[#1E2430] flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className={`inline-block px-2 py-1 rounded text-xs font-bold text-white mb-2 ${rarityColors[item.rarity]}`}>
                      {item.rarity?.toUpperCase()}
                    </div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

              <TabsContent value="library">
                <div className="flex gap-6">
                  {/* Category Filter Sidebar */}
                  <div className="w-[200px] flex-shrink-0">
                    <div className="bg-[#2A3441]/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 sticky top-4">
                      <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Categories</h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => setSelectedCategory("all")}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            selectedCategory === "all"
                              ? "bg-[#37F2D1]/20 text-[#37F2D1] shadow-lg shadow-[#37F2D1]/20"
                              : "text-gray-400 hover:text-[#37F2D1] hover:bg-white/5"
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          <span className="text-sm font-medium">All Items</span>
                        </button>
                        {Object.entries(itemCategories).map(([key, label]) => {
                          const Icon = categoryIcons[key];
                          const count = itemsByCategory[key]?.length || 0;
                          return (
                            <button
                              key={key}
                              onClick={() => setSelectedCategory(key)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                selectedCategory === key
                                  ? "bg-[#37F2D1]/20 text-[#37F2D1] shadow-lg shadow-[#37F2D1]/20"
                                  : "text-gray-400 hover:text-[#37F2D1] hover:bg-white/5"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm font-medium flex-1 text-left">{label}</span>
                              <span className="text-xs opacity-60">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Items Grid */}
                  <div className="flex-1">
                    <div className="mb-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search items..."
                          className="bg-[#2A3441]/50 backdrop-blur-sm border-white/10 text-white pl-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 max-h-[800px] overflow-y-auto pr-2">
                      {filteredLibraryItems.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedLibraryItem(item)}
                          className="bg-[#2A3441]/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:scale-105 hover:border-[#37F2D1]/50 transition-all p-4"
                        >
                          {itemIcons[item.name] ? (
                            <img src={itemIcons[item.name]} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-2" />
                          ) : (
                            <div className="w-full h-32 bg-[#1E2430]/50 rounded-lg flex items-center justify-center mb-2">
                              <Package className="w-12 h-12 text-gray-600" />
                            </div>
                          )}
                          <h3 className="font-semibold text-sm line-clamp-1 text-white">{item.name}</h3>
                          <p className="text-xs text-gray-400">{item.type}</p>
                          <p className="text-xs text-[#37F2D1] font-semibold mt-1">{item.cost}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Library Item Detail Modal */}
      {selectedLibraryItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="bg-gradient-to-br from-[#2A3441]/90 via-[#1E2430]/90 to-[#2A3441]/90 backdrop-blur-md border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
              <div className="flex items-start gap-6 mb-6">
                {itemIcons[selectedLibraryItem.name] && (
                  <img src={itemIcons[selectedLibraryItem.name]} alt={selectedLibraryItem.name} className="w-32 h-32 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{selectedLibraryItem.name}</h2>
                  <p className="text-[#37F2D1] font-semibold mb-1">{selectedLibraryItem.type}</p>
                  <p className="text-white font-bold text-xl mb-2">{selectedLibraryItem.cost}</p>
                  {selectedLibraryItem.weight > 0 && (
                    <p className="text-gray-400 text-sm">Weight: {selectedLibraryItem.weight} lb.</p>
                  )}
                </div>
              </div>

              {selectedLibraryItem.damage && (
                <div className="mb-4 p-3 bg-[#1E2430] rounded-lg">
                  <span className="font-semibold text-[#FF5722]">Damage: </span>
                  <span className="text-white">{selectedLibraryItem.damage}</span>
                </div>
              )}

              {selectedLibraryItem.armorClass && (
                <div className="mb-4 p-3 bg-[#1E2430] rounded-lg">
                  <span className="font-semibold text-[#37F2D1]">Armor Class: </span>
                  <span className="text-white">{selectedLibraryItem.armorClass}</span>
                </div>
              )}

              {selectedLibraryItem.properties && (
                <div className="mb-4 p-3 bg-[#1E2430] rounded-lg">
                  <span className="font-semibold text-white">Properties: </span>
                  <span className="text-gray-300">{selectedLibraryItem.properties}</span>
                </div>
              )}

              <p className="text-white leading-relaxed mb-6">{selectedLibraryItem.description}</p>

            <Button onClick={() => setSelectedLibraryItem(null)} className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {(selectedItem || editingItem) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="bg-gradient-to-br from-[#2A3441]/90 via-[#1E2430]/90 to-[#2A3441]/90 backdrop-blur-md border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
              {editingItem ? (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold">{editingItem.id ? 'Edit Item' : 'Create Item'}</h2>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Item Image</label>
                    {editingItem.image_url ? (
                      <img src={editingItem.image_url} alt="Item" className="w-48 h-48 rounded-lg object-cover mb-2" />
                    ) : (
                      <div className="w-48 h-48 bg-[#1E2430] rounded-lg flex items-center justify-center mb-2">
                        <Upload className="w-12 h-12 text-gray-500" />
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
                    <label className="block text-sm font-semibold mb-2">Name</label>
                    <Input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      placeholder="Item Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Rarity</label>
                    <Select value={editingItem.rarity} onValueChange={(v) => setEditingItem({ ...editingItem, rarity: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="uncommon">Uncommon</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="very_rare">Very Rare</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                        <SelectItem value="artifact">Artifact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Type</label>
                    <Input
                      value={editingItem.type}
                      onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                      placeholder="Weapon, Armor, Potion, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Description</label>
                    <Textarea
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      placeholder="Item description..."
                      rows={6}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleSave} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                      Save Item
                    </Button>
                    <Button onClick={() => {
                      setEditingItem(null);
                      setSelectedItem(null);
                    }} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    {/* Prefer icon_url when the row has one (DB seeded
                        items usually do); fall back to image_url (set
                        when the GM uploads a custom image). */}
                    {(selectedItem.icon_url || selectedItem.image_url) && (
                      <img
                        src={selectedItem.icon_url || selectedItem.image_url}
                        alt={selectedItem.name}
                        className="w-48 h-48 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex gap-2">
                      {/* System items come from the DB seed (252 SRD
                          rows). The DB trigger rejects deletes on
                          is_system=true, so we also hide the button
                          so the GM doesn't get a confusing error. */}
                      {!selectedItem.is_system && (
                        <>
                          <Button onClick={() => setEditingItem(selectedItem)} variant="outline">
                            Edit
                          </Button>
                          <Button onClick={() => deleteItemMutation.mutate(selectedItem.id)} variant="outline" className="text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {selectedItem.is_system && (
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 self-center px-2">
                          Read-only (SRD)
                        </div>
                      )}
                      <Button onClick={() => setSelectedItem(null)} variant="outline">
                        Close
                      </Button>
                    </div>
                  </div>

                  <div className={`inline-block px-3 py-1 rounded font-bold text-white mb-3 ${rarityColors[selectedItem.rarity]}`}>
                    {selectedItem.rarity?.toUpperCase()}
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-2">{selectedItem.name}</h2>
                  <p className="text-gray-400 mb-4">{selectedItem.type}</p>
                  <p className="text-white leading-relaxed">{selectedItem.description}</p>
                </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}