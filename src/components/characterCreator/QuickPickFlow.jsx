import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Check, X as XIcon, ChevronLeft, ChevronRight, Shuffle, Upload, ArrowLeft, Dice5, Loader2,
} from "lucide-react";
import { quickPick, generatePortrait } from "@/api/aiClient";
import { uploadFile } from "@/utils/uploadFile";
import { trackEvent } from "@/utils/analytics";
import { useAuth } from "@/lib/AuthContext";
import RaceStep from "@/components/characterCreator/RaceStep";
import ClassStep from "@/components/characterCreator/ClassStep";

const BACKGROUNDS = [
  "Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero",
  "Guild Artisan", "Hermit", "Noble", "Outlander", "Sage",
  "Sailor", "Soldier", "Urchin",
];

/**
 * Quick Pick flow — 3-step picker (race / class / background), then
 * a loading state while the AI returns 6 candidates, then a
 * swipe-card UI for the player to pass / pick. On pick we generate
 * a portrait and hand the finished record back to the parent via
 * onComplete (the parent saves to the characters table).
 */
export default function QuickPickFlow({ onBack, onComplete, campaignId, busy = false }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0 race, 1 class, 2 background, 3 loading, 4 swipe, 5 portrait-preview
  const [draft, setDraft] = useState({ race: "", subrace: "", class: "", subclass: "", background: "" });

  const [candidates, setCandidates] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState(null);
  const [portrait, setPortrait] = useState(null);
  const [bloodiedPortrait, setBloodiedPortrait] = useState(null);
  const [portraitUploading, setPortraitUploading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Finding your perfect match…");

  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const runQuickPick = async () => {
    setLoadingLabel("Finding your perfect match…");
    setStep(3);
    trackEvent(user?.id, 'ai_quick_pick_used', {
      race: draft.race,
      class: draft.class,
      background: draft.background,
    });
    try {
      const res = await quickPick({
        race: draft.race,
        class: draft.class,
        background: draft.background,
      });
      const list = Array.isArray(res.characters) ? res.characters : [];
      if (list.length === 0) {
        throw new Error("The AI couldn't find a match. Try a different combination.");
      }
      setCandidates(list);
      setCursor(0);
      setStep(4);
    } catch (err) {
      toast.error(err?.message || "Quick Pick failed");
      setStep(2);
    }
  };

  const pass = () => {
    if (cursor < candidates.length - 1) {
      setCursor((c) => c + 1);
    } else {
      setCursor(candidates.length); // out-of-range → exhausted view
    }
  };

  const pickCurrent = async () => {
    const choice = candidates[cursor];
    if (!choice) return;
    setPicked(choice);
    setLoadingLabel("Painting their portrait…");
    setStep(5);
    try {
      const p = await generatePortrait({
        description: choice.appearance || `${choice.race} ${choice.class}, ${choice.gender || ""}`,
        portrait_prompt: choice.portrait_prompt,
        campaign_id: campaignId || null,
      });
      setPortrait(p);
      trackEvent(user?.id, 'ai_portrait_generated', { subject_type: 'character_main' });
    } catch (err) {
      toast.error(err?.message || "Portrait generation failed — you can still upload one.");
      setPortrait(null);
    }
    // Queue a bloodied variant in the background. Non-blocking —
    // combat still falls back to the CSS overlay if this never
    // resolves.
    generatePortrait({
      description:
        `${choice.appearance || `${choice.race} ${choice.class}`}. They look exhausted, wounded, and battle-worn. ` +
        `Cuts, bruises, torn clothing, smears of blood. Same character after a brutal fight.`,
      campaign_id: campaignId || null,
    })
      .then((bp) => setBloodiedPortrait(bp))
      .catch(() => { /* non-blocking */ });
  };

  const replacePortrait = async (file) => {
    if (!file) return;
    setPortraitUploading(true);
    try {
      const { file_url } = await uploadFile(file, "avatars", "characters");
      setPortrait({ image_url: file_url, replaced: true });
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setPortraitUploading(false);
    }
  };

  const confirmCharacter = () => {
    if (!picked) return;
    onComplete?.({
      ...picked,
      race: picked.race || draft.race,
      class: picked.class || draft.class,
      background: picked.background || draft.background,
      avatar_url: portrait?.image_url || null,
      bloodied_avatar_url: bloodiedPortrait?.image_url || null,
    });
  };

  // --- render ---
  if (step === 0) {
    return (
      <Shell title="Quick Pick — Step 1 of 3" subtitle="Pick your race." onBack={onBack}>
        <div className="bg-[#1E2430]/70 rounded-2xl p-4 border border-[#2A3441] max-h-[65vh] overflow-y-auto custom-scrollbar">
          <RaceStep characterData={draft} updateCharacterData={updateDraft} />
        </div>
        <StepFooter
          backLabel="Back"
          onBack={onBack}
          nextDisabled={!draft.race}
          nextLabel="Next: Class"
          onNext={() => setStep(1)}
        />
      </Shell>
    );
  }
  if (step === 1) {
    return (
      <Shell title="Quick Pick — Step 2 of 3" subtitle="Pick your class." onBack={() => setStep(0)}>
        <div className="bg-[#1E2430]/70 rounded-2xl p-4 border border-[#2A3441] max-h-[65vh] overflow-y-auto custom-scrollbar">
          <ClassStep characterData={draft} updateCharacterData={updateDraft} />
        </div>
        <StepFooter
          backLabel="Back"
          onBack={() => setStep(0)}
          nextDisabled={!draft.class}
          nextLabel="Next: Background"
          onNext={() => setStep(2)}
        />
      </Shell>
    );
  }
  if (step === 2) {
    return (
      <Shell title="Quick Pick — Step 3 of 3" subtitle="Pick your background." onBack={() => setStep(1)}>
        <div className="bg-[#1E2430]/70 rounded-2xl p-6 border border-[#2A3441]">
          <label className="block text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">
            Background
          </label>
          <Select
            value={draft.background}
            onValueChange={(v) => updateDraft({ background: v })}
          >
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white max-w-md">
              <SelectValue placeholder="Select a background" />
            </SelectTrigger>
            <SelectContent>
              {BACKGROUNDS.map((bg) => (
                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-3">
            Your background flavors the AI's six picks. You can always change this later.
          </p>
        </div>
        <StepFooter
          backLabel="Back"
          onBack={() => setStep(1)}
          nextDisabled={!draft.background}
          nextLabel="Find My Match"
          nextIcon={<Shuffle className="w-4 h-4" />}
          onNext={runQuickPick}
        />
      </Shell>
    );
  }

  if (step === 3 || (step === 5 && !portrait && !picked)) {
    return <LoadingScreen label={loadingLabel} />;
  }

  if (step === 4) {
    const exhausted = cursor >= candidates.length;
    if (exhausted) {
      return (
        <Shell title="No match?" subtitle="Pass on all six? Let's try again." onBack={() => setStep(2)}>
          <div className="bg-[#1E2430]/70 rounded-2xl p-10 border border-[#2A3441] text-center">
            <Dice5 className="w-12 h-12 text-[#fbbf24] mx-auto mb-3" />
            <p className="text-white text-lg font-bold mb-1">Try Quick Pick again?</p>
            <p className="text-slate-400 text-sm mb-4">
              We'll grab six fresh candidates with the same race / class / background.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Change picks</Button>
              <Button onClick={runQuickPick} className="bg-[#fbbf24] text-[#050816] font-bold hover:bg-[#fde68a]">
                <Shuffle className="w-4 h-4 mr-2" /> Reshuffle
              </Button>
            </div>
          </div>
        </Shell>
      );
    }
    const card = candidates[cursor];
    return (
      <Shell title="Quick Pick" subtitle={`${cursor + 1} of ${candidates.length}`} onBack={() => setStep(2)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={cursor}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
          >
            <CandidateCard card={card} />
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => setCursor((c) => Math.max(0, c - 1))}
            disabled={cursor === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={pass}
            className="bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20"
            variant="outline"
          >
            <XIcon className="w-4 h-4 mr-1" /> Pass
          </Button>
          <Button
            onClick={pickCurrent}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold"
          >
            <Check className="w-4 h-4 mr-1" /> Pick this one
          </Button>
          <Button
            variant="outline"
            onClick={() => setCursor((c) => Math.min(candidates.length - 1, c + 1))}
            disabled={cursor === candidates.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Shell>
    );
  }

  // step === 5 — picked + (maybe) portrait
  return (
    <Shell title={picked?.name || "Your character"} subtitle="One last look." onBack={() => setStep(4)}>
      <div className="bg-[#1E2430]/70 rounded-2xl p-6 border border-[#2A3441] flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          {portrait?.image_url ? (
            <img
              src={portrait.image_url}
              alt="Portrait"
              className="w-48 h-48 rounded-xl object-cover border-2 border-[#37F2D1]/60 shadow-[0_0_25px_rgba(55,242,209,0.25)]"
            />
          ) : (
            <div className="w-48 h-48 rounded-xl bg-[#050816] border-2 border-slate-700 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#37F2D1]" />
            </div>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#37F2D1] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
            <Upload className="w-3 h-3" />
            {portraitUploading ? "Uploading…" : "Upload your own portrait instead"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => replacePortrait(e.target.files?.[0])}
              disabled={portraitUploading}
            />
          </label>
        </div>
        <div className="flex-1">
          <CandidateCard card={picked} compact />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => setStep(4)}>Back to picks</Button>
        <Button
          onClick={confirmCharacter}
          disabled={busy}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          {busy ? "Saving…" : "Create Character"}
        </Button>
      </div>
    </Shell>
  );
}

// ---------- Sub components ----------

function Shell({ title, subtitle, onBack, children }) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="text-slate-300">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function StepFooter({ onBack, backLabel = "Back", onNext, nextLabel = "Next", nextDisabled, nextIcon }) {
  return (
    <div className="flex items-center justify-between mt-4">
      <Button variant="outline" onClick={onBack}>{backLabel}</Button>
      <Button
        onClick={onNext}
        disabled={!!nextDisabled}
        className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
      >
        {nextIcon ? <span className="mr-2 flex items-center">{nextIcon}</span> : null}
        {nextLabel}
      </Button>
    </div>
  );
}

function LoadingScreen({ label }) {
  return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
        className="w-20 h-20 mx-auto mb-6 border-4 border-[#37F2D1]/30 border-t-[#37F2D1] rounded-full"
      />
      <h3 className="text-xl font-bold text-white">{label}</h3>
      <p className="text-sm text-slate-400 mt-2">Shuffling the deck of destinies…</p>
    </div>
  );
}

function CandidateCard({ card, compact = false }) {
  if (!card) return null;
  const abilityRow = card.ability_scores || card.stats?.ability_scores || card.stats || {};
  return (
    <div className={`bg-[#0b1220] border border-[#1e293b] rounded-2xl p-5 ${compact ? "" : "shadow-[0_20px_60px_rgba(0,0,0,0.6)]"}`}>
      <div className="flex items-start justify-between mb-2 gap-3">
        <div>
          <h3 className="text-2xl font-black text-white">{card.name}</h3>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">
            {[card.race, card.subrace, card.class, card.subclass].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end">
          {card.gender && <Badge className="bg-[#37F2D1]/20 text-[#37F2D1] border border-[#37F2D1]/50">{card.gender}</Badge>}
          {card.alignment && <Badge variant="outline" className="text-slate-300 border-slate-600">{card.alignment}</Badge>}
        </div>
      </div>

      {card.tagline && (
        <p className="text-sm italic text-slate-300 mb-3">"{card.tagline}"</p>
      )}

      {card.appearance && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Appearance</div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{card.appearance}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {Array.isArray(card.likes) && card.likes.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#22c55e] font-bold mb-0.5">Likes</div>
            <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
              {card.likes.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        )}
        {Array.isArray(card.dislikes) && card.dislikes.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#ef4444] font-bold mb-0.5">Dislikes</div>
            <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
              {card.dislikes.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        )}
      </div>

      {card.story_hook && (
        <div className="bg-[#050816] border border-[#fbbf24]/40 rounded-lg p-3 mb-3">
          <div className="text-[10px] uppercase tracking-widest text-[#fbbf24] font-bold mb-1">Story hook</div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{card.story_hook}</p>
        </div>
      )}

      {abilityRow && Object.keys(abilityRow).length > 0 && (
        <div className="grid grid-cols-6 gap-2 text-center">
          {["str","dex","con","int","wis","cha"].map((k) => (
            <div key={k} className="bg-[#050816] border border-[#1e293b] rounded p-1">
              <div className="text-[9px] uppercase tracking-widest text-slate-500">{k}</div>
              <div className="text-sm font-bold text-white">{abilityRow[k] ?? abilityRow[k.toUpperCase()] ?? 10}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
