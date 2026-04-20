import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle, BookOpen, Code2, Zap, ChefHat, LifeBuoy } from "lucide-react";
import { FORMULA_REFERENCE } from "@/lib/formulaEvaluator";
import {
  TRIGGER_EVENTS,
  TRIGGER_GATES,
  EFFECT_TYPES,
} from "@/config/codeModSchema";

/**
 * In-app reference for Layer-3 code mod authors.
 *
 * Renders four sections in a single dialog:
 *   - Formula reference (variables / operators / functions / dice)
 *   - Trigger guide (events / filters / gates)
 *   - Common recipes (copy-pasteable formulas)
 *   - Troubleshooting
 *
 * Opened by the "?" button in the code-mod creator. Content is
 * sourced from FORMULA_REFERENCE (the evaluator's own reference
 * export) + the schema constants so docs never drift from the
 * code — there's only one source of truth.
 */

export function CodeModHelpButton({ onOpen }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onOpen}
      className="text-[#37F2D1] border-[#37F2D1]/60 hover:bg-[#37F2D1]/10"
    >
      <HelpCircle className="w-3 h-3 mr-1" /> Help
    </Button>
  );
}

export default function CodeModHelpPanel({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="bg-[#1E2430] border border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#37F2D1]" /> Code Mod Reference
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <FormulaReferenceSection />
          <TriggerGuideSection />
          <RecipesSection />
          <TroubleshootingSection />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#37F2D1] mt-0.5" />
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-[#37F2D1]">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3 text-[12px] text-slate-300">{children}</div>
    </section>
  );
}

function Kbd({ children }) {
  return <code className="font-mono text-[11px] bg-[#050816] border border-slate-700 rounded px-1.5 py-0.5 text-[#37F2D1]">{children}</code>;
}

function RefTable({ rows }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
      {rows.map((r) => (
        <div key={r.key} className="flex items-start gap-2">
          <Kbd>{r.key}</Kbd>
          <span className="text-[11px] text-slate-400">{r.description}</span>
        </div>
      ))}
    </div>
  );
}

function FormulaReferenceSection() {
  return (
    <Section icon={Code2} title="Formula reference" subtitle="The mini-language the evaluator understands.">
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Direct scalars</h4>
        <RefTable rows={FORMULA_REFERENCE.scalars} />
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">
          <Kbd>actor.*</Kbd> / <Kbd>target.*</Kbd>
        </h4>
        <p className="text-[11px] text-slate-500 mb-2">
          Both <Kbd>actor</Kbd> and <Kbd>target</Kbd> expose the same field set.
        </p>
        <RefTable rows={FORMULA_REFERENCE.actor_fields} />
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Functions</h4>
        <RefTable rows={FORMULA_REFERENCE.functions} />
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Operators</h4>
        <div className="flex flex-wrap gap-1.5">
          {FORMULA_REFERENCE.operators.map((op) => <Kbd key={op}>{op}</Kbd>)}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Standard math precedence: <Kbd>* / %</Kbd> bind tighter than <Kbd>+ -</Kbd>; comparisons bind loosest.
          Comparison results are 1 or 0, so you can use them in arithmetic
          (e.g. <Kbd>actor.level &gt;= 5 * 2d6</Kbd> deals 2d6 only at level 5+).
        </p>
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Dice</h4>
        <RefTable rows={FORMULA_REFERENCE.dice} />
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">
          <Kbd>config.*</Kbd>
        </h4>
        <p className="text-[11px] text-slate-500">
          Configurable parameters the installing GM can tune show up as <Kbd>config.&lt;key&gt;</Kbd>.
          Define them in the "Configurable Parameters" section of the creator; the key in the form
          becomes the formula variable. Installing GMs see a form that edits these values before
          the mod goes live.
        </p>
      </div>
    </Section>
  );
}

function TriggerGuideSection() {
  return (
    <Section icon={Zap} title="Trigger guide" subtitle="When triggers fire and how to scope them.">
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Events</h4>
        <div className="flex flex-wrap gap-1.5">
          {TRIGGER_EVENTS.map((e) => <Kbd key={e}>{e}</Kbd>)}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Events that include <Kbd>_by</Kbd> fire from the target's perspective (e.g.
          <Kbd>on_hit_by</Kbd> = "a creature hit me"). Events without <Kbd>_by</Kbd> fire
          from the actor's perspective (<Kbd>on_hit</Kbd> = "I hit a creature").
        </p>
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Filters</h4>
        <p className="text-[11px] text-slate-500 mb-1">
          Each trigger can narrow its event by:
        </p>
        <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
          <li><Kbd>source</Kbd> — self, ally, enemy, or any. "Any" matches everything.</li>
          <li><Kbd>weapon_type</Kbd> — melee, ranged, spell, or any.</li>
          <li><Kbd>damage_type</Kbd> — for damage-scoped events, match a specific damage type.</li>
          <li><Kbd>creature_type</Kbd> — for kill / type-scoped events, narrow by creature type.</li>
        </ul>
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Gates</h4>
        <div className="flex flex-wrap gap-1.5">
          {TRIGGER_GATES.map((g) => <Kbd key={g.value}>{g.label}</Kbd>)}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Gates bound how often a trigger can fire. Once-per-turn / round / rest gates are
          tracked per-install by the engine; Proficiency-Bonus-Per-Long-Rest uses the actor's
          prof as the cap. Turn / round gates reset when the combat layer calls
          <Kbd>resetTriggerGates</Kbd> at turn/round end.
        </p>
      </div>
      <div>
        <h4 className="text-[11px] uppercase tracking-widest text-slate-400 font-bold mb-2">Effect types</h4>
        <div className="space-y-1">
          {EFFECT_TYPES.map((e) => (
            <div key={e.value} className="flex items-start gap-2">
              <Kbd>{e.value}</Kbd>
              <span className="text-[11px] text-slate-400">{e.description}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Recipe({ title, description, formula, event, gate }) {
  return (
    <div className="bg-[#050816] border border-slate-700 rounded-lg p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white">{title}</span>
        <span className="text-[9px] uppercase tracking-widest text-[#37F2D1]">
          {event}{gate ? ` · ${gate}` : ""}
        </span>
      </div>
      <p className="text-[11px] text-slate-400">{description}</p>
      <Kbd>{formula}</Kbd>
    </div>
  );
}

function RecipesSection() {
  return (
    <Section icon={ChefHat} title="Common recipes" subtitle="Copy-paste formulas for the patterns that come up most.">
      <Recipe
        title="Bonus damage on hit"
        description="1d6 extra every time you land an attack, once per turn."
        event="on_hit"
        gate="once per turn"
        formula="1d6"
      />
      <Recipe
        title="Heal on kill"
        description="Regain your character level in HP when you drop a creature."
        event="on_kill"
        formula="actor.level"
      />
      <Recipe
        title="Scale damage by level"
        description="1d6 at level 1, 2d6 at 5, 3d6 at 11, 4d6 at 17 — cantrip progression."
        event="on_hit"
        gate="once per turn"
        formula="if(actor.level >= 17, 4d6, if(actor.level >= 11, 3d6, if(actor.level >= 5, 2d6, 1d6)))"
      />
      <Recipe
        title="Conditional bonus by stat"
        description="Add CHA mod to save throws, but only if CHA is positive."
        event="on_save_fail"
        gate="once per rest"
        formula="max(0, actor.cha_mod)"
      />
      <Recipe
        title="Configurable multiplier"
        description="Crit damage uses a GM-tunable multiplier (define config.multiplier in the creator)."
        event="on_crit"
        formula="weapon_damage_dice * config.multiplier"
      />
      <Recipe
        title="Damage reduction"
        description="Subtract proficiency bonus from incoming damage. Pair with modify_damage + incoming_damage."
        event="on_take_damage"
        formula="-actor.prof"
      />
      <Recipe
        title="Reaction counterattack"
        description="Strike back when a melee attack misses you."
        event="on_missed_by"
        gate="once per round"
        formula="weapon_damage_dice + actor.str_mod"
      />
    </Section>
  );
}

function TroubleshootingSection() {
  return (
    <Section icon={LifeBuoy} title="Troubleshooting" subtitle="Common failure modes and how to fix them.">
      <div>
        <h4 className="text-xs font-bold text-white mb-1">"Unknown variable" on save</h4>
        <p className="text-[11px] text-slate-400">
          The formula references a path not in the whitelist. Check: did you spell
          <Kbd>actor.str_mod</Kbd> with the underscore? Did you use <Kbd>actor.STR</Kbd>
          instead of <Kbd>actor.str</Kbd>? <Kbd>config.*</Kbd> keys only work after you've
          defined the matching parameter in the Configurable Parameters section.
        </p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-white mb-1">"Unknown function" on save</h4>
        <p className="text-[11px] text-slate-400">
          Only <Kbd>min</Kbd>, <Kbd>max</Kbd>, <Kbd>floor</Kbd>, <Kbd>ceil</Kbd>,
          <Kbd>abs</Kbd>, and <Kbd>if</Kbd> are recognised. JavaScript functions like
          <Kbd>Math.round</Kbd> or <Kbd>Math.pow</Kbd> are not allowed.
        </p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-white mb-1">My trigger isn't firing</h4>
        <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-0.5">
          <li>Event — is the trigger listening for the right event for the combat action?</li>
          <li>Source filter — <Kbd>self</Kbd> only fires when the current actor caused the event. Try <Kbd>any</Kbd> while debugging.</li>
          <li>Weapon filter — for weapon-less events (on_turn_start, on_save_fail, etc.), set weapon filter to <Kbd>any</Kbd>.</li>
          <li>Gate — check if the trigger's already fired this turn/round/rest. Advance the turn or round to reset.</li>
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-bold text-white mb-1">Session won't start</h4>
        <p className="text-[11px] text-slate-400">
          A mod has a validation error — its formula is invalid. Open
          <strong> Campaign Settings → Brewery Mods</strong>; mods in error state show
          the exact parser message. Fix the formula and republish, or disable / uninstall
          the mod to unblock session start.
        </p>
      </div>
      <div>
        <h4 className="text-xs font-bold text-white mb-1">Mod flipped to "error" mid-session</h4>
        <p className="text-[11px] text-slate-400">
          A runtime error fired while a trigger evaluated. Check the error_message field
          on the install row — usually this is a division by zero, a missing
          <Kbd>config.*</Kbd> key, or a bad dice expression that validated but rolled
          something nonsensical. The engine catches runtime errors per-trigger so combat
          keeps running, but the bad mod won't fire again until someone edits it.
        </p>
      </div>
    </Section>
  );
}
