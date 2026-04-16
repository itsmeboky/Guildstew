import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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
      navigate("/Home");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;

      // Create their user profile
      if (data.user) {
        await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          email: email,
          username: email.split("@")[0],
        });
      }

      navigate("/Onboarding");
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
      <div className="w-[700px] h-[700px] bg-white rounded-full flex items-center justify-center p-16 shadow-2xl">
        <div className="w-full max-w-md space-y-6">
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
                <button className="text-xs text-[#6366F1] hover:underline font-medium">
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
            disabled={loading || !email || !password}
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
    </div>
  );
}