import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, X, Flag, Ban, AlertTriangle, ShieldOff, Check, Trash2, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { downloadCsv } from "@/utils/csv";
import { PanelCard, EmptyState } from "./adminShared";

const STATUS_STYLES = {
  pending:  { label: "Pending",  cls: "bg-amber-500 text-black" },
  resolved: { label: "Resolved", cls: "bg-green-500 text-white" },
  urgent:   { label: "Urgent",   cls: "bg-red-600 text-white" },
};
const RESOLUTION_LABELS = {
  dismissed: "Dismissed",
  warned: "User warned",
  banned: "User banned",
  escalated: "Escalated",
};

export default function ReportsModerationTab({ adminId }) {
  const [sub, setSub] = useState("reports"); // 'reports' | 'content'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Reports &amp; Moderation</h2>
      </div>
      <div className="inline-flex rounded-lg border border-[#2A3441] bg-[#1E2430] p-1">
        <SubTabBtn active={sub === "reports"} onClick={() => setSub("reports")}>
          User Reports
        </SubTabBtn>
        <SubTabBtn active={sub === "content"} onClick={() => setSub("content")}>
          Content Moderation
        </SubTabBtn>
      </div>

      {sub === "reports" ? <ReportsSub adminId={adminId} /> : <ContentSub adminId={adminId} />}
    </div>
  );
}

function SubTabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active ? "bg-[#37F2D1]/15 text-[#37F2D1]" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ───────── shared ──────────────────────────────────────────────────

async function logAdminAction(adminId, action_type, target_type, target_id, details = {}) {
  try {
    await base44.entities.AdminAction.create({
      admin_id: adminId,
      action_type,
      target_type,
      target_id,
      details,
    });
  } catch (err) {
    console.error("admin_actions log failed:", err);
  }
}

// ═════════ A) USER REPORTS ═════════════════════════════════════════

function ReportsSub({ adminId }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [warnDialog, setWarnDialog] = useState(false);
  const [warnMessage, setWarnMessage] = useState("");
  const [confirm, setConfirm] = useState(null); // { type }

  const { data: reports = [] } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => base44.entities.UserReport.list("-created_at").catch(() => []),
    initialData: [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.UserProfile.list().catch(() => []),
    initialData: [],
  });

  const profileMap = useMemo(() => {
    const m = new Map();
    for (const p of profiles) m.set(p.user_id || p.id, p);
    return m;
  }, [profiles]);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) || null,
    [reports, selectedId],
  );
  const reporter = selected ? profileMap.get(selected.reporter_id) : null;
  const reported = selected ? profileMap.get(selected.reported_user_id) : null;

  const setStatusMutation = useMutation({
    mutationFn: async ({ reportId, patch, action_type, details }) => {
      await base44.entities.UserReport.update(reportId, patch);
      await logAdminAction(adminId, action_type, "report", reportId, details);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "adminActions"] });
    },
    onError: (err) => toast.error(err?.message || "Update failed"),
  });

  const dismiss = () => {
    setStatusMutation.mutate({
      reportId: selected.id,
      patch: { status: "resolved", resolution: "dismissed", resolved_at: new Date().toISOString(), resolved_by: adminId },
      action_type: "dismiss_report",
      details: { reported_user_id: selected.reported_user_id, category: selected.category },
    });
    toast.success("Report dismissed");
  };

  const warnUser = async () => {
    if (!warnMessage.trim() || !reported) return;
    const target = reported;
    const warnings = Array.isArray(target.warnings) ? target.warnings : [];
    const next = [...warnings, {
      message: warnMessage.trim(),
      at: new Date().toISOString(),
      by: adminId,
      report_id: selected.id,
    }];
    try {
      await base44.entities.UserProfile.update(target.id, { warnings: next });
      await base44.entities.UserReport.update(selected.id, {
        status: "resolved",
        resolution: "warned",
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      });
      await logAdminAction(adminId, "warn_user_from_report", "user", target.user_id || target.id, {
        report_id: selected.id, message: warnMessage.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "adminActions"] });
      toast.success("User warned");
      setWarnDialog(false);
      setWarnMessage("");
    } catch (err) {
      toast.error(err?.message || "Failed to warn user");
    }
  };

  const banUser = async () => {
    if (!reported) return;
    try {
      await base44.entities.UserProfile.update(reported.id, {
        account_status: "banned",
        banned_at: new Date().toISOString(),
      });
      await base44.entities.UserReport.update(selected.id, {
        status: "resolved",
        resolution: "banned",
        resolved_at: new Date().toISOString(),
        resolved_by: adminId,
      });
      await logAdminAction(adminId, "ban_user_from_report", "user", reported.user_id || reported.id, {
        report_id: selected.id,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "adminActions"] });
      toast.success("User banned");
      setConfirm(null);
    } catch (err) {
      toast.error(err?.message || "Ban failed");
    }
  };

  const escalate = () => {
    setStatusMutation.mutate({
      reportId: selected.id,
      patch: { priority: "urgent" },
      action_type: "escalate_report",
      details: { reported_user_id: selected.reported_user_id, category: selected.category },
    });
    toast.success("Escalated for another admin");
  };

  const handleExport = () => {
    const rows = reports.map((r) => {
      const reporter = profileMap.get(r.reporter_id);
      const target = profileMap.get(r.reported_user_id);
      return {
        id: r.id,
        reporter: reporter?.username || r.reporter_id || "",
        reported_user: target?.username || r.reported_user_id || "",
        category: r.category || "",
        status: r.status || "pending",
        resolution: r.resolution || "",
        priority: r.priority || "normal",
        created_at: r.created_at || "",
      };
    });
    downloadCsv("admin_reports", rows, ["id","reporter","reported_user","category","status","resolution","priority","created_at"]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} className="text-slate-300">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,520px] gap-4">
        <PanelCard className="overflow-hidden">
          {reports.length === 0 ? (
            <EmptyState label="No user reports yet." />
          ) : (
            <div className="max-h-[680px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500 sticky top-0 bg-[#1E2430]">
                  <tr>
                    <th className="text-left py-2 px-2">Reporter</th>
                    <th className="text-left py-2 px-2">Reported User</th>
                    <th className="text-left py-2 px-2">Category</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const reporter = profileMap.get(r.reporter_id);
                    const target = profileMap.get(r.reported_user_id);
                    const isUrgent = r.priority === "urgent" && r.status !== "resolved";
                    const status = isUrgent ? STATUS_STYLES.urgent : (STATUS_STYLES[r.status] || STATUS_STYLES.pending);
                    const isActive = selectedId === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`border-t border-[#2A3441] cursor-pointer hover:bg-[#0b1220] ${isActive ? "bg-[#0b1220]" : ""}`}
                      >
                        <td className="py-2 px-2 text-xs text-slate-300">{reporter?.username || r.reporter_id?.slice(0, 8) || "—"}</td>
                        <td className="py-2 px-2 text-xs text-white font-bold">{target?.username || r.reported_user_id?.slice(0, 8) || "—"}</td>
                        <td className="py-2 px-2 text-[11px] text-slate-300">{r.category}</td>
                        <td className="py-2 px-2"><Badge className={`text-[10px] ${status.cls}`}>{status.label}</Badge></td>
                        <td className="py-2 px-2 text-[11px] text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>

        {!selected ? (
          <PanelCard title="Detail">
            <EmptyState label="Select a report from the list." />
          </PanelCard>
        ) : (
          <PanelCard
            title={`Report: ${selected.category}`}
            action={
              <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            }
          >
            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[10px] ${STATUS_STYLES[selected.status]?.cls || STATUS_STYLES.pending.cls}`}>
                  {STATUS_STYLES[selected.status]?.label || "Pending"}
                </Badge>
                {selected.priority === "urgent" && (
                  <Badge className="text-[10px] bg-red-600 text-white">Urgent</Badge>
                )}
                {selected.resolution && (
                  <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                    {RESOLUTION_LABELS[selected.resolution] || selected.resolution}
                  </Badge>
                )}
                <span className="text-[10px] text-slate-500 ml-auto">{new Date(selected.created_at).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <UserMini label="Reporter" profile={reporter} />
                <UserMini label="Reported" profile={reported} />
              </div>

              {selected.campaign_id && (
                <div className="text-[11px] text-slate-400">
                  <span className="text-slate-500 uppercase tracking-widest font-bold mr-1">Campaign:</span>
                  <span className="font-mono">{selected.campaign_id}</span>
                </div>
              )}

              <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Report Text</div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{selected.description}</p>
              </div>

              {Array.isArray(selected.evidence_urls) && selected.evidence_urls.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Evidence</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.evidence_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" className="rounded-lg border border-slate-700 w-full h-32 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {reported && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                    Reported user's warning history ({(reported.warnings || []).length})
                  </div>
                  {(reported.warnings || []).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">Clean record.</p>
                  ) : (
                    <ul className="space-y-1">
                      {reported.warnings.map((w, i) => (
                        <li key={i} className="text-[11px] text-amber-300 border-l-2 border-amber-500 pl-2">
                          <div>{w.message}</div>
                          <div className="text-slate-500">{new Date(w.at).toLocaleString()}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selected.status !== "resolved" && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                  <Button size="sm" variant="outline" onClick={dismiss} className="text-slate-300">
                    <EyeOff className="w-3 h-3 mr-1" /> Dismiss
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setWarnDialog(true)} className="text-amber-400 border-amber-700">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Warn User
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "ban" })} className="text-red-400 border-red-700">
                    <Ban className="w-3 h-3 mr-1" /> Ban User
                  </Button>
                  <Button size="sm" variant="outline" onClick={escalate} className="text-orange-400 border-orange-700"
                          disabled={selected.priority === "urgent"}>
                    <Flag className="w-3 h-3 mr-1" /> Escalate
                  </Button>
                </div>
              )}
            </div>
          </PanelCard>
        )}
      </div>

      <AlertDialog open={warnDialog} onOpenChange={(o) => !o && setWarnDialog(false)}>
        <AlertDialogContent className="bg-[#1E2430] border-[#2A3441]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Warn this user</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The warning attaches to their profile and the report is marked resolved. Logged to admin_actions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={warnMessage}
            onChange={(e) => setWarnMessage(e.target.value)}
            placeholder="Reference the rule they broke and what should change."
            rows={4}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!warnMessage.trim()}
              onClick={warnUser}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              Send Warning
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm?.type === "ban"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-[#1E2430] border-[#2A3441]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Ban {reported?.username || "this user"}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              They will be locked out immediately and the report marked resolved. Logged to admin_actions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={banUser} className="bg-red-600 hover:bg-red-500 text-white">
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserMini({ label, profile }) {
  return (
    <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-2">
      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">{label}</div>
      {profile ? (
        <div className="flex items-center gap-2">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-700" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white font-bold truncate">{profile.username || "—"}</div>
            <div className="text-[10px] text-slate-500 truncate">{profile.email}</div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-500">User not found</div>
      )}
    </div>
  );
}

// ═════════ B) CONTENT MODERATION ═══════════════════════════════════

function ContentSub({ adminId }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type }
  const [rejectReason, setRejectReason] = useState("");

  const { data: brews = [] } = useQuery({
    queryKey: ["admin", "brews"],
    queryFn: () => base44.entities.HomebrewRule.list("-created_at").catch(() => []),
    initialData: [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.UserProfile.list().catch(() => []),
    initialData: [],
  });
  const profileMap = useMemo(() => {
    const m = new Map();
    for (const p of profiles) m.set(p.user_id || p.id, p);
    return m;
  }, [profiles]);

  // Items needing review: pending status OR adult content not yet
  // explicitly approved. Anything already approved or rejected stays
  // out of the queue.
  const queue = useMemo(() => {
    return brews.filter((b) => {
      const status = b.moderation_status || (b.is_published ? "pending" : null);
      if (status === "approved" || status === "rejected") return false;
      const isAdult = (b.content_rating || "all_ages") === "18+";
      return status === "pending" || isAdult;
    });
  }, [brews]);

  const selected = useMemo(
    () => brews.find((b) => b.id === selectedId) || null,
    [brews, selectedId],
  );
  const creator = selected ? profileMap.get(selected.creator_id) : null;

  const updateMutation = useMutation({
    mutationFn: async ({ patch, action_type, details }) => {
      await base44.entities.HomebrewRule.update(selected.id, patch);
      await logAdminAction(adminId, action_type, "homebrew", selected.id, details);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "brews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "adminActions"] });
      queryClient.invalidateQueries({ queryKey: ["brewery"] });
    },
    onError: (err) => toast.error(err?.message || "Update failed"),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.HomebrewRule.delete(selected.id);
      await logAdminAction(adminId, "remove_homebrew", "homebrew", selected.id, {
        title: selected.title, creator_id: selected.creator_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "brews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "adminActions"] });
      queryClient.invalidateQueries({ queryKey: ["brewery"] });
      toast.success("Homebrew removed");
      setSelectedId(null);
      setConfirm(null);
    },
    onError: (err) => toast.error(err?.message || "Remove failed"),
  });

  const approve = () => {
    updateMutation.mutate({
      patch: { moderation_status: "approved", moderated_at: new Date().toISOString(), moderated_by: adminId },
      action_type: "approve_homebrew",
      details: { title: selected.title, creator_id: selected.creator_id },
    });
    toast.success("Approved");
  };

  const reject = async () => {
    await updateMutation.mutateAsync({
      patch: {
        moderation_status: "rejected",
        moderated_at: new Date().toISOString(),
        moderated_by: adminId,
        rejection_reason: rejectReason.trim() || null,
        is_published: false,
      },
      action_type: "reject_homebrew",
      details: { title: selected.title, creator_id: selected.creator_id, reason: rejectReason.trim() || null },
    });

    // Notify the creator with a support ticket so they have a record
    // and can ask follow-up questions through the existing support
    // thread UI rather than us having to build a parallel inbox.
    if (selected.creator_id) {
      try {
        await base44.entities.SupportTicket.create({
          user_id: selected.creator_id,
          category: "Content Report",
          subject: `Homebrew rejected: ${selected.title}`,
          description: `Your homebrew "${selected.title}" was rejected by moderation.\n\nReason: ${rejectReason.trim() || "Policy violation."}`,
          status: "open",
          priority: "normal",
          admin_notes: `Auto-created from content moderation by admin ${adminId}.`,
        });
      } catch (err) {
        console.error("Failed to notify creator:", err);
      }
    }

    toast.success("Rejected — creator notified");
    setRejectReason("");
    setConfirm(null);
  };

  const flag18 = () => {
    updateMutation.mutate({
      patch: { content_rating: "18+", flagged_at: new Date().toISOString(), flagged_by: adminId },
      action_type: "flag_homebrew_18plus",
      details: { title: selected.title, previous_rating: selected.content_rating || "all_ages" },
    });
    toast.success("Flagged as 18+");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,520px] gap-4">
        <PanelCard className="overflow-hidden">
          {queue.length === 0 ? (
            <EmptyState label="Nothing in the moderation queue." />
          ) : (
            <div className="max-h-[680px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest text-slate-500 sticky top-0 bg-[#1E2430]">
                  <tr>
                    <th className="text-left py-2 px-2">Cover</th>
                    <th className="text-left py-2 px-2">Title</th>
                    <th className="text-left py-2 px-2">Creator</th>
                    <th className="text-left py-2 px-2">Category</th>
                    <th className="text-left py-2 px-2">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((b) => {
                    const creator = profileMap.get(b.creator_id);
                    const isAdult = (b.content_rating || "all_ages") === "18+";
                    const isActive = selectedId === b.id;
                    return (
                      <tr
                        key={b.id}
                        onClick={() => setSelectedId(b.id)}
                        className={`border-t border-[#2A3441] cursor-pointer hover:bg-[#0b1220] ${isActive ? "bg-[#0b1220]" : ""}`}
                      >
                        <td className="py-2 px-2">
                          {b.cover_image_url ? (
                            <img src={b.cover_image_url} className="w-12 h-12 rounded object-cover" alt="" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-slate-700" />
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs text-white font-bold max-w-xs truncate">{b.title}</td>
                        <td className="py-2 px-2 text-[11px] text-slate-300">{creator?.username || b.creator_id?.slice(0, 8) || "—"}</td>
                        <td className="py-2 px-2 text-[11px] text-slate-400">{b.category}</td>
                        <td className="py-2 px-2">
                          <Badge className={`text-[10px] ${isAdult ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                            {isAdult ? "18+" : "All Ages"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelCard>

        {!selected ? (
          <PanelCard title="Review">
            <EmptyState label="Pick an item to review." />
          </PanelCard>
        ) : (
          <PanelCard
            title={selected.title}
            action={
              <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            }
          >
            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {selected.cover_image_url && (
                <img src={selected.cover_image_url} alt="" className="w-full max-h-72 object-cover rounded-lg border border-slate-700" />
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">{selected.category}</Badge>
                <Badge className={`text-[10px] ${(selected.content_rating || "all_ages") === "18+" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                  {(selected.content_rating || "all_ages") === "18+" ? "18+" : "All Ages"}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">v{selected.version || "1.0.0"}</Badge>
                <span className="text-[10px] text-slate-500 ml-auto">{new Date(selected.created_at).toLocaleString()}</span>
              </div>

              {creator && (
                <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-2 flex items-center gap-2">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Creator</div>
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-700" />
                  )}
                  <span className="text-xs text-white font-bold">{creator.username || "—"}</span>
                  <span className="text-[10px] text-slate-500 ml-auto truncate">{creator.email}</span>
                </div>
              )}

              <div className="bg-[#0b1220] border border-slate-700 rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Description</div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{selected.description}</p>
              </div>

              {selected.modifications && (
                <details className="bg-[#0b1220] border border-slate-700 rounded-lg p-3">
                  <summary className="text-[10px] uppercase tracking-widest text-slate-500 font-bold cursor-pointer">
                    Raw Modifications
                  </summary>
                  <pre className="mt-2 text-[10px] text-slate-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(selected.modifications, null, 2)}
                  </pre>
                </details>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                <Button size="sm" onClick={approve} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "reject" })} className="text-red-400 border-red-700">
                  <X className="w-3 h-3 mr-1" /> Reject
                </Button>
                <Button size="sm" variant="outline" onClick={flag18} className="text-amber-400 border-amber-700"
                        disabled={(selected.content_rating || "all_ages") === "18+"}>
                  <ShieldOff className="w-3 h-3 mr-1" /> Flag as 18+
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirm({ type: "remove" })} className="text-red-400 border-red-700">
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            </div>
          </PanelCard>
        )}
      </div>

      <AlertDialog open={confirm?.type === "reject"} onOpenChange={(o) => { if (!o) { setConfirm(null); setRejectReason(""); } }}>
        <AlertDialogContent className="bg-[#1E2430] border-[#2A3441]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reject this homebrew?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The creator gets a support ticket explaining the rejection. The brew is unpublished and logged to admin_actions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain what they need to fix (optional but recommended)."
            rows={4}
            className="bg-[#0b1220] border-slate-700 text-white"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reject} className="bg-red-600 hover:bg-red-500 text-white">
              Reject Homebrew
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm?.type === "remove"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-[#1E2430] border-[#2A3441]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove this homebrew entirely?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Deletes the row from homebrew_rules — only do this for outright policy violations. Logged to admin_actions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete Homebrew
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
