import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Gift, Sparkles, X } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { notifySpicePurchase } from "@/lib/spiceBalanceBus";

const STICKER_URL =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/Me%20sticker.png";
const SIGNATURE_URL =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/ui/fakesig.png";

/**
 * One-time alpha welcome modal. Mounted from Home.jsx and shown
 * when user_profiles.has_seen_alpha_welcome is false.
 *
 * Two phases:
 *   1) Message — heartfelt opener from Boky, sticker on the side,
 *      "Open Your Welcome Gift" button at the bottom.
 *   2) Reveal — celebratory confetti + bouncing "+10,000 SPICE",
 *      send-off line, "Let's go" closes the modal.
 *
 * The gift grant runs via the grant_alpha_welcome_gift RPC
 * (SECURITY DEFINER, idempotent on alpha_gift_claimed). Even if
 * the modal logic is bypassed, the server-side check prevents
 * double-grants.
 *
 * Props:
 *   open       — modal visibility (parent controls based on profile flag)
 *   onClaimed  — fires after a successful grant + flag flip; parent
 *                refetches profile to flip the local has-seen flag
 *   onClose    — fires when the modal is dismissed (gift claimed
 *                or — for parents that want to allow it — Esc/X)
 */
export default function AlphaWelcomeModal({ open, onClaimed, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState("message"); // 'message' | 'reveal'
  const [claiming, setClaiming] = useState(false);
  const confettiTriggered = useRef(false);

  // Reset internal phase whenever the modal re-opens.
  useEffect(() => {
    if (open) {
      setPhase("message");
      setClaiming(false);
      confettiTriggered.current = false;
    }
  }, [open]);

  // Body scroll lock while the modal is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const fireConfetti = () => {
    if (confettiTriggered.current) return;
    confettiTriggered.current = true;
    // Three staggered bursts — keeps the celebration alive for ~2s
    // without a single heavy explosion that obscures the message.
    const fire = (originX, options) =>
      confetti({
        particleCount: 80,
        spread: 70,
        startVelocity: 35,
        origin: { x: originX, y: 0.7 },
        colors: ["#FF5722", "#37F2D1", "#FBBF24", "#A855F7", "#EC4899"],
        scalar: 1.1,
        ...options,
      });
    fire(0.25);
    setTimeout(() => fire(0.75), 250);
    setTimeout(() => fire(0.5, { spread: 100, particleCount: 110 }), 600);
  };

  const handleClaim = async () => {
    if (claiming) return;
    if (!user?.id) {
      toast.error("Sign in to claim your welcome gift.");
      return;
    }
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("grant_alpha_welcome_gift", {
        p_user_id: user.id,
      });
      if (error) throw error;
      // Server returns { granted, amount, new_balance } on success
      // or { granted: false, reason: 'already_claimed' } if a prior
      // grant won the race. Either way, advance to reveal — the
      // server-side state is the source of truth.
      setPhase("reveal");
      fireConfetti();
      const granted = data?.granted !== false;
      const amount = data?.amount || 10000;
      if (granted) {
        // Notify the spice balance bus so any open wallet UI
        // reacts to the change without a hard refresh.
        const newBalance = data?.new_balance;
        if (typeof newBalance === "number") {
          notifySpicePurchase({ from: newBalance - amount, to: newBalance });
        }
        // Invalidate the obvious cache keys so consumers refetch.
        queryClient.invalidateQueries({ queryKey: ["spiceWallet", user.id] });
        queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
      } else {
        // Already claimed — likely a prior session.  Still flip
        // has_seen_alpha_welcome on the profile so the modal
        // stops appearing.
        queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
      }
      onClaimed?.(data || null);
    } catch (err) {
      console.error("Alpha welcome gift grant failed:", err);
      toast.error(`Couldn't claim your gift: ${err?.message || "unknown error"}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <motion.div
          key="welcome-card"
          initial={{ scale: 0.92, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          className="relative w-full max-w-3xl bg-[#1E2430] border border-[#37F2D1]/40 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden"
        >
          {/* Sticker — overlaps the top-right corner of the card.
              Hidden on small viewports so the message has room. */}
          <img
            src={STICKER_URL}
            alt=""
            aria-hidden="true"
            className="hidden md:block pointer-events-none absolute -top-12 -right-8 w-44 lg:w-52 z-10 drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
          />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#37F2D1] font-bold">
                Alpha · Round 1
              </p>
              <h2 className="text-2xl font-black text-white">
                Welcome to the Guildstew Alpha
              </h2>
            </div>
            {phase === "reveal" && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {phase === "message" ? (
            <MessagePhase claiming={claiming} onClaim={handleClaim} />
          ) : (
            <RevealPhase onDone={() => onClose?.()} />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MessagePhase({ claiming, onClaim }) {
  return (
    <div className="px-6 py-5 space-y-4">
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl px-5 py-4 max-h-[55vh] overflow-y-auto custom-scrollbar text-sm leading-relaxed text-slate-200 space-y-4">
        <p className="font-semibold text-white">
          Heyo/Zdravo/Здраво/السَّلَامُ عَلَيْكُمْ everyone,
        </p>
        <p>First, I just want to say thank you.</p>
        <p>
          Seriously. From the bottom of my tiny, anxious, over-caffeinated
          little goblin heart — thank you for signing up for the Guildstew
          alpha and being willing to try something I've been pouring myself
          into for the last two years.
        </p>
        <p>
          Guildstew has been a labor of love in every possible way. It was
          built for the people who love escaping into worlds they created.
          The storytellers. The day-dreamers. The forever DMs. The players
          who spend three hours making a character and then immediately
          fall in love with them like they're a real person with highly
          suspicious companion choices, trauma and way better hair.
        </p>
        <p className="italic">Basically: my people.</p>
        <p>
          Ever since I was a kid, creating things has always been how I
          made sense of the world. Coding, writing, building systems,
          making characters, designing places that didn't exist yet — all
          of that became my way of escaping the harder parts of life and
          turning them into something useful, something fun, something
          that could maybe make someone else feel a little less alone too.
        </p>
        <p>
          So getting to finally share Guildstew with you means more to me
          than I can probably explain without getting embarrassingly
          emotional in public, and nobody needs to see that. Not before
          launch.
        </p>
        <p>
          We at Aetherian Studios have standards. Questionable standards,
          but standards.
        </p>
        <p>
          This alpha is still early. There will be bugs. There will be
          weird little gremlins hiding in the corners. There will probably
          be at least one thing that makes you go,
        </p>
        <p className="italic text-[#FF5722]">
          "Yo Boky, what in the fresh hell is this?"
        </p>
        <p>And honestly? Good.</p>
        <p>I want to hear it.</p>
        <p>
          Constructive criticism is more than welcome. It is deeply
          appreciated. Every bit of feedback helps make Guildstew better,
          stronger, smoother, and more useful for the people it was made
          for. So whether something works beautifully, breaks
          spectacularly, confuses you, delights you, or makes you want to
          lovingly throw a chair — please tell me.
        </p>
        <p>
          Thank you for taking the time to test Guildstew. Thank you for
          trusting Aetherian Studios with your stories, your campaigns,
          your characters, and your weird little tabletop rituals. Thank
          you for being part of this first step.
        </p>
        <p>
          I'm so excited, very nervous, and wildly grateful to finally
          show you what I've been working on.
        </p>
        <p className="font-semibold text-[#37F2D1]">
          Now go make something magical.
        </p>
        <p className="text-slate-300">With love and probably not enough sleep,</p>
        <img
          src={SIGNATURE_URL}
          alt="Signature"
          className="h-16 w-auto -ml-2"
        />
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">
          CEO &amp; Creative Director
          <br />
          Aetherian Studios
        </p>
      </div>

      <div className="flex justify-center pt-2">
        <motion.button
          type="button"
          onClick={onClaim}
          disabled={claiming}
          whileHover={!claiming ? { scale: 1.04 } : {}}
          whileTap={!claiming ? { scale: 0.96 } : {}}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-[#FF5722] via-[#FB923C] to-[#FBBF24] text-[#1E2430] font-black text-base px-8 py-3.5 rounded-full shadow-[0_12px_40px_rgba(251,146,60,0.35)] disabled:opacity-60 disabled:cursor-wait"
        >
          <Gift className="w-5 h-5" />
          {claiming ? "Opening…" : "Open Your Welcome Gift"}
          <Sparkles className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}

function RevealPhase({ onDone }) {
  return (
    <div className="px-6 py-10 text-center space-y-5">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: [0, 1.25, 1], rotate: [-10, 8, 0] }}
        transition={{ duration: 0.6, times: [0, 0.6, 1] }}
        className="inline-block"
      >
        <div className="text-6xl">🎁</div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 220, damping: 18 }}
        className="space-y-1"
      >
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#37F2D1] font-bold">
          Granted
        </p>
        <p className="text-5xl font-black bg-gradient-to-r from-[#FF5722] via-[#FBBF24] to-[#37F2D1] bg-clip-text text-transparent">
          +10,000 Spice
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-base text-slate-300 italic"
      >
        “Now go make something magical.”
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="pt-3"
      >
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-2 bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-black text-sm px-7 py-2.5 rounded-full shadow-[0_10px_30px_rgba(55,242,209,0.3)]"
        >
          <Sparkles className="w-4 h-4" />
          Let&apos;s go!
        </button>
      </motion.div>
    </div>
  );
}
