import React from "react";
import { Shield, Heart, Wind, Zap, Dices, Sparkles, Package, BookOpen, Languages, ScrollText } from "lucide-react";
import CompanionCard from "@/components/characters/CompanionCard";

/**
 * Read-only full character sheet used by the GM application review.
 * Renders every stat the GM needs to approve or reject in one pass:
 * header, combat line, ability scores with modifiers, saving throws,
 * skills, features / traits, spellcasting (save DC + attack +
 * slots + known spells grouped by level), equipment, languages,
 * backstory, and companions. Non-spellcasters skip the spells block
 * automatically.
 *
 * Kept stateless so it can drop into any review surface (dialog,
 * side panel, full-page) without its own queries.
 */

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const SKILLS = [
  ["Acrobatics", "dex"], ["Animal Handling", "wis"], ["Arcana", "int"],
  ["Athletics", "str"], ["Deception", "cha"], ["History", "int"],
  ["Insight", "wis"], ["Intimidation", "cha"], ["Investigation", "int"],
  ["Medicine", "wis"], ["Nature", "int"], ["Perception", "wis"],
  ["Performance", "cha"], ["Persuasion", "cha"], ["Religion", "int"],
  ["Sleight of Hand", "dex"], ["Stealth", "dex"], ["Survival", "wis"],
];

function mod(score) {
  const n = Number(score) || 10;
  const m = Math.floor((n - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}
function profBonus(level) {
  const l = Number(level) || 1;
  return Math.ceil(l / 4) + 1;
}

export default function FullCharacterSheetPreview({ character }) {
  if (!character) {
    return (
      <p className="text-sm text-slate-500 italic p-4">
        Character data missing — applicant may have deleted it.
      </p>
    );
  }

  const abilities = character.attributes || {};
  const hp = character.hit_points || {};
  const skills = character.skills || {};
  const savingThrows = character.saving_throws || {};
  const features = Array.isArray(character.features) ? character.features : [];
  const spells = Array.isArray(character.spells) ? character.spells : [];
  const equipment = Array.isArray(character.equipment)
    ? character.equipment
    : Array.isArray(character.inventory) ? character.inventory : [];
  const languages = Array.isArray(character.languages) ? character.languages : [];
  const companions = Array.isArray(character.companions) ? character.companions : [];
  const pb = character.proficiency_bonus || profBonus(character.level);

  // Group spells by level for the spellcasting panel. If every spell
  // is missing a `.level` we fall back to a single "Known" bucket.
  const spellsByLevel = {};
  for (const s of spells) {
    const lvl = Number(s?.level ?? 0);
    const key = Number.isFinite(lvl) ? lvl : "known";
    (spellsByLevel[key] = spellsByLevel[key] || []).push(s);
  }

  const hasSpellcasting = spells.length > 0 || character.spell_save_dc != null;
  const hasModTags = Array.isArray(character.mod_dependencies) && character.mod_dependencies.length > 0;

  return (
    <div className="space-y-4">
      <SheetHeader character={character} hasModTags={hasModTags} />

      <Section title="Combat" icon={Shield}>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          <StatBox label="AC" value={character.armor_class ?? "—"} />
          <StatBox label="HP" value={hp.max ? `${hp.current ?? hp.max}/${hp.max}` : "—"} />
          <StatBox label="Speed" value={character.speed ? `${character.speed} ft` : "—"} />
          <StatBox label="Init" value={character.initiative ?? "—"} />
          <StatBox label="Prof" value={`+${pb}`} />
        </div>
      </Section>

      <Section title="Ability Scores" icon={Dices}>
        <div className="grid grid-cols-6 gap-2">
          {ABILITIES.map((ab) => (
            <div key={ab} className="bg-[#0b1220] border border-slate-800 rounded py-2 text-center">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{ab.toUpperCase()}</p>
              <p className="text-lg font-bold text-white leading-tight">{abilities[ab] ?? 10}</p>
              <p className="text-[11px] text-[#37F2D1] font-bold">{mod(abilities[ab])}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Saving Throws" icon={Shield}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {ABILITIES.map((ab) => {
            const proficient = !!savingThrows[ab];
            const base = Math.floor(((Number(abilities[ab]) || 10) - 10) / 2);
            const total = proficient ? base + pb : base;
            return (
              <div key={ab} className="bg-[#0b1220] border border-slate-800 rounded px-2 py-1 flex items-center justify-between text-xs">
                <span className={proficient ? "font-bold text-[#37F2D1]" : "text-slate-400"}>
                  {proficient ? "●" : "○"} {ab.toUpperCase()}
                </span>
                <span className="text-white font-bold">{total >= 0 ? `+${total}` : total}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Skills" icon={Zap}>
        <div className="grid grid-cols-2 gap-1">
          {SKILLS.map(([name, abbr]) => {
            const proficient = !!skills[name];
            const base = Math.floor(((Number(abilities[abbr]) || 10) - 10) / 2);
            const total = proficient ? base + pb : base;
            return (
              <div key={name} className="flex items-center justify-between bg-[#0b1220]/50 border border-slate-800 rounded px-2 py-0.5 text-[11px]">
                <span className={proficient ? "text-[#37F2D1] font-bold" : "text-slate-400"}>
                  {proficient ? "●" : "○"} {name}
                </span>
                <span className="text-white">{total >= 0 ? `+${total}` : total}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {features.length > 0 && (
        <Section title={`Features & Traits (${features.length})`} icon={Sparkles}>
          <ul className="space-y-1">
            {features.map((f, i) => (
              <li key={i} className="bg-[#0b1220] border border-slate-800 rounded px-2 py-1.5 text-xs">
                <p className="font-bold text-white">{f?.name || f}</p>
                {f?.description && <p className="text-slate-400 text-[11px] mt-0.5 leading-snug line-clamp-3">{f.description}</p>}
                {f?.source && <p className="text-[10px] text-slate-500 italic mt-0.5">{f.source}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {hasSpellcasting && (
        <Section title="Spellcasting" icon={BookOpen}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {character.spell_save_dc != null && <StatBox label="Save DC" value={character.spell_save_dc} />}
            {character.spell_attack_bonus != null && <StatBox label="Attack" value={character.spell_attack_bonus >= 0 ? `+${character.spell_attack_bonus}` : character.spell_attack_bonus} />}
            {character.spellcasting_ability && <StatBox label="Ability" value={String(character.spellcasting_ability).toUpperCase()} />}
          </div>
          {character.spell_slots && (
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(character.spell_slots || {}).map(([lvl, count]) => count > 0 && (
                <span key={lvl} className="text-[10px] bg-violet-500/10 border border-violet-400/40 text-violet-200 rounded px-1.5 py-0.5 font-bold uppercase">
                  L{lvl}: {count}
                </span>
              ))}
            </div>
          )}
          {spells.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">No spells prepared.</p>
          ) : (
            <div className="space-y-2">
              {Object.keys(spellsByLevel)
                .sort((a, b) => Number(a) - Number(b))
                .map((lvl) => (
                  <div key={lvl}>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                      {lvl === "0" ? "Cantrips" : lvl === "known" ? "Spell List" : `Level ${lvl}`}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {spellsByLevel[lvl].map((s, i) => (
                        <span key={i} className="text-[11px] bg-[#0b1220] border border-slate-700 rounded px-1.5 py-0.5 text-white">
                          {s?.name || s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>
      )}

      {equipment.length > 0 && (
        <Section title={`Equipment (${equipment.length})`} icon={Package}>
          <ul className="grid grid-cols-2 gap-1">
            {equipment.map((it, i) => (
              <li key={i} className="bg-[#0b1220] border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200">
                {it?.name || it}
                {it?.quantity > 1 && <span className="text-slate-500"> ×{it.quantity}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {languages.length > 0 && (
        <Section title="Languages & Proficiencies" icon={Languages}>
          <div className="flex flex-wrap gap-1">
            {languages.map((l, i) => (
              <span key={i} className="text-[11px] bg-[#0b1220] border border-slate-700 rounded px-1.5 py-0.5 text-slate-200">
                {l?.name || l}
              </span>
            ))}
          </div>
        </Section>
      )}

      {character.backstory && (
        <Section title="Backstory" icon={ScrollText}>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{character.backstory}</p>
        </Section>
      )}

      {companions.length > 0 && (
        <Section title={`Companions (${companions.length})`} icon={Heart}>
          <div className="space-y-2">
            {companions.map((c, i) => (
              <CompanionCard key={c?.id || i} companion={c} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SheetHeader({ character, hasModTags }) {
  return (
    <div className="flex items-start gap-3 bg-[#0b1220] border border-slate-700 rounded-lg p-3">
      {character.profile_avatar_url || character.avatar_url ? (
        <img
          src={character.profile_avatar_url || character.avatar_url}
          alt=""
          className="w-20 h-20 rounded-md object-cover object-top bg-[#050816] border border-slate-700 flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-md bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-300 flex-shrink-0">
          {(character.name || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xl font-black leading-tight">{character.name || "Unnamed"}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Level {character.level || 1} · {character.race || "?"}
          {character.subrace ? ` (${character.subrace})` : ""}
          {character.class ? ` · ${character.class}` : ""}
          {character.subclass ? ` (${character.subclass})` : ""}
        </p>
        {character.alignment && (
          <p className="text-[11px] text-slate-500 mt-0.5">
            {character.alignment}{character.background ? ` · ${character.background}` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {hasModTags && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 bg-[#37F2D1]/15 text-[#37F2D1] border border-[#37F2D1]/40">
              <Sparkles className="w-3 h-3" /> Modded
            </span>
          )}
          {character.campaign_origin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5 bg-violet-500/15 text-violet-200 border border-violet-400/40">
              <Sparkles className="w-3 h-3" /> Built for {character.campaign_origin}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section>
      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1.5 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[#37F2D1]" /> {title}
      </h4>
      {children}
    </section>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-bold text-white leading-tight">{value}</p>
    </div>
  );
}
