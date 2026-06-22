// The 9-step character-creator flow definition. Lifted verbatim from the
// prototype's STEPS array (with the lucide icons preserved as JSX-imports).

import { Scroll, Trees, Compass, Sword, Star, Zap, Sparkles, Shield, Hammer } from 'lucide-react';

export const STEPS = [
  { num: 'I',    key: 'identity',   label: 'Identity',   icon: Scroll,
    whisper: 'Pathfinder leans into character. The richer the bio, the more hooks your GM has to pull on later. Set your character [[level]] here — the rest of the creator will scale to it.' },
  { num: 'II',   key: 'ancestry',   label: 'Ancestry',   icon: Trees,
    whisper: '[[ancestry|Ancestry]] is your people. [[heritage|Heritage]] is your specific lineage within that people. Both grant mechanical perks — pick the combination that fits the story you want to tell.' },
  { num: 'III',  key: 'background', label: 'Background', icon: Compass,
    whisper: '[[background|Backgrounds]] grant two [[ability-boost|boosts]], a [[trained]] [[skill]], [[lore]] knowledge, and a free [[skill-feat|skill feat]]. They\'re short — but mechanically meaningful.' },
  { num: 'IV',   key: 'class',      label: 'Class',      icon: Sword,
    whisper: 'Your [[class]] defines what your turns look like in combat and exploration. Match its [[key-ability|key ability]] with a [[ability-boost|boost]] you already received — your numbers will be stronger.' },
  { num: 'V',    key: 'abilities',  label: 'Boosts',     icon: Star,
    whisper: '[[ability-boost|Boosts]] work in batches. In each batch, you cannot apply two boosts to the same [[ability-score|ability]]. Most boosts add +2; once a score is 18+, additional boosts add +1. Higher levels grant additional boost batches.' },
  { num: 'VI',   key: 'skills',     label: 'Skills',     icon: Zap,
    whisper: 'PF2e adds your [[level]] to nearly every [[skill]] check. So being [[trained|Trained]] at level 1 isn\'t just +2 — it\'s +3. Skill increases at later levels let you advance Trained → [[expert|Expert]] → [[master|Master]] → [[legendary|Legendary]].' },
  { num: 'VII',  key: 'spells',     label: 'Spells',     icon: Sparkles,
    whisper: 'Casters choose [[cantrip|cantrips]] (cast freely, unlimited) and ranked [[spell|spells]] (limited [[spell-slot|slots]], refreshed daily). Non-casters can pick up magic later via Multiclass Caster archetypes.' },
  { num: 'VIII', key: 'gear',       label: 'Loadout',    icon: Shield,
    whisper: 'Starting wealth scales with character [[level]]. New players should take the recommended [[class-kit|class kit]]; veterans browse the custom shop. Carrying limit = 5 + your [[strength|Strength]] [[ability-modifier|modifier]].' },
  { num: 'IX',   key: 'review',     label: 'Forge',      icon: Hammer,
    whisper: 'One last look. Forge when ready — most GMs allow respecs after session one if something feels wrong.' },
];
