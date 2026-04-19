import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Download, Search, AlertTriangle, Ban, ShieldOff, Trash2, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";
import { TIERS } from "@/api/billingClient";
import { downloadCsv } from "@/utils/csv";
import { setStorageOverride } from "@/utils/campaignLifecycle";
import { PanelCard, EmptyState } from "./adminShared";

const DAY_MS = 24 * 60 * 60 * 1000;

export default function UsersTab({ adminId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, payload }
  const [warningMessage, setWarningMessage] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.UserProfile.list(),
    initialData: [],
  });
  const { data: events = [] } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => base44.entities.AnalyticsEvent.list(),
    initialData: [],
  });
  const { data: characters = [] } = useQuery({
    queryKey: ["admin", "characters"],
    queryFn: () => base44.entities.Character.list().catch(() => []),
    initialData: [],
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin", "campaigns"],
    queryFn: () => base44.entities.Campaign.list(),
    initialData: [],
  });

  const lastActiveByUser = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const t = new Date(e.created_at || e.timestamp || 0).getTime();
      if (!Number.isFinite(t) || !e.user_id) continue;
      if (!map.has(e.user_id) || t > map.get(e.user_id)) map.set(e.user_id, t);
    }
    return map;
  }, [events]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let rows = users;
    if (s) {
      rows = users.filter((u) =>
        (u.username || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        String(u.user_id || u.id || "").toLowerCase().includes(s)
      );
    }
    return rows.slice().sort((a, b) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      return bt - at;
    });
  }, [users, search]);

  const selected = useMemo(
    () => users.find((u) => (u.user_id || u.id) === selectedId) || null,
    [users, selectedId],
  );

  const selectedCharacters = useMemo(
    () => characters.filter((c) => c.user_id === selectedId || c.created_by === selected?.email),
    [characters, selectedId, selected],
  );
  const selectedCampaigns = useMemo(
    () => campaigns.filter((c) =>
      c.game_master_id === selectedId ||
      (Array.isArray(c.player_ids) && c.player_ids.includes(selectedId)) ||
      (Array.isArray(c.co_dm_ids) && c.co_dm_ids.includes(selectedId))
    ),
    [campaigns, selectedId],
  );
  const selectedEvents = useMemo(
    () => events
      .filter((e) => e.user_id === selectedId)
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 25),
    [events, selectedId],
  );

  const logAction = async (action_type, target_id, details = {}) => {
    try {
      await base44.entities.AdminAction.create({
        admin_id: adminId,
        action_type,
        target_type: "user",
        target_id,
        details,
      });
    } catch (err) {
      console.error("Admin action log failed:", err);
    }
  };

  const warnMutation = useMutation({
    mutationFn: async ({ userId, message }) => {
      const profile = users.find((u) => (u.user_id || u.id) === userId);
      const warnings = Array.isArray(profile?.warnings) ? profile.warnings : [];
      const next = [...warnings, { message, at: new Date().toISOString(), by: adminId }];
      await base44.entities.UserProfile.update(profile.id, { warnings: next });
      await logAction("warn_user", userId, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Warning sent");
      setConfirm(null);
      setWarningMessage("");
    },
    onError: (err) => toast.error(err?.message || "Failed to warn user"),
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, ban }) => {
      const profile = users.find((u) => (u.user_id || u.id) === userId);
      await base44.entities.UserProfile.update(profile.id, {
        account_status: ban ? "banned" : "active",
        banned_at: ban ? new Date().toISOString() : null,
      });
      await logAction(ban ? "ban_user" : "unban_user", userId);
    },
    onSuccess: (_, { ban }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(ban ? "User banned" : "User unbanned");
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.message || "Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ userId }) => {
      const profile = users.find((u) => (u.user_id || u.id) === userId);
      await base44.entities.UserProfile.update(profile.id, {
        account_status: "deleted",
        deleted_at: new Date().toISOString(),
      });
      await logAction("delete_user", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Account marked deleted");
      setSelectedId(null);
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.message || "Delete failed"),
  });

  const handleExport = () => {
    const rows = filtered.map((u) => {
      const uid = u.user_id || u.id;
      const last = lastActiveByUser.get(uid);
      return {
        user_id: uid,
        username: u.username || "",
        email: u.email || "",
        tier: u.subscription_tier || "free",
        status: u.account_status || "active",
        signed_up: u.created_at || "",
        last_active: last ? new Date(last).toISOString() : "",
      };
    });
    downloadCsv("admin_users", rows, ["user_id","username","email","tier","status","signed_up","last_active"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Users</h2>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, email, id…"
              className="pl-7 bg-[#0b1220] border-slate-700 text-white"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-4">
        <PanelCard className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState label="No users match." />
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500 sticky top-0 bg-[#1E2430]">
                  <tr>
                    <th className="text-left py-2 px-2">User</th>
                    <th className="text-left py-2 px-2">Tier</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Joined</th>
                    <th className="text-left py-2 px-2">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const uid = u.user_id || u.id;
                    const last = lastActiveByUser.get(uid);
                    const status = u.account_status || "active";
                    const isActive = uid === selectedId;
                    return (
                      <tr
                        key={uid}
                        onClick={() => setSelectedId(uid)}
                        className={`border-t border-[#2A3441] cursor-pointer hover:bg-[#0b1220] ${isActive ? "bg-[#0b1220]" : ""}`}
                      >
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-700" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-white text-xs font-bold">{u.username || "—"}</span>
                              <span className="text-[10px] text-slate-500">{u.email || ""}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                            {TIERS[u.subscription_tier]?.name || "Free"}
                          </Badge>
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-[10px] uppercase font-bold ${
                            status === "banned" ? "text-red-400" :
                            status === "deleted" ? "text-slate-500" :
                            "text-emerald-400"
                          }`}>{status}</span>
                        </td>
                        <td className="py-2 px-2 text-[11px] text-slate-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2 px-2 text-[11px] text-slate-400">
                          {last ? formatRelative(last) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>

        <UserDetailPanel
          user={selected}
          onClose={() => setSelectedId(null)}
          characters={selectedCharacters}
          campaigns={selectedCampaigns}
          events={selectedEvents}
          onWarn={() => setConfirm({ type: "warn", userId: selectedId })}
          onBan={() => setConfirm({ type: selected?.account_status === "banned" ? "unban" : "ban", userId: selectedId })}
          onDelete={() => setConfirm({ type: "delete", userId: selectedId })}
        />
      </div>

      <AlertDialog open={confirm?.type === "warn"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-[#1E2430] border-[#2A3441]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Send warning</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The user will see this message in their notifications. The action is logged to admin_actions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Be specific about what rule was broken and what you expect them to do."
            rows={4}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!warningMessage.trim() || warnMutation.isPending}
              onClick={() => warnMutation.mutate({ userId: confirm.userId, message: warningMessage.trim() })}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              Send Warning
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm?.type === "ban" || confirm?.type === "unban"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-[#1E2430] border-[#2A3441]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirm?.type === "ban" ? "Ban this user?" : "Unban this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {confirm?.type === "ban"
                ? "They will be locked out of the app immediately. The action is logged."
                : "They'll regain access on their next login."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={banMutation.isPending}
              onClick={() => banMutation.mutate({ userId: confirm.userId, ban: confirm.type === "ban" })}
              className={confirm?.type === "ban" ? "bg-red-500 hover:bg-red-400 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-black"}
            >
              {confirm?.type === "ban" ? "Ban User" : "Unban User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm?.type === "delete"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-[#1E2430] border-[#2A3441]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this account?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The profile will be marked deleted. This is logged and reversible from the database, but the
              user will lose access immediately. Data is not erased — pair with a GDPR export if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ userId: confirm.userId })}
              className="bg-red-500 hover:bg-red-400 text-white"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserDetailPanel({ user, onClose, characters, campaigns, events, onWarn, onBan, onDelete }) {
  if (!user) {
    return (
      <PanelCard title="Detail">
        <EmptyState label="Select a user from the list." />
      </PanelCard>
    );
  }
  const tier = TIERS[user.subscription_tier] || TIERS.free;
  const warnings = Array.isArray(user.warnings) ? user.warnings : [];
  return (
    <PanelCard
      title={user.username || "User"}
      action={
        <button onClick={onClose} className="text-slate-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      }
    >
      <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-700" />
          )}
          <div>
            <div className="text-white font-bold">{user.username || "—"}</div>
            <div className="text-[11px] text-slate-400">{user.email || ""}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{user.user_id || user.id}</div>
          </div>
        </div>

        <DetailSection label="Subscription">
          <div className="flex items-center justify-between">
            <Badge className="text-[10px]" style={{ backgroundColor: `${tier.badgeColor}33`, color: tier.badgeColor, borderColor: `${tier.badgeColor}66` }}>
              {tier.badgeIcon} {tier.name}
            </Badge>
            <span className="text-[11px] text-slate-400">{tier.priceLabel}</span>
          </div>
        </DetailSection>

        <StorageSection user={user} campaigns={campaigns} />

        <DetailSection label={`Characters (${characters.length})`}>
          {characters.length === 0 ? (
            <p className="text-xs text-slate-500">None.</p>
          ) : (
            <ul className="space-y-1">
              {characters.slice(0, 8).map((c) => (
                <li key={c.id} className="text-xs text-slate-300 flex justify-between">
                  <span>{c.name || "Unnamed"}</span>
                  <span className="text-slate-500">{[c.race, c.class].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection label={`Campaigns (${campaigns.length})`}>
          {campaigns.length === 0 ? (
            <p className="text-xs text-slate-500">None.</p>
          ) : (
            <ul className="space-y-1">
              {campaigns.slice(0, 8).map((c) => (
                <li key={c.id} className="text-xs text-slate-300 flex justify-between">
                  <span>{c.title || c.name}</span>
                  <span className="text-slate-500">
                    {c.game_master_id === (user.user_id || user.id) ? "GM" : "Player"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection label={`Recent activity (${events.length})`}>
          {events.length === 0 ? (
            <p className="text-xs text-slate-500">No events.</p>
          ) : (
            <ul className="space-y-1">
              {events.map((e) => (
                <li key={e.id} className="text-[11px] text-slate-400 flex justify-between gap-2">
                  <span className="text-slate-300 truncate">{e.event_type}</span>
                  <span className="text-slate-500 shrink-0">{new Date(e.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection label={`Warnings (${warnings.length})`}>
          {warnings.length === 0 ? (
            <p className="text-xs text-slate-500">No warnings.</p>
          ) : (
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-[11px] text-amber-300 border-l-2 border-amber-500 pl-2">
                  <div>{w.message}</div>
                  <div className="text-slate-500">{new Date(w.at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onWarn} className="text-amber-400 border-amber-700">
            <AlertTriangle className="w-3 h-3 mr-1" /> Warn
          </Button>
          {user.account_status === "banned" ? (
            <Button size="sm" variant="outline" onClick={onBan} className="text-emerald-400 border-emerald-700">
              <ShieldOff className="w-3 h-3 mr-1" /> Unban
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onBan} className="text-red-400 border-red-700">
              <Ban className="w-3 h-3 mr-1" /> Ban
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onDelete} className="col-span-2 text-red-400 border-red-700">
            <Trash2 className="w-3 h-3 mr-1" /> Delete Account
          </Button>
        </div>
      </div>
    </PanelCard>
  );
}

function DetailSection({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{label}</div>
      {children}
    </div>
  );
}

function formatRelative(ms) {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / DAY_MS)}d ago`;
}

// Storage usage + per-user override. The override stored in
// user_profiles.storage_limit_override_bytes wins over the tier
// default when set; clearing it falls back to the tier limit.
function StorageSection({ user, campaigns }) {
  const uid = user?.user_id || user?.id;
  const queryClient = useQueryClient();
  const [overrideMB, setOverrideMB] = React.useState(
    user?.storage_limit_override_bytes
      ? Math.round(user.storage_limit_override_bytes / (1024 * 1024))
      : "",
  );

  const tier = TIERS[user?.subscription_tier] || TIERS.free;
  const tierLimit = tier.limits.userStorageBytes || 0;
  const effectiveLimit =
    user?.storage_limit_override_bytes
    || user?.storage_limit_bytes
    || tierLimit
    || 1;
  const used = user?.storage_used_bytes || 0;
  const pct = Math.min(100, Math.round((used / effectiveLimit) * 100));
  const usedMB = (used / (1024 * 1024)).toFixed(1);
  const limitMB = (effectiveLimit / (1024 * 1024)).toFixed(0);
  const tierMB = (tierLimit / (1024 * 1024)).toFixed(0);

  const ownedCampaigns = campaigns.filter((c) => c.game_master_id === uid);

  const applyOverride = async () => {
    const bytes = overrideMB === "" ? null : Number(overrideMB) * 1024 * 1024;
    await setStorageOverride(uid, bytes);
    queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
  };

  return (
    <DetailSection label="Storage">
      <div className="bg-[#050816] rounded-lg p-3 border border-slate-700/30 space-y-3">
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Personal storage</p>
            <p className="text-white font-bold text-sm">{usedMB} MB / {limitMB} MB</p>
          </div>
          <div className="w-full bg-slate-700/30 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-400" : "bg-[#37F2D1]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Tier default: {tierMB} MB{user?.storage_limit_override_bytes ? " · override active" : ""}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">
              Override limit (MB)
            </label>
            <Input
              type="number"
              min={0}
              value={overrideMB}
              onChange={(e) => setOverrideMB(e.target.value)}
              placeholder="Empty = tier default"
              className="bg-[#0f1219] border-slate-700 text-white text-xs h-8"
            />
          </div>
          <Button
            onClick={applyOverride}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold h-8"
          >
            {overrideMB === "" ? "Clear" : "Apply"}
          </Button>
        </div>

        {ownedCampaigns.length > 0 && (
          <div className="pt-2 border-t border-slate-700/30 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              Owned campaigns ({ownedCampaigns.length})
            </p>
            {ownedCampaigns.map((c) => {
              const mb = ((c.storage_used_bytes || 0) / (1024 * 1024)).toFixed(1);
              return (
                <div key={c.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 truncate">{c.title || c.name || "Untitled"}</span>
                  <span className="text-slate-500">
                    {mb} MB{c.status === "archived" ? " · archived" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DetailSection>
  );
}
