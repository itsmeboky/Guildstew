
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClassFeaturesForLevel } from "@/components/dnd5e/classFeatures";
import SubclassPicker from "@/components/characterCreator/SubclassPicker";
import InfoTip from "@/components/characterCreator/InfoTip";
import { tipFor } from "@/components/characterCreator/creatorTips";
import {
  meetsMulticlassPrereqs,
  multiclassPrereqDescription,
  multiclassProficienciesFor,
  FEATS,
} from "@/components/dnd5e/dnd5eRules";
import {
  ABILITY_KEYS,
  ABILITY_LABELS,
  MAX_ABILITY_SCORE,
  asiKey,
  reachedAsiLevels,
  feasibleFeats,
  bumpsForSelection,
  applyAsiBumps,
  validateSelection,
  fmtMod,
} from "@/components/characterCreator/asiSelections";

// Canonical "choose your specialization" feature names per class.
// When a feature's name lands in this set, render the arrow-pattern
// SubclassPicker instead of the legacy Select dropdown. Other
// choice-required features (Fighting Style, Expertise picks,
// Eldritch Invocations, etc.) keep the dropdown — those are short
// flat lists, not paragraph-rich subclass cards.
const SUBCLASS_FEATURE_NAMES = new Set([
  "Primal Path",
  "Bard College",
  "Divine Domain",
  "Druid Circle",
  "Martial Archetype",
  "Monastic Tradition",
  "Sacred Oath",
  "Ranger Archetype",
  "Ranger Conclave",
  "Roguish Archetype",
  "Sorcerous Origin",
  "Otherworldly Patron",
  "Arcane Tradition",
]);

function isSubclassFeature(feature) {
  return !!feature?.choiceRequired && SUBCLASS_FEATURE_NAMES.has(feature?.name);
}

export default function ClassFeaturesStep({ characterData, updateCharacterData }) {
  const [multiclasses, setMulticlasses] = useState(characterData.multiclasses || []);
  const [featureChoices, setFeatureChoices] = useState(characterData.feature_choices || {});
  const [asiSelections, setAsiSelections] = useState(characterData.asiSelections || {});

  const availableClasses = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"];
  const usedClasses = [characterData.class, ...multiclasses.map(mc => mc.class).filter(Boolean)];

  const totalLevel = Number(characterData.level) || 1;
  const primaryClassLevel = totalLevel - multiclasses.reduce((sum, mc) => sum + (mc.level || 0), 0);

  // Pre-ASI scores: written by AbilityScoresStep as
  // baseAttributes = base + racial. The ASI picker below applies
  // bumps relative to this baseline so re-picks don't compound.
  // Falls back to attributes for editing legacy characters that
  // never had a baseAttributes field saved.
  const baseAttributes = characterData.baseAttributes || characterData.attributes || {};

  // Whenever asiSelections changes, recompute effective attributes
  // (= base + racial + ASI bumps) and persist both the audit trail
  // and the derived attributes. Downstream consumers (HP / skill /
  // save DC) keep reading characterData.attributes and naturally
  // see the post-ASI value.
  React.useEffect(() => {
    updateCharacterData({
      asiSelections,
      attributes: applyAsiBumps(baseAttributes, asiSelections),
    });
    // baseAttributes intentionally omitted from deps — it's the
    // source-of-truth for the recompute, not an input that should
    // re-trigger when the user merely revisits this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asiSelections]);

  // Reached ASI levels for the primary class only. Multiclass ASI
  // distribution is filed as a smell (recon Layer 3) — the storage
  // shape is multiclass-ready but the picker UI surfaces only the
  // primary-class ASIs for now.
  const primaryAsiLevels = reachedAsiLevels(characterData.class, primaryClassLevel);

  // Prune ASI selections at levels the player has retreated below
  // (e.g. user picked level 8, took the level-4 ASI, then dropped
  // back to level 5 — the level-4 pick stays, but if they drop to
  // 3 it should disappear). We compare against the primary class's
  // currently-reached ASI levels.
  React.useEffect(() => {
    const validKeys = new Set(primaryAsiLevels.map((lvl) => asiKey(characterData.class, lvl)));
    const stale = Object.keys(asiSelections || {}).filter((k) => {
      // Only consider primary-class keys for pruning here. Multi-
      // class ASI keys (e.g. "Fighter-4" while primary is Wizard)
      // are left untouched — that's the smell flagged in the recon.
      const [keyClass] = k.split("-");
      return keyClass === characterData.class && !validKeys.has(k);
    });
    if (stale.length === 0) return;
    setAsiSelections((current) => {
      const next = { ...current };
      for (const k of stale) delete next[k];
      return next;
    });
  }, [characterData.class, primaryAsiLevels.length]);

  const handleLevelChange = (newLevel) => {
    const lvl = Math.max(1, Math.min(20, Number(newLevel) || 1));
    // Clamp multiclass entries so primary stays at least 1.
    const totalMc = multiclasses.reduce((sum, mc) => sum + (mc.level || 0), 0);
    const clampedMcs = totalMc > lvl - 1
      ? multiclasses.map((mc) => ({ ...mc, level: 0 })).filter(() => false) // wipe if level can't fit
      : multiclasses;
    if (clampedMcs !== multiclasses) setMulticlasses(clampedMcs);
    updateCharacterData({
      level: lvl,
      ...(clampedMcs !== multiclasses ? { multiclasses: clampedMcs } : {}),
    });
  };

  const handleAsiChange = (level, nextSelection) => {
    const key = asiKey(characterData.class, level);
    setAsiSelections((current) => {
      const next = { ...current };
      if (!nextSelection || (!nextSelection.kind)) {
        delete next[key];
      } else {
        next[key] = nextSelection;
      }
      return next;
    });
  };

  // Multiclass prereq gates (PHB p. 163). Both rules must pass:
  //   (a) Player meets the prereq for their PRIMARY class.
  //   (b) Player meets the prereq for the TARGET class being added.
  // Rule (a) is computed once and shown as a banner — failing it
  // hides the Add Class button entirely. Rule (b) disables
  // individual class options in the per-multiclass dropdown so
  // the player can see what's available without guessing.
  const attributes = characterData.attributes || {};
  const primaryPrereqMet = meetsMulticlassPrereqs(characterData.class, attributes);
  const primaryPrereqDesc = multiclassPrereqDescription(characterData.class);

  const canMulticlass =
    characterData.level >= 2 && primaryClassLevel >= 1 && primaryPrereqMet;

  const primaryFeatures = getClassFeaturesForLevel(characterData.class, primaryClassLevel) || [];

  const multiclassFeatures = multiclasses.flatMap(mc => {
    if (!mc.class || !mc.level) return [];
    const features = getClassFeaturesForLevel(mc.class, mc.level) || [];
    return features.map(f => ({ ...f, multiclass: mc.class }));
  });

  const allFeatures = [...primaryFeatures, ...multiclassFeatures];

  const handleAddMulticlass = () => {
    if (primaryClassLevel <= 1) return;
    setMulticlasses([...multiclasses, { class: "", level: 1 }]);
  };

  const handleRemoveMulticlass = (index) => {
    const newMulticlasses = multiclasses.filter((_, i) => i !== index);
    setMulticlasses(newMulticlasses);
    updateCharacterData({ multiclasses: newMulticlasses });
  };

  const handleMulticlassChange = (index, field, value) => {
    const newMulticlasses = [...multiclasses];
    newMulticlasses[index][field] = value;
    
    const totalMulticlassLevels = newMulticlasses.reduce((sum, mc) => sum + (mc.level || 0), 0);
    if (characterData.level - totalMulticlassLevels < 1) {
      newMulticlasses[index].level = Math.max(1, characterData.level - totalMulticlassLevels + (multiclasses[index].level || 1) - 1);
    }
    
    setMulticlasses(newMulticlasses);
    updateCharacterData({ multiclasses: newMulticlasses });
  };

  const handleFeatureChoice = (featureKey, choice) => {
    const newChoices = { ...featureChoices, [featureKey]: choice };
    setFeatureChoices(newChoices);
    updateCharacterData({ feature_choices: newChoices });
  };

  const requiredChoices = allFeatures.filter(f => f.choiceRequired);
  const allChoicesMade = requiredChoices.every(f => {
    const key = `${f.multiclass || characterData.class}-${f.level}-${f.name}`;
    return featureChoices[key];
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-[#2A3441] rounded-xl p-6 mb-6 border-2 border-[#1E2430]">
        <h2 className="text-2xl font-bold text-[#FFC6AA] mb-3">Class Features</h2>
        <p className="text-white mb-3">
          Class features are special abilities you gain as you level up. Some features are granted automatically,
          while others require you to make choices (like picking a subclass or fighting style).
        </p>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <label className="text-sm font-bold text-white">Character Level:</label>
          <Select
            value={String(totalLevel)}
            onValueChange={handleLevelChange}
          >
            <SelectTrigger className="w-32 bg-[#1E2430] border-[#5B4B9E] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-[#5B4B9E] text-white">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((l) => (
                <SelectItem key={l} value={String(l)} className="text-white">
                  Level {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-white/60">
            Your {characterData.class} level: <span className="font-bold text-[#37F2D1]">{primaryClassLevel}</span>
            {multiclasses.filter((mc) => mc.class).length > 0 && (
              <span className="ml-1">(total − multiclass levels)</span>
            )}
          </span>
        </div>

        {totalLevel >= 2 && (
          <p className="text-white flex items-start gap-2 flex-wrap mt-4">
            💡 <span className="font-bold">Multiclassing:</span> At level 2+, you can multiclass into another class to gain abilities from multiple sources.
            Each level you gain can be put into any of your classes.
            <InfoTip>{tipFor("multiclass_prereqs")}</InfoTip>
          </p>
        )}
      </div>

      {primaryAsiLevels.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h3 className="text-lg font-bold text-amber-200">
              Ability Score Improvements
            </h3>
            <span className="text-xs text-white/60">
              ({primaryAsiLevels.length} earned at {characterData.class} level{primaryAsiLevels.length > 1 ? "s" : ""} {primaryAsiLevels.join(", ")})
            </span>
          </div>
          {primaryAsiLevels.map((lvl) => {
            const key = asiKey(characterData.class, lvl);
            return (
              <AsiCard
                key={key}
                className={characterData.class}
                level={lvl}
                selection={asiSelections[key]}
                baseAttributes={baseAttributes}
                asiSelections={asiSelections}
                ownKey={key}
                onChange={(next) => handleAsiChange(lvl, next)}
              />
            );
          })}
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="bg-[#2A3441] border-2 border-[#5B4B9E] rounded-lg px-4 py-2">
            <span className="text-[#5B4B9E] font-bold text-lg">{characterData.class}</span>
            <span className="text-white ml-2">Level {primaryClassLevel}</span>
          </div>
          {multiclasses.filter(mc => mc.class).map((mc, idx) => (
            <div key={idx} className="bg-[#2A3441] border-2 border-[#5B4B9E] rounded-lg px-4 py-2">
              <span className="text-[#5B4B9E] font-bold text-lg">{mc.class}</span>
              <span className="text-white ml-2">Level {mc.level}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {primaryFeatures.map((feature, idx) => {
            const featureKey = `${characterData.class}-${feature.level}-${feature.name}`;
            const hasChoice = feature.choiceRequired;
            const currentChoice = featureChoices[featureKey];

            return (
              <div
                key={idx}
                className={`p-6 rounded-xl border-2 transition-all ${
                  hasChoice && !currentChoice
                    ? 'bg-[#2A3441] border-[#FF5722] border-4'
                    : 'bg-[#2A3441] border-[#1E2430]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-lg font-bold text-[#FFC6AA]">{feature.name}</h4>
                    {feature.uses && (
                      <Badge className="bg-[#37F2D1] text-[#1E2430] text-xs">
                        {feature.uses}
                      </Badge>
                    )}
                    {feature.level && (
                      <Badge className="bg-[#1E2430] text-white border border-white/20 text-xs">
                        Gained at Level {feature.level}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-white text-sm leading-7 whitespace-pre-line mb-4">
                  {feature.description}
                </p>

                {hasChoice && feature.choices && (
                  isSubclassFeature(feature) ? (
                    <div className="mt-5">
                      <SubclassPicker
                        choices={feature.choices}
                        value={currentChoice || null}
                        onSelect={(value) => handleFeatureChoice(featureKey, value)}
                        featureName={feature.name}
                        levelGained={feature.level}
                      />
                    </div>
                  ) : (
                    <div className="mt-5 p-5 bg-[#1E2430]/50 rounded-lg border-2 border-[#FF5722]">
                      <p className="text-[#FF5722] font-semibold mb-4 text-sm">
                        ⚠️ You must make a choice for this feature:
                      </p>

                      <Select
                        value={currentChoice || ""}
                        onValueChange={(value) => handleFeatureChoice(featureKey, value)}
                      >
                        <SelectTrigger className="h-auto min-h-11 w-full">
                          <SelectValue placeholder="Select option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {feature.choices.map((choice, cIdx) => {
                            const choiceName = typeof choice === 'string' ? choice : choice.name;
                            const choiceDesc = typeof choice === 'object' ? choice.description : null;
                            return (
                              <SelectItem
                                key={cIdx}
                                value={choiceName}
                                description={choiceDesc || undefined}
                              >
                                {choiceName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {characterData.level >= 2 && primaryClassLevel >= 1 && !primaryPrereqMet && (
        <div className="mb-6 bg-[#2A3441] border-2 border-[#FF5722]/60 rounded-xl p-4">
          <h3 className="text-[#FF5722] font-bold mb-1 flex items-center gap-2">
            ⚠️ Multiclass locked — primary class prereq not met
          </h3>
          <p className="text-sm text-white/80">
            To multiclass out of <span className="font-bold">{characterData.class}</span>,
            your character needs <span className="text-[#FF5722] font-bold">{primaryPrereqDesc}</span>.
            Adjust your ability scores on the previous step to unlock multiclassing.
          </p>
        </div>
      )}

      {canMulticlass && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#5B4B9E] flex items-center gap-2">
              Multiclassing
              <InfoTip>{tipFor("multiclass_prereqs")}</InfoTip>
            </h3>
            <Button
              onClick={handleAddMulticlass}
              disabled={primaryClassLevel <= 1}
              className="bg-[#5B4B9E] hover:bg-[#4A3D8A] text-white disabled:opacity-50"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </div>

          {multiclasses.map((mc, index) => (
            <div key={index} className="bg-[#2A3441] rounded-xl p-5 mb-4 border-2 border-[#5B4B9E]">
              <div className="flex items-center gap-4 mb-4">
                <Select
                  value={mc.class || ""}
                  onValueChange={(value) => handleMulticlassChange(index, 'class', value)}
                >
                  <SelectTrigger className="bg-[#1E2430] border-white text-white flex-1">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3441] border-[#1E2430]">
                    {availableClasses
                      .filter(c => !usedClasses.includes(c) || c === mc.class)
                      .map((cls) => {
                        const meets = meetsMulticlassPrereqs(cls, attributes);
                        const desc = multiclassPrereqDescription(cls);
                        return (
                          <SelectItem
                            key={cls}
                            value={cls}
                            disabled={!meets}
                            description={meets ? desc : `Requires ${desc} — ability scores too low`}
                            className={
                              meets
                                ? "text-white hover:bg-[#1E2430]"
                                : "text-slate-500 cursor-not-allowed"
                            }
                          >
                            {cls}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>

                <Select
                  value={mc.level?.toString() || ""}
                  onValueChange={(value) => handleMulticlassChange(index, 'level', parseInt(value))}
                >
                  <SelectTrigger className="bg-[#1E2430] border-white text-white w-32">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A3441] border-[#1E2430]">
                    {Array.from({ length: Math.min(19, characterData.level - 1) }, (_, i) => i + 1).map((lvl) => (
                      <SelectItem key={lvl} value={lvl.toString()} className="text-white hover:bg-[#1E2430]">
                        Level {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => handleRemoveMulticlass(index)}
                  variant="outline"
                  size="icon"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {mc.class && mc.level && (
                <MulticlassProficienciesPanel className={mc.class} />
              )}

              {mc.class && mc.level && (
                <div className="grid grid-cols-1 gap-3">
                  {(getClassFeaturesForLevel(mc.class, mc.level) || []).map((feature, fIdx) => {
                    const featureKey = `${mc.class}-${feature.level}-${feature.name}`;
                    const hasChoice = feature.choiceRequired;
                    const currentChoice = featureChoices[featureKey];

                    return (
                      <div
                        key={fIdx}
                        className={`p-5 rounded-lg border-2 ${
                          hasChoice && !currentChoice
                            ? 'bg-[#2A3441] border-[#FF5722] border-4'
                            : 'bg-[#2A3441] border-[#5B4B9E]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h5 className="font-semibold text-white text-sm">{feature.name}</h5>
                          {feature.level && (
                            <Badge className="bg-[#1E2430] text-gray-300 border border-white/20 text-xs">
                              Lvl {feature.level}
                            </Badge>
                          )}
                        </div>
                        <p className="text-white text-sm leading-7 whitespace-pre-line mb-3">
                          {feature.description}
                        </p>
                        
                        {hasChoice && feature.choices && (
                          isSubclassFeature(feature) ? (
                            <div className="mt-4">
                              <SubclassPicker
                                choices={feature.choices}
                                value={currentChoice || null}
                                onSelect={(value) => handleFeatureChoice(featureKey, value)}
                                featureName={feature.name}
                                levelGained={feature.level}
                              />
                            </div>
                          ) : (
                            <Select
                              value={currentChoice || ""}
                              onValueChange={(value) => handleFeatureChoice(featureKey, value)}
                            >
                              <SelectTrigger className="h-auto min-h-11 w-full mt-4">
                                <SelectValue placeholder="Make a choice..." />
                              </SelectTrigger>
                              <SelectContent>
                                {feature.choices.map((choice, cIdx) => {
                                  const choiceName = typeof choice === 'string' ? choice : choice.name;
                                  const choiceDesc = typeof choice === 'object' ? choice.description : null;
                                  return (
                                    <SelectItem
                                      key={cIdx}
                                      value={choiceName}
                                      description={choiceDesc || undefined}
                                    >
                                      {choiceName}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {requiredChoices.length > 0 && !allChoicesMade && (
        <div className="bg-[#2A3441] border-2 border-[#FF5722] rounded-xl p-4 text-center">
          <p className="text-white font-semibold">
            ⚠️ Please make all required feature choices before proceeding
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Surfaces the LIMITED proficiencies a character gains by
 * multiclassing into `className`. Per RAW (PHB p. 164) this is a
 * subset of the class's primary list — players don't get the full
 * starting bundle on multiclass entry. Sourced from
 * MULTICLASS_PROFICIENCIES so the rules table stays the single
 * source of truth; updating the data here refreshes every UI
 * surface that reads it.
 */
function MulticlassProficienciesPanel({ className }) {
  const profs = multiclassProficienciesFor(className);
  const hasArmor = Array.isArray(profs.armor) && profs.armor.length > 0;
  const hasWeapons = Array.isArray(profs.weapons) && profs.weapons.length > 0;
  const skillCount = Number(profs.skills) || 0;
  const hasOther = Array.isArray(profs.other) && profs.other.length > 0;
  const hasNotes = !!profs.notes;
  const grantsAnything = hasArmor || hasWeapons || skillCount > 0 || hasOther;

  if (!grantsAnything && !hasNotes) {
    return (
      <div className="mb-4 bg-[#1E2430]/80 border border-slate-700 rounded-lg p-3 text-sm text-slate-400">
        Multiclassing into <span className="font-bold text-white">{className}</span>{" "}
        grants no additional proficiencies (you keep what you already have).
      </div>
    );
  }

  return (
    <div className="mb-4 bg-[#1E2430]/80 border border-[#37F2D1]/30 rounded-lg p-3">
      <p className="text-xs uppercase tracking-widest text-[#37F2D1] font-bold mb-2">
        Multiclass Proficiencies Gained
      </p>
      <ul className="text-sm text-white space-y-1">
        {hasArmor && (
          <li>
            <span className="text-slate-400">Armor:</span>{" "}
            <span className="font-semibold capitalize">{profs.armor.join(", ")}</span>
          </li>
        )}
        {hasWeapons && (
          <li>
            <span className="text-slate-400">Weapons:</span>{" "}
            <span className="font-semibold capitalize">{profs.weapons.join(", ")}</span>
          </li>
        )}
        {skillCount > 0 && (
          <li>
            <span className="text-slate-400">Skills:</span>{" "}
            <span className="font-semibold">
              {skillCount} from the {className} skill list
            </span>
          </li>
        )}
        {hasOther &&
          profs.other.map((item, i) => (
            <li key={i}>
              <span className="text-slate-400">Also:</span>{" "}
              <span className="font-semibold">{item}</span>
            </li>
          ))}
      </ul>
      {hasNotes && (
        <p className="mt-2 text-[11px] italic text-slate-400">{profs.notes}</p>
      )}
    </div>
  );
}

/**
 * Picker card for a single ASI milestone. Three options:
 *   - +2 to one ability (cap 20)
 *   - +1 to two different abilities (cap 20 each)
 *   - A feat (PHB list, filtered by ability-score prerequisite)
 *
 * The card writes its selection back through `onChange`. The parent
 * step stores the result in characterData.asiSelections and
 * recomputes characterData.attributes via applyAsiBumps.
 *
 * Cap-20 is shown as a per-ability ceiling — the dropdown shows
 * the post-bump score next to each ability so the player can see
 * "STR 16 → 18" rather than guess. Abilities already at 20 get
 * disabled options.
 */
function AsiCard({ className, level, selection, baseAttributes, asiSelections, ownKey, onChange }) {
  const kind = selection?.kind || "";

  // The "current" ability score to bump from — every ASI taken
  // BEFORE this one stacks. We sum the bumps from sibling
  // selections (excluding this card's own) so the player sees the
  // running total, not the base.
  const otherSelections = React.useMemo(() => {
    const out = { ...(asiSelections || {}) };
    delete out[ownKey];
    return out;
  }, [asiSelections, ownKey]);
  const runningAttributes = applyAsiBumps(baseAttributes, otherSelections);

  const setKind = (nextKind) => {
    if (nextKind === kind) return;
    onChange({ kind: nextKind });
  };

  const setAbility1 = (val) => onChange({ ...selection, kind, ability1: val });
  const setAbility2 = (val) => onChange({ ...selection, kind, ability2: val });
  const setFeat = (val) => onChange({ ...selection, kind: "feat", feat: val });

  const validation = validateSelection(selection);
  const featList = feasibleFeats(runningAttributes);

  return (
    <div
      className={`rounded-xl p-4 border-2 ${
        validation
          ? "bg-amber-500/10 border-amber-500/40"
          : "bg-emerald-500/10 border-emerald-500/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500 text-[#1E2430] text-xs font-black">
            {className} L{level}
          </Badge>
          <span className="text-sm font-bold text-white">
            Ability Score Improvement
          </span>
        </div>
        {validation && (
          <span className="text-[11px] text-amber-300 font-semibold">{validation}</span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {[
          { id: "plus2", label: "+2 to one" },
          { id: "split", label: "+1 to two" },
          { id: "feat", label: "Feat" },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`text-xs font-bold rounded-full px-3 py-1.5 border transition-colors ${
              kind === id
                ? "bg-amber-500 text-[#1E2430] border-amber-300"
                : "bg-[#1E2430] text-white/70 border-slate-600 hover:border-amber-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {kind === "plus2" && (
        <AbilitySelect
          label="Pick one ability"
          value={selection?.ability1 || ""}
          onChange={setAbility1}
          attributes={runningAttributes}
          bump={2}
          excludeAbility={null}
        />
      )}

      {kind === "split" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <AbilitySelect
            label="Ability 1 (+1)"
            value={selection?.ability1 || ""}
            onChange={setAbility1}
            attributes={runningAttributes}
            bump={1}
            excludeAbility={selection?.ability2 || null}
          />
          <AbilitySelect
            label="Ability 2 (+1)"
            value={selection?.ability2 || ""}
            onChange={setAbility2}
            attributes={runningAttributes}
            bump={1}
            excludeAbility={selection?.ability1 || null}
          />
        </div>
      )}

      {kind === "feat" && (
        <div>
          <label className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-1.5">
            Pick a feat
          </label>
          <Select
            value={selection?.feat || ""}
            onValueChange={setFeat}
          >
            <SelectTrigger className="bg-[#1E2430] border-slate-600 text-white">
              <SelectValue placeholder="Choose a feat" />
            </SelectTrigger>
            <SelectContent className="bg-[#1E2430] border-slate-600 text-white max-h-72">
              {featList.map((feat) => (
                <SelectItem key={feat} value={feat} className="text-white">
                  {feat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selection?.feat && FEATS[selection.feat]?.description && (
            <p className="text-[11px] text-white/60 mt-2 italic">
              {FEATS[selection.feat].description}
            </p>
          )}
          <p className="text-[10px] text-white/50 mt-2">
            Spellcasting / proficiency-prereq feats are listed and
            assumed to be eligible for the player's build — verify
            with your DM.
          </p>
        </div>
      )}
    </div>
  );
}

function AbilitySelect({ label, value, onChange, attributes, bump, excludeAbility }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider font-bold text-white/70 block mb-1.5">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-[#1E2430] border-slate-600 text-white">
          <SelectValue placeholder="Choose an ability" />
        </SelectTrigger>
        <SelectContent className="bg-[#1E2430] border-slate-600 text-white">
          {ABILITY_KEYS.map((k) => {
            const current = attributes?.[k] || 10;
            const next = Math.min(MAX_ABILITY_SCORE, current + bump);
            const wasted = next === current;
            const isExcluded = excludeAbility === k;
            return (
              <SelectItem
                key={k}
                value={k}
                disabled={wasted || isExcluded}
                className="text-white"
              >
                {ABILITY_LABELS[k]}: {current} → {next} ({fmtMod(next)})
                {wasted && " — at cap"}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
