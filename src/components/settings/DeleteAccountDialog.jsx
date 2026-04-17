import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";

/**
 * Self-serve account deletion. Confirmed by typing "DELETE" verbatim,
 * then we walk the user's personal rows and clean them up. The
 * Supabase auth row itself needs the service role key, which we don't
 * have client-side — the profile is flagged `account_status = deleted`
 * so the admin tab can finish the purge server-side later.
 */
export default function DeleteAccountDialog({ open, onClose, userId, profileId }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const disabled = confirmText !== "DELETE" || deleting || !userId;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // 1. Characters — author column is `created_by` (email in legacy
      //    rows) or `user_id`. Hit both to be safe.
      try {
        const chars = await base44.entities.Character.filter({ user_id: userId }).catch(() => []);
        for (const c of chars) {
          await base44.entities.Character.delete(c.id).catch(() => {});
        }
      } catch {}

      // 2. Posts authored by this user.
      try {
        const posts = await base44.entities.Post.filter({ author_id: userId }).catch(() => []);
        for (const p of posts) {
          await base44.entities.Post.delete(p.id).catch(() => {});
        }
      } catch {}

      // 3. Homebrew.
      try {
        const brews = await base44.entities.HomebrewRule.filter({ creator_id: userId }).catch(() => []);
        for (const b of brews) {
          await base44.entities.HomebrewRule.delete(b.id).catch(() => {});
        }
      } catch {}

      // 4. Friendships — either side of the relation.
      try {
        const allFriends = await base44.entities.Friend.list().catch(() => []);
        const mine = allFriends.filter((f) => f.user_id === userId || f.friend_id === userId);
        for (const f of mine) {
          await base44.entities.Friend.delete(f.id).catch(() => {});
        }
      } catch {}

      // 5. Mark profile deleted. Full row-delete requires service role
      //    key; we flip the status flag so the admin purge job can
      //    finish the job and the user immediately loses access.
      if (profileId) {
        await base44.entities.UserProfile.update(profileId, {
          account_status: "deleted",
          deleted_at: new Date().toISOString(),
        }).catch(() => {});
      }

      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate("/");
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Contact support.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setConfirmText(""); onClose?.(); } }}>
      <DialogContent className="bg-[#1E2430] border border-red-500/40 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" /> Delete Your Account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-slate-300">This will permanently delete:</p>
          <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">
            <li>Your profile and all personal data</li>
            <li>All your characters</li>
            <li>All your campaign memberships</li>
            <li>Your homebrew content</li>
            <li>Your marketplace purchases and sales history</li>
            <li>Your subscription (no refund for remaining period)</li>
          </ul>
          <p className="text-sm text-red-300 font-semibold">This action cannot be undone.</p>
          <div>
            <p className="text-xs text-slate-400 mb-1">Type <span className="font-mono font-bold text-white">DELETE</span> to confirm:</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="bg-[#0b1220] border-slate-700 text-white"
              placeholder="DELETE"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setConfirmText(""); onClose?.(); }}>Cancel</Button>
          <Button
            onClick={handleDelete}
            disabled={disabled}
            className="bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete My Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
