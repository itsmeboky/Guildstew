// The five clans the v6 prototype ships. V5 corebook line — Tremere
// reads "Blood Sorcery" (the post-Camarilla-falling-out renaming),
// not "Thaumaturgy". Do not "fix" the discipline list; the audited
// math depends on these exact names.
//
// `sigil` is a Lucide component reference; `accent` is the clan's
// signature hex; `hood` is the all-caps tagline shown over the
// portrait on the reveal panel.

import {
  Flame, Sparkles, Crown, Moon as MoonIcon, Wand2,
} from 'lucide-react';

export const CLANS = [
  {
    id: 'brujah', name: 'Brujah', epithet: 'The Rabble',
    flavor: 'Rebels and warriors. Idealists with fangs. They burn hot — the Beast lives close to the skin.',
    bane: 'Violent Temper',
    baneDesc: 'When triggered toward fury frenzy, subtract dice equal to Bane Severity from the resistance pool.',
    compulsion: 'Rebellion',
    compulsionDesc: 'Two-die penalty until you defy an order, expectation, or current command.',
    disciplines: ['Celerity', 'Potence', 'Presence'],
    sigil: Flame, accent: '#c41e3a', hood: 'BLOOD AND CONVICTION',
  },
  {
    id: 'toreador', name: 'Toreador', epithet: 'The Divas',
    flavor: 'Artists, aesthetes, sensualists drowning in beauty. They feel everything — and forget what mortals could not survive.',
    bane: 'Aesthetic Fixation',
    baneDesc: 'When surrounded by exquisite beauty and unable to indulge, suffer a dice penalty until you do.',
    compulsion: 'Obsession',
    compulsionDesc: 'Fixate on a single sensory experience. Two-die penalty on unrelated rolls.',
    disciplines: ['Auspex', 'Celerity', 'Presence'],
    sigil: Sparkles, accent: '#d4537e', hood: 'BEAUTY AND RUIN',
  },
  {
    id: 'ventrue', name: 'Ventrue', epithet: 'The Blue Bloods',
    flavor: 'Aristocrats. Manipulators. They were ruling cities before the Camarilla had a name.',
    bane: 'Rarefied Tastes',
    baneDesc: 'Can only feed from a narrow, specific category of mortals. All other blood is bile.',
    compulsion: 'Arrogance',
    compulsionDesc: 'Must give a command and have it obeyed. Two-die penalty until someone submits.',
    disciplines: ['Dominate', 'Fortitude', 'Presence'],
    sigil: Crown, accent: '#7f77dd', hood: 'POWER AND PRICE',
  },
  {
    id: 'nosferatu', name: 'Nosferatu', epithet: 'The Sewer Rats',
    flavor: 'Twisted by the Embrace into something the world cannot look at. They know every secret.',
    bane: 'Repulsiveness',
    baneDesc: 'Cannot pass for human. Two-dice penalty on Social pools involving anyone who sees them clearly.',
    compulsion: 'Cryptophilia',
    compulsionDesc: 'Must learn a secret no one wants known. Two-die penalty until they do.',
    disciplines: ['Animalism', 'Obfuscate', 'Potence'],
    sigil: MoonIcon, accent: '#5DCAA5', hood: 'WHISPERS AND SHADOW',
  },
  {
    id: 'tremere', name: 'Tremere', epithet: 'The Warlocks',
    flavor: 'Blood sorcerers who killed their way to immortality. The clan bond shattered — no one trusts them.',
    bane: 'Deficient Blood',
    baneDesc: 'Cannot create blood bonds with other Kindred. Their vitae lost its potency.',
    compulsion: 'Perfectionism',
    compulsionDesc: 'Must redo any task that was not a critical success. Two-die penalty until then.',
    disciplines: ['Auspex', 'Blood Sorcery', 'Dominate'],
    sigil: Wand2, accent: '#AFA9EC', hood: 'BLOOD AND WILL',
  },
];

export const getClan = (id) => CLANS.find((c) => c.id === id) || null;
