import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { aiGenerate, generatePortrait } from "@/api/aiClient";
import { uploadFile } from "@/utils/uploadFile";
import { trackEvent } from "@/utils/analytics";
import { useAuth } from "@/lib/AuthContext";

/**
 * AI Generate flow — one prompt box, one API call, a preview with
 * portrait, and a save button. Parent supplies `onComplete` with
 * the final character record + avatar_url.
 */
export default function AIGenerateFlow({ onBack, onComplete, campaignId, busy = false }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle"); // idle | generating | painting | ready
  const [character, setCharacter] = useState(null);
  const [portrait, setPortrait] = useState(null);
  const [bloodiedPortrait, setBloodiedPortrait] = useState(null);
  const [portraitUploading, setPortraitUploading] = useState(false);

  const run = async () => {
    if (!prompt.trim()) {
      toast.error("Describe your character first.");
      return;
    }
    setStatus("generating");
    setCharacter(null);
    setPortrait(null);
    setBloodiedPortrait(null);
    trackEvent(user?.id, 'ai_generate_used', { prompt_length: prompt.length });
    try {
      const c = await aiGenerate(prompt);
      setCharacter(c);
      setStatus("painting");
      try {
        const p = await generatePortrait({
          description: c.appearance || c.backstory || prompt,
          portrait_prompt: c.portrait_prompt,
          campaign_id: campaignId || null,
        });
        setPortrait(p);
        trackEvent(user?.id, 'ai_portrait_generated', { subject_type: 'character_main' });
      } catch (err) {
        toast.error(err?.message || "Portrait generation failed — you can still upload one.");
      }
      // Queue a bloodied variant in the background. A failure here
      // is soft — the combat UI falls back to the CSS splatter
      // overlay when bloodied_avatar_url is missing.
      generatePortrait({
        description:
          `${c.appearance || c.backstory || prompt}. They look exhausted, wounded, and battle-worn. ` +
          `Cuts, bruises, torn clothing, smears of blood. Same character after a brutal fight.`,
        campaign_id: campaignId || null,
      })
        .then((bp) => setBloodiedPortrait(bp))
        .catch(() => { /* non-blocking */ });
      setStatus("ready");
    } catch (err) {
      toast.error(err?.message || "Generation failed");
      setStatus("idle");
    }
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

  const tryAgain = () => {
    setCharacter(null);
    setPortrait(null);
    setStatus("idle");
  };

  const confirm = () => {
    if (!character) return;
    onComplete?.({
      ...character,
      avatar_url: portrait?.image_url || null,
      bloodied_avatar_url: bloodiedPortrait?.image_url || null,
    });
  };

  if (status === "idle") {
    return (
      <Shell title="AI Generate" subtitle="Describe your dream character." onBack={onBack}>
        <div className="bg-[#1E2430]/70 rounded-2xl p-6 border border-[#2A3441]">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="A grizzled dwarf who used to be a pirate captain but got cursed and now searches for a way to break it. Loves rum and hates elves."
            className="bg-[#0b1220] border-slate-700 text-white"
          />
          <p className="text-xs text-slate-500 mt-2">
            Include race / class hints if you have preferences. Otherwise let the AI surprise you.
          </p>
          <div className="flex justify-end mt-4">
            <Button
              onClick={run}
              disabled={!prompt.trim()}
              className="bg-[#a855f7] hover:bg-[#c084fc] text-white font-bold"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === "generating") {
    return <LoadingScreen label="Forging your destiny…" accent="#a855f7" />;
  }
  if (status === "painting" && !portrait) {
    return <LoadingScreen label="Painting their portrait…" accent="#a855f7" />;
  }

  return (
    <Shell title={character?.name || "Your character"} subtitle="AI-generated — check the details before saving." onBack={onBack}>
      <div className="bg-[#1E2430]/70 rounded-2xl p-6 border border-[#2A3441] grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
        <div className="flex flex-col items-center gap-3">
          {portrait?.image_url ? (
            <img
              src={portrait.image_url}
              alt="Portrait"
              className="w-52 h-52 rounded-xl object-cover border-2 border-[#a855f7]/60 shadow-[0_0_25px_rgba(168,85,247,0.3)]"
            />
          ) : (
            <div className="w-52 h-52 rounded-xl bg-[#050816] border-2 border-slate-700 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#a855f7]" />
            </div>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer bg-[#0b1220] border border-slate-700 hover:border-[#a855f7] rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">
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
        <div>
          <CharacterSummary character={character} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <Button variant="outline" onClick={tryAgain} className="text-slate-300">
          <RefreshCw className="w-3 h-3 mr-1" /> Not quite — try again
        </Button>
        <Button
          onClick={confirm}
          disabled={busy || !character}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          {busy ? "Saving…" : "This is perfect — Create Character"}
        </Button>
      </div>
    </Shell>
  );
}

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

function LoadingScreen({ label, accent = "#a855f7" }) {
  return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
        className="w-20 h-20 mx-auto mb-6 rounded-full border-4"
        style={{ borderColor: `${accent}33`, borderTopColor: accent }}
      />
      <h3 className="text-xl font-bold text-white">{label}</h3>
      <p className="text-sm text-slate-400 mt-2">Conjuring stats, spells, and backstory…</p>
    </div>
  );
}

function CharacterSummary({ character }) {
  if (!character) return null;
  const abilities = character.ability_scores || character.stats?.ability_scores || character.stats || {};
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-2xl font-black text-white">{character.name}</h3>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">
            Level {character.level || 1}
            {" · "}
            {[character.race, character.subrace, character.class, character.subclass].filter(Boolean).join(" · ")}
            {character.background ? ` · ${character.background}` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          {character.alignment && (
            <Badge variant="outline" className="text-slate-300 border-slate-600">{character.alignment}</Badge>
          )}
          {character.gender && (
            <Badge className="bg-[#a855f7]/20 text-[#c084fc] border border-[#a855f7]/50">{character.gender}</Badge>
          )}
        </div>
      </div>

      {character.backstory && (
        <Section label="Backstory">{character.backstory}</Section>
      )}
      {character.personality && (
        <Section label="Personality">{character.personality}</Section>
      )}
      {character.build_reasoning && (
        <Section label="Why this build">{character.build_reasoning}</Section>
      )}
      {character.appearance && !character.backstory && (
        <Section label="Appearance">{character.appearance}</Section>
      )}

      <div className="grid grid-cols-6 gap-2 text-center">
        {["str","dex","con","int","wis","cha"].map((k) => (
          <div key={k} className="bg-[#050816] border border-[#1e293b] rounded p-1">
            <div className="text-[9px] uppercase tracking-widest text-slate-500">{k}</div>
            <div className="text-sm font-bold text-white">{abilities[k] ?? abilities[k.toUpperCase()] ?? 10}</div>
          </div>
        ))}
      </div>

      {Array.isArray(character.spells_known) && character.spells_known.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Spells</div>
          <div className="flex flex-wrap gap-1.5">
            {character.spells_known.slice(0, 12).map((s, i) => (
              <Badge key={i} variant="outline" className="text-slate-300 border-slate-600 text-[10px]">{s}</Badge>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(character.equipment) && character.equipment.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">Equipment</div>
          <div className="flex flex-wrap gap-1.5">
            {character.equipment.slice(0, 12).map((s, i) => (
              <Badge key={i} variant="outline" className="text-slate-300 border-slate-600 text-[10px]">
                {typeof s === "string" ? s : s?.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">{label}</div>
      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  );
}
