import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { trackEvent } from "@/utils/analytics";
import AuthBackdrop from "@/components/auth/AuthBackdrop";

// Bump this string whenever the privacy / terms / EULA copy
// materially changes so existing users are forced through the
// re-consent dialog. The same constant is consumed by
// LegalReconsentGate in App.jsx.
export const CURRENT_TOS_VERSION = '1.0';

/**
 * Login landing page. Signup lives on its own route now — this
 * component is login-only so unauthenticated visitors land on a
 * welcoming, low-friction screen instead of a mandatory onboarding
 * form.
 */
export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const handleGoogle = async () => {
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/Home` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err.message || "Google sign-in failed. Try email instead.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative p-4">
      <AuthBackdrop />

      <div className="w-full max-w-md mx-4 md:mx-0 bg-white rounded-2xl overflow-hidden p-8 md:p-10 shadow-2xl relative z-10">
        <div className="w-full space-y-6">
          <div className="flex justify-center mb-2">
            <img
              src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/branding/90f5ad509_GuildStewLogoOfficialForRedditWhite1.png"
              alt="Guildstew"
              className="h-24 w-auto"
            />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-[#FF5722]">Greetings, Wanderer.</h1>
            <p className="text-gray-700 text-sm">Sign in to continue your journey.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <button
                type="button"
                onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                className="text-xs text-[#6366F1] hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-[#FFD4C4] border-none h-12 text-gray-800"
            />
          </div>

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

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={setRemember}
            />
            <label htmlFor="remember" className="text-sm text-gray-700">
              Remember me on this device
            </label>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white h-12 rounded-full text-base font-bold disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : "Login"}
          </Button>

          {/* Google OAuth — branded button per Google guidelines. */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500 uppercase tracking-wider">or</span>
            </div>
          </div>
          <Button
            onClick={handleGoogle}
            variant="outline"
            className="w-full h-12 rounded-full text-sm font-semibold text-gray-700 border-gray-300 bg-white hover:bg-gray-50"
          >
            <GoogleGlyph />
            Continue with Google
          </Button>

          <p className="text-center text-sm text-gray-700">
            Don't have an account?{' '}
            <Link to="/Signup" className="text-[#FF5722] font-semibold hover:underline">
              Sign Up
            </Link>
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

function GoogleGlyph() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}
