// Deity presets surfaced by the DeityModal picker. Verbatim from the prototype.
// Lighter-weight shape than data/deities.json (which holds the full Remaster
// stat block); this is the picker-ready summary with a lucide icon attached.

import { Hammer, Moon, Sun, Skull, Waves, Crown } from 'lucide-react';

const DEITY_PRESETS = [
  {
    id: 'forge-father', name: 'The Forge-Father', icon: Hammer,
    sanctification: 'Holy',
    edicts: 'Repair what is broken. Honor the work of your hands. Stand with your kin.',
    anathema: 'Lie about the quality of your work. Abandon kin in their hour of need.',
    domains: ['Earth', 'Creation', 'Family'], favoredWeapon: 'Warhammer',
    sacredAnimal: 'Ox', sacredColors: ['#3D3530', '#C26F2F'],
    flavor: 'God of smiths, builders, and the bonds forged by shared labor.',
  },
  {
    id: 'veiled-dancer', name: 'The Veiled Dancer', icon: Moon,
    sanctification: 'Neither',
    edicts: 'Keep what is given in confidence. Take only from those who do not deserve.',
    anathema: 'Reveal a confidence given in trust. Harm a weaker creature for sport.',
    domains: ['Trickery', 'Travel', 'Moon'], favoredWeapon: 'Rapier',
    sacredAnimal: 'Fox', sacredColors: ['#1A1F3A', '#9B9FB0'],
    flavor: 'Patron of thieves with codes, secret-keepers, and those who walk between.',
  },
  {
    id: 'eternal-flame', name: 'The Eternal Flame', icon: Sun,
    sanctification: 'Holy',
    edicts: 'Bring light to dark places. Share warmth with the cold. Tend the wounded.',
    anathema: 'Hoard light or healing. Abandon those who plead for aid.',
    domains: ['Sun', 'Fire', 'Healing'], favoredWeapon: 'Longsword',
    sacredAnimal: 'Lion', sacredColors: ['#C9A961', '#9B1D26'],
    flavor: 'The dawn that does not surrender. Goddess of healers, soldiers, and unyielding hope.',
  },
  {
    id: 'pale-hunter', name: 'The Pale Hunter', icon: Skull,
    sanctification: 'Either',
    edicts: 'Grant clean deaths. Honor the cycle. Hunt only what you can use.',
    anathema: 'Cause undue suffering. Deny a soul its passage. Slaughter for sport.',
    domains: ['Death', 'Moon', 'Hunt'], favoredWeapon: 'Longbow',
    sacredAnimal: 'Wolf', sacredColors: ['#E8DCC4', '#3A2E4F'],
    flavor: 'God of the merciful kill, the moonlit chase, and the soul\'s passage onward.',
  },
  {
    id: 'tidemother', name: 'The Tidemother', icon: Waves,
    sanctification: 'Holy',
    edicts: 'Protect those drawn under. Give freely as the tide gives.',
    anathema: 'Befoul still or running waters. Refuse aid to a drowning soul.',
    domains: ['Water', 'Nature', 'Family'], favoredWeapon: 'Trident',
    sacredAnimal: 'Dolphin', sacredColors: ['#2D6A6F', '#E8DCC4'],
    flavor: 'Goddess of oceans, rivers, mothers, and the generous rhythm of giving.',
  },
  {
    id: 'shadowed-throne', name: 'The Shadowed Throne', icon: Crown,
    sanctification: 'Unholy',
    edicts: 'Rule through fear. Reward loyalty without limit. Crush defiance utterly.',
    anathema: 'Show mercy to traitors. Accept rebellion. Permit an insult to stand.',
    domains: ['Tyranny', 'Knowledge', 'Cities'], favoredWeapon: 'Scythe',
    sacredAnimal: 'Raven', sacredColors: ['#0E1419', '#9B1D26'],
    flavor: 'The crown that knows no kindness. God of tyrants, conquerors, and the law of fear.',
  },
];

export default DEITY_PRESETS;
