import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RotateCcw, Trash2, Swords, Moon, UserCircle, Sparkles, FlaskConical, ExternalLink, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { MODIFIABLE_RULES, getRule } from "@/components/dnd5e/dnd5eRules";
import CreateHomebrewDialog from "@/components/homebrew/CreateHomebrewDialog";

/**
 * House Rules editor. Reads every modifiable rule from the registry
 * and lets the GM override it per-campaign. Writes to
 * campaigns.homebrew_rules (JSONB). The combat system already reads
 * via getRule(campaign.homebrew_rules, 'path.to.rule').
 *
 * The panel also lists any Brewery homebrew the campaign has
 * installed (campaign_homebrew rows) with per-row enable toggles.
 */

// Normalize campaign.homebrew_rules into an object. Legacy rows may
// hold a JSON string (or even a stringified array from the old
// homebrew-text flow); coerce anything we don't understand to {}.
function normalizeRules(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch { /* ignore */ }
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return {};
}

// Deep clone so edits don't mutate the cached query data.
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Set a dotted-path value on a nested object, creating parents as needed.
function setPath(root, path, value) {
  const keys = path.split(".");
  const next = clone(root);
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cursor[k] || typeof cursor[k] !== "object") cursor[k] = {};
    cursor = cursor[k];
  }
  cursor[keys[keys.length - 1]] = value;
  return next;
}

// Remove a dotted-path key. Also prunes empty parent objects so the
// "MODIFIED" check stays accurate after a reset.
function clearPath(root, path) {
  const keys = path.split(".");
  const next = clone(root);
  const trail = [];
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cursor[k] || typeof cursor[k] !== "object") return next;
    trail.push([cursor, k]);
    cursor = cursor[k];
  }
  delete cursor[keys[keys.length - 1]];
  // Prune any parent that's now empty.
  for (let i = trail.length - 1; i >= 0; i--) {
    const [parent, key] = trail[i];
    if (parent[key] && typeof parent[key] === "object" && Object.keys(parent[key]).length === 0) {
      delete parent[key];
    } else {
      break;
    }
  }
  return next;
}

// Does a dotted path exist anywhere under the campaign overrides?
function hasOverrideAtPath(rules, path) {
  const keys = path.split(".");
  let cursor = rules;
  for (const key of keys) {
    if (cursor && typeof cursor === "object" && key in cursor) {
      cursor = cursor[key];
    } else {
      return false;
    }
  }
  return true;
}

// Radio-group helper for "mutually exclusive boolean" shapes like
// combat.critical_hits.{double_dice, max_first_roll_second, max_all}.
// Returns which of the three booleans is the "selected" one based on
// current campaign rules (falling back to the default). "double_dice"
// is the implicit default when none are set true.
function resolveCritHitMode(rules) {
  const val = getRule(rules, "combat.critical_hits") || {};
  if (val.max_all) return "max_all";
  if (val.max_first_roll_second) return "max_first_roll_second";
  return "double_dice";
}

// Apply a crit-hit radio selection by flipping the three booleans in
// lockstep. Returns the full rule tree after the change.
function applyCritHitMode(rules, mode) {
  const next = clone(rules || {});
  if (!next.combat) next.combat = {};
  next.combat.critical_hits = {
    double_dice: mode === "double_dice",
    max_first_roll_second: mode === "max_first_roll_second",
    max_all: mode === "max_all",
    additional_effects: MODIFIABLE_RULES.combat.critical_hits.additional_effects,
  };
  return next;
}

// Entire rule catalog. Each row describes one control. Rows inside
// the same section share a category header. Order here is also the
// render order.
const SECTIONS = [
  {
    key: "combat",
    title: "Combat Rules",
    icon: Swords,
    rows: [
      { path: "combat.flanking.enabled", label: "Flanking", description: "Attackers on opposite sides of a target get a bonus.", control: "toggle" },
      { path: "combat.flanking.bonus", label: "Flanking bonus", description: "Numeric +X to the attack roll when flanking.", control: "number", min: 0, max: 5 },
      { path: "combat.flanking.grants_advantage", label: "Flanking grants advantage", description: "Flanking gives advantage instead of a flat bonus.", control: "toggle" },
      { path: "combat.critical_hits", label: "Critical hit formula", description: "How many dice crits roll.", control: "crit_hit_radio" },
      { path: "combat.critical_fumbles.enabled", label: "Critical fumbles", description: "Rolling a natural 1 on attacks triggers a fumble effect.", control: "toggle" },
      { path: "combat.critical_fumbles.fumble_table", label: "Roll fumble table", description: "Nat 1 on attack rolls a table for the fumble effect.", control: "toggle" },
      { path: "combat.critical_fumbles.drop_weapon", label: "Drop weapon on fumble", description: "Nat 1 drops the attacker's weapon.", control: "toggle" },
      { path: "combat.death_saves.dc", label: "Death save DC", description: "Number the character must meet or exceed (default 10).", control: "number", min: 5, max: 20 },
      { path: "combat.death_saves.visible_to_party", label: "Death saves visible to party", description: "Other players can see the dying character's save results.", control: "toggle" },
      { path: "combat.death_saves.monsters_make_saves", label: "Monsters make death saves", description: "Non-player creatures roll death saves too.", control: "toggle" },
      { path: "combat.initiative.dex_tiebreaker", label: "DEX tiebreaker on initiative", description: "Ties resolve in DEX order.", control: "toggle" },
      { path: "combat.initiative.group_initiative", label: "Group initiative", description: "All enemies share one initiative roll.", control: "toggle" },
      { path: "combat.opportunity_attacks.enabled", label: "Opportunity attacks", description: "Leaving an enemy's reach provokes an attack.", control: "toggle" },
      { path: "combat.opportunity_attacks.provoked_by_ranged", label: "Ranged attacks provoke OA", description: "Firing ranged in melee draws an opportunity attack.", control: "toggle" },
      { path: "combat.healing_potions.action_cost", label: "Healing potion cost", description: "How using a potion on yourself consumes the action economy.", control: "radio_string", options: [
        { value: "action", label: "Action (default)" },
        { value: "bonus", label: "Bonus Action (self)" },
      ]},
    ],
  },
  {
    key: "resting",
    title: "Resting Rules",
    icon: Moon,
    rows: [
      { path: "resting.short_rest_minutes", label: "Short rest duration (minutes)", description: "Length of a short rest.", control: "number", min: 1, max: 1440 },
      { path: "resting.long_rest_hours", label: "Long rest duration (hours)", description: "Length of a long rest.", control: "number", min: 1, max: 168 },
      { path: "resting.full_hp_on_long_rest", label: "Full HP on long rest", description: "Long rests fully heal characters.", control: "toggle" },
      { path: "resting.gritty_realism", label: "Gritty Realism variant", description: "Short rest = 8 hours, long rest = 7 days.", control: "toggle" },
      { path: "resting.epic_heroism", label: "Epic Heroism variant", description: "Short rest = 5 min, long rest = 1 hour.", control: "toggle" },
    ],
  },
  {
    key: "character",
    title: "Character Rules",
    icon: UserCircle,
    rows: [
      { path: "character.stat_generation", label: "Stat generation", description: "How new characters determine ability scores.", control: "radio_string", options: [
        { value: "standard_array", label: "Standard Array" },
        { value: "point_buy", label: "Point Buy" },
        { value: "roll_4d6_drop_lowest", label: "Roll 4d6 Drop Lowest" },
      ]},
      { path: "character.hp_on_level_up", label: "HP on level up", description: "How new HP is granted each level.", control: "radio_string", options: [
        { value: "average", label: "Average (default)" },
        { value: "roll", label: "Roll" },
        { value: "max_first_then_roll", label: "Max at 1st, Roll after" },
      ]},
      { path: "character.multiclass_allowed", label: "Multiclassing allowed", description: "Characters can take levels in multiple classes.", control: "toggle" },
      { path: "character.feats_allowed", label: "Feats allowed", description: "Players can pick feats at ASI levels.", control: "toggle" },
      { path: "character.encumbrance_variant", label: "Variant encumbrance", description: "Use the strict encumbrance formula (speed penalties).", control: "toggle" },
    ],
  },
  {
    key: "spellcasting",
    title: "Spellcasting Rules",
    icon: Sparkles,
    rows: [
      { path: "spellcasting.component_tracking", label: "Track material components", description: "Casters must supply material components from inventory.", control: "toggle" },
      { path: "spellcasting.identify_before_counterspell", label: "Identify before Counterspell", description: "Casters must identify a spell (reaction roll) before countering it.", control: "toggle" },
      { path: "spellcasting.spell_points_variant", label: "Spell points variant", description: "Replace spell slots with the spell-points pool.", control: "toggle" },
    ],
  },
];

export default function HouseRulesPanel({ campaign, campaignId, canEdit = true }) {
  const queryClient = useQueryClient();
  const rules = useMemo(() => normalizeRules(campaign?.homebrew_rules), [campaign?.homebrew_rules]);
  const [creatingCustom, setCreatingCustom] = React.useState(false);
  // Stable seed object handed to the homebrew creator dialog. The
  // dialog's reset-on-brew-change effect re-fires whenever this
  // identity changes, so we only regenerate it when the drawer opens
  // — not on every render.
  const customSeed = useMemo(() => {
    if (!creatingCustom) return null;
    return {
      modifications: rules,
      game_system: "dnd5e",
      category: "combat_rules",
      version: "1.0.0",
      tags: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatingCustom]);

  // Installed Brewery homebrew (per-campaign join rows).
  const { data: installedHomebrew = [] } = useQuery({
    queryKey: ["campaignHomebrew", campaignId],
    queryFn: async () => {
      try {
        return await base44.entities.CampaignHomebrew.filter({ campaign_id: campaignId });
      } catch (err) {
        // Table may not exist yet in early environments.
        return [];
      }
    },
    enabled: !!campaignId,
    initialData: [],
  });

  // Load the homebrew_rules rows for display so we can show title /
  // creator on the Installed list without nested joins.
  const { data: homebrewMeta = [] } = useQuery({
    queryKey: ["homebrewMeta", installedHomebrew.map((h) => h.homebrew_id).sort().join(",")],
    queryFn: async () => {
      if (!installedHomebrew.length) return [];
      try {
        return await Promise.all(
          installedHomebrew.map((h) =>
            base44.entities.HomebrewRule.filter({ id: h.homebrew_id }).then((rows) => rows[0] || null),
          ),
        );
      } catch {
        return [];
      }
    },
    enabled: installedHomebrew.length > 0,
    initialData: [],
  });

  const writeRules = useMutation({
    mutationFn: async (nextRules) => {
      return base44.entities.Campaign.update(campaignId, { homebrew_rules: nextRules });
    },
    onMutate: async (nextRules) => {
      await queryClient.cancelQueries({ queryKey: ["campaign", campaignId] });
      const prev = queryClient.getQueryData(["campaign", campaignId]);
      queryClient.setQueryData(["campaign", campaignId], (old) => (old ? { ...old, homebrew_rules: nextRules } : old));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["campaign", campaignId], ctx.prev);
      toast.error("House rule update failed");
      console.error(err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      toast.success("House rule updated");
    },
  });

  const updateRule = (path, value) => {
    if (!canEdit) return;
    const next = setPath(rules, path, value);
    writeRules.mutate(next);
  };

  const resetRule = (path) => {
    if (!canEdit) return;
    const next = clearPath(rules, path);
    writeRules.mutate(next);
  };

  const applyCritMode = (mode) => {
    if (!canEdit) return;
    writeRules.mutate(applyCritHitMode(rules, mode));
  };

  const resetCritMode = () => {
    if (!canEdit) return;
    writeRules.mutate(clearPath(rules, "combat.critical_hits"));
  };

  const toggleInstalled = useMutation({
    mutationFn: async ({ id, enabled }) => base44.entities.CampaignHomebrew.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaignHomebrew", campaignId] }),
  });

  const removeInstalled = useMutation({
    mutationFn: async (id) => base44.entities.CampaignHomebrew.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaignHomebrew", campaignId] });
      toast.success("Homebrew removed from campaign");
    },
  });

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.key} className="bg-[#2A3441] rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Icon className="w-6 h-6 text-[#37F2D1]" />
              {section.title}
            </h2>
            <div className="divide-y divide-[#1e293b]">
              {section.rows.map((row) => (
                <RuleRow
                  key={row.path}
                  row={row}
                  rules={rules}
                  canEdit={canEdit}
                  onUpdate={updateRule}
                  onReset={resetRule}
                  onApplyCritMode={applyCritMode}
                  onResetCritMode={resetCritMode}
                />
              ))}
            </div>
          </div>
        );
      })}

      <BanListsSection campaign={campaign} campaignId={campaignId} canEdit={canEdit} />

      {/* Installed Brewery homebrew — merged on top of manual rules at combat time. */}
      <div className="bg-[#2A3441] rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-1">Installed Homebrew</h2>
        <p className="text-sm text-slate-400 mb-4">
          Brewery packs enabled on this campaign. Changes here take effect immediately.
        </p>
        {installedHomebrew.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No homebrew installed. Browse The Brewery to install packs.</p>
        ) : (
          <div className="space-y-2">
            {installedHomebrew.map((join, idx) => {
              const meta = homebrewMeta[idx];
              return (
                <div key={join.id} className="flex items-center justify-between gap-3 bg-[#1E2430] border border-[#111827] rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {meta?.title || "Homebrew pack"}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {meta?.category || "—"}
                      {meta?.version ? ` · v${meta.version}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-[11px] text-slate-300">
                      <span>{join.enabled ? "Enabled" : "Disabled"}</span>
                      <Switch
                        checked={!!join.enabled}
                        onCheckedChange={(checked) => toggleInstalled.mutate({ id: join.id, enabled: checked })}
                        disabled={!canEdit || toggleInstalled.isPending}
                      />
                    </label>
                    <button
                      disabled={!canEdit || removeInstalled.isPending}
                      onClick={() => removeInstalled.mutate(join.id)}
                      className="text-slate-400 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Remove from campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share / create CTA. Opens the homebrew creator pre-filled
          with whatever overrides are already set on this campaign, so
          a GM can turn their tweaks into a shareable Brewery pack. */}
      <div className="bg-[#2A3441] rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <FlaskConical className="w-8 h-8 text-[#37F2D1] flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Share these rules with the community</h3>
            <p className="text-[11px] text-slate-400">
              Package your tweaks as a Brewery pack. Drafts are private until you publish.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreatingCustom(true)}
            disabled={!canEdit}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Custom Rule
          </button>
          <Link
            to={createPageUrl("Brewery")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#37F2D1] hover:text-white"
          >
            Open The Brewery <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <CreateHomebrewDialog
        open={creatingCustom}
        onClose={() => setCreatingCustom(false)}
        brew={customSeed}
      />
    </div>
  );
}

function RuleRow({ row, rules, canEdit, onUpdate, onReset, onApplyCritMode, onResetCritMode }) {
  // Special case — the crit-hit radio spans three sibling bools, so
  // the "modified" check keys on the parent path.
  if (row.control === "crit_hit_radio") {
    const mode = resolveCritHitMode(rules);
    const modified = hasOverrideAtPath(rules, "combat.critical_hits");
    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{row.label}</span>
            {modified ? (
              <Badge className="bg-amber-500 text-black hover:bg-amber-500">Modified</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400 border-slate-600">Default</Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{row.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroup
            value={mode}
            onValueChange={(next) => canEdit && onApplyCritMode(next)}
            className="flex flex-col gap-1"
          >
            {[
              { value: "double_dice", label: "Double Dice (default)" },
              { value: "max_first_roll_second", label: "Max First, Roll Second" },
              { value: "max_all", label: "Maximize All" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem id={`crit-${opt.value}`} value={opt.value} disabled={!canEdit} />
                <Label htmlFor={`crit-${opt.value}`} className="text-xs text-slate-200">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
          {modified && canEdit && (
            <button
              onClick={onResetCritMode}
              className="text-slate-400 hover:text-white"
              title="Revert to default"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const defaultVal = getRule({}, row.path);
  const currentVal = getRule(rules, row.path);
  const modified = hasOverrideAtPath(rules, row.path);

  let control = null;
  if (row.control === "toggle") {
    control = (
      <Switch
        checked={!!currentVal}
        onCheckedChange={(checked) => onUpdate(row.path, checked)}
        disabled={!canEdit}
      />
    );
  } else if (row.control === "number") {
    control = (
      <Input
        type="number"
        min={row.min}
        max={row.max}
        value={currentVal ?? defaultVal ?? 0}
        disabled={!canEdit}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onUpdate(row.path, n);
        }}
        className="bg-[#1E2430] border-slate-700 text-white w-28"
      />
    );
  } else if (row.control === "radio_string") {
    control = (
      <RadioGroup
        value={String(currentVal ?? defaultVal ?? "")}
        onValueChange={(next) => onUpdate(row.path, next)}
        className="flex flex-col gap-1"
      >
        {row.options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem id={`${row.path}-${opt.value}`} value={opt.value} disabled={!canEdit} />
            <Label htmlFor={`${row.path}-${opt.value}`} className="text-xs text-slate-200">{opt.label}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">{row.label}</span>
          {modified ? (
            <Badge className="bg-amber-500 text-black hover:bg-amber-500">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 border-slate-600">Default</Badge>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">{row.description}</p>
      </div>
      <div className="flex items-center gap-3">
        {control}
        {modified && canEdit && (
          <button
            onClick={() => onReset(row.path)}
            className="text-slate-400 hover:text-white"
            title="Revert to default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Ban lists ────────────────────────────
//
// Simple spell / class ban lists live on campaign.settings.banned_* so
// they travel with the campaign row without extra tables. Character
// creator + spell flows read these to grey out disallowed picks. The
// Brewery is for mechanical mods; banning is a single-boolean toggle
// per item so it stays here.

const CLASSES_FOR_BAN = [
  "Artificer", "Barbarian", "Bard", "Cleric", "Druid", "Fighter",
  "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard",
  "Blood Hunter",
];

function BanListsSection({ campaign, campaignId, canEdit }) {
  const queryClient = useQueryClient();
  const settings = campaign?.settings && typeof campaign.settings === "object" ? campaign.settings : {};
  const bannedSpells  = Array.isArray(settings.banned_spells)  ? settings.banned_spells  : [];
  const bannedClasses = Array.isArray(settings.banned_classes) ? settings.banned_classes : [];

  // Campaign-visible spell list (SRD + homebrew). We reuse the
  // entities layer which already filters by campaign + SRD seed.
  const { data: availableSpells = [] } = useQuery({
    queryKey: ["spellsForBan", campaignId],
    queryFn: async () => {
      try {
        const srd = await base44.entities.Dnd5eSpell.list();
        return (Array.isArray(srd) ? srd : []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      } catch {
        return [];
      }
    },
    enabled: !!campaignId,
    initialData: [],
  });

  const saveSettings = useMutation({
    mutationFn: async (nextSettings) =>
      base44.entities.Campaign.update(campaignId, { settings: nextSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Ban list updated");
    },
    onError: (err) => toast.error(err?.message || "Couldn't save ban list"),
  });

  const toggleSpell = (name) => {
    const next = bannedSpells.includes(name)
      ? bannedSpells.filter((s) => s !== name)
      : [...bannedSpells, name];
    saveSettings.mutate({ ...settings, banned_spells: next });
  };
  const toggleClass = (name) => {
    const next = bannedClasses.includes(name)
      ? bannedClasses.filter((s) => s !== name)
      : [...bannedClasses, name];
    saveSettings.mutate({ ...settings, banned_classes: next });
  };

  return (
    <div className="bg-[#2A3441] rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" /> Banned Classes
        </h2>
        <p className="text-sm text-slate-400 mb-3">
          Classes on this list are hidden in the character creator for this campaign.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CLASSES_FOR_BAN.map((cls) => {
            const banned = bannedClasses.includes(cls);
            return (
              <button
                key={cls}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleClass(cls)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  banned
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-[#1E2430] border-slate-700 text-slate-300 hover:border-rose-400"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {cls}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" /> Banned Spells
        </h2>
        <p className="text-sm text-slate-400 mb-3">
          Click a spell to toggle it. Banned spells can't be learned, prepared, or cast in this campaign.
        </p>
        {availableSpells.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Loading spells…</p>
        ) : (
          <div className="max-h-64 overflow-y-auto pr-1 flex flex-wrap gap-1">
            {availableSpells.map((sp) => {
              const name = sp?.name;
              if (!name) return null;
              const banned = bannedSpells.includes(name);
              return (
                <button
                  key={sp.id || name}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleSpell(name)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                    banned
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-[#1E2430] border-slate-700 text-slate-300 hover:border-rose-400"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
        {bannedSpells.length > 0 && (
          <p className="text-[11px] text-slate-500 mt-2">
            {bannedSpells.length} banned · click again to unban.
          </p>
        )}
      </div>
    </div>
  );
}
