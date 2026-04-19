import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Dices, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import {
  getAbilityModifier, getSkillModifier, canReattempt,
  getComprehensionLevel, speaksLanguage,
} from "@/utils/languageComprehension";
import { fontFamilyFor } from "@/utils/languageFonts";
import { SymbolImage } from "@/components/shared/SymbolPicker";
import { THIEVES_CANT_SYMBOLS, CANT_DEFAULT_COLOR } from "@/config/thievesCantSymbols";
import { DRUIDIC_SYMBOLS, DRUIDIC_DEFAULT_COLOR } from "@/config/druidicSymbols";

/**
 * Wraps a World Lore entry's body with the three gating layers:
 *   1. knowledge gates (skill / ability checks) — fail → locked card
 *      with "Attempt Check". Retry policy honours
 *      campaigns.skill_check_retry_policy.
 *   2. language gate (entry.language) — drives comprehension tier.
 *      Fluent shows English; partial shows gist + font-obfuscated
 *      body with an INT decipher roll; unknown shows only font-
 *      obfuscated body.
 *   3. Thieves' Cant / Druidic annotations — render conditionally
 *      based on whether the viewer's character knows those
 *      languages. Invisible to everyone else; they don't even get
 *      a "locked" affordance.
 *
 * GMs always see full English + see every gate pre-satisfied; the
 * gating is cosmetic for them with a "GM View" badge per layer.
 */
export default function GatedEntryView({
  entry,
  character,
  campaign,
  isGM,
  renderBody,
  className,
}) {
  const queryClient = useQueryClient();
  const gates = Array.isArray(entry?.knowledge_gates) ? entry.knowledge_gates : [];
  const gatesToCheck = useMemo(() => gates.filter((g) => g && g.type && g.type !== "none"), [gates]);

  // Bulk-load every reveal_attempt relevant to this entry +
  // character so gates, the language decipher flow, and the
  // locked state all read from one source.
  const { data: attempts = [] } = useQuery({
    queryKey: ["revealAttempts", character?.id, entry?.id],
    queryFn: async () => {
      if (!character?.id || !entry?.id) return [];
      const { data, error } = await supabase
        .from("reveal_attempts")
        .select("*")
        .eq("character_id", character.id)
        .eq("target_type", "lore_entry")
        .eq("target_id", entry.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!character?.id && !!entry?.id && !isGM,
    initialData: [],
  });

  const invalidateAttempts = () => {
    queryClient.invalidateQueries({ queryKey: ["revealAttempts", character?.id, entry?.id] });
  };

  const recordAttempt = useMutation({
    mutationFn: async ({ revealType, total, dc, passed }) => {
      const { error } = await supabase
        .from("reveal_attempts")
        .upsert(
          {
            character_id: character.id,
            target_type: "lore_entry",
            target_id: entry.id,
            reveal_type: revealType,
            result: passed ? "pass" : "fail",
            rolled_value: total,
            dc,
            attempted_at: new Date().toISOString(),
          },
          { onConflict: "character_id,target_type,target_id,reveal_type" },
        );
      if (error) throw error;
    },
    onSuccess: () => invalidateAttempts(),
  });

  const retryPolicy = campaign?.skill_check_retry_policy || "next_session";
  const sessionStartedAt = campaign?.session_started_at;

  // --- Knowledge gate evaluation (skill_check / ability_check / language) ---
  // Language gates are handled below in the comprehension layer, so
  // the evaluator only blocks on skill / ability failures.
  const blockingGate = useMemo(() => {
    if (isGM) return null;
    for (const gate of gatesToCheck) {
      if (gate.type === "language") continue;
      const revealType = `skill_gate:${gate.id || gate.skill || gate.ability}`;
      const attempt = attempts.find((a) => a.reveal_type === revealType);
      if (attempt?.result === "pass") continue;
      return { gate, attempt, revealType };
    }
    return null;
  }, [isGM, gatesToCheck, attempts]);

  // Language comprehension context — computed up front so the hook
  // order never depends on the early "blocked" branches below.
  const entryLanguage = useMemo(() => {
    const langGate = gatesToCheck.find((g) => g.type === "language" && g.language);
    return langGate?.language || entry?.language || null;
  }, [gatesToCheck, entry?.language]);
  const tier = useMemo(() => {
    if (!entryLanguage) return "fluent";
    if (isGM) return "fluent";
    return getComprehensionLevel(character, entryLanguage);
  }, [entryLanguage, isGM, character]);
  const hardLanguageGate = useMemo(
    () => gatesToCheck.find((g) => g.type === "language"),
    [gatesToCheck],
  );

  if (blockingGate) {
    return (
      <LockedGate
        entry={entry}
        gate={blockingGate.gate}
        attempt={blockingGate.attempt}
        retryPolicy={retryPolicy}
        sessionStartedAt={sessionStartedAt}
        onRoll={async () => {
          const { gate, revealType } = blockingGate;
          const modifier = gate.type === "skill_check"
            ? getSkillModifier(character, gate.skill)
            : getAbilityModifier(character, gate.ability);
          const roll = Math.floor(Math.random() * 20) + 1;
          const total = roll + modifier;
          const dc = Number(gate.dc) || 15;
          const passed = total >= dc;
          await recordAttempt.mutateAsync({ revealType, total, dc, passed });
          const label = gate.skill || (gate.ability || "").toUpperCase();
          if (passed) toast.success(`Success — rolled ${total} vs DC ${dc} (${label})`);
          else toast.error(`Failed — rolled ${total} vs DC ${dc} (${label})`);
        }}
      />
    );
  }

  // A specific language-gate of type 'language' blocks when the
  // character doesn't speak it at all — no partial tier.
  if (!isGM && hardLanguageGate && !speaksLanguage(character, hardLanguageGate.language)) {
    return (
      <LockedLanguageGate
        entry={entry}
        language={hardLanguageGate.language}
        failureText={hardLanguageGate.failure_text}
      />
    );
  }

  const body = renderBody ? renderBody() : null;
  const decipherRevealType = "language_decipher";
  const decipherAttempt = attempts.find((a) => a.reveal_type === decipherRevealType);
  const alreadyDeciphered = decipherAttempt?.result === "pass";

  if (tier === "fluent" || alreadyDeciphered) {
    return (
      <div className={className}>
        {isGM && entryLanguage && (
          <LanguageBanner language={entryLanguage} label="GM View" />
        )}
        {!isGM && entryLanguage && alreadyDeciphered && (
          <LanguageBanner language={entryLanguage} label="Deciphered" tone="emerald" />
        )}
        {body}
        <Annotations entry={entry} character={character} isGM={isGM} />
      </div>
    );
  }

  if (tier === "partial") {
    return (
      <PartialLanguageView
        entry={entry}
        language={entryLanguage}
        attempt={decipherAttempt}
        retryPolicy={retryPolicy}
        sessionStartedAt={sessionStartedAt}
        body={body}
        className={className}
        onRoll={async () => {
          const dc = Number(entry?.decipher_dc) || 15;
          const modifier = getAbilityModifier(character, "int");
          const roll = Math.floor(Math.random() * 20) + 1;
          const total = roll + modifier;
          const passed = total >= dc;
          await recordAttempt.mutateAsync({
            revealType: decipherRevealType, total, dc, passed,
          });
          if (passed) toast.success(`Deciphered! Rolled ${total} vs DC ${dc}`);
          else toast.error(`Could not decipher — ${total} vs DC ${dc}`);
        }}
        annotations={<Annotations entry={entry} character={character} isGM={isGM} />}
      />
    );
  }

  // tier === "unknown"
  return (
    <div className={className}>
      <div
        className="text-lg text-slate-300 whitespace-pre-wrap leading-relaxed"
        style={{ fontFamily: fontFamilyFor(entryLanguage) }}
        title={`Written in ${entryLanguage}`}
      >
        {entry?.content || ""}
      </div>
      <Annotations entry={entry} character={character} isGM={isGM} />
    </div>
  );
}

/* ------------------------------ gates ----------------------------- */

function LockedGate({ entry, gate, attempt, retryPolicy, sessionStartedAt, onRoll }) {
  const reattempt = canReattempt({ attempt, retryPolicy, sessionStartedAt });
  const requirement = gate.type === "skill_check"
    ? `${gate.skill} check (DC ${gate.dc ?? 15})`
    : `${(gate.ability || "").toUpperCase()} check (DC ${gate.dc ?? 15})`;

  return (
    <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-8 text-center">
      <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
      <h3 className="text-white font-semibold text-lg mb-2">{entry?.title}</h3>
      <p className="text-slate-400 mb-4">
        {gate.failure_text || "This knowledge requires further investigation."}
      </p>
      <p className="text-sm text-slate-500 mb-4">
        Requires: <span className="text-amber-400">{requirement}</span>
      </p>
      {reattempt ? (
        <Button
          onClick={onRoll}
          className="bg-[#37F2D1] text-[#1E2430] hover:bg-[#2dd9bd]"
        >
          <Dices className="w-4 h-4 mr-2" /> Attempt Check
        </Button>
      ) : (
        <p className="text-sm text-red-400">
          {retryPolicy === "permanent"
            ? "You failed this check permanently."
            : retryPolicy === "next_session"
              ? "You can try again next session."
              : "You can try again in 24 hours."}
        </p>
      )}
      {attempt?.rolled_value != null && (
        <RollPill
          roll={null}
          total={attempt.rolled_value}
          dc={attempt.dc}
          passed={attempt.result === "pass"}
        />
      )}
    </div>
  );
}

function LockedLanguageGate({ entry, language, failureText }) {
  return (
    <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-8 text-center">
      <Languages className="w-12 h-12 text-amber-400 mx-auto mb-4" />
      <h3 className="text-white font-semibold text-lg mb-2">{entry?.title}</h3>
      <p className="text-slate-400 mb-4">
        {failureText || "The text is written in a language you don't speak."}
      </p>
      <p className="text-sm text-slate-500">
        Requires: <span className="text-amber-400">{language} fluency</span>
      </p>
    </div>
  );
}

function PartialLanguageView({
  entry, language, attempt, retryPolicy, sessionStartedAt,
  body, onRoll, className, annotations,
}) {
  const reattempt = canReattempt({ attempt, retryPolicy, sessionStartedAt });
  const dc = Number(entry?.decipher_dc) || 15;

  return (
    <div className={className}>
      {entry?.gist && (
        <div className="border-l-2 border-amber-500/60 bg-amber-900/10 pl-3 py-2 rounded-r mb-3">
          <p className="text-[11px] uppercase tracking-widest text-amber-400 mb-1">
            You catch the gist
          </p>
          <p className="text-sm text-amber-100/90">{entry.gist}</p>
        </div>
      )}
      <div
        className="text-lg text-slate-300 whitespace-pre-wrap leading-relaxed opacity-90"
        style={{ fontFamily: fontFamilyFor(language) }}
        title={`Written in ${language}`}
      >
        {entry?.content || ""}
      </div>
      {body}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        {reattempt ? (
          <Button
            onClick={onRoll}
            className="bg-[#37F2D1] text-[#1E2430] hover:bg-[#2dd9bd]"
          >
            <Dices className="w-4 h-4 mr-2" /> Attempt to decipher · INT DC {dc}
          </Button>
        ) : (
          <p className="text-sm text-red-400">
            {retryPolicy === "permanent"
              ? "You failed the decipher permanently."
              : retryPolicy === "next_session"
                ? "You can try to decipher again next session."
                : "You can try to decipher again in 24 hours."}
          </p>
        )}
        {attempt?.rolled_value != null && (
          <RollPill
            total={attempt.rolled_value}
            dc={attempt.dc}
            passed={attempt.result === "pass"}
          />
        )}
      </div>
      {annotations}
    </div>
  );
}

function RollPill({ total, dc, passed }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs ${
        passed
          ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300"
          : "bg-red-900/30 border border-red-700 text-red-300"
      }`}
    >
      🎲 <span className="font-bold">{total}</span>
      <span className="text-slate-400">vs DC {dc}</span>
      <span className="font-bold">{passed ? "✓ PASS" : "✗ FAIL"}</span>
    </span>
  );
}

function LanguageBanner({ language, label, tone = "amber" }) {
  const cls = tone === "emerald"
    ? "text-emerald-300 border-emerald-500/40 bg-emerald-900/10"
    : "text-amber-300 border-amber-500/40 bg-amber-900/10";
  return (
    <div className={`inline-flex items-center gap-2 text-[11px] border rounded px-2 py-0.5 mb-2 ${cls}`}>
      <Languages className="w-3 h-3" />
      Language: {language} · {label}
    </div>
  );
}

/* --------------------- Thieves' Cant / Druidic -------------------- */

function Annotations({ entry, character, isGM }) {
  const meta = entry?.metadata || {};
  const cant = meta.thieves_cant_message;
  const druidic = meta.druidic_message;
  const cantSymbols = Array.isArray(meta.thieves_cant_symbols) ? meta.thieves_cant_symbols : [];
  const druidicSymbols = Array.isArray(meta.druidic_symbols) ? meta.druidic_symbols : [];
  const knowsCant = isGM || speaksLanguage(character, "Thieves' Cant");
  const knowsDruidic = isGM || speaksLanguage(character, "Druidic");

  const hasCant = !!cant || cantSymbols.length > 0;
  const hasDruidic = !!druidic || druidicSymbols.length > 0;
  if (!hasCant && !hasDruidic) return null;

  return (
    <>
      {hasCant && knowsCant && (
        <div className="mt-4 border-l-2 border-amber-500/50 pl-4 py-2 bg-amber-900/10 rounded-r-lg space-y-2">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
            🗡️ Thieves&apos; Cant
          </p>
          <AnnotationSymbols
            selected={cantSymbols}
            catalog={THIEVES_CANT_SYMBOLS}
            defaultColor={meta.thieves_cant_color || CANT_DEFAULT_COLOR}
          />
          {cant && <p className="text-sm text-amber-200/80 italic">{cant}</p>}
        </div>
      )}
      {hasDruidic && knowsDruidic && (
        <div className="mt-4 border-l-2 border-emerald-500/50 pl-4 py-2 bg-emerald-900/10 rounded-r-lg space-y-2">
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            🌿 Druidic
          </p>
          <AnnotationSymbols
            selected={druidicSymbols}
            catalog={DRUIDIC_SYMBOLS}
            defaultColor={meta.druidic_color || DRUIDIC_DEFAULT_COLOR}
          />
          {druidic && <p className="text-sm text-emerald-200/80 italic">{druidic}</p>}
        </div>
      )}
    </>
  );
}

function AnnotationSymbols({ selected, catalog, defaultColor }) {
  if (!Array.isArray(selected) || selected.length === 0) return null;
  const byId = new Map(catalog.map((s) => [s.id, s]));
  return (
    <div className="flex flex-wrap gap-3">
      {selected.map((sel) => {
        const sym = byId.get(sel.id);
        if (!sym) return null;
        return (
          <div key={sel.id} className="flex flex-col items-center gap-0.5 w-16">
            <SymbolImage
              src={sym.src}
              color={sel.color || defaultColor}
              size={40}
              title={sym.name}
            />
            <span className="text-[9px] text-slate-400 font-semibold text-center leading-tight">
              {sym.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
