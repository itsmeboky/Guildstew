import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Eye, Check, X as XIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import DiceRoller from "@/components/dice/DiceRoller";
import { abilityModifier } from "@/components/dnd5e/dnd5eRules";
import { readCombatQueue } from "@/utils/combatQueue";
import { initClassResources } from "@/components/combat/classResources";
import { logCombatEvent } from "@/utils/combatLog";
import { normalizeHp } from "@/components/combat/hpColor";
import { getCombatantPortrait } from "@/utils/monsterPortrait";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/isAdmin";

/**
 * GroupDiceArena — shared multi-player rolling space.
 *
 * Composed of N independent DiceRoller instances (one per selected
 * player slot). Visual co-presence happens at the overlay level —
 * all slots in one modal, all players' dice rendered with each
 * owner's own cosmetic via the refactored useActiveDiceSkin(userId)
 * hook. NOT a shared THREE.js scene; each slot's DiceRoller has its
 * own canvas. (Recon proved DiceRoller's multi-dice scene is
 * single-actor; cross-actor composition would require a refactor
 * that's explicitly out of scope.)
 *
 * Modes:
 *   - 'initiative' — GM Accept button enables when all responses
 *     in; on Accept, monsters roll privately and combat order
 *     builds.
 *   - 'dc_check' — DC overlay header rendered; no Accept stage; GM
 *     watches and clicks Close to dismiss.
 *
 * Player roll authority:
 *   Each slot's owner is the only one who can physically roll into
 *   their slot. Other viewers (including GM) see avatar + name +
 *   result-pill once the owner has rolled. Live re-animation for
 *   spectators (forcedResult playback on non-owner tabs) is filed
 *   as a polish smell — doesn't block the core flow.
 *
 * 30s auto-roll: owner's own tab manages the timer. Reset on any
 * pointer-down inside the DiceRoller. On expiry, writes a
 * Math.random()-derived result to the response slot.
 */
export default function GroupDiceArena({
  mode = 'initiative',
  call,
  isGM,
  currentUserId,
  campaign,
  campaignId,
  players = [],
  characters = [],
  allUserProfiles = [],
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const viewerIsAdmin = isAdminUser(user);
  const isOpen = !!call?.active;

  const selectedUserIds = useMemo(
    () => Array.isArray(call?.selected_user_ids) ? call.selected_user_ids : [],
    [call?.selected_user_ids],
  );

  // Visibility gate: GM always sees; selected players see; non-
  // selected players see nothing.
  const viewerIsGM = !!isGM;
  const viewerIsSelected = !!currentUserId && selectedUserIds.includes(currentUserId);
  const shouldRender = isOpen && (viewerIsGM || viewerIsSelected);

  // Response keyed by user_id — lookups for "did this player roll
  // yet" + post-roll result rendering.
  const responses = call?.responses || {};
  const responseFor = (uid) => responses?.[uid] || null;
  const allResponded =
    selectedUserIds.length > 0 &&
    selectedUserIds.every((uid) => !!responseFor(uid));
  const pendingUserIds = useMemo(
    () => selectedUserIds.filter((uid) => !responses?.[uid]),
    [selectedUserIds, responses],
  );

  // Roll-to-response writer with concurrent-write safety. Re-reads
  // the campaign from the query cache before merging so two
  // simultaneously-rolling players don't clobber each other.
  // Pattern preserved from 98fb542's design.
  const submitRoll = useMutation({
    mutationFn: async ({ userId, raw, mod, total }) => {
      if (!userId || !campaignId) return;
      const callKey = mode === 'initiative' ? 'initiative_call' : 'dc_check_call';
      const latest = queryClient.getQueryData(['campaign', campaignId]) || campaign;
      const latestCall = latest?.combat_data?.[callKey];
      if (!latestCall?.active) return;

      const dc = mode === 'dc_check' ? Number(latestCall.dc) || 0 : null;
      const success = dc != null ? total >= dc : null;

      const nextResponses = {
        ...(latestCall.responses || {}),
        [userId]: {
          roll: raw,
          mod,
          total,
          ...(success != null ? { success } : {}),
          rolled_at: new Date().toISOString(),
        },
      };
      const nextCombatData = {
        ...(latest?.combat_data || {}),
        [callKey]: { ...latestCall, responses: nextResponses },
      };
      await base44.entities.Campaign.update(campaignId, { combat_data: nextCombatData });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }),
    onError: (err) => toast.error(err?.message || "Couldn't submit roll."),
  });

  // Admin-only force-roll for any selected player who hasn't rolled
  // yet. Demo tool for Boky — fills pending response slots with
  // 1d20 + DEX so the Accept Initiative button enables without
  // waiting on real players. Each forced roll is logged with
  // forced:true so demo data can be filtered out of analytics.
  // Never overwrites an existing roll — re-checks against the
  // latest cached responses at write time.
  const forceRollPending = useMutation({
    mutationFn: async () => {
      if (!isAdminUser(user)) {
        throw new Error("Force roll is admin-only.");
      }
      if (mode !== 'initiative') {
        throw new Error("Force roll is initiative-only.");
      }
      const latest = queryClient.getQueryData(['campaign', campaignId]) || campaign;
      const latestCall = latest?.combat_data?.initiative_call;
      if (!latestCall?.active) {
        throw new Error("Initiative call is no longer active.");
      }
      const latestResponses = latestCall.responses || {};
      const latestSelected = Array.isArray(latestCall.selected_user_ids)
        ? latestCall.selected_user_ids
        : [];
      const stillPending = latestSelected.filter((uid) => !latestResponses[uid]);
      if (stillPending.length === 0) return { rolled: [] };

      const rolled = [];
      const nextResponses = { ...latestResponses };
      for (const uid of stillPending) {
        const p = players.find((x) => x.user_id === uid);
        const char = p?.character || characters.find(
          (c) => c.user_id === uid || c.created_by === p?.email,
        );
        const dex = char?.attributes?.dex || 10;
        const mod = abilityModifier(dex);
        const raw = Math.floor(Math.random() * 20) + 1;
        const total = raw + mod;
        nextResponses[uid] = {
          roll: raw,
          mod,
          total,
          forced: true,
          rolled_at: new Date().toISOString(),
        };
        rolled.push({
          name: char?.name || p?.username || 'Player',
          raw,
          mod,
          total,
        });
      }

      const nextCombatData = {
        ...(latest?.combat_data || {}),
        initiative_call: { ...latestCall, responses: nextResponses },
      };
      await base44.entities.Campaign.update(campaignId, { combat_data: nextCombatData });

      for (const r of rolled) {
        const sign = r.mod >= 0 ? '+' : '−';
        const absMod = Math.abs(r.mod);
        try {
          await logCombatEvent(
            campaignId,
            `${r.name} rolls initiative (forced): ${r.total} (${r.raw} ${sign} ${absMod})`,
            {
              event: 'initiative_roll',
              category: 'initiative',
              actor: r.name,
              roll: r.total,
              raw: r.raw,
              mod: r.mod,
              forced: true,
            },
          );
        } catch (err) {
          console.error(`[forceRollPending] failed to log roll for ${r.name}`, err);
        }
      }
      return { rolled };
    },
    onSuccess: ({ rolled } = { rolled: [] }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      if (rolled.length > 0) {
        toast.success(`Force-rolled ${rolled.length} pending ${rolled.length === 1 ? 'roll' : 'rolls'}.`);
      }
    },
    onError: (err) => {
      console.error('[forceRollPending] error', err);
      toast.error(err?.message || "Couldn't force-roll pending.");
    },
  });

  // GM cancel — clears the call from combat_data.
  const cancelCall = useMutation({
    mutationFn: async () => {
      const callKey = mode === 'initiative' ? 'initiative_call' : 'dc_check_call';
      const next = { ...(campaign?.combat_data || {}) };
      delete next[callKey];
      await base44.entities.Campaign.update(campaignId, { combat_data: next });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] }),
    onError: (err) => toast.error(err?.message || "Couldn't close arena."),
  });

  // GM Accept (initiative mode only) — rolls each monster privately,
  // builds combat_data.order from responses + monster rolls, sets
  // combat_active = true, clears initiative_call. Reuses the
  // acceptance shape from 98fb542 (preserved per Commit 1 spec).
  const acceptInitiative = useMutation({
    mutationFn: async () => {
      const rollD20 = (m) => {
        const raw = Math.floor(Math.random() * 20) + 1;
        return { raw, mod: m, total: raw + m };
      };

      const playerCombatants = selectedUserIds.map((uid) => {
        const p = players.find((x) => x.user_id === uid);
        const char = p?.character || characters.find((c) => c.user_id === uid || c.created_by === p?.email);
        const dex = char?.attributes?.dex || 10;
        const mod = abilityModifier(dex);
        const resp = responses[uid] || {};
        const raw = typeof resp.roll === 'number' ? resp.roll : Math.floor(Math.random() * 20) + 1;
        const total = typeof resp.total === 'number' ? resp.total : raw + mod;
        const hp = normalizeHp(char);
        return {
          id: `player-${uid}`,
          name: char?.name || p?.username,
          avatar: char?.profile_avatar_url || char?.avatar_url || char?.image_url || p?.avatar_url,
          bloodied_avatar_url: char?.bloodied_avatar_url || null,
          dexMod: mod,
          type: 'player',
          initiative: total,
          initiativeRoll: raw,
          initiativeMod: mod,
          uniqueId: `player-${uid}`,
          hit_points: hp,
          faction: 'player',
          originalFaction: 'player',
          charmDuration: null,
        };
      });

      const queue = readCombatQueue(campaignId);
      const monsterCombatants = queue.map((m) => {
        const stats = m.stats || m;
        const dex = stats.dex || stats.attributes?.dex || 10;
        const mod = abilityModifier(dex);
        const r = rollD20(mod);
        const hp = normalizeHp(m);
        return {
          id: `monster-${m.queueId}`,
          name: m.name,
          // Gated like the GMPanel build chokepoint — crest URL when the
          // portrait flag is off, raw image_url||avatar_url when on.
          avatar: getCombatantPortrait(m),
          dexMod: mod,
          type: 'monster',
          initiative: r.total,
          initiativeRoll: r.raw,
          initiativeMod: r.mod,
          uniqueId: `monster-${m.queueId}`,
          initiative_rolled: true,
          hit_points: hp,
          // Same AC + stats surfacing as the legacy rollInitiative
          // path — the actor's hit/miss math otherwise defaults to
          // AC 10 against any monster from the new arena flow.
          armor_class: stats.armor_class || stats.ac || 10,
          stats,
          faction: m.faction || 'enemy',
          originalFaction: m.originalFaction || m.faction || 'enemy',
          charmDuration: m.charmDuration ?? null,
        };
      });

      const allCombatants = [...playerCombatants, ...monsterCombatants].sort((a, b) => {
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        return Math.random() - 0.5;
      });

      const initialResources = {};
      allCombatants.forEach((c) => {
        const key = c.uniqueId || c.id;
        if (c.type === 'player' || c.class) {
          const charData = characters.find((ch) => ch.id === key || ch.name === c.name) || c;
          initialResources[key] = initClassResources({ ...charData, ...c });
        }
      });

      await base44.entities.Campaign.update(campaignId, {
        combat_active: true,
        combat_data: {
          stage: 'initiative',
          order: allCombatants,
          rolls: {},
          currentTurnIndex: 0,
          round: 1,
          classResources: initialResources,
        },
      });

      logCombatEvent(campaignId, '⚔️ Combat started! (Group dice arena.)', {
        event: 'combat_started', category: 'initiative',
      });
      allCombatants.forEach((c) => {
        const sign = (c.initiativeMod || 0) >= 0 ? '+' : '−';
        const absMod = Math.abs(c.initiativeMod || 0);
        logCombatEvent(
          campaignId,
          `${c.name} rolls initiative: ${c.initiative} (${c.initiativeRoll} ${sign} ${absMod})`,
          { event: 'initiative_roll', category: 'initiative', actor: c.name, roll: c.initiative },
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      toast.success("Initiative locked.");
    },
    onError: (err) => toast.error(err?.message || "Couldn't accept initiative."),
  });

  if (!shouldRender) return null;

  const modifier = call?.modifier || 'normal';
  const modifierLabel =
    modifier === 'advantage' ? 'ADVANTAGE' :
    modifier === 'disadvantage' ? 'DISADVANTAGE' :
    null;

  // GM avatar: use campaign owner's profile if available.
  const gmProfile = allUserProfiles.find((p) => p.user_id === campaign?.game_master_id);

  const profileFor = (uid) => allUserProfiles.find((p) => p.user_id === uid) || {};
  const charFor = (uid) => {
    const p = players.find((x) => x.user_id === uid);
    return p?.character || characters.find((c) => c.user_id === uid || c.created_by === p?.email);
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] overflow-y-auto bg-[rgba(5,8,22,0.92)] p-6"
      style={{
        backdropFilter: 'blur(6px)',
        background:
          'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255, 83, 0, 0.08), transparent 60%), ' +
          'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(55, 242, 209, 0.06), transparent 60%), ' +
          'rgba(5, 8, 22, 0.92)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top bar — GM avatar + watcher label + DC overlay */}
        <header className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-3">
            {gmProfile?.avatar_url ? (
              <img
                src={gmProfile.avatar_url}
                alt={gmProfile.username || 'GM'}
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.4)]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-amber-50 font-bold border-2 border-amber-300">
                GM
              </div>
            )}
            <div>
              <div className="text-amber-300 text-xs uppercase tracking-[0.24em] font-bold flex items-center gap-1">
                <Eye className="w-3 h-3" /> Watching
              </div>
              <div className="text-white font-bold">{gmProfile?.username || 'Game Master'}</div>
            </div>
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2 mt-1">
            <Megaphone className="w-4 h-4 text-[#37F2D1]" />
            {mode === 'initiative' ? 'Call for Initiative' : 'Call for DC Check'}
          </div>

          {mode === 'dc_check' && call?.dc != null && (
            <div className="mt-2 px-6 py-2 rounded-2xl bg-[#37F2D1]/10 border border-[#37F2D1]/40">
              <span className="text-[#37F2D1] font-black text-3xl tracking-widest">DC {call.dc}</span>
              {call.ability && (
                <span className="ml-3 text-slate-300 text-sm uppercase tracking-widest">
                  {String(call.ability)} {call.check_type === 'saving_throw' ? 'Save' : 'Check'}
                </span>
              )}
            </div>
          )}

          {modifierLabel && (
            <div
              className={`mt-1 text-xs uppercase tracking-[0.24em] font-black px-3 py-1 rounded-full border ${
                modifier === 'advantage'
                  ? 'text-emerald-300 bg-emerald-900/30 border-emerald-500/50'
                  : 'text-red-300 bg-red-900/30 border-red-500/50'
              }`}
            >
              {modifierLabel}
            </div>
          )}
        </header>

        {/* Slot grid. Spec calls for perimeter positioning per count
            (1 → centered bottom, 9 → corners + sides). Polish-smell:
            v1 ships with a flex-wrap grid that adapts naturally to
            count — the perimeter layout is a CSS-positioning project
            that's distinct from the wiring work and worth its own
            commit. */}
        <div className="flex flex-wrap items-start justify-center gap-6">
          {selectedUserIds.map((uid) => (
            <ArenaSlot
              key={uid}
              userId={uid}
              isSelf={uid === currentUserId}
              isGMView={viewerIsGM}
              modifier={modifier}
              mode={mode}
              dc={call?.dc}
              ability={call?.ability}
              checkType={call?.check_type}
              response={responseFor(uid)}
              profile={profileFor(uid)}
              character={charFor(uid)}
              onSubmit={(payload) => submitRoll.mutate({ userId: uid, ...payload })}
            />
          ))}
        </div>

        {/* GM controls */}
        {viewerIsGM && (
          <footer className="mt-8 flex justify-center gap-3">
            <Button variant="outline" onClick={() => cancelCall.mutate()} disabled={cancelCall.isPending}>
              <XIcon className="w-4 h-4 mr-1" /> {mode === 'initiative' ? 'Cancel call' : 'Close'}
            </Button>
            {mode === 'initiative' && viewerIsAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  if (!isAdminUser(user)) return;
                  forceRollPending.mutate();
                }}
                disabled={pendingUserIds.length === 0 || forceRollPending.isPending}
                className="border-amber-400/60 text-amber-300 hover:bg-amber-400/10 disabled:opacity-40"
                title="Admin: auto-roll initiative for any selected player who hasn't rolled yet."
              >
                <Zap className="w-4 h-4 mr-1" />
                {forceRollPending.isPending ? 'Rolling…' : 'Force Roll Pending'}
              </Button>
            )}
            {mode === 'initiative' && (
              <Button
                onClick={() => acceptInitiative.mutate()}
                disabled={!allResponded || acceptInitiative.isPending}
                className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold disabled:opacity-50"
              >
                <Check className="w-4 h-4 mr-1" />
                {acceptInitiative.isPending ? 'Accepting…' : 'Accept Initiative'}
              </Button>
            )}
          </footer>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

/* ────────────────────────────────────────────────────────── */

const AUTO_ROLL_MS = 30000;

function ArenaSlot({
  userId,
  isSelf,
  modifier,
  mode,
  dc,
  ability,
  checkType,
  response,
  profile,
  character,
  onSubmit,
}) {
  const [secondsLeft, setSecondsLeft] = useState(Math.round(AUTO_ROLL_MS / 1000));
  const submittedRef = useRef(!!response);

  // Compute the slot owner's modifier for the roll. For initiative
  // mode: DEX modifier. For dc_check mode: ability modifier from
  // the character's matching ability score. Falls back to 0 if the
  // attribute lookup fails.
  const rollMod = useMemo(() => {
    if (mode === 'initiative') {
      return abilityModifier(character?.attributes?.dex || 10);
    }
    // dc_check — ability is e.g. 'wisdom', 'dexterity', or a skill
    // alias like 'perception' / 'stealth'. Try ability score lookup
    // by 3-letter prefix; fall back to 0 if unrecognized.
    const lower = String(ability || '').toLowerCase();
    const ABILITY_PREFIX_MAP = {
      str: 'str', strength: 'str',
      dex: 'dex', dexterity: 'dex',
      con: 'con', constitution: 'con',
      int: 'int', intelligence: 'int',
      wis: 'wis', wisdom: 'wis',
      cha: 'cha', charisma: 'cha',
      // Skills → governing ability per 5e SRD
      perception: 'wis', insight: 'wis', medicine: 'wis', survival: 'wis', 'animal handling': 'wis',
      stealth: 'dex', acrobatics: 'dex', 'sleight of hand': 'dex',
      athletics: 'str',
      arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
      deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha',
    };
    const key = ABILITY_PREFIX_MAP[lower] || lower.slice(0, 3);
    return abilityModifier(character?.attributes?.[key] || 10);
  }, [mode, ability, character]);

  // Per-slot 30s timer, owner-tab only. Resets on roll, clears on
  // unmount or when a response lands.
  useEffect(() => {
    if (!isSelf || response) return;
    submittedRef.current = false;
    setSecondsLeft(Math.round(AUTO_ROLL_MS / 1000));
    const tickId = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const expireId = setTimeout(() => {
      if (submittedRef.current) return;
      // Auto-roll fallback. Math.random() result, owner's mod
      // applied. For adv/dis, take higher/lower of two rolls (the
      // actual visible dice tray is bypassed for auto-roll — the
      // display will show "auto" via a label; that's acceptable for
      // an AFK player).
      const rollOne = () => Math.floor(Math.random() * 20) + 1;
      let raw = rollOne();
      if (modifier === 'advantage') {
        const a = raw; const b = rollOne();
        raw = Math.max(a, b);
      } else if (modifier === 'disadvantage') {
        const a = raw; const b = rollOne();
        raw = Math.min(a, b);
      }
      submittedRef.current = true;
      onSubmit({ raw, mod: rollMod, total: raw + rollMod });
    }, AUTO_ROLL_MS);
    return () => {
      clearInterval(tickId);
      clearTimeout(expireId);
    };
  }, [isSelf, response, rollMod, modifier, onSubmit]);

  const onRollComplete = (value) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    let raw = value;
    if (modifier === 'advantage' || modifier === 'disadvantage') {
      // Adv/Dis math kept honest for the manual-roll path: roll a
      // second d20 inline, take higher/lower. The visible
      // animation only shows the first die (forcedResult playback
      // for the second die is a polish smell — see component
      // header). Total + breakdown still reflect take-better.
      const second = Math.floor(Math.random() * 20) + 1;
      raw = modifier === 'advantage' ? Math.max(value, second) : Math.min(value, second);
    }
    onSubmit({ raw, mod: rollMod, total: raw + rollMod });
  };

  const success = response?.success;
  const total = response?.total;
  const breakdown = response
    ? `(${response.roll}${(response.mod || 0) >= 0 ? ' + ' : ' − '}${Math.abs(response.mod || 0)})`
    : null;

  return (
    <div className="w-[260px] rounded-2xl bg-[#0f1219]/80 border border-slate-700/60 p-3 flex flex-col items-center gap-3 shadow-lg">
      <div className="flex items-center gap-2 w-full">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
            {(profile?.username || character?.name || '?').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-bold truncate">{character?.name || profile?.username || 'Player'}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest">
            {mode === 'initiative' ? `DEX ${rollMod >= 0 ? '+' : ''}${rollMod}` : `${ability || 'roll'} ${rollMod >= 0 ? '+' : ''}${rollMod}`}
          </div>
        </div>
        {!response && (
          <div className="text-[10px] text-slate-400 font-mono w-8 text-right">
            {secondsLeft}s
          </div>
        )}
      </div>

      {/* Live dice tray — owner-tab only. Other viewers see the
          static avatar + result-pill below. Spectator dice playback
          on non-owner tabs is filed as a polish smell — the
          forcedResult + autoRollOnOpen pattern from CombatDiceWindow
          could replay the roll once it lands, but ships separately. */}
      {isSelf && !response && (
        <div className="w-full h-[200px] rounded-lg overflow-hidden border border-slate-700 bg-[#050816] relative">
          <DiceRoller
            key={`arena-${userId}`}
            isOpen={true}
            initialDice="d20"
            onRollComplete={onRollComplete}
            modifier="none"
            userId={userId}
            isThemedSkin={true}
            compact={true}
          />
        </div>
      )}

      {/* Result pill — visible on every viewer's tab once the
          response lands. Includes success indicator for dc_check
          mode. */}
      {response ? (
        <div className="w-full text-center py-3 rounded-lg bg-[#050816] border border-[#37F2D1]/30">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-black text-[#37F2D1]">{total}</span>
            {success === true && <span className="text-xl text-emerald-400">✓</span>}
            {success === false && <span className="text-xl text-red-400">✗</span>}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{breakdown}</div>
        </div>
      ) : !isSelf ? (
        <div className="w-full text-center py-6 text-xs text-slate-500 italic">
          {checkType ? `Awaiting roll…` : 'Rolling…'}
        </div>
      ) : null}
    </div>
  );
}
