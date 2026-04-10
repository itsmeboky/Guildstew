import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [avatarFile, setAvatarFile] = useState(null);
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [country, setCountry] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [reason, setReason] = useState("");
  const [showBirthdayInfo, setShowBirthdayInfo] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  React.useEffect(() => {
    if (currentUser && currentUser.birthday) {
      navigate(createPageUrl("Home"));
    }
  }, [currentUser, navigate]);

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data) => {
      let avatarUrl = null;

      if (avatarFile) {
        const fileName = `avatars/${currentUser.id}_${Date.now()}`
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, avatarFile)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName)
          avatarUrl = urlData.publicUrl
        }
      }

      const birthDate = new Date(data.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Update the user profile
      const updates = {
        username: data.username,
        birthday: data.birthday,
        age: age,
        country: data.country,
        pronouns: data.pronouns,
        onboarding_reason: data.reason,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }
      if (avatarUrl) updates.avatar_url = avatarUrl

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', currentUser.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success("Welcome to Guildstew!");
      window.location.href = createPageUrl("Home");
    },
    onError: (error) => {
      console.error('Onboarding error:', error);
      toast.error("Failed to complete onboarding. Please try again.");
    }
  });

  const handleSubmit = () => {
    if (!username.trim()) {
      toast.error("Please choose a username");
      return;
    }
    if (!birthday) {
      toast.error("Please enter your birthday");
      return;
    }
    if (!reason) {
      toast.error("Please tell us what brought you to Guildstew");
      return;
    }

    completeOnboardingMutation.mutate({
      username,
      birthday,
      country,
      pronouns,
      reason
    });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://i.imgur.com/5LT5NUj.gif)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-[#2A3441]/40 backdrop-blur-[2px]" />

      <div className="w-full max-w-[min(95vmin,1100px)] aspect-square bg-white/95 rounded-full p-6 sm:p-10 md:p-12 lg:p-16 relative z-10 flex flex-col items-center justify-center overflow-y-auto">
        <div className="text-center mb-3 sm:mb-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/2a112bc4f_GuildStewLogoOfficialForRedditWhite1.png"
            alt="Guildstew"
            className="h-20 sm:h-28 md:h-32 w-auto mx-auto mb-2"
          />
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-[#FF5722]">Welcome to Guildstew!</h1>
          <p className="text-gray-700 text-xs sm:text-sm">Let's get your profile set up</p>
        </div>

        <div className="space-y-3 sm:space-y-4 w-full max-w-md">
          <div>
            <Label className="text-sm sm:text-base font-semibold mb-2 block text-gray-800">Profile Picture</Label>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#FF5722] bg-gray-200">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                    👤
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#FF5722] text-white rounded-lg cursor-pointer hover:bg-[#FF6B3D] transition-colors text-xs sm:text-sm"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                  Upload Photo
                </label>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Optional - you can add this later</p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="username" className="text-sm sm:text-base font-semibold mb-2 block text-gray-800">
              Username <span className="text-[#FF5722]">*</span>
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose your username"
              className="bg-orange-100/50 border-orange-200 text-gray-800 placeholder:text-gray-500 text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-600 mt-1">This cannot be changed later</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="birthday" className="text-sm sm:text-base font-semibold text-gray-800">
                Birthday <span className="text-[#FF5722]">*</span>
              </Label>
              <div
                className="relative"
                onMouseEnter={() => setShowBirthdayInfo(true)}
                onMouseLeave={() => setShowBirthdayInfo(false)}
              >
                <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 cursor-help" />
                {showBirthdayInfo && (
                  <div className="absolute left-0 top-6 w-[90vw] max-w-[450px] bg-[#2A3441] border-2 border-[#37F2D1] rounded-lg p-4 sm:p-5 text-xs sm:text-sm text-white leading-relaxed z-50 shadow-xl">
                    <p className="mb-2 sm:mb-3">We ask for your birthday to keep our community safe. Guildstew never sells your data, and we're not here to pry — we simply need to confirm that users are old enough to join certain spaces and to make sure minors aren't exposed to adult content or unsafe interactions.</p>
                    <p className="mb-2 sm:mb-3">We take the protection of minors extremely seriously. Any attempt to target, harm, groom, or exploit underage users will result in immediate removal, permanent bans, and reports to the appropriate authorities. Zero exceptions. Zero second chances.</p>
                    <p>Your safety matters. That's why we verify birthdays — not for profit, not for marketing, but to protect our players.</p>
                  </div>
                )}
              </div>
            </div>
            <Input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="bg-orange-100/50 border-orange-200 text-gray-800 text-sm sm:text-base"
            />
          </div>

          <div>
            <Label htmlFor="country" className="text-sm sm:text-base font-semibold mb-2 block text-gray-800">Country</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., USA, Canada, UK"
              className="bg-orange-100/50 border-orange-200 text-gray-800 placeholder:text-gray-500 text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Optional</p>
          </div>

          <div>
            <Label htmlFor="pronouns" className="text-sm sm:text-base font-semibold mb-2 block text-gray-800">Pronouns</Label>
            <Input
              id="pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g., they/them, he/him, she/her"
              className="bg-orange-100/50 border-orange-200 text-gray-800 placeholder:text-gray-500 text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Optional</p>
          </div>

          <div>
            <Label htmlFor="reason" className="text-sm sm:text-base font-semibold mb-2 block text-gray-800">
              What made you want to try out Guildstew? <span className="text-[#FF5722]">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-orange-100/50 border-orange-200 text-gray-800 text-sm sm:text-base">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="love_ttrpgs">I love TTRPGs, wanted to try this out.</SelectItem>
                <SelectItem value="never_played">I've never played a TTRPG, I hear this would help me out.</SelectItem>
                <SelectItem value="recommended">Was recommended by a friend.</SelectItem>
                <SelectItem value="curious">Just curious.</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={completeOnboardingMutation.isPending || !username.trim() || !birthday || !reason}
          className="w-auto px-6 sm:px-10 bg-[#FF5722] hover:bg-[#37F2D1] text-white hover:text-[#2A3441] font-bold py-2 sm:py-2.5 text-sm sm:text-base rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4 sm:mt-6"
        >
          {completeOnboardingMutation.isPending ? "Setting up..." : "Welcome to Guildstew"}
        </Button>
      </div>
    </div>
  );
}