import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, ArrowLeft, Download, Users, Shield, FileText, Image as ImageIcon, UserPlus, Trash2, AlertCircle, Bell, Clock, Trophy, Database, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { canModifySettings, isMainGM } from "@/components/campaigns/permissions";
import ImagePositionEditor from "@/components/campaigns/ImagePositionEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ConsentChecklist from "@/components/consent/ConsentChecklist";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CampaignSettings() {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  const navigate = useNavigate();
  const [editingImage, setEditingImage] = useState(null);
  const [consentData, setConsentData] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [sessionTime, setSessionTime] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [legendSettings, setLegendSettings] = useState({ crit_success_points: 10, crit_fail_points: 10 });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => base44.entities.Campaign.filter({ id: campaignId }).then(campaigns => campaigns[0]),
    enabled: !!campaignId
  });

  const { data: allUserProfiles } = useQuery({
    queryKey: ['allUserProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    staleTime: 60000,
    initialData: []
  });

  const { data: invitations } = useQuery({
    queryKey: ['campaignInvitations', campaignId],
    queryFn: () => base44.entities.CampaignInvitation.filter({ campaign_id: campaignId }),
    enabled: !!campaignId,
    initialData: []
  });

  // Initialize consent data when campaign loads
  React.useEffect(() => {
    if (campaign) {
      setConsentData({
        consent_rating: campaign.consent_rating,
        consent_checklist: campaign.consent_checklist,
        player_expectations: campaign.player_expectations,
        gm_responsibilities: campaign.gm_responsibilities
      });
      setSessionTime(campaign.next_session_time || '');
      setRemindersEnabled(campaign.session_reminders_enabled !== false);
      if (campaign.legend_settings) {
        setLegendSettings(campaign.legend_settings);
      }
    }
  }, [campaign]);

  const updateImageMutation = useMutation({
    mutationFn: async ({ field, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.Campaign.update(campaignId, { [field]: file_url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    }
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ field, position, zoom }) => {
      const positionField = field.replace('_url', '_position');
      const zoomField = field.replace('_url', '_zoom');
      return base44.entities.Campaign.update(campaignId, { 
        [positionField]: position,
        [zoomField]: zoom
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      setEditingImage(null);
    }
  });

  const updateConsentMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Campaign.update(campaignId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Consent settings updated');
    }
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Campaign.update(campaignId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Settings updated');
    }
  });

  const updateCoDMMutation = useMutation({
    mutationFn: async (coDMIds) => {
      return base44.entities.Campaign.update(campaignId, { co_dm_ids: coDMIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Co-GMs updated');
    }
  });

  const updateMoleMutation = useMutation({
    mutationFn: async (moleId) => {
      return base44.entities.Campaign.update(campaignId, { mole_player_id: moleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Mole player updated');
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ next_session_time, session_reminders_enabled }) => {
      return base44.entities.Campaign.update(campaignId, { 
        next_session_time, 
        session_reminders_enabled 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Session settings updated');
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('sendSessionReminder', { campaign_id: campaignId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionReminders', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success('Session reminders sent to all players!');
      setIsSendingReminder(false);
    },
    onError: () => {
      toast.error('Failed to send reminders');
      setIsSendingReminder(false);
    }
  });

  // Legacy preload flows used to call Edge Functions that never
  // shipped. D&D 5e content is now seeded by a DB trigger at campaign
  // creation, so these mutations are kept as inert stubs and the
  // settings tab below renders a one-line notice instead of buttons.
  const preloadMonstersMutation = { isPending: false, mutate: () => {} };
  const preloadItemsMutation = { isPending: false, mutate: () => {} };

  const handleImageUpload = (field, file) => {
    if (file) {
      updateImageMutation.mutate({ field, file });
    }
  };

  const imageSettings = [
    { title: "Archives Background", field: "archives_background_url", description: "Background image for the Campaign Archives page" },
    { title: "NPCs Section Image", field: "npcs_image_url", description: "Card image for NPCs section" },
    { title: "Items Section Image", field: "items_image_url", description: "Card image for Items section" },
    { title: "Items Page Background", field: "items_background_url", description: "Background image for Items page" },
    { title: "Maps Section Image", field: "maps_image_url", description: "Card image for Maps section" },
    { title: "World Lore Section Image", field: "world_lore_image_url", description: "Card image for World Lore section" },
    { title: "Homebrew Section Image", field: "homebrew_image_url", description: "Card image for Homebrew section" },
    { title: "Cosmology & Origins", field: "cosmology_image_url", description: "Background for Cosmology & Origins category" },
    { title: "Geography & Regions", field: "geography_image_url", description: "Background for Geography & Regions category" },
    { title: "Geography Interactive Map", field: "geography_main_map_url", description: "Main world map for Geography & Regions interactive view" },
    { title: "Cultures & Peoples", field: "cultures_image_url", description: "Background for Cultures & Peoples category" },
    { title: "History & Timelines", field: "history_image_url", description: "Background for History & Timelines category" },
    { title: "Myth & Legend", field: "myth_image_url", description: "Background for Myth & Legend category" },
    { title: "Magic & Arcana", field: "magic_image_url", description: "Background for Magic & Arcana category" },
    { title: "Technology & Craft", field: "technology_image_url", description: "Background for Technology & Craft category" },
    { title: "Religions & Organizations", field: "religions_image_url", description: "Background for Religions & Organizations category" },
    { title: "Monster Compendium", field: "monsters_image_url", description: "Background for Monster Compendium category" },
    { title: "Flora & Fauna", field: "flora_image_url", description: "Background for Flora & Fauna category" },
    { title: "Artifacts & Relics", field: "artifacts_image_url", description: "Background for Artifacts & Relics category" },
    { title: "Political Structure", field: "political_image_url", description: "Background for Political Structure category" },
    { title: "Calendar & Time", field: "calendar_image_url", description: "Background for Calendar & Time category" },
    { title: "Miscellany", field: "misc_image_url", description: "Background for Miscellany category" }
  ];

  const handleSavePosition = (field, position, zoom) => {
    updatePositionMutation.mutate({ field, position, zoom });
  };

  const handleSaveConsent = () => {
    updateConsentMutation.mutate(consentData);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await base44.functions.invoke('exportCampaignData', { campaign_id: campaignId });
      const blob = new Blob([response.data], { type: 'application/rtf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaign.title.replace(/[^a-z0-9]/gi, '_')}_archives.rtf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Archive data exported');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddCoDM = (userId) => {
    const currentCoDMs = campaign.co_dm_ids || [];
    if (!currentCoDMs.includes(userId)) {
      updateCoDMMutation.mutate([...currentCoDMs, userId]);
    }
  };

  const handleRemoveCoDM = (userId) => {
    const currentCoDMs = campaign.co_dm_ids || [];
    updateCoDMMutation.mutate(currentCoDMs.filter(id => id !== userId));
  };

  const handleConsentChange = (updates) => {
    setConsentData(prev => ({ ...prev, ...updates }));
  };

  const handleSaveSessionSettings = () => {
    updateSessionMutation.mutate({
      next_session_time: sessionTime,
      session_reminders_enabled: remindersEnabled
    });
  };

  const handleSendReminderNow = () => {
    setIsSendingReminder(true);
    sendReminderMutation.mutate();
  };

  const consentOptions = [
    {
      value: "green",
      label: "Green - Family Friendly",
      description: "Suitable for all ages. No mature content.",
      color: "bg-green-600 hover:bg-green-700 border-green-500"
    },
    {
      value: "yellow",
      label: "Yellow - Mature Themes",
      description: "Some mature content. Recommended for ages 13+.",
      color: "bg-yellow-600 hover:bg-yellow-700 border-yellow-500"
    },
    {
      value: "orange",
      label: "Orange - Graphic Violence",
      description: "Graphic violence and dark themes, but no explicit sexual content. 17+.",
      color: "bg-orange-600 hover:bg-orange-700 border-orange-500"
    },
    {
      value: "red",
      label: "Red - Adult Content",
      description: "Contains adult themes and explicit content. 18+ only.",
      color: "bg-red-600 hover:bg-red-700 border-red-500"
    }
  ];

  if (!campaign) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  // Permission check - only GMs and Co-GMs can access settings
  if (!canModifySettings(campaign, user?.id)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to access campaign settings.</p>
          <Button onClick={() => navigate(-1)} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const players = campaign.player_ids?.map(playerId => {
    return allUserProfiles.find(u => u.user_id === playerId);
  }).filter(Boolean) || [];

  const invitedUsers = invitations
    .filter(inv => inv.status === 'pending')
    .map(inv => allUserProfiles.find(u => u.user_id === inv.invited_user_id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E2430] to-[#2A3441] p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate(createPageUrl("CampaignGMPanel") + `?id=${campaignId}`)}
          variant="ghost"
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaign
        </Button>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Campaign Settings</h1>
          <p className="text-gray-400">{campaign.title}</p>
        </div>

        <Tabs defaultValue="session" className="space-y-6">
          <TabsList className="bg-[#2A3441] border border-gray-700">
            <TabsTrigger value="session" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <AlertCircle className="w-4 h-4 mr-2" />
              Session Alerts
            </TabsTrigger>
            <TabsTrigger value="coDMs" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Users className="w-4 h-4 mr-2" />
              Co-GMs & Mole
            </TabsTrigger>
            <TabsTrigger value="consent" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Shield className="w-4 h-4 mr-2" />
              Consent & Safety
            </TabsTrigger>
            <TabsTrigger value="legend" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Trophy className="w-4 h-4 mr-2" />
              Legend System
            </TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <ImageIcon className="w-4 h-4 mr-2" />
              Archive Images
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <FileText className="w-4 h-4 mr-2" />
              Export Data
            </TabsTrigger>
            {(campaign.system === 'D&D 5e' || campaign.system === 'Dungeons and Dragons 5e') && (
              <TabsTrigger value="content" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
                <Database className="w-4 h-4 mr-2" />
                Game Content
              </TabsTrigger>
            )}
          </TabsList>

          {/* Session Alerts Tab */}
          <TabsContent value="session" className="space-y-6">
            <div className="bg-[#2A3441] rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-6 h-6" />
                Session Reminders
              </h2>
              <p className="text-gray-400 mb-6">
                Schedule your next session and automatically remind all players 10 minutes before it starts. 
                You can also send reminders immediately.
              </p>

              <div className="space-y-6">
                <div>
                  <Label className="text-white mb-2 block">Next Session Time</Label>
                  <Input
                    type="datetime-local"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="bg-[#1E2430] border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Players will be automatically notified 10 minutes before this time.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="reminders-enabled"
                    checked={remindersEnabled}
                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="reminders-enabled" className="text-white cursor-pointer">
                    Enable automatic session reminders
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleSaveSessionSettings} 
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Save Session Settings
                  </Button>
                  <Button 
                    onClick={handleSendReminderNow}
                    disabled={!sessionTime || isSendingReminder}
                    className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {isSendingReminder ? 'Sending...' : 'Send Reminder Now'}
                  </Button>
                </div>

                {campaign.last_reminder_sent && (
                  <div className="bg-[#1E2430] rounded-lg p-4 text-sm text-gray-400">
                    Last reminder sent: {new Date(campaign.last_reminder_sent).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Co-GMs & Mole Tab */}
          <TabsContent value="coDMs" className="space-y-6">
            {/* Invite Players shortcut — prominent link to the
                CampaignInvite page so the GM doesn't have to
                navigate away from settings to add people. */}
            <div className="bg-[#2A3441] rounded-xl p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Invite Players</h2>
                <p className="text-gray-400 text-sm">
                  Send invites to your friends or share a join link.
                  {campaign?.player_ids?.length > 0 &&
                    ` ${campaign.player_ids.length} player${campaign.player_ids.length === 1 ? '' : 's'} in campaign.`}
                </p>
              </div>
              <Button
                onClick={() => navigate(createPageUrl("CampaignInvite") + `?id=${campaignId}`)}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] font-bold"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Players
              </Button>
            </div>

            <div className="bg-[#2A3441] rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Co-Game Masters
              </h2>
              <p className="text-gray-400 mb-6">Co-GMs have full access to campaign management and can edit all content, except they cannot archive or delete the campaign.</p>

              <div className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Add Co-GM</Label>
                  <Select onValueChange={handleAddCoDM}>
                    <SelectTrigger className="bg-[#1E2430] border-gray-700 text-white">
                      <SelectValue placeholder="Select a player or invited user" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...players, ...invitedUsers].map(player => {
                        if (!player || campaign.co_dm_ids?.includes(player.user_id)) return null;
                        return (
                          <SelectItem key={player.user_id} value={player.user_id}>
                            @{player.username}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {campaign.co_dm_ids && campaign.co_dm_ids.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white">Current Co-GMs</Label>
                    {campaign.co_dm_ids.map(coDMId => {
                      const coDM = allUserProfiles.find(u => u.user_id === coDMId);
                      if (!coDM) return null;
                      return (
                        <div key={coDMId} className="flex items-center justify-between bg-[#1E2430] rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            {coDM.avatar_url && (
                              <img src={coDM.avatar_url} alt={coDM.username} className="w-10 h-10 rounded-full" />
                            )}
                            <span>@{coDM.username}</span>
                          </div>
                          <Button
                            onClick={() => handleRemoveCoDM(coDMId)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#2A3441] rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                Mole Player
              </h2>
              <p className="text-gray-400 mb-6">
                Assign a player as the "mole" - they can access specific GM-only sections you grant them, 
                giving them insider knowledge for roleplay purposes or sabotage mechanics.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Mole Player</Label>
                  <Select value={campaign.mole_player_id || ""} onValueChange={(value) => updateMoleMutation.mutate(value || null)}>
                    <SelectTrigger className="bg-[#1E2430] border-gray-700 text-white">
                      <SelectValue placeholder="No mole assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>No mole</SelectItem>
                      {players.map(player => {
                        if (!player) return null;
                        return (
                          <SelectItem key={player.user_id} value={player.user_id}>
                            @{player.username}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {campaign.mole_player_id && (
                  <div>
                    <Label className="text-white mb-2 block">Mole Access Permissions</Label>
                    <p className="text-gray-400 text-sm mb-3">Select which sections the mole can access:</p>
                    <div className="space-y-2">
                      {['gm_notes', 'secret_npcs', 'hidden_maps'].map(section => {
                        const sectionLabels = {
                          gm_notes: 'GM Notes',
                          secret_npcs: 'Secret NPCs',
                          hidden_maps: 'Hidden Maps'
                        };
                        const isChecked = campaign.mole_accessible_sections?.includes(section);
                        return (
                          <div key={section} className="flex items-center gap-3 bg-[#1E2430] p-3 rounded-lg">
                            <input
                              type="checkbox"
                              id={`mole-${section}`}
                              checked={isChecked}
                              onChange={(e) => {
                                const current = campaign.mole_accessible_sections || [];
                                const updated = e.target.checked
                                  ? [...current, section]
                                  : current.filter(s => s !== section);
                                base44.entities.Campaign.update(campaignId, { mole_accessible_sections: updated })
                                  .then(() => queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }));
                              }}
                              className="w-4 h-4"
                            />
                            <Label htmlFor={`mole-${section}`} className="text-white cursor-pointer">
                              {sectionLabels[section]}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Legend System Tab */}
          <TabsContent value="legend" className="space-y-6">
            <div className="bg-[#2A3441] rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Legend System Settings
              </h2>
              <p className="text-gray-400 mb-6">Configure how critical rolls affect character legend scores in the Myth & Legend category.</p>

              <div className="space-y-4">
                <div>
                  <Label className="text-white mb-2 block">Points per Critical Success</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={legendSettings.crit_success_points}
                    onChange={(e) => setLegendSettings({
                      ...legendSettings,
                      crit_success_points: parseInt(e.target.value) || 10
                    })}
                    className="bg-[#1E2430] border-gray-700 text-white max-w-xs"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How many points characters gain when they roll a critical success (default: 10)
                  </p>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Points per Critical Fail</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={legendSettings.crit_fail_points}
                    onChange={(e) => setLegendSettings({
                      ...legendSettings,
                      crit_fail_points: parseInt(e.target.value) || 10
                    })}
                    className="bg-[#1E2430] border-gray-700 text-white max-w-xs"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    How many points characters lose when they roll a critical fail (default: 10)
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => updateCampaignMutation.mutate({ legend_settings: legendSettings })}
                    className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
                  >
                    Save Legend Settings
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-[#2A3441] rounded-xl p-6">
              <h3 className="text-lg font-bold mb-3">Legend Benchmarks</h3>
              <p className="text-sm text-gray-400 mb-4">Characters earn achievements when reaching these milestones:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-red-400 font-semibold">Infamy (-100 to 0)</div>
                  <div className="text-gray-300">-20: Minor Nuisance</div>
                  <div className="text-gray-300">-40: Troublemaker</div>
                  <div className="text-gray-300">-60: Notorious</div>
                  <div className="text-gray-300">-80: Infamous</div>
                  <div className="text-gray-300">-100: Arch-Villain</div>
                </div>
                <div className="space-y-1">
                  <div className="text-blue-400 font-semibold">Fame (0 to +100)</div>
                  <div className="text-gray-300">+20: Slightly Known</div>
                  <div className="text-gray-300">+40: Notable</div>
                  <div className="text-gray-300">+60: Famous</div>
                  <div className="text-gray-300">+80: Renowned Hero</div>
                  <div className="text-gray-300">+100: Living Legend</div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Consent & Safety Tab */}
          <TabsContent value="consent" className="space-y-6">
            <div className="bg-[#2A3441] rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Content Guidelines & Safety
              </h2>

              <div className="space-y-6">
                <div>
                  <Label className="text-white mb-4 block text-lg">Campaign Content Rating</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consentOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleConsentChange({ consent_rating: option.value })}
                        className={`p-6 rounded-xl border-2 transition-all text-left ${
                          consentData.consent_rating === option.value
                            ? `${option.color} border-white ring-2 ring-white`
                            : "bg-[#1E2430] border-gray-700 hover:border-gray-500"
                        }`}
                      >
                        <h3 className="font-bold text-lg mb-2">{option.label}</h3>
                        <p className="text-sm text-gray-300">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Player Expectations</Label>
                  <Textarea
                    value={consentData.player_expectations || ''}
                    onChange={(e) => handleConsentChange({ player_expectations: e.target.value })}
                    placeholder="Describe your expectations for player behavior..."
                    className="bg-[#1E2430] border-gray-700 text-white min-h-[120px]"
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">GM Responsibilities</Label>
                  <Textarea
                    value={consentData.gm_responsibilities || ''}
                    onChange={(e) => handleConsentChange({ gm_responsibilities: e.target.value })}
                    placeholder="State what you commit to as a Game Master..."
                    className="bg-[#1E2430] border-gray-700 text-white min-h-[120px]"
                  />
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-xl font-bold mb-4">Content Consent Checklist</h3>
                  <ConsentChecklist
                    checklist={consentData.consent_checklist || {}}
                    onChange={(checklist) => handleConsentChange({ consent_checklist: checklist })}
                  />
                </div>

                <Button onClick={handleSaveConsent} className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]">
                  Save Consent Settings
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Archive Images Tab */}
          <TabsContent value="images" className="space-y-6">
            {imageSettings.map(setting => (
              <div key={setting.field} className="bg-[#2A3441] rounded-xl p-6">
                <div className="flex items-start gap-6">
                  <div className="relative w-64 h-40 bg-[#1E2430] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {campaign[setting.field] ? (
                      <img 
                        src={campaign[setting.field]} 
                        alt={setting.title}
                        className="w-full h-full object-cover"
                        style={{
                          transform: campaign[setting.field.replace('_url', '_position')] && campaign[setting.field.replace('_url', '_zoom')]
                            ? `translate(${campaign[setting.field.replace('_url', '_position')].x}px, ${campaign[setting.field.replace('_url', '_position')].y}px) scale(${campaign[setting.field.replace('_url', '_zoom')]})`
                            : 'none',
                          transformOrigin: 'center center'
                        }}
                      />
                    ) : (
                      <Upload className="w-12 h-12 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{setting.title}</h3>
                    <p className="text-gray-400 text-sm mb-4">{setting.description}</p>
                    <div className="flex gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id={`upload-${setting.field}`}
                        onChange={(e) => e.target.files[0] && handleImageUpload(setting.field, e.target.files[0])}
                        className="hidden"
                      />
                      <label htmlFor={`upload-${setting.field}`} className="cursor-pointer inline-block">
                        <div className="border border-[#37F2D1] text-[#37F2D1] hover:bg-[#37F2D1]/10 px-4 py-2 rounded-md inline-flex items-center gap-2 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>{campaign[setting.field] ? 'Change Image' : 'Upload Image'}</span>
                        </div>
                      </label>
                      {campaign[setting.field] && (
                        <Button
                          onClick={() => setEditingImage(setting)}
                          className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white"
                        >
                          Position Image
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Export Data Tab */}
          <TabsContent value="export" className="space-y-6">
            <div className="bg-[#2A3441] rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Download className="w-6 h-6" />
                Export Campaign Archives
              </h2>
              <p className="text-gray-400 mb-6">
                Export all text data from your campaign archives (NPCs, Items, Maps, World Lore, and Homebrew) 
                into a single RTF document for backup or offline reference.
              </p>

              <Button 
                onClick={handleExportData} 
                disabled={isExporting}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430]"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export to RTF'}
              </Button>
            </div>
          </TabsContent>

          {/* Game Content Tab (D&D 5e Only).
              This used to house manual preload buttons for monsters
              and items. D&D 5e content is now auto-seeded by a
              database trigger on campaign creation, so the tab just
              reports that status. Left in place so the tabs don't
              shift when a campaign uses the D&D 5e system. */}
          {(campaign.system === 'D&D 5e' || campaign.system === 'Dungeons and Dragons 5e') && (
            <TabsContent value="content" className="space-y-6">
              <div className="bg-[#2A3441] rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Database className="w-6 h-6" />
                  Game Content
                </h2>
                <p className="text-gray-400">
                  D&amp;D 5e monsters, items, and spells are automatically seeded into your campaign when it's created.
                  There's nothing to preload here — the full SRD library is already available in the Monster Library,
                  Items, and Spells tabs.
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Position Editor Dialog */}
        <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
          <DialogContent className="bg-[#1E2430] border-[#37F2D1] text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Position {editingImage?.title}</DialogTitle>
            </DialogHeader>
            {editingImage && (
              <ImagePositionEditor
                imageUrl={campaign[editingImage.field]}
                position={campaign[editingImage.field.replace('_url', '_position')] || { x: 0, y: 0 }}
                zoom={campaign[editingImage.field.replace('_url', '_zoom')] || 1}
                onSave={(position, zoom) => handleSavePosition(editingImage.field, position, zoom)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}