import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Save, LogOut, Trophy, Check, Eye, Sun, Moon, Type, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import PlayerConsentForm from "@/components/consent/PlayerConsentForm";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import SubscriptionTab from "@/components/subscription/SubscriptionTab";

const CLASS_ICONS = {
  "Wizard": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/94cfaa28a_Wizard1.png",
  "Warlock": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/184c98268_Warlock1.png",
  "Rogue": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/a66f2aac1_Rogue1.png",
  "Ranger": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/748e5be38_Ranger1.png",
  "Paladin": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/1eb7cd2f2_Paladin1.png",
  "Monk": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/f2e85e13a_Monk1.png",
  "Druid": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/ef43c9ff2_Druid1.png",
  "Cleric": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/15fe6ef24_Cleric1.png",
  "Bard": "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/classes/cbe7f7dba_Bard1.png"
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: achievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => base44.entities.Achievement.filter({ user_id: user?.id }, '-earned_at'),
    enabled: !!user,
    initialData: []
  });

  const [formData, setFormData] = useState({
    username: user?.username || '',
    tagline: user?.tagline || '',
    bio: user?.bio || '',
    favorite_ttrpg: user?.favorite_ttrpg || 'D&D 5e',
    favorite_class: user?.favorite_class || '',
    favorite_class_icon: user?.favorite_class_icon || '',
    online_status: user?.online_status || 'online',
    stream_url: user?.stream_url || '',
    featured_achievement_ids: user?.featured_achievement_ids || []
  });

  const [accessibilityData, setAccessibilityData] = useState({
    accessibility_dyslexic_font: user?.accessibility_dyslexic_font || false,
    accessibility_dark_mode: user?.accessibility_dark_mode !== false,
    accessibility_high_contrast: user?.accessibility_high_contrast || false,
    accessibility_reduced_motion: user?.accessibility_reduced_motion || false,
    accessibility_font_size: user?.accessibility_font_size || 'medium'
  });

  const [consentData, setConsentData] = useState({
    consent_checklist: user?.consent_checklist || {},
    consent_lines: user?.consent_lines || '',
    consent_veils: user?.consent_veils || '',
    character_consent: user?.character_consent || {},
    additional_consent_notes: user?.additional_consent_notes || ''
  });

  const rarityColors = {
    common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      let updates = { ...data };

      if (avatarFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: avatarFile });
        updates.avatar_url = file_url;
      }

      if (bannerFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: bannerFile });
        updates.banner_url = file_url;
      }

      await base44.auth.updateMe(updates);

      // Sync to UserProfile for public visibility
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const profileData = {
        username: updates.username || user.username,
        email: user.email,
        avatar_url: updates.avatar_url || user.avatar_url,
        age: user.age,
        tagline: updates.tagline || user.tagline,
        country: user.country,
        pronouns: user.pronouns,
        bio: user.bio,
        social_links: user.social_links || [],
        favorite_genres: user.favorite_genres || [],
        profile_color_1: user.profile_color_1 || '#FF5722',
        profile_color_2: user.profile_color_2 || '#37F2D1',
        banner_url: updates.banner_url || user.banner_url,
        role: user.role
      };

      if (profiles.length > 0) {
        await base44.entities.UserProfile.update(profiles[0].id, profileData);
      } else {
        await base44.entities.UserProfile.create({ ...profileData, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['allUserProfiles'] });
      toast.success('Profile updated successfully');
      setAvatarFile(null);
      setBannerFile(null);
    }
  });

  const updateAccessibilityMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Accessibility settings saved');
    }
  });

  const updateConsentMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Consent preferences saved');
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleAccessibilitySave = () => {
    updateAccessibilityMutation.mutate(accessibilityData);
  };

  const handleConsentSave = () => {
    updateConsentMutation.mutate(consentData);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleClassChange = (className) => {
    setFormData({
      ...formData,
      favorite_class: className,
      favorite_class_icon: CLASS_ICONS[className] || ''
    });
  };

  const toggleAchievement = (achievementId) => {
    const currentIds = formData.featured_achievement_ids || [];
    if (currentIds.includes(achievementId)) {
      setFormData({
        ...formData,
        featured_achievement_ids: currentIds.filter(id => id !== achievementId)
      });
    } else if (currentIds.length < 3) {
      setFormData({
        ...formData,
        featured_achievement_ids: [...currentIds, achievementId]
      });
    } else {
      toast.error('You can only feature up to 3 achievements');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-[#2A3441]">
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Profile
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Featured Achievements
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Accessibility
            </TabsTrigger>
            <TabsTrigger value="consent" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Consent & Safety
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Account
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Subscription
            </TabsTrigger>
            <TabsTrigger value="legal" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Privacy & Legal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-[#2A3441] rounded-2xl p-6 space-y-6">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  disabled
                  className="mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">Username cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="The Adventurer"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="bio">Biography (max 250 characters)</Label>
                <Input
                  id="bio"
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 250) })}
                  placeholder="Tell us about yourself..."
                  className="mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">{(formData.bio || '').length}/250 characters</p>
              </div>

              <div>
                <Label htmlFor="favorite_ttrpg">Favorite TTRPG System</Label>
                <Select value={formData.favorite_ttrpg} onValueChange={(value) => setFormData({ ...formData, favorite_ttrpg: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D&D 5e">D&D 5e</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="favorite_class">Favorite Class</Label>
                <Select value={formData.favorite_class} onValueChange={handleClassChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select your favorite class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bard">Bard</SelectItem>
                    <SelectItem value="Cleric">Cleric</SelectItem>
                    <SelectItem value="Druid">Druid</SelectItem>
                    <SelectItem value="Monk">Monk</SelectItem>
                    <SelectItem value="Paladin">Paladin</SelectItem>
                    <SelectItem value="Ranger">Ranger</SelectItem>
                    <SelectItem value="Rogue">Rogue</SelectItem>
                    <SelectItem value="Warlock">Warlock</SelectItem>
                    <SelectItem value="Wizard">Wizard</SelectItem>
                  </SelectContent>
                </Select>
                {formData.favorite_class && (
                  <div className="mt-4 flex items-center gap-3">
                    <img src={CLASS_ICONS[formData.favorite_class]} alt={formData.favorite_class} className="w-16 h-16 object-contain" />
                    <span className="text-sm text-gray-400">Preview of {formData.favorite_class} icon</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="online_status">Online Status</Label>
                <Select value={formData.online_status} onValueChange={(value) => setFormData({ ...formData, online_status: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="streaming">Streaming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.online_status === 'streaming' && (
                <div>
                  <Label htmlFor="stream_url">Stream URL (Twitch)</Label>
                  <Input
                    id="stream_url"
                    value={formData.stream_url}
                    onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                    placeholder="https://twitch.tv/your_channel"
                    className="mt-2"
                  />
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] gap-2"
              >
                <Save className="w-4 h-4" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="bg-[#2A3441] rounded-2xl p-6">
              <div className="mb-4">
                <Label>Featured Achievements ({formData.featured_achievement_ids?.length || 0}/3)</Label>
                <p className="text-sm text-gray-400 mt-1">Select up to 3 achievements to display on your profile</p>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {achievements.map((achievement) => {
                    const isSelected = formData.featured_achievement_ids?.includes(achievement.id);
                    return (
                      <button
                        key={achievement.id}
                        onClick={() => toggleAchievement(achievement.id)}
                        className={`w-full flex items-center gap-3 bg-[#1E2430] rounded-lg p-4 transition-all ${
                          isSelected ? 'ring-2 ring-[#37F2D1]' : 'hover:bg-[#1E2430]/80'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-lg ${rarityColors[achievement.rarity]} border flex items-center justify-center flex-shrink-0`}>
                          {achievement.icon_url ? (
                            <img src={achievement.icon_url} alt={achievement.title} className="w-8 h-8" />
                          ) : (
                            <Trophy className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-bold text-sm">{achievement.title}</h4>
                          <p className="text-xs text-gray-400">{achievement.description}</p>
                          <Badge className={`${rarityColors[achievement.rarity]} text-xs mt-1`}>
                            {achievement.rarity}
                          </Badge>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-[#37F2D1] flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {achievements.length === 0 && (
                    <div className="text-center py-12">
                      <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500">No achievements earned yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] gap-2 mt-6"
              >
                <Save className="w-4 h-4" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Featured Achievements'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="accessibility">
            <div className="bg-[#2A3441] rounded-2xl p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Type className="w-5 h-5 text-[#37F2D1]" />
                    <div>
                      <Label>Dyslexic-Friendly Font</Label>
                      <p className="text-xs text-gray-400">Use OpenDyslexic font for easier reading</p>
                    </div>
                  </div>
                  <Switch
                    checked={accessibilityData.accessibility_dyslexic_font}
                    onCheckedChange={(checked) => {
                      setAccessibilityData({ ...accessibilityData, accessibility_dyslexic_font: checked });
                      // Instantly apply the font mode so the user sees
                      // the change before the profile save round-trips.
                      const mode = checked ? 'dyslexic' : 'default';
                      localStorage.setItem('gs-font-mode', mode);
                      document.documentElement.setAttribute('data-font-mode', mode);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {accessibilityData.accessibility_dark_mode ? <Moon className="w-5 h-5 text-[#37F2D1]" /> : <Sun className="w-5 h-5 text-[#37F2D1]" />}
                    <div>
                      <Label>Dark Mode</Label>
                      <p className="text-xs text-gray-400">Switch between light and dark themes</p>
                    </div>
                  </div>
                  <Switch
                    checked={accessibilityData.accessibility_dark_mode}
                    onCheckedChange={(checked) => setAccessibilityData({ ...accessibilityData, accessibility_dark_mode: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-[#37F2D1]" />
                    <div>
                      <Label>High Contrast Mode</Label>
                      <p className="text-xs text-gray-400">Increase contrast for better visibility</p>
                    </div>
                  </div>
                  <Switch
                    checked={accessibilityData.accessibility_high_contrast}
                    onCheckedChange={(checked) => setAccessibilityData({ ...accessibilityData, accessibility_high_contrast: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ZoomIn className="w-5 h-5 text-[#37F2D1]" />
                    <div>
                      <Label>Reduce Motion</Label>
                      <p className="text-xs text-gray-400">Minimize animations and transitions</p>
                    </div>
                  </div>
                  <Switch
                    checked={accessibilityData.accessibility_reduced_motion}
                    onCheckedChange={(checked) => setAccessibilityData({ ...accessibilityData, accessibility_reduced_motion: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="font_size">Font Size</Label>
                  <Select 
                    value={accessibilityData.accessibility_font_size} 
                    onValueChange={(value) => setAccessibilityData({ ...accessibilityData, accessibility_font_size: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="extra-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAccessibilitySave}
                disabled={updateAccessibilityMutation.isPending}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] gap-2"
              >
                <Save className="w-4 h-4" />
                {updateAccessibilityMutation.isPending ? 'Saving...' : 'Save Accessibility Settings'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="consent">
            <div className="bg-[#2A3441] rounded-2xl p-6">
              <PlayerConsentForm data={consentData} onChange={setConsentData} />
              <Button
                onClick={handleConsentSave}
                disabled={updateConsentMutation.isPending}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#1E2430] gap-2 mt-8"
              >
                <Save className="w-4 h-4" />
                {updateConsentMutation.isPending ? 'Saving...' : 'Save Consent Preferences'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="account">
            <div className="bg-[#2A3441] rounded-2xl p-6 space-y-6">
              <div>
                <Label>Email</Label>
                <Input value={user?.email} disabled className="mt-2" />
                <p className="text-xs text-gray-400 mt-1">Contact support to change your email</p>
              </div>

              <div>
                <Label>Role</Label>
                <Input value={user?.role} disabled className="mt-2 capitalize" />
              </div>

              <div className="pt-6 border-t border-gray-700">
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionTab />
          </TabsContent>

          <TabsContent value="legal">
            <div className="bg-[#2A3441] rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Privacy & Legal</h2>
                <p className="text-sm text-slate-400">
                  Read how Guildstew handles your data, or request account deletion.
                </p>
              </div>

              <ul className="space-y-2">
                <li>
                  <a href="/PrivacySummary" className="text-[#37F2D1] hover:underline">
                    How We Use Your Data (plain-language summary)
                  </a>
                </li>
                <li>
                  <a href="/Privacy" className="text-[#37F2D1] hover:underline">
                    Full Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/Terms" className="text-[#37F2D1] hover:underline">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/EULA" className="text-[#37F2D1] hover:underline">
                    EULA & Minor Safety
                  </a>
                </li>
                <li>
                  <a href="/Cookies" className="text-[#37F2D1] hover:underline">
                    Cookie Policy
                  </a>
                </li>
              </ul>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h3 className="text-base font-semibold text-white mb-1">Delete my account</h3>
                <p className="text-xs text-slate-400 mb-3">
                  We're working on a self-serve delete flow. In the meantime, please email
                  the support team and we'll process the request within 30 days.
                </p>
                <a
                  href="mailto:support@guildstew.com?subject=Account%20deletion%20request"
                  className="inline-flex items-center gap-2 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  Contact support@guildstew.com
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}