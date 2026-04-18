import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { trackEvent } from "@/utils/analytics";
import UsernameField from "@/components/profile/UsernameField";
import { validateUsername, isUsernameAvailable } from "@/utils/username";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import { CURRENT_TOS_VERSION } from "@/pages/Landing";

/**
 * Dedicated signup / create-account page. Separated from Landing so
 * the default unauthenticated route can be a clean login screen.
 * Uses the same AuthBackdrop video + dark-overlay treatment.
 */
export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setError(null);
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    const ageMs = Date.now() - new Date(dob).getTime();
    const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
    if (!Number.isFinite(age) || age < 0) {
      setError("That date of birth doesn't look right.");
      return;
    }
    if (age < 13) {
      setError("You must be at least 13 years old to create a Guildstew account.");
      return;
    }
    if (!agreedToTos) {
      setError("Please agree to the Terms, Privacy Policy, and EULA to continue.");
      return;
    }

    const desiredUsername = (username || "").trim();
    const policy = validateUsername(desiredUsername, email);
    if (!policy.ok) {
      setError(policy.error);
      return;
    }
    const { available, error: checkErr } = await isUsernameAvailable(desiredUsername);
    if (checkErr) {
      setError("Could not verify username availability. Please try again.");
      return;
    }
    if (!available) {
      setError("That username is taken. Try another one.");
      return;
    }

    const isMinor = age < 18;
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (data.user) {
        await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          email: email,
          username: desiredUsername,
          date_of_birth: dob,
          is_minor: isMinor,
          tos_accepted_at: new Date().toISOString(),
          tos_version: CURRENT_TOS_VERSION,
        });
        trackEvent(data.user.id, "user_signup", { is_minor: isMinor });
      }

      // If Supabase email confirmation is enabled (dashboard setting),
      // data.session is null until the user clicks the link. Route to
      // the verification page so they know what to do next. When
      // confirmation is off, they're already signed in — send them to
      // Onboarding so they finish their profile.
      if (!data.session) {
        navigate("/VerifyEmail?email=" + encodeURIComponent(email));
      } else {
        navigate("/Onboarding");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative p-4">
      <AuthBackdrop />

      <div className="w-full max-w-md mx-4 md:mx-0 bg-white rounded-2xl overflow-hidden p-8 md:p-10 shadow-2xl relative z-10">
        <div className="w-full space-y-5">
          <div className="flex justify-center mb-2">
            <img
              src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/branding/90f5ad509_GuildStewLogoOfficialForRedditWhite1.png"
              alt="Guildstew"
              className="h-20 w-auto"
            />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-[#FF5722]">Join the Guild.</h1>
            <p className="text-gray-700 text-sm">Create an account to begin your adventure.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#FFD4C4] border-none h-11 text-gray-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#FFD4C4] border-none h-11 text-gray-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Username</label>
            <UsernameField
              value={username}
              onChange={setUsername}
              onStatus={setUsernameStatus}
              email={email}
              label={null}
              placeholder="boky"
              inputClassName="bg-[#FFD4C4] border-none h-11 text-gray-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Date of birth</label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="bg-[#FFD4C4] border-none h-11 text-gray-800"
            />
            <p className="text-[11px] text-gray-600">You must be 13+ to play.</p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="tos"
              checked={agreedToTos}
              onCheckedChange={(v) => setAgreedToTos(!!v)}
              className="mt-1"
            />
            <label htmlFor="tos" className="text-xs text-gray-700 leading-snug">
              I have read and agree to the{' '}
              <a href="/Terms" target="_blank" rel="noopener noreferrer" className="text-[#FF5722] hover:underline font-semibold">Terms of Service</a>,{' '}
              <a href="/Privacy" target="_blank" rel="noopener noreferrer" className="text-[#FF5722] hover:underline font-semibold">Privacy Policy</a>, and{' '}
              <a href="/EULA" target="_blank" rel="noopener noreferrer" className="text-[#FF5722] hover:underline font-semibold">EULA</a>.
            </label>
          </div>

          <Button
            onClick={handleSignUp}
            disabled={
              loading
              || !email
              || !password
              || !dob
              || !agreedToTos
              || usernameStatus !== "available"
            }
            className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white h-12 rounded-full text-base font-bold disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : "Create Account"}
          </Button>

          <p className="text-center text-sm text-gray-700">
            Already have an account?{' '}
            <Link to="/Login" className="text-[#FF5722] font-semibold hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
