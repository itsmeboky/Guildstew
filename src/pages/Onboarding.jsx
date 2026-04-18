import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, HelpCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import UsernameField from "@/components/profile/UsernameField";
import { validateUsername, isUsernameAvailable } from "@/utils/username";

/**
 * Profile-completion flow after signup. Split into two steps so the
 * content fits inside the circular card without a scrollbar:
 *   Step 1 — photo, username, birthday
 *   Step 2 — country, pronouns, "what made you try Guildstew"
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle");
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
        const fileName = `avatars/${currentUser.id}_${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, avatarFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
          avatarUrl = urlData.publicUrl;
        }
      }

      const birthDate = new Date(data.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const updates = {
        username: data.username,
        birthday: data.birthday,
        age,
        country: data.country,
        pronouns: data.pronouns,
        onboarding_reason: data.reason,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };
      if (avatarUrl) updates.avatar_url = avatarUrl;

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', currentUser.id);
      if (error) throw error;
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

  const canAdvance = username.trim() && birthday && (usernameStatus === "available" || usernameStatus === "idle");
  const canSubmit = canAdvance && reason;

  const handleNext = async () => {
    if (!username.trim()) { toast.error("Please choose a username"); return; }
    if (!birthday) { toast.error("Please enter your birthday"); return; }
    // Re-check the username policy + uniqueness right before we
    // advance so a stale "available" indicator can't let a bad value
    // through.
    const policy = validateUsername(username.trim(), currentUser?.email);
    if (!policy.ok) { toast.error(policy.error); return; }
    const { available, error: checkErr } = await isUsernameAvailable(username.trim(), currentUser?.id);
    if (checkErr) { toast.error("Could not verify username availability. Try again."); return; }
    if (!available) { toast.error("That username is taken. Try another one."); return; }
    setStep(2);
  };

  const handleSubmit = () => {
    if (!reason) { toast.error("Please tell us what brought you to Guildstew"); return; }
    completeOnboardingMutation.mutate({
      username: username.trim(),
      birthday,
      country,
      pronouns,
      reason,
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative p-4 sm:p-6">
      <AuthBackdrop />

      <div className="w-[min(92vmin,720px)] aspect-square bg-white/95 rounded-full shadow-2xl relative z-10 flex flex-col items-center justify-center p-10 sm:p-14 overflow-hidden">
        <div className="text-center mb-3 flex-shrink-0">
          <img
            src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/branding/2a112bc4f_GuildStewLogoOfficialForRedditWhite1.png"
            alt="Guildstew"
            className="h-14 sm:h-16 w-auto mx-auto mb-1"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-[#FF5722]">Welcome to Guildstew!</h1>
          <p className="text-gray-700 text-[11px]">
            Step {step} of 2 — {step === 1 ? "The basics" : "Tell us about you"}
          </p>
          {/* Step-dot indicator so the user sees there's more. */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {[1, 2].map((s) => (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-6 bg-[#FF5722]" : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {step === 1 ? (
            <>
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#FF5722] bg-gray-200 flex-shrink-0">
                  {avatarFile ? (
                    <img src={URL.createObjectURL(avatarFile)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files[0])}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5722] text-white rounded-lg cursor-pointer hover:bg-[#FF6B3D] transition-colors text-xs"
                  >
                    <Upload className="w-3 h-3" />
                    Upload photo
                  </label>
                  <p className="text-[10px] text-gray-600 mt-0.5">Optional — add later if you like</p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-800">
                  Username <span className="text-[#FF5722]">*</span>
                </Label>
                <div className="mt-1">
                  <UsernameField
                    value={username}
                    onChange={setUsername}
                    onStatus={setUsernameStatus}
                    email={currentUser?.email}
                    excludeUserId={currentUser?.id}
                    label={null}
                    placeholder="Choose a username"
                    inputClassName="bg-orange-100/50 border-orange-200 text-gray-800 placeholder:text-gray-500 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="birthday" className="text-xs font-semibold text-gray-800">
                    Birthday <span className="text-[#FF5722]">*</span>
                  </Label>
                  <button
                    type="button"
                    onMouseEnter={() => setShowBirthdayInfo(true)}
                    onMouseLeave={() => setShowBirthdayInfo(false)}
                    className="relative"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-gray-600 cursor-help" />
                    {showBirthdayInfo && (
                      <div className="absolute left-0 top-5 w-64 bg-[#2A3441] border border-[#37F2D1] rounded-lg p-2.5 text-[10px] text-white leading-relaxed z-50 shadow-xl text-left">
                        We ask your birthday to confirm you're old enough to join certain spaces and
                        to protect minors from adult content. We never sell your data.
                      </div>
                    )}
                  </button>
                </div>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="bg-orange-100/50 border-orange-200 text-gray-800 h-9 text-sm mt-1"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="country" className="text-xs font-semibold text-gray-800">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., USA, Canada, UK"
                  className="bg-orange-100/50 border-orange-200 text-gray-800 placeholder:text-gray-500 h-9 text-sm mt-1"
                />
              </div>

              <div>
                <Label htmlFor="pronouns" className="text-xs font-semibold text-gray-800">Pronouns</Label>
                <Input
                  id="pronouns"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="they/them, he/him, she/her…"
                  className="bg-orange-100/50 border-orange-200 text-gray-800 placeholder:text-gray-500 h-9 text-sm mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reason" className="text-xs font-semibold text-gray-800">
                  What brought you here? <span className="text-[#FF5722]">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="bg-orange-100/50 border-orange-200 text-gray-800 h-9 text-sm mt-1">
                    <SelectValue placeholder="Select one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="love_ttrpgs">I love TTRPGs — wanted to try this out.</SelectItem>
                    <SelectItem value="never_played">New to TTRPGs — this looks approachable.</SelectItem>
                    <SelectItem value="recommended">A friend recommended it.</SelectItem>
                    <SelectItem value="curious">Just curious.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4 flex-shrink-0">
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="text-xs h-9 px-3 rounded-full border-gray-300 text-gray-700"
            >
              <ArrowLeft className="w-3 h-3 mr-1" /> Back
            </Button>
          )}
          {step === 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canAdvance}
              className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-bold px-6 h-9 text-sm rounded-full disabled:opacity-50"
            >
              Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || completeOnboardingMutation.isPending}
              className="bg-[#FF5722] hover:bg-[#37F2D1] hover:text-[#2A3441] text-white font-bold px-6 h-9 text-sm rounded-full disabled:opacity-50"
            >
              {completeOnboardingMutation.isPending ? "Setting up…" : "Welcome to Guildstew"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
