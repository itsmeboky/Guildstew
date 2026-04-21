import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Trash2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { patchSettingsDomain, getUserSettings } from "@/lib/userSettings";
import { Row, SectionHeader } from "@/pages/Settings";

/**
 * Settings → Privacy & Security.
 *
 * Profile-visibility + online-status toggles persist to
 * `settings.privacy` (same pattern as every other tab). Data
 * downloads are stubbed — shown for GDPR optics; the actual export
 * pipeline lands later. Account deletion funnels into the support
 * ticket queue with category 'account' so an admin can run the
 * delete flow + confirmations before anything is destructive.
 */
export default function PrivacyTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: state = { settings: {} } } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: () => getUserSettings(user.id),
    enabled: !!user?.id,
  });
  const privacy = state.settings.privacy || {};

  const save = useMutation({
    mutationFn: (patch) => patchSettingsDomain(user.id, "privacy", patch),
    onSuccess: () => {
      toast.success("Saved", { duration: 1200 });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
    },
  });

  return (
    <>
      <SectionHeader title="Visibility" subtitle="Who can see you and your content." />

      <Row
        label="Profile visibility"
        description="Public lets anyone find your profile. Friends-only limits it to people you've added. Private hides it entirely."
      >
        <Select
          value={privacy.profileVisibility || "public"}
          onValueChange={(v) => save.mutate({ profileVisibility: v })}
        >
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="friends">Friends Only</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row
        label="Show online status to friends"
        description="Friends see your green / away / offline dot."
      >
        <Switch
          checked={privacy.showOnlineFriends !== false}
          onCheckedChange={(v) => save.mutate({ showOnlineFriends: v })}
        />
      </Row>

      <Row
        label="Show online status to everyone"
        description="Your status is visible to anyone viewing your profile, not just friends."
      >
        <Switch
          checked={!!privacy.showOnlineEveryone}
          onCheckedChange={(v) => save.mutate({ showOnlineEveryone: v })}
        />
      </Row>

      <SectionHeader title="Data" subtitle="Export or delete your Guildstew account." />

      <Row
        label="Download my data"
        description="Export your characters, campaigns, posts, and purchase history. Arrives in JSON / CSV."
      >
        <Button
          variant="outline"
          disabled
          className="opacity-60"
          title="Coming soon"
        >
          <Download className="w-4 h-4 mr-1" /> Coming soon
        </Button>
      </Row>

      <Row
        label="Delete my account"
        description="Opens a support ticket so our team can walk you through the deletion and confirm the identity before anything is removed."
      >
        <Button
          onClick={() => setDeleteOpen(true)}
          variant="outline"
          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-1" /> Request deletion
        </Button>
      </Row>

      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </>
  );
}

function DeleteAccountDialog({ open, onClose }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in first.");
      if (confirmText.trim().toUpperCase() !== "DELETE") {
        throw new Error("Type DELETE to confirm.");
      }
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: "Account Deletion Request",
        description:
          `The account owner has requested deletion from the Settings → Privacy tab.\n\n` +
          `Reason (optional):\n${reason || "(none provided)"}`,
        category: "account",
        priority: "high",
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request submitted — we'll be in touch.");
      setReason("");
      setConfirmText("");
      onClose?.();
    },
    onError: (err) => toast.error(err?.message || "Could not submit."),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Delete my account</DialogTitle>
          <DialogDescription className="text-slate-400">
            This opens a support ticket — your data is NOT deleted yet. A team member will
            confirm with you before anything is removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-300">Tell us why you're leaving (optional)</p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="bg-[#050816] border-slate-700 text-white mt-1"
              placeholder="Not required, but it helps us improve."
            />
          </div>
          <div>
            <p className="text-xs text-slate-300">
              Type <span className="font-mono text-rose-300">DELETE</span> to confirm
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-[#050816] border border-slate-700 rounded text-white font-mono text-sm"
              placeholder="DELETE"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || confirmText.trim().toUpperCase() !== "DELETE"}
            className="bg-rose-500 hover:bg-rose-400 text-white font-bold"
          >
            {submit.isPending ? "Submitting…" : "Submit Deletion Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
