import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + "/Home");
  };

  const handleSignUp = () => {
    base44.auth.redirectToLogin(window.location.origin + "/Home");
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center relative"
      style={{
        backgroundImage: "url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/168af6bd5_bggggg1.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* White circular card */}
      <div className="w-[700px] h-[700px] bg-white rounded-full flex items-center justify-center p-16 shadow-2xl">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/90f5ad509_GuildStewLogoOfficialForRedditWhite1.png"
              alt="Guildstew"
              className="h-32 w-auto"
            />
          </div>

          {/* Greeting */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-[#FF5722]">
              Greetings, Wanderer.
            </h1>
            <p className="text-gray-700 text-sm">
              Sign-in to continue your journey.
            </p>
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <button className="text-xs text-[#6366F1] hover:underline font-medium">
                Forgot Password?
              </button>
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              className="bg-[#FFD4C4] border-none h-12 text-gray-800"
            />
          </div>

          {/* Remember me */}
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

          {/* Login button */}
          <Button
            onClick={handleLogin}
            className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white h-14 rounded-full text-lg font-bold"
          >
            Login
          </Button>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-700">
            Don't have an account?{" "}
            <button 
              onClick={handleSignUp}
              className="text-[#FF5722] font-semibold hover:underline"
            >
              Sign-up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}