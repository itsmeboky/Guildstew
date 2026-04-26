import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check, Copy, Link as LinkIcon, Shield, ShieldOff,
  Trash2, UserMinus, Image as ImageIcon, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import { guildRemove } from "@/api/billingClient";
import { displayName, displayInitial } from "@/utils/displayName";

/**
 * Leader-only settings panel for the Guild Hall.
 *
 * Surfaces every guild-level knob in one tabbed dialog:
 *   - General: name, crest placeholder
 *   - Permissions: spending-restricted toggle (mirrored to the wallet row)
 *   - Invites: share link/code
 *   - Members: promote/demote to Officer, remove
 *   - Danger zone: disband (requires typing the exact guild name)
 *
 * Per-table routing:
 *   - guild_halls         — name, crest, disband
 *   - guild_spice_wallets — spending_restricted toggle
 *   - guild_memberships   — officer promote/demote (role column)
 * Member removal still flows through the existing guildRemove Edge
 * Function.
 */
export default function GuildSettingsDialog({
  open,
  onClose,
  guild,
  guildOwnerId,
  profiles = [],
  inviteCode,
  wallet,
  officerIds = [],
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("general");
  const [name, setName] = useState(guild?.name || "");
  const [spendingRestricted, setSpendingRestricted] = useState(
    wallet?.spending_restricted ?? false,
  );
  const [disbandConfirm, setDisbandConfirm] = useState("");
  const [disbandOpen, setDisbandOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName(guild?.name || "");
      setSpendingRestricted(wallet?.spending_restricted ?? false);
      setDisbandConfirm("");
      setDisbandOpen(false);
    }
  }, [open, guild?.name, wallet?.spending_restricted]);
  const memberRows = useMemo(
    () => profiles.filter((p) => p.user_id !== guildOwnerId),
    [profiles, guildOwnerId],
  );

  const inviteLink = useMemo(() => {
    if (!inviteCode) return "";
    if (typeof window === "undefined") return inviteCode;
    return `${window.location.origin}/guild/join?code=${inviteCode}`;
  }, [inviteCode]);

  // Lazy-insert the guilds row on the first save. maybeSingle + upsert
  // keeps this resilient when the row doesn't exist yet.
  const saveGeneral = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("guild_halls")
        .upsert(
          { owner_user_id: guildOwnerId, name: name.trim() || null },
          { onConflict: "owner_user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guild name saved.");
      queryClient.invalidateQueries({ queryKey: ["guildRow", guildOwnerId] });
    },
    onError: (err) => toast.error(err.message || "Save failed"),
  });

  const savePermissions = useMutation({
    mutationFn: async (nextRestricted) => {
      // The spending flag is a wallet concern — guild_spice_wallets
      // is the source of truth; the Tavern checkout already reads
      // from there. No mirror onto guild_halls.
      const { error: walletErr } = await supabase
        .from("guild_spice_wallets")
        .update({ spending_restricted: nextRestricted })
        .eq("guild_id", guildOwnerId);
      if (walletErr) throw walletErr;
    },
    onSuccess: () => {
      toast.success("Spending permissions updated.");
      queryClient.invalidateQueries({ queryKey: ["guildSpiceWallet", guildOwnerId] });
    },
    onError: (err) => toast.error(err.message || "Update failed"),
  });

  const toggleOfficer = useMutation({
    mutationFn: async (userId) => {
      // Officer is a per-membership role, not a guild-level array —
      // flip the row's `role` between 'officer' and 'member' on
      // guild_memberships. Keying join on guild_id == owner_user_id
      // matches the guild_spice_wallets convention used elsewhere.
      const isOfficer = officerIds.includes(userId);
      const nextRole = isOfficer ? "member" : "officer";
      const { error } = await supabase
        .from("guild_memberships")
        .update({ role: nextRole })
        .eq("guild_id", guildOwnerId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guildMembershipsRoles", guildOwnerId] });
    },
    onError: (err) => toast.error(err.message || "Failed"),
  });

  const removeMember = useMutation({
    mutationFn: async (userId) => {
      await guildRemove({ owner_user_id: guildOwnerId, member_user_id: userId });
    },
    onSuccess: () => {
      toast.success("Member removed.");
      queryClient.invalidateQueries({ queryKey: ["guildMembers", guildOwnerId] });
      queryClient.invalidateQueries({ queryKey: ["guildMemberProfiles"] });
    },
    onError: (err) => toast.error(err.message || "Failed to remove"),
  });

  const disbandGuild = useMutation({
    mutationFn: async () => {
      // No server-side "disband" endpoint yet — deleting the
      // guild_halls row removes the settings, and the leader can
      // cancel the Guild-tier subscription to clear memberships.
      // Call out the billing step in the toast so the UI doesn't
      // pretend it's fully undone.
      const { error } = await supabase.from("guild_halls").delete().eq("owner_user_id", guildOwnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Guild settings cleared. Cancel the Guild subscription in Billing to finish disbanding.");
      queryClient.invalidateQueries({ queryKey: ["guildRow", guildOwnerId] });
      setDisbandOpen(false);
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to disband"),
  });

  const copyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — paste manually from the field.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0b1324] border border-amber-500/40 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="text-2xl text-amber-200"
            style={{ fontFamily: "'Cinzel', 'Cream', Georgia, serif" }}
          >
            Guild Settings
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Leader-only controls for {guild?.name || "your guild"}.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 -mx-6 px-6 gap-1 flex-wrap">
          {[
            { id: "general", label: "General" },
            { id: "permissions", label: "Permissions" },
            { id: "invites", label: "Invites" },
            { id: "members", label: "Members" },
            { id: "danger", label: "Danger Zone" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${
                tab === t.id
                  ? "text-amber-200 border-b-2 border-amber-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pt-4">
          {tab === "general" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-300 mb-1 block">
                  Guild Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={48}
                  placeholder="The Mithril Compass"
                  className="bg-[#050816] border-slate-700 text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">Up to 48 characters.</p>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-300 mb-1 block">
                  Guild Crest
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border-2 border-amber-500/40 bg-[#050816] flex items-center justify-center overflow-hidden">
                    {guild?.crest_url ? (
                      <img src={guild.crest_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-amber-400/70" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    disabled
                    title="Crest builder lands in a later task"
                    className="border-amber-500/40 text-amber-200"
                  >
                    Edit Crest
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Full crest builder lands in a later task.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => saveGeneral.mutate()}
                  disabled={saveGeneral.isPending}
                  className="bg-amber-500 hover:bg-amber-400 text-[#050816] font-black"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {tab === "permissions" && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-700 bg-[#050816]">
                <div>
                  <p className="text-sm font-black text-white flex items-center gap-2">
                    {spendingRestricted ? (
                      <ShieldOff className="w-4 h-4 text-amber-300" />
                    ) : (
                      <Shield className="w-4 h-4 text-emerald-300" />
                    )}
                    Leader-only spending
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    When enabled, only you can spend from the shared Spice wallet. Members still benefit from Tavern items bought with guild Spice.
                  </p>
                </div>
                <Switch
                  checked={spendingRestricted}
                  onCheckedChange={(v) => {
                    setSpendingRestricted(v);
                    savePermissions.mutate(v);
                  }}
                  disabled={savePermissions.isPending}
                />
              </div>
            </div>
          )}

          {tab === "invites" && (
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-300 block">
                Invite Link
              </label>
              {inviteCode ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="bg-[#050816] border-slate-700 text-white font-mono text-xs"
                    />
                    <Button
                      onClick={copyInvite}
                      variant="outline"
                      className="border-amber-500/40 text-amber-200 flex-shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <LinkIcon className="w-3 h-3" />
                    Share with up to 5 friends. Invites expire after 7 days of inactivity.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400 bg-[#050816] border border-slate-700 rounded p-3">
                  No invite code set yet. Invites are currently sent one-by-one from the Billing page — the shareable code is coming.
                </p>
              )}
            </div>
          )}

          {tab === "members" && (
            <div className="space-y-2">
              {memberRows.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No members to manage yet — invite some friends first.
                </p>
              ) : (
                memberRows.map((p) => {
                  const isOfficer = officerIds.includes(p.user_id);
                  return (
                    <div
                      key={p.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-slate-700 bg-[#050816]"
                    >
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-black text-slate-200">
                          {displayInitial(p)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {displayName(p, { fallback: "Member" })}
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
                          {isOfficer ? "Officer" : "Member"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleOfficer.mutate(p.user_id)}
                        disabled={toggleOfficer.isPending}
                        className="border-blue-500/40 text-blue-200 hover:bg-blue-500/15"
                      >
                        {isOfficer ? "Demote" : "Promote"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMember.mutate(p.user_id)}
                        disabled={removeMember.isPending}
                        className="border-rose-500/40 text-rose-200 hover:bg-rose-500/15"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "danger" && (
            <div>
              <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-4">
                <p className="text-sm font-black text-rose-200 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Disband Guild
                </p>
                <p className="text-xs text-rose-100/80 mt-1">
                  Clears all guild settings, officer roles, and the crest. Members stay on their
                  current billing period — cancel the Guild subscription in Billing to finish the process.
                </p>
                {!disbandOpen ? (
                  <Button
                    variant="outline"
                    onClick={() => setDisbandOpen(true)}
                    className="border-rose-500 text-rose-200 hover:bg-rose-500/20 mt-3"
                  >
                    I understand — start disband
                  </Button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-rose-100">
                      Type <strong>{guild?.name || "your guild's name"}</strong> to confirm:
                    </p>
                    <Input
                      value={disbandConfirm}
                      onChange={(e) => setDisbandConfirm(e.target.value)}
                      placeholder={guild?.name || ""}
                      className="bg-[#050816] border-rose-500/40 text-white"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => disbandGuild.mutate()}
                        disabled={
                          disbandGuild.isPending ||
                          !guild?.name ||
                          disbandConfirm.trim() !== guild.name.trim()
                        }
                        className="bg-rose-600 hover:bg-rose-500 text-white flex-1"
                      >
                        Disband Guild
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDisbandOpen(false);
                          setDisbandConfirm("");
                        }}
                        className="border-slate-600 text-slate-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
