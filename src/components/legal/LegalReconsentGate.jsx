import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { CURRENT_TOS_VERSION } from "@/pages/Landing";

/**
 * Full-screen blocker that shows when a signed-in user's
 * `tos_version` is older than CURRENT_TOS_VERSION. Accepting
 * stamps the new version + timestamp on user_profiles and
 * dismisses the gate. Cannot be skipped — the rest of the app
 * doesn't render until the user accepts.
 *
 * Mounted from App.jsx between AuthProvider and the routes.
 */
export default function LegalReconsentGate({ children }) {
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // user.profile_id is set by AuthContext's mergedUser. If we
  // don't have a profile yet (initial fetch in flight) just let
  // the app render — we'll re-check on the next render.
  const profileId = user?.profile_id;
  const storedVersion = user?.tos_version;
  const needsConsent = !!user?.id && !!profileId && storedVersion !== CURRENT_TOS_VERSION;

  if (!needsConsent || dismissed) return children;

  const accept = async () => {
    setSubmitting(true);
    try {
      await supabase.from("user_profiles").update({
        tos_version: CURRENT_TOS_VERSION,
        tos_accepted_at: new Date().toISOString(),
      }).eq("id", profileId);
      setDismissed(true);
      // Soft refresh so AuthContext re-fetches the merged profile.
      window.location.reload();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-[#0f1219]/95 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-[#1a1f2e] border border-[#37F2D1]/40 rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-[#37F2D1]" />
          <div>
            <h2 className="text-xl font-bold text-white">We've updated our policies</h2>
            <p className="text-xs text-slate-400">Please review the changes before continuing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <Link
            to="/Privacy"
            target="_blank"
            className="text-center bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            View Privacy Policy
          </Link>
          <Link
            to="/Terms"
            target="_blank"
            className="text-center bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            View Terms
          </Link>
          <Link
            to="/EULA"
            target="_blank"
            className="text-center bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            View EULA
          </Link>
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-300 mb-4">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-1" />
          <span>I have reviewed and agree to the updated policies.</span>
        </label>

        <Button
          onClick={accept}
          disabled={!agreed || submitting}
          className="w-full bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          {submitting ? "Saving…" : "I Accept"}
        </Button>
      </div>
    </div>
  );
}
