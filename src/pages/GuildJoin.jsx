import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { redeemGuildInviteCode } from "@/api/billingClient";

/**
 * Invite-code redemption landing page.
 *
 * Wired to /guild/join?code=GLD-XXXX-XXXX — the URL shape generated
 * by GuildSettingsDialog's "Copy share link" button. Reads the code
 * from the query string, runs redeem_guild_invite_code() through
 * the existing billingClient helper, and renders a tailored state
 * for every possible outcome.
 *
 * Auth: the RPC is SECURITY DEFINER with an auth.uid() guard, so an
 * unauth visitor can't redeem. App.jsx routes unauth users to this
 * page (allowlisted in the unauth block) so they get the "Sign in"
 * affordance instead of landing on the marketing page.
 *
 * Manual code entry has its own surface (RedeemInviteCodeForm on
 * /guild for non-members) — this page is the click-the-link path,
 * not a replacement for that form.
 */
export default function GuildJoin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();

  const code = (searchParams.get("code") || "").trim();
  const [status, setStatus] = useState("idle");
  const [errorReason, setErrorReason] = useState(null);

  const redeem = useMutation({
    mutationFn: (codeValue) => redeemGuildInviteCode(codeValue),
    onSuccess: (result) => {
      const s = result?.status;
      if (s === "joined") {
        setStatus("success");
        toast.success("Welcome to the guild!");
        // Refresh subscription state so the rest of the app
        // (Guild.jsx, billing panel, etc.) flips into "you're a
        // member" mode without a page reload.
        sub.refresh?.();
        queryClient.invalidateQueries({ queryKey: ["guildRow"] });
        queryClient.invalidateQueries({ queryKey: ["guildMembers"] });
        // Brief celebratory pause so the user sees the success
        // state before the Guild Hub takes over the screen.
        setTimeout(() => navigate("/guild"), 1500);
        return;
      }
      setStatus("error");
      setErrorReason(s || "unknown");
    },
    onError: (err) => {
      console.error("Guild redemption error:", err);
      setStatus("error");
      setErrorReason("unknown");
    },
  });

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setErrorReason("no_code");
      return;
    }
    if (isLoadingAuth) return;
    if (!isAuthenticated || !user) {
      setStatus("error");
      setErrorReason("not_logged_in");
      return;
    }
    if (status !== "idle") return;
    setStatus("redeeming");
    redeem.mutate(code);
    // Intentional: only fire once on first ready render. Re-runs are
    // gated by `status !== "idle"` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isAuthenticated, isLoadingAuth, user]);

  if (status === "idle" || status === "redeeming" || isLoadingAuth) {
    return (
      <Shell>
        <Loader2 className="w-12 h-12 animate-spin text-amber-300 mb-4" />
        <h1 className="text-2xl md:text-3xl font-black text-amber-100 mb-2"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
          Joining guild…
        </h1>
        <p className="text-slate-400 text-sm">Validating invite code</p>
      </Shell>
    );
  }

  if (status === "success") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-300" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-amber-100 mb-2"
            style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
          Welcome to the guild!
        </h1>
        <p className="text-slate-400 text-sm">Taking you to your Guild Hall…</p>
      </Shell>
    );
  }

  const err = ERROR_COPY[errorReason] || ERROR_COPY.unknown;
  const showSignIn = errorReason === "not_logged_in";
  const showHomeOnly = errorReason === "no_code" || errorReason === "unknown" || errorReason === "invalid_code";
  const isAlreadyAnyMember = errorReason === "already_member" || errorReason === "already_in_other_guild";

  return (
    <Shell>
      <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4">
        {showSignIn ? (
          <AlertCircle className="w-8 h-8 text-amber-300" />
        ) : (
          <X className="w-8 h-8 text-rose-300" />
        )}
      </div>
      <h1 className="text-3xl md:text-4xl font-black text-amber-100 mb-2 text-center"
          style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
        {err.title}
      </h1>
      <p className="text-slate-400 text-sm text-center max-w-md mb-6 leading-relaxed">
        {err.body}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {showSignIn && (
          <Button
            onClick={() => {
              // Stash the code so a future GuildJoin mount (after
              // login → navigate-back) can pick it up if the URL
              // got stripped along the way. Best-effort; the user
              // re-clicking the invite link from their email is
              // the canonical happy path.
              try { sessionStorage.setItem("pending_guild_code", code); } catch { /* private mode */ }
              window.location.href = "/";
            }}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black"
          >
            Sign in
          </Button>
        )}
        {isAlreadyAnyMember && (
          <Button
            onClick={() => navigate("/guild")}
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black"
          >
            Go to my guild
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => navigate(showHomeOnly ? "/" : "/guild")}
          className="border-slate-600 text-slate-200 hover:bg-slate-800"
        >
          {showHomeOnly ? "Return home" : "Browse guilds"}
        </Button>
      </div>
    </Shell>
  );
}

const ERROR_COPY = {
  no_code: {
    title: "No invite code",
    body: "This link is missing the code parameter. Ask the guild owner to send you a fresh invite link.",
  },
  not_logged_in: {
    title: "Sign in required",
    body: "You need to be signed in to redeem an invite code. Sign in (or create an account), then click the invite link again.",
  },
  invalid_code: {
    title: "Code not recognized",
    body: "This invite code is invalid or has been revoked. Ask the guild owner to generate a new one.",
  },
  guild_full: {
    title: "Guild is full",
    body: "This guild has reached its 6-member cap. The owner can remove an inactive member or wait until a seat opens up.",
  },
  already_member: {
    title: "Already a member",
    body: "You're already part of this guild. Head to your Guild Hall to see what's new.",
  },
  already_in_other_guild: {
    title: "You're in another guild",
    body: "You can only belong to one guild at a time. Leave your current guild before redeeming an invite to a new one.",
  },
  unknown: {
    title: "Something went wrong",
    body: "We couldn't redeem that code. Try again in a moment, or contact the guild owner for a fresh link.",
  },
};

function Shell({ children }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#050816" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-8 md:p-10 flex flex-col items-center"
        style={{ backgroundColor: "#0b1324", borderColor: "rgba(251, 191, 36, 0.25)" }}
      >
        {children}
      </div>
    </div>
  );
}
