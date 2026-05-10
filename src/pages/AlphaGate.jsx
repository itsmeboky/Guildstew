import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import AuthBackdrop from "@/components/auth/AuthBackdrop";

export default function AlphaGate() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedEmail || !trimmedCode) {
      setError("Enter both your email and alpha code.");
      return;
    }

    setLoading(true);
    try {
      const { data: isValid, error: rpcError } = await supabase.rpc(
        "validate_alpha_code",
        { p_email: trimmedEmail, p_code: trimmedCode }
      );
      if (rpcError) throw rpcError;

      if (!isValid) {
        setError("Invalid or already-used alpha code. Double-check your email and code, then try again.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("gs-alpha-email", trimmedEmail);
      sessionStorage.setItem("gs-alpha-code", trimmedCode);
      navigate("/Signup");
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && email && code && !loading) handleSubmit();
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
              <h1 className="text-2xl font-bold text-[#FF5722]">Alpha Access</h1>
              <p className="text-gray-700 text-xs">Enter the email you signed up with and your alpha code.</p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 text-center">
                {error}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="the email you signed up with"
                className="bg-[#FFD4C4] border-none h-9 text-gray-800 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Alpha Code</label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="GS-XXXX-XXXX"
                className="bg-[#FFD4C4] border-none h-9 text-gray-800 text-sm font-mono tracking-wider"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={loading || !email || !code}
              className="w-full bg-[#FF5722] hover:bg-[#FF6B3D] text-white h-9 rounded-full text-sm font-bold disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Enter the Kitchen"}
            </Button>
          </div>
        </div>
        <p className="text-center text-sm text-white drop-shadow-md">
          Already have an account?{" "}
          <Link to="/Login" className="text-[#37F2D1] font-semibold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
