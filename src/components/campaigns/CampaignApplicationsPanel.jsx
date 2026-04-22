import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check, X, Inbox, Clock, ChevronDown, ChevronUp, UserX, UserMinus, MessageSquare, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/api/supabaseClient";
import {
  listPendingApplications, acceptApplication, rejectCharacter, rejectPlayer, MAX_SUBMISSIONS,
} from "@/lib/campaignApplications";
import { displayName, displayInitial } from "@/utils/displayName";
import FullCharacterSheetPreview from "@/components/campaigns/FullCharacterSheetPreview";

/**
 * GM application review surface — renders inside campaign settings.
 *
 * For every pending / rejected-character application, the GM sees
 * the applicant (username + avatar), submission metadata
 * (timestamp, resubmission count, ban-violation warning), the GM's
 * message to the player on a prior round (if any), and an
 * expandable block containing the FULL character sheet so every
 * stat, feature, spell, and item is inspectable without a second
 * click.
 *
 * Three actions — accept, reject character (with required feedback),
 * or reject player outright — route through lib/campaignApplications.
 */
export default function CampaignApplicationsPanel({ campaign, campaignId }) {
  const queryClient = useQueryClient();
  const id = campaignId || campaign?.id;

  const { data: applications = [] } = useQuery({
    queryKey: ["campaignApplications", id],
    queryFn: () => listPendingApplications(id),
    enabled: !!id,
  });

  // Build the set of ids we need profile + character rows for, then
  // batch-fetch both so the review list doesn't N+1.
  const applicantIds = useMemo(
    () => Array.from(new Set(
      applications.map((a) => a.user_id || a.applicant_id).filter(Boolean),
    )),
    [applications],
  );
  const characterIds = useMemo(
    () => Array.from(new Set(applications.map((a) => a.character_id).filter(Boolean))),
    [applications],
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["campaignAppApplicants", applicantIds.sort().join(",")],
    queryFn: async () => {
      if (applicantIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", applicantIds);
      return data || [];
    },
    enabled: applicantIds.length > 0,
  });

  const { data: characters = [] } = useQuery({
    queryKey: ["campaignAppCharacters", characterIds.sort().join(",")],
    queryFn: async () => {
      if (characterIds.length === 0) return [];
      const { data } = await supabase
        .from("characters")
        .select("*")
        .in("id", characterIds);
      return data || [];
    },
    enabled: characterIds.length > 0,
  });

  const profileFor = (uid) => profiles.find((p) => p.user_id === uid) || null;
  const characterFor = (cid) => characters.find((c) => c.id === cid) || null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["campaignApplications", id] });
    queryClient.invalidateQueries({ queryKey: ["userCampaigns"] });
  };

  const accept = useMutation({
    mutationFn: (app) => acceptApplication({ application: app }),
    onSuccess: () => { toast.success("Applicant added to the campaign."); invalidate(); },
    onError: (err) => { console.error(err); toast.error(`Failed to accept: ${err?.message || err}`); },
  });

  // Rejection dialogs are modal so the GM message is explicit — no
  // accidental rejections from a stray click.
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectMode, setRejectMode] = useState(null); // 'character' | 'player'

  const pending = applications.filter((a) => ["pending", "rejected_character"].includes(a.status));

  if (applications.length === 0) return null;

  return (
    <section className="bg-[#1E2430] border border-slate-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Inbox className="w-5 h-5 text-[#37F2D1]" /> Applications
        </h2>
        <p className="text-xs text-slate-500">
          {pending.length} pending
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No pending applications.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((app) => (
            <ApplicationRow
              key={app.id}
              app={app}
              profile={profileFor(app.user_id || app.applicant_id)}
              character={characterFor(app.character_id)}
              onAccept={() => accept.mutate(app)}
              onRejectCharacter={() => { setRejectTarget(app); setRejectMode("character"); }}
              onRejectPlayer={() => { setRejectTarget(app); setRejectMode("player"); }}
              disabled={accept.isPending}
            />
          ))}
        </ul>
      )}

      <RejectDialog
        app={rejectTarget}
        mode={rejectMode}
        onClose={() => { setRejectTarget(null); setRejectMode(null); }}
        onDone={invalidate}
      />
    </section>
  );
}

function ApplicationRow({ app, profile, character, onAccept, onRejectCharacter, onRejectPlayer, disabled }) {
  const [expanded, setExpanded] = useState(false);
  const isResubmission = (app.submission_count || 1) > 1;
  const wasRejectedChar = app.status === "rejected_character";
  const attemptsRemaining = Math.max(0, MAX_SUBMISSIONS - (app.submission_count || 1));
  const hasViolations = Array.isArray(app.ban_violations) && app.ban_violations.length > 0;

  return (
    <li className="bg-[#050816] border border-slate-800 rounded-lg p-3">
      <div className="flex items-start gap-3">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200 flex-shrink-0">
            {displayInitial(profile)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-bold">{displayName(profile, { fallback: "Anonymous" })}</p>
            {isResubmission && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-200 border border-amber-500/40">
                Resubmitted (attempt #{app.submission_count})
              </span>
            )}
            {wasRejectedChar && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/40">
                Awaiting edit
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Applied {new Date(app.created_at).toLocaleString()}
            {attemptsRemaining > 0 && (
              <> · {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining</>
            )}
          </p>
          {app.message && (
            <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
              "{app.message}"
            </p>
          )}
          {app.gm_message && (
            <div className="mt-2 bg-[#1E2430] border border-slate-700 rounded p-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Your last message</p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap mt-0.5">{app.gm_message}</p>
            </div>
          )}
          {hasViolations && (
            <div className="mt-2 bg-rose-500/10 border border-rose-500/40 rounded p-2 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-rose-200">Cached ban violations on this character</p>
                <ul className="text-[10px] text-rose-100 list-disc list-inside">
                  {app.ban_violations.slice(0, 4).map((v, i) => (
                    <li key={i}>{v.type}: {v.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="text-[11px] uppercase tracking-widest font-bold text-slate-400 hover:text-[#37F2D1] flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide character sheet" : "View full character sheet"}
        </button>
        {expanded && (
          <div className="mt-3 bg-[#0b1220] border border-slate-800 rounded p-3 max-h-[60vh] overflow-y-auto">
            <FullCharacterSheetPreview character={character} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={onRejectPlayer}
          disabled={disabled}
          className="border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
        >
          <UserX className="w-3 h-3 mr-1" /> Reject Player
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRejectCharacter}
          disabled={disabled}
          className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
        >
          <UserMinus className="w-3 h-3 mr-1" /> Reject Character, Keep Player
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={disabled}
          className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold"
        >
          <Check className="w-3 h-3 mr-1" /> Accept Player & Character
        </Button>
      </div>
    </li>
  );
}

function RejectDialog({ app, mode, onClose, onDone }) {
  const [message, setMessage] = useState("");
  React.useEffect(() => { setMessage(""); }, [app?.id, mode]);

  const run = useMutation({
    mutationFn: async () => {
      if (mode === "character") {
        return rejectCharacter({ application: app, gmMessage: message });
      }
      return rejectPlayer({ application: app, reason: message });
    },
    onSuccess: (resolution) => {
      if (resolution === "auto_closed") {
        toast.success("Application closed — max attempts reached.");
      } else if (mode === "character") {
        toast.success("Sent — the player can edit and resubmit.");
      } else {
        toast.success("Application declined.");
      }
      onDone?.();
      onClose?.();
    },
    onError: (err) => {
      console.error("reject", err);
      toast.error(err?.message || "Couldn't send.");
    },
  });

  if (!app || !mode) return null;
  const charMode = mode === "character";

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {charMode ? <MessageSquare className="w-5 h-5 text-amber-300" /> : <UserX className="w-5 h-5 text-rose-300" />}
            {charMode ? "Reject character, keep player" : "Reject player"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400 mb-2">
          {charMode
            ? "Tell the player what to change — this message goes straight to them along with an Edit Character button so they can resubmit."
            : "This declines the application outright. Add an optional reason for the player."}
        </p>
        <Textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={charMode
            ? "Your Silvery Barbs replacement should be Cutting Words or Shield; pick either and I'll sign off."
            : "Optional — not a great fit for this table."}
          className="bg-[#050816] border-slate-700 text-white"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => run.mutate()}
            disabled={run.isPending || (charMode && !message.trim())}
            className={charMode ? "bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold" : "bg-rose-500 hover:bg-rose-400 text-white font-bold"}
          >
            {run.isPending ? "Sending…" : charMode ? "Send Feedback" : "Decline Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
