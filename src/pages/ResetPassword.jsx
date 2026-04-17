import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";

/**
 * Handles the Supabase password-reset callback. The user lands here
 * with a recovery session (Supabase sets it from the URL fragment),
 * enters a new password, and we call updateUser({ password }). On
 * success we sign them out so they log in fresh with the new pass.
 */
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Wait for Supabase to surface the recovery session from the URL
  // fragment before enabling the form — otherwise updateUser fails
  // with "Auth session missing".
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  const handleReset = async () => {
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated! Redirecting to login…");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      toast.error(err?.message || "Failed to update password. The link may have expired.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1219] flex items-center justify-center px-4">
      <div className="bg-[#1a1f2e] border border-[#2A3441] rounded-xl p-8 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-white">Set a new password</h1>
        {!ready && (
          <p className="text-sm text-amber-400">
            Verifying your reset link…
          </p>
        )}
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-[#0f1219] border border-slate-700 rounded-lg text-white"
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full p-3 bg-[#0f1219] border border-slate-700 rounded-lg text-white"
        />
        <button
          onClick={handleReset}
          disabled={!ready || saving || !password || !confirm}
          className="w-full py-3 bg-[#37F2D1] text-[#1E2430] font-semibold rounded-lg hover:bg-[#2dd9bd] disabled:opacity-50"
        >
          {saving ? "Updating…" : "Update Password"}
        </button>
      </div>
    </div>
  );
}
