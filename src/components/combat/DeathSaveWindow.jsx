import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Dramatic full-screen overlay that replaces the normal action bar / dice
 * window when a downed character rolls a death saving throw. Plays a
 * heartbeat loop, pulses the portrait, and reveals a huge d20 button. On
 * click the heartbeat ramps up, a d20 is rolled, and a result sound fires
 * before the overlay auto-closes and the caller advances the turn.
 *
 * Props:
 *   combatant  : the downed combatant (needs .name, .avatar, .deathSaves)
 *   canRoll    : if false, the roll button is disabled (spectator mode)
 *   silent     : if true, suppresses all audio (GM "quiet monster" default)
 *   onRoll     : async (rollValue) => void. Called AFTER the ramp-up delay
 *                with the pre-rolled d20 value so the caller can persist it.
 *   onClose    : () => void. Called after the result sound finishes.
 */

// Custom art used throughout the Guildstew combat UI for death saves.
const ICONS = {
  life: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/UI/life.png",
  death: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/UI/death.png",
};
const WHITE_TINT = { filter: "brightness(0) invert(1)" };

// Sound effect URLs. These live in the `campaign-assets` Supabase bucket
// under `dnd5e/sfx/`. Filenames are URL-encoded because the uploads
// intentionally use human-readable names with spaces. If a file is
// missing, the corresponding sound just silently fails — the window
// still functions.
const SFX_BASE =
  "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/campaign-assets/dnd5e/sfx";

const SOUND_URLS = {
  heartbeat: `${SFX_BASE}/Heart%20Beat.mp3`,
  nat20: `${SFX_BASE}/Nat%2020%20(back%20from%20the%20brink).mp3`,
  nat1: `${SFX_BASE}/Nat%201%20(double%20failure).wav`,
  success: `${SFX_BASE}/Regular%20success%20(10+).wav`,
  failure: `${SFX_BASE}/Regular%20failure%20(2-9).mp3`,
  stabilizedMale: `${SFX_BASE}/Stabilized%20(3rd%20success)Male.mp3`,
  stabilizedFemale: `${SFX_BASE}/Stabilized%20(3rd%20success)Female.mp3`,
  dead: `${SFX_BASE}/Dead%20(3rd%20failure).wav`,
};

function makeAudio(url, { loop = false, volume = 0.7 } = {}) {
  try {
    const a = new Audio(url);
    a.loop = loop;
    a.volume = volume;
    a.preload = "auto";
    return a;
  } catch {
    return null;
  }
}

function tryPlay(audio) {
  if (!audio) return;
  try {
    const p = audio.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    /* ignore */
  }
}

export default function DeathSaveWindow({
  combatant,
  canRoll = true,
  silent = false,
  onRoll,
  onClose,
}) {
  const [phase, setPhase] = React.useState("idle"); // idle | rolling | result
  const [rollValue, setRollValue] = React.useState(null);
  const heartbeatRef = React.useRef(null);
  const timeoutsRef = React.useRef([]);

  const saves = combatant?.deathSaves || {
    successes: 0,
    failures: 0,
    stabilized: false,
    dead: false,
  };

  // Start the heartbeat loop when the window mounts (unless silent).
  React.useEffect(() => {
    if (silent) return undefined;
    const hb = makeAudio(SOUND_URLS.heartbeat, { loop: true, volume: 0.45 });
    heartbeatRef.current = hb;
    if (hb) {
      hb.playbackRate = 0.85;
      tryPlay(hb);
    }
    return () => {
      if (hb) {
        try {
          hb.pause();
          hb.src = "";
        } catch {
          /* ignore */
        }
      }
      heartbeatRef.current = null;
    };
  }, [silent]);

  // Clear all pending timeouts on unmount so a mid-animation close doesn't
  // try to setState on an unmounted component.
  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const queueTimeout = (fn, delay) => {
    const t = setTimeout(fn, delay);
    timeoutsRef.current.push(t);
    return t;
  };

  const stopHeartbeat = () => {
    const hb = heartbeatRef.current;
    if (!hb) return;
    try {
      hb.pause();
    } catch {
      /* ignore */
    }
  };

  const handleRoll = () => {
    if (phase !== "idle" || !canRoll) return;
    setPhase("rolling");

    // Ramp the heartbeat up for about a second to build tension.
    const hb = heartbeatRef.current;
    if (hb && !silent) {
      hb.playbackRate = 1.0;
      queueTimeout(() => {
        if (heartbeatRef.current) heartbeatRef.current.playbackRate = 1.3;
      }, 350);
      queueTimeout(() => {
        if (heartbeatRef.current) heartbeatRef.current.playbackRate = 1.55;
      }, 700);
    }

    // After the ramp-up, roll the d20, stop the heartbeat, play the
    // result sound, and notify the parent so they can persist state.
    queueTimeout(() => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      setRollValue(d20);
      setPhase("result");
      stopHeartbeat();

      let resultUrl;
      let resultVolume = 0.7;
      if (d20 === 20) resultUrl = SOUND_URLS.nat20;
      else if (d20 === 1) resultUrl = SOUND_URLS.nat1;
      else if (d20 >= 10) resultUrl = SOUND_URLS.success;
      else resultUrl = SOUND_URLS.failure;

      if (!silent) tryPlay(makeAudio(resultUrl, { volume: resultVolume }));

      // Predict the follow-up state to decide whether to chain a
      // stabilized / dead sting. We trust the parent to do the real
      // state mutation via onRoll(d20).
      const nextSuccesses =
        d20 === 20 ? 0 : d20 >= 10 ? Math.min(3, saves.successes + 1) : saves.successes;
      const nextFailures =
        d20 === 20
          ? 0
          : d20 === 1
          ? Math.min(3, saves.failures + 2)
          : d20 >= 10
          ? saves.failures
          : Math.min(3, saves.failures + 1);

      const willStabilize = nextSuccesses >= 3 && nextFailures < 3;
      const willDie = nextFailures >= 3;

      if (!silent && willStabilize) {
        // Pick the stabilized sting based on the combatant's recorded
        // gender / pronouns. Falls back to male if nothing usable is
        // on the entity.
        const g = (combatant.gender || combatant.pronouns || "").toString().toLowerCase();
        const isFemale =
          g.includes("female") ||
          g === "f" ||
          g.includes("she") ||
          g.includes("her");
        const stabilizedUrl = isFemale
          ? SOUND_URLS.stabilizedFemale
          : SOUND_URLS.stabilizedMale;
        queueTimeout(() => {
          tryPlay(makeAudio(stabilizedUrl, { volume: 0.7 }));
        }, 900);
      }
      if (!silent && willDie) {
        queueTimeout(() => {
          tryPlay(makeAudio(SOUND_URLS.dead, { volume: 0.5 }));
        }, 900);
      }

      if (typeof onRoll === "function") {
        try {
          onRoll(d20);
        } catch (err) {
          // Don't let a parent crash block the close.
          console.error("DeathSaveWindow onRoll error:", err);
        }
      }

      // Hold the result on screen long enough for players to read it,
      // then fade out. Nat 20 / death get a longer beat for drama.
      const holdMs = d20 === 20 || willDie ? 3400 : 2500;
      queueTimeout(() => {
        if (typeof onClose === "function") onClose();
      }, holdMs);
    }, 1000);
  };

  const resultLabel = (() => {
    if (phase !== "result" || rollValue == null) return null;
    if (rollValue === 20) return { text: "NATURAL 20 — BACK ON YOUR FEET", color: "#22c55e" };
    if (rollValue === 1) return { text: "NATURAL 1 — TWO FAILURES", color: "#ef4444" };
    if (rollValue >= 10) return { text: "SUCCESS", color: "#22c55e" };
    return { text: "FAILURE", color: "#ef4444" };
  })();

  if (!combatant) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="death-save-window"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md"
      >
        {/* Pulsing red vignette when idle/rolling, green flash on success */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              phase === "result" && rollValue != null && (rollValue === 20 || rollValue >= 10)
                ? "radial-gradient(circle at center, rgba(34,197,94,0.25), transparent 70%)"
                : "radial-gradient(circle at center, rgba(239,68,68,0.25), transparent 70%)",
          }}
          animate={
            phase === "idle" || phase === "rolling"
              ? { opacity: [0.35, 0.65, 0.35] }
              : { opacity: 0.8 }
          }
          transition={
            phase === "idle" || phase === "rolling"
              ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.4 }
          }
        />

        <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 max-w-2xl w-full">
          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[11px] uppercase tracking-[0.4em] text-red-400/80 font-bold"
          >
            Death Saving Throw
          </motion.p>

          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 22 }}
            className="text-3xl md:text-4xl font-black text-white tracking-wide text-center"
          >
            {combatant.name}
          </motion.h1>

          <div className="flex items-center justify-center gap-8 md:gap-12">
            {/* Successes column */}
            <div className="flex flex-col items-center gap-2">
              <img src={ICONS.life} alt="Successes" className="w-10 h-10" style={WHITE_TINT} />
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{
                      backgroundColor: saves.successes > i ? "#22c55e" : "transparent",
                      boxShadow: saves.successes > i ? "0 0 12px #22c55e" : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Portrait with heartbeat pulse */}
            <motion.div
              animate={
                phase === "result"
                  ? { scale: 1 }
                  : { scale: [1, 1.06, 1] }
              }
              transition={
                phase === "result"
                  ? { duration: 0.3 }
                  : {
                      duration: phase === "rolling" ? 0.55 : 0.85,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
              className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-4 border-red-500/70 bg-[#1a1f2e] shadow-[0_0_60px_rgba(239,68,68,0.55)] flex-shrink-0"
            >
              {combatant.avatar ? (
                <img
                  src={combatant.avatar}
                  alt={combatant.name}
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl text-slate-400 font-bold">
                  {combatant.name?.[0] || "?"}
                </div>
              )}
            </motion.div>

            {/* Failures column */}
            <div className="flex flex-col items-center gap-2">
              <img src={ICONS.death} alt="Failures" className="w-10 h-10" style={WHITE_TINT} />
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{
                      backgroundColor: saves.failures > i ? "#ef4444" : "transparent",
                      boxShadow: saves.failures > i ? "0 0 12px #ef4444" : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Roll button / result display */}
          <div className="w-full flex flex-col items-center gap-3 min-h-[120px] justify-center">
            {phase === "idle" && (
              <motion.button
                type="button"
                onClick={handleRoll}
                disabled={!canRoll}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                whileTap={{ scale: 0.96 }}
                className="relative px-10 py-5 rounded-2xl bg-gradient-to-b from-[#ef4444] to-[#991b1b] text-white text-xl md:text-2xl font-black tracking-widest uppercase border-b-4 border-[#450a0a] shadow-[0_0_40px_rgba(239,68,68,0.55)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ boxShadow: "0 0 60px rgba(239,68,68,0.8)" }}
                  animate={{ opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="relative">Roll for Your Life</span>
              </motion.button>
            )}

            {phase === "rolling" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/70 text-sm uppercase tracking-[0.3em]"
              >
                Rolling…
              </motion.p>
            )}

            {phase === "result" && resultLabel && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="flex flex-col items-center gap-2"
              >
                <div
                  className="text-6xl md:text-7xl font-black"
                  style={{ color: resultLabel.color, textShadow: `0 0 40px ${resultLabel.color}` }}
                >
                  {rollValue}
                </div>
                <div
                  className="text-sm md:text-base font-bold uppercase tracking-[0.25em]"
                  style={{ color: resultLabel.color }}
                >
                  {resultLabel.text}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
