import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { trackEvent } from "@/utils/analytics";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import { CURRENT_TOS_VERSION } from "@/pages/Landing";

/**
 * Create-account page. Only asks for what Supabase actually needs up
 * front — email, password, and legal consent. Username and birthday
 * are collected on the onboarding step so we never double-ask the
 * same question on two pages.
 *
 * The row we insert into user_profiles carries a disposable
 * placeholder username (email prefix + short random suffix) so the
 * unique constraint isn't violated; onboarding lets the user pick a
 * real one and runs the live uniqueness check there.
 */
export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/Onboarding` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || "Google sign-in failed. Try email instead.");
    }
  };

  const handleSignUp = async () => {
    setError(null);
    if (!agreedToTos) {
      setError("Please agree to the Terms, Privacy Policy, and EULA to continue.");
      return;
    }
    if (!email || !password) {
      setError("Enter an email and password first.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      if (data.user) {
        const prefix = (email.split("@")[0] || "guildstewer").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
        const placeholderUsername = `${prefix || "guildstewer"}_${Math.random().toString(36).slice(2, 6)}`;
        await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          email: email,
          username: placeholderUsername,
          tos_accepted_at: new Date().toISOString(),
          tos_version: CURRENT_TOS_VERSION,
        });
        trackEvent(data.user.id, "user_signup");
      }

      // If Supabase email confirmation is enabled, data.session is
      // null until the link gets clicked — route to /VerifyEmail so
      // the user knows what to do next. Otherwise drop them straight
      // into onboarding to finish their profile.
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

      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="w-[min(92vmin,600px)] aspect-square bg-white rounded-full shadow-2xl overflow-hidden flex flex-col items-center justify-center px-10">
          <div className="w-full max-w-xs space-y-4">
            <div className="flex justify-center">
              <img
                src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/branding/90f5ad509_GuildStewLogoOfficialForRedditWhite1.png"
                alt="Guildstew"
                className="h-[120px] w-auto"
              />
            </div>

            <div className="text-center space-y-0.5">
              <h1 className="text-2xl font-bold text-[#FF5722]">Join the Guild.</h1>
              <p className="text-gray-700 text-xs">Create an account to begin your adventure.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 text-center">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full h-9 border border-slate-300 rounded-lg flex items-center justify-center gap-2 text-slate-700 hover:bg-slate-100 transition text-xs font-semibold"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                className="w-4 h-4"
              />
              Sign up with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-300" />
              <span className="text-slate-400 text-[11px] uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-slate-300" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#FFD4C4] border-none h-9 text-gray-800 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#FFD4C4] border-none h-9 text-gray-800 text-sm"
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="tos"
                checked={agreedToTos}
                onCheckedChange={(v) => setAgreedToTos(!!v)}
                className="mt-0.5"
              />
              <label htmlFor="tos" className="text-[10px] text-gray-700 leading-snug">
                I agree to the{' '}
                <a href="/Terms" target="_blank" rel="noopener noreferrer" className="text-[#FF5722] hover:underline font-semibold">Terms</a>,{' '}
                <a href="/Privacy" target="_blank" rel="noopener noreferrer" className="text-[#FF5722] hover:underline font-semibold">Privacy</a>, and{' '}
                <a href="/EULA" target="_blank" rel="noopener noreferrer" className="text-[#FF5722] hover:underline font-semibold">EULA</a>.
              </label>
            </div>

            <Button
              onClick={handleSignUp}
              disabled={loading || !email || !password || !agreedToTos}
              className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white h-9 rounded-full text-sm font-bold disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Create Account"}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-white drop-shadow-md">
          Already have an account?{' '}
          <Link to="/Login" className="text-[#37F2D1] font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
