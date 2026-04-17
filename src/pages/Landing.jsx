import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { trackEvent } from "@/utils/analytics";
import UsernameField from "@/components/profile/UsernameField";
import { validateUsername, isUsernameAvailable } from "@/utils/username";

// Bump this string whenever the privacy / terms / EULA copy
// materially changes so existing users are forced through the
// re-consent dialog. The same constant is consumed by
// LegalReconsentGate in App.jsx.
export const CURRENT_TOS_VERSION = '1.0';

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Signup-only state
  const [dob, setDob] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [agreedToTos, setAgreedToTos] = useState(false);
  // Forgot-password dialog state.
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      if (data?.user?.id) trackEvent(data.user.id, "user_login");
      navigate("/Home");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setError(null);
    // Age + consent gates. Block under-13 outright; flag 13-17 as
    // minors so the marketplace later filters 18+ content for them.
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
    // Username policy + uniqueness. The live field already shows the
    // status, but we re-check here so someone can't bypass the gate
    // by submitting while the debounce is still pending.
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
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;

      // Create their user profile with consent + age metadata.
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
      // Onboarding as before.
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

  const handleSubmit = () => {
    if (isSignUp) {
      handleSignUp();
    } else {
      handleLogin();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative"
      style={{
        backgroundImage:
          "url('https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/168af6bd5_bggggg1.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md mx-4 md:mx-0 bg-white rounded-2xl overflow-hidden flex items-center justify-center p-8 md:p-10 shadow-2xl">
        <div className="w-full space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/branding/90f5ad509_GuildStewLogoOfficialForRedditWhite1.png"
              alt="Guildstew"
              className="h-32 w-auto"
            />
          </div>

          {/* Greeting */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-[#FF5722]">
              {isSignUp ? "Join the Guild." : "Greetings, Wanderer."}
            </h1>
            <p className="text-gray-700 text-sm">
              {isSignUp
                ? "Create an account to begin your adventure."
                : "Sign-in to continue your journey."}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Email</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                  className="text-xs text-[#6366F1] hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-[#FFD4C4] border-none h-12 text-gray-800"
            />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-[#FFD4C4] border-none h-12 text-gray-800"
            />
          </div>

          {/* Signup-only: username, date of birth, ToS checkbox.
              Under-13 is blocked at submit; 13-17 flagged as minor
              on the user_profiles row. */}
          {isSignUp && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Username</label>
                <UsernameField
                  value={username}
                  onChange={setUsername}
                  onStatus={setUsernameStatus}
                  email={email}
                  label={null}
                  placeholder="boky"
                  inputClassName="bg-[#FFD4C4] border-none h-12 text-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date of birth</label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="bg-[#FFD4C4] border-none h-12 text-gray-800"
                />
                <p className="text-[11px] text-gray-600">
                  Used for age verification. You must be 13+ to play.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="tos"
                  checked={agreedToTos}
                  onCheckedChange={(v) => setAgreedToTos(!!v)}
                  className="border-gray-400 mt-1"
                />
                <label htmlFor="tos" className="text-xs text-gray-700 leading-snug">
                  I have read and agree to the{' '}
                  <a href="/Terms" target="_blank" rel="noreferrer" className="text-[#FF5722] hover:underline font-semibold">Terms of Service</a>,{' '}
                  <a href="/Privacy" target="_blank" rel="noreferrer" className="text-[#FF5722] hover:underline font-semibold">Privacy Policy</a>, and{' '}
                  <a href="/EULA" target="_blank" rel="noreferrer" className="text-[#FF5722] hover:underline font-semibold">End User License Agreement</a>.
                </label>
              </div>
            </>
          )}

          {/* Remember me */}
          {!isSignUp && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={setRemember}
                className="border-gray-400"
              />
              <label htmlFor="remember" className="text-sm text-gray-700">
                Remember me on this device
              </label>
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={
              loading
              || !email
              || !password
              || (isSignUp && (!dob || !agreedToTos || usernameStatus !== "available"))
            }
            className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white h-14 rounded-full text-lg font-bold disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Login"
            )}
          </Button>

          {/* Toggle login/signup */}
          <p className="text-center text-sm text-gray-700">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-[#FF5722] font-semibold hover:underline"
            >
              {isSignUp ? "Login" : "Sign-up"}
            </button>
          </p>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              We'll email you a link to pick a new password.
            </p>
            <Input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-[#FFD4C4] border-none h-11 text-gray-800"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
            <Button
              disabled={!forgotEmail || forgotSending}
              onClick={async () => {
                setForgotSending(true);
                try {
                  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                    redirectTo: `${window.location.origin}/ResetPassword`,
                  });
                  if (resetErr) throw resetErr;
                  toast.success("Check your email for a password reset link.");
                  setForgotOpen(false);
                } catch (err) {
                  toast.error(err?.message || "Failed to send reset email. Please try again.");
                } finally {
                  setForgotSending(false);
                }
              }}
              className="bg-[#FF5722] hover:bg-[#FF6B3D] text-white font-bold"
            >
              {forgotSending ? "Sending…" : "Send Reset Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}