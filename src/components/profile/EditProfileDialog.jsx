import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import UsernameField from "@/components/profile/UsernameField";
import { validateUsername, isUsernameAvailable } from "@/utils/username";
import SocialHandlesEditor from "@/components/profile/SocialHandlesEditor";

export default function EditProfileDialog({ open, onClose, user }) {
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [tagline, setTagline] = useState(user?.tagline || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [country, setCountry] = useState(user?.country || "");
  const [displayAge, setDisplayAge] = useState(user?.display_age !== false);
  const [pronouns, setPronouns] = useState(user?.pronouns || "");
  const [color1, setColor1] = useState(user?.profile_color_1 || "#FF5722");
  const [color2, setColor2] = useState(user?.profile_color_2 || "#37F2D1");
  const [username, setUsername] = useState(user?.username || "");
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [socialHandles, setSocialHandles] = useState(user?.social_handles || {});
  const [selectedGenres, setSelectedGenres] = useState(user?.favorite_genres || []);
  const [selectedAchievements, setSelectedAchievements] = useState(user?.featured_achievement_ids || []);

  const queryClient = useQueryClient();

  const { data: allAchievements } = useQuery({
    queryKey: ['userAchievements', user?.id],
    queryFn: () => base44.entities.Achievement.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    initialData: []
  });

  const availableGenres = [
    "High Fantasy", "Low Fantasy", "Dark Fantasy", "Grimdark", "Sword & Sorcery", "Urban Fantasy", "Modern Fantasy", "Mythic Fantasy", "Fairy Tale", "Gaslamp Fantasy", "Dungeon Crawl", "Wuxia", "Xianxia",
    "Hard Sci-Fi", "Soft Sci-Fi", "Cyberpunk", "Solarpunk", "Biopunk", "Steampunk", "Dieselpunk", "Atompunk", "Post-Cyberpunk", "Mecha", "Space Opera", "Space Western", "Time Travel",
    "Gothic Horror", "Cosmic Horror", "Supernatural Horror", "Folk Horror", "Survival Horror", "Psychological Horror", "Splatter Horror", "Paranormal Investigation",
    "Zombie Apocalypse", "Wasteland", "Bio-Plague", "Nuclear Fallout", "Alien Invasion", "Magical Apocalypse", "Climate Collapse", "Reclamation / Rebuilding",
    "Ancient World", "Medieval", "Renaissance", "Age of Sail", "Victorian", "Western", "Roaring 20s", "World War", "Cold War",
    "Crime", "Heist", "Noir", "Action Thriller", "Military Ops", "Urban Grit", "Espionage",
    "Monster Hunting", "Occult", "Paranormal", "Supernatural Urban", "Modern Mythology", "Angels & Demons",
    "Classic Superheroes", "Vigilante", "Teen Supers", "Cosmic Supers", "Mutant Powers",
    "Absurdist", "Parody", "Slice-of-Life Comedy", "Goblin Chaos",
    "Detective", "Whodunnit", "Conspiracy", "Tech Thriller",
    "Cozy Romance", "Romantic Fantasy", "Gothic Romance", "Drama Romance",
    "Expedition", "Treasure Hunting", "Naval Adventure", "Skyship Adventure", "Lost World",
    "Wilderness Survival", "Ocean Survival", "Space Survival", "Isolated Outpost",
    "Multiverse", "Planar", "Dreamworld", "Surreal", "Anthropomorphic", "Kaiju", "Wargame Hybrid", "Narrative Drama"
  ];

  const genreGradients = {
    // Fantasy
    "High Fantasy": "from-purple-500 to-pink-500",
    "Low Fantasy": "from-indigo-400 to-purple-400",
    "Dark Fantasy": "from-gray-700 to-purple-900",
    "Grimdark": "from-gray-900 to-red-900",
    "Sword & Sorcery": "from-orange-500 to-red-600",
    "Urban Fantasy": "from-indigo-500 to-purple-600",
    "Modern Fantasy": "from-blue-400 to-purple-500",
    "Mythic Fantasy": "from-yellow-400 to-purple-500",
    "Fairy Tale": "from-pink-300 to-purple-400",
    "Gaslamp Fantasy": "from-amber-500 to-orange-600",
    "Dungeon Crawl": "from-stone-600 to-gray-800",
    "Wuxia": "from-red-500 to-yellow-500",
    "Xianxia": "from-cyan-400 to-blue-500",
    // Sci-Fi
    "Hard Sci-Fi": "from-blue-600 to-cyan-500",
    "Soft Sci-Fi": "from-sky-400 to-blue-500",
    "Cyberpunk": "from-pink-500 to-purple-600",
    "Solarpunk": "from-green-400 to-emerald-500",
    "Biopunk": "from-lime-500 to-green-600",
    "Steampunk": "from-amber-600 to-yellow-700",
    "Dieselpunk": "from-orange-700 to-amber-800",
    "Atompunk": "from-cyan-500 to-teal-600",
    "Post-Cyberpunk": "from-violet-500 to-fuchsia-600",
    "Mecha": "from-slate-500 to-blue-600",
    "Space Opera": "from-indigo-600 to-purple-700",
    "Space Western": "from-orange-600 to-red-700",
    "Time Travel": "from-blue-500 to-purple-600",
    // Horror
    "Gothic Horror": "from-purple-900 to-gray-900",
    "Cosmic Horror": "from-indigo-900 to-purple-950",
    "Supernatural Horror": "from-violet-800 to-gray-900",
    "Folk Horror": "from-green-900 to-gray-800",
    "Survival Horror": "from-red-900 to-gray-900",
    "Psychological Horror": "from-gray-800 to-slate-900",
    "Splatter Horror": "from-red-700 to-red-950",
    "Paranormal Investigation": "from-indigo-700 to-purple-900",
    // Post-Apocalyptic
    "Zombie Apocalypse": "from-green-800 to-gray-900",
    "Wasteland": "from-yellow-800 to-orange-900",
    "Bio-Plague": "from-lime-700 to-green-900",
    "Nuclear Fallout": "from-orange-600 to-red-800",
    "Alien Invasion": "from-purple-700 to-red-800",
    "Magical Apocalypse": "from-fuchsia-600 to-purple-900",
    "Climate Collapse": "from-blue-800 to-gray-900",
    "Reclamation / Rebuilding": "from-emerald-600 to-teal-700",
    // Historical
    "Ancient World": "from-amber-700 to-orange-800",
    "Medieval": "from-stone-600 to-amber-700",
    "Renaissance": "from-rose-500 to-amber-600",
    "Age of Sail": "from-blue-600 to-cyan-700",
    "Victorian": "from-purple-700 to-gray-800",
    "Western": "from-yellow-700 to-orange-800",
    "Roaring 20s": "from-yellow-500 to-pink-600",
    "World War": "from-gray-700 to-red-800",
    "Cold War": "from-blue-800 to-gray-800",
    // Modern
    "Crime": "from-red-700 to-gray-800",
    "Heist": "from-emerald-600 to-cyan-700",
    "Noir": "from-gray-800 to-slate-900",
    "Action Thriller": "from-red-600 to-orange-700",
    "Military Ops": "from-green-700 to-gray-800",
    "Urban Grit": "from-slate-700 to-gray-900",
    "Espionage": "from-blue-700 to-gray-800",
    // Supernatural / Paranormal
    "Monster Hunting": "from-red-600 to-purple-700",
    "Occult": "from-purple-700 to-gray-900",
    "Paranormal": "from-violet-600 to-purple-800",
    "Supernatural Urban": "from-indigo-600 to-gray-800",
    "Modern Mythology": "from-cyan-500 to-purple-600",
    "Angels & Demons": "from-yellow-400 to-red-700",
    // Superhero
    "Classic Superheroes": "from-blue-500 to-red-600",
    "Vigilante": "from-red-700 to-gray-900",
    "Teen Supers": "from-pink-500 to-blue-600",
    "Cosmic Supers": "from-purple-600 to-cyan-500",
    "Mutant Powers": "from-green-500 to-purple-600",
    // Comedy
    "Absurdist": "from-pink-400 to-yellow-400",
    "Parody": "from-orange-400 to-pink-500",
    "Slice-of-Life Comedy": "from-green-400 to-blue-400",
    "Goblin Chaos": "from-lime-500 to-orange-600",
    // Mystery
    "Detective": "from-amber-600 to-gray-700",
    "Whodunnit": "from-purple-600 to-gray-700",
    "Conspiracy": "from-red-700 to-gray-900",
    "Tech Thriller": "from-cyan-600 to-blue-800",
    // Romance
    "Cozy Romance": "from-pink-400 to-rose-500",
    "Romantic Fantasy": "from-rose-400 to-purple-500",
    "Gothic Romance": "from-purple-700 to-red-800",
    "Drama Romance": "from-red-500 to-pink-600",
    // Adventure / Exploration
    "Expedition": "from-green-600 to-blue-600",
    "Treasure Hunting": "from-yellow-600 to-orange-700",
    "Naval Adventure": "from-blue-600 to-cyan-600",
    "Skyship Adventure": "from-sky-500 to-indigo-600",
    "Lost World": "from-green-700 to-purple-700",
    // Survival
    "Wilderness Survival": "from-green-700 to-emerald-800",
    "Ocean Survival": "from-blue-700 to-cyan-800",
    "Space Survival": "from-indigo-700 to-purple-900",
    "Isolated Outpost": "from-gray-700 to-blue-800",
    // Misc / Hybrid
    "Multiverse": "from-purple-500 to-pink-600",
    "Planar": "from-indigo-600 to-violet-700",
    "Dreamworld": "from-pink-400 to-purple-500",
    "Surreal": "from-fuchsia-500 to-cyan-500",
    "Anthropomorphic": "from-orange-500 to-pink-500",
    "Kaiju": "from-red-700 to-purple-800",
    "Wargame Hybrid": "from-slate-600 to-red-700",
    "Narrative Drama": "from-rose-600 to-purple-700"
  };

  useEffect(() => {
    if (user) {
      setTagline(user.tagline || "");
      setBio(user.bio || "");
      setCountry(user.country || "");
      setDisplayAge(user.display_age !== false);
      setPronouns(user.pronouns || "");
      setColor1(user.profile_color_1 || "#FF5722");
      setColor2(user.profile_color_2 || "#37F2D1");
      setUsername(user.username || "");
      setSocialHandles(user.social_handles || {});
      setSelectedGenres(user.favorite_genres || []);
      setSelectedAchievements(user.featured_achievement_ids || []);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      let bannerUrl = user?.banner_url;
      let avatarUrl = user?.avatar_url;

      if (bannerFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: bannerFile });
        bannerUrl = file_url;
      }

      if (avatarFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: avatarFile });
        avatarUrl = file_url;
      }

      const updates = {
        username: data.username,
        tagline: data.tagline,
        bio: data.bio,
        country: data.country,
        display_age: data.displayAge,
        pronouns: data.pronouns,
        banner_url: bannerUrl,
        avatar_url: avatarUrl,
        profile_color_1: data.color1,
        profile_color_2: data.color2,
        social_handles: data.socialHandles,
        favorite_genres: data.selectedGenres,
        featured_achievement_ids: data.selectedAchievements
      };

      await base44.auth.updateMe(updates);

      // Sync to UserProfile for public visibility
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const profileData = {
        username: data.username,
        email: user.email,
        avatar_url: avatarUrl,
        age: user.age,
        tagline: data.tagline,
        country: data.country,
        pronouns: data.pronouns,
        bio: data.bio,
        social_handles: data.socialHandles,
        favorite_genres: data.selectedGenres,
        profile_color_1: data.color1,
        profile_color_2: data.color2,
        banner_url: bannerUrl,
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
      toast.success("Profile updated successfully!");
      onClose();
    },
    onError: () => {
      toast.error("Failed to update profile");
    }
  });

  const handleSave = async () => {
    // Username is required and must pass the policy + uniqueness
    // check. Skip the live-field status and re-check here so a stale
    // debounce can't let an invalid name slip through.
    const desiredUsername = (username || "").trim();
    if (desiredUsername !== (user?.username || "")) {
      const policy = validateUsername(desiredUsername, user?.email);
      if (!policy.ok) {
        toast.error(policy.error);
        return;
      }
      const { available, error: checkErr } = await isUsernameAvailable(desiredUsername, user?.id);
      if (checkErr) {
        toast.error("Could not verify username availability. Please try again.");
        return;
      }
      if (!available) {
        toast.error("That username is taken. Try another one.");
        return;
      }
    }
    updateProfileMutation.mutate({
      username: desiredUsername,
      tagline,
      bio,
      country,
      displayAge,
      pronouns,
      color1,
      color2,
      socialHandles,
      selectedGenres,
      selectedAchievements
    });
  };

  const toggleGenre = (genre) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else if (prev.length < 9) {
        return [...prev, genre];
      } else {
        toast.error('You can only select up to 9 genres');
        return prev;
      }
    });
  };

  const toggleAchievement = (achievementId) => {
    setSelectedAchievements(prev => {
      if (prev.includes(achievementId)) {
        return prev.filter(id => id !== achievementId);
      } else if (prev.length < 3) {
        return [...prev, achievementId];
      }
      return prev;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1f2e] border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(42, 52, 65, 0.5);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(55, 242, 209, 0.5);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(55, 242, 209, 0.8);
          }
        `}</style>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Banner Upload */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">Profile Banner</Label>
            <div className="relative h-32 bg-[#2A3441] rounded-lg overflow-hidden border-2 border-dashed border-gray-600 hover:border-[#37F2D1] transition-colors">
              {bannerFile ? (
                <>
                  <img src={URL.createObjectURL(bannerFile)} alt="Banner preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setBannerFile(null)}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : user?.banner_url ? (
                <>
                  <img src={user.banner_url} alt="Current banner" className="w-full h-full object-cover" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files[0])}
                    className="hidden"
                    id="banner-upload"
                  />
                  <label
                    htmlFor="banner-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-white" />
                  </label>
                </>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files[0])}
                    className="hidden"
                    id="banner-upload"
                  />
                  <label
                    htmlFor="banner-upload"
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">Upload Banner</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Avatar Upload */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">Profile Picture</Label>
            <div className="relative w-32 h-32 bg-[#2A3441] rounded-full overflow-hidden border-2 border-dashed border-gray-600 hover:border-[#37F2D1] transition-colors">
              {avatarFile ? (
                <>
                  <img src={URL.createObjectURL(avatarFile)} alt="Avatar preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setAvatarFile(null)}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : user?.avatar_url ? (
                <>
                  <img src={user.avatar_url} alt="Current avatar" className="w-full h-full object-cover" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files[0])}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-white" />
                  </label>
                </>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files[0])}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-400">Upload</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Tagline */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">Tagline</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="The Adventurer"
              className="bg-[#2A3441] border-gray-700 text-white"
            />
          </div>

          {/* Bio */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              className="bg-[#2A3441] border-gray-700 text-white"
            />
          </div>

          {/* Country, Birthday/Age, Pronouns */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-300 mb-2 block">Country</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="USA"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-300 mb-2 block">Birthday / Age</Label>
              <div className="space-y-2">
                <Input
                  value={user?.birthday ? new Date(user.birthday).toLocaleDateString() : 'Not set'}
                  disabled
                  className="bg-[#1E2430] border-gray-700 text-gray-400"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="display-age"
                    checked={displayAge}
                    onChange={(e) => setDisplayAge(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <Label htmlFor="display-age" className="text-xs text-gray-400 cursor-pointer">
                    Display age on profile ({user?.age || 'N/A'})
                  </Label>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-300 mb-2 block">Pronouns</Label>
              <Input
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="they/them"
                className="bg-[#2A3441] border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Color Pickers */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">Profile Colors</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-400 mb-1 block">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <Input
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    className="bg-[#2A3441] border-gray-700 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-400 mb-1 block">Secondary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={color2}
                    onChange={(e) => setColor2(e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <Input
                    value={color2}
                    onChange={(e) => setColor2(e.target.value)}
                    className="bg-[#2A3441] border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Username — live uniqueness + policy check. */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">Username</Label>
            <UsernameField
              value={username}
              onChange={setUsername}
              onStatus={setUsernameStatus}
              email={user?.email}
              excludeUserId={user?.id}
              label={null}
              inputClassName="bg-[#2A3441] border-gray-700 text-white"
            />
          </div>

          {/* Social Handles — replaces the old free-form Links array.
              Only specific platforms are accepted; links open with a
              "leaving Guildstew" confirmation on the public profile. */}
          <SocialHandlesEditor value={socialHandles} onChange={setSocialHandles} />

          {/* Favorite Genres */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">Favorite Genres (Select up to 9)</Label>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-2 bg-[#2A3441] rounded-lg custom-scrollbar">
              {availableGenres.map(genre => (
                <Badge
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`cursor-pointer transition-all ${
                    selectedGenres.includes(genre)
                      ? `bg-gradient-to-r ${genreGradients[genre]} text-white border-0`
                      : 'bg-[#2A3441] text-gray-400 hover:bg-[#2A3441]/70'
                  }`}
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          {/* Featured Achievements */}
          <div>
            <Label className="text-sm font-semibold text-gray-300 mb-2 block">
              Featured Achievements (Select up to 3)
            </Label>
            <div className="max-h-80 overflow-y-auto p-2 bg-[#2A3441] rounded-lg space-y-2 custom-scrollbar">
              {allAchievements.map((achievement) => {
                const rarityColors = {
                  common: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                  rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                  epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                  legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                };
                
                return (
                  <div
                    key={achievement.id}
                    onClick={() => toggleAchievement(achievement.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedAchievements.includes(achievement.id)
                        ? 'ring-2 ring-[#37F2D1] bg-[#1E2430]'
                        : 'bg-[#1E2430] hover:bg-[#1E2430]/70'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg ${rarityColors[achievement.rarity]} border flex items-center justify-center flex-shrink-0`}>
                      {achievement.icon_url ? (
                        <img src={achievement.icon_url} alt={achievement.title} className="w-8 h-8" />
                      ) : (
                        <span className="text-2xl">🏆</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm text-white truncate">{achievement.title}</h4>
                        <Badge className={`${rarityColors[achievement.rarity]} text-xs px-2 py-0`}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{achievement.description}</p>
                    </div>
                  </div>
                );
              })}
              {allAchievements.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No achievements yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="border-gray-700 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              updateProfileMutation.isPending
              || usernameStatus === "checking"
              || usernameStatus === "invalid"
              || usernameStatus === "taken"
            }
            className="bg-[#37F2D1] text-[#1E2430] hover:bg-[#FF5722] hover:text-white transition-all font-semibold"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}