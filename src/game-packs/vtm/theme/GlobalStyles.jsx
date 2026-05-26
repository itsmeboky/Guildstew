// Scoped global styles for the VTM creator. Lifted verbatim from
// the prototype's `GlobalStyles` block. Mounted once at the root of
// VTMCharacterCreator; class selectors here (.v-card, .v-btn,
// .v-input, .v-textarea, .f-display, .f-typewriter, etc.) live in
// component JSX and don't conflict with platform styles because all
// of them carry the .v- / .f- prefix.
//
// Keyframe animations (sceneIn, fadeUp, sigilPulse, glowPulse,
// polaroidDevelop, lacyRotateCW/CCW, batFly1/2/3, batFlap) are
// scoped here too — global keyframes are theoretically global in
// CSS, but the names are unique enough that they won't collide.
//
// Web fonts are pulled in via Google Fonts import — Cinzel, Cinzel
// Decorative, Cormorant Garamond, Inter, Special Elite, Old
// Standard TT. The platform's preferred font-loader pattern is not
// well-established (only PF2e does this, and it does it inline
// inside CharacterCreatorFlow.jsx) so this matches that convention.

import React from 'react';
import { V } from './colors.js';

export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700;800;900&family=Special+Elite&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap');

      .v-root { font-family: 'Inter', -apple-system, sans-serif; }
      .f-display { font-family: 'Cinzel', serif; letter-spacing: 0.08em; }
      .f-decorative { font-family: 'Cinzel Decorative', serif; }
      .f-serif { font-family: 'Cormorant Garamond', serif; }
      .f-italic { font-family: 'Cormorant Garamond', serif; font-style: italic; }
      .f-typewriter { font-family: 'Special Elite', monospace; letter-spacing: 0.04em; }
      .f-mono { font-family: 'JetBrains Mono', 'SF Mono', monospace; letter-spacing: 0.15em; }
      .f-old { font-family: 'Old Standard TT', serif; }

      .v-root *::-webkit-scrollbar { width: 4px; height: 4px; }
      .v-root *::-webkit-scrollbar-track { background: transparent; }
      .v-root *::-webkit-scrollbar-thumb { background: rgba(196, 30, 58, 0.22); border-radius: 2px; }

      .outline-text { font-family: 'Cinzel', serif; font-weight: 900; color: transparent; -webkit-text-stroke: 1.5px ${V.text}; letter-spacing: 0.04em; }
      .outline-red  { font-family: 'Cinzel', serif; font-weight: 900; color: transparent; -webkit-text-stroke: 1.5px ${V.bloodBri}; letter-spacing: 0.04em; }
      .outline-cyan { font-family: 'Cinzel', serif; font-weight: 900; color: transparent; -webkit-text-stroke: 1.5px ${V.cyan}; letter-spacing: 0.04em; }

      @keyframes batFly1 { 0% { transform: translate(-10vw, 35vh) scale(0.4); opacity: 0; } 10% { opacity: 0.5; } 90% { opacity: 0.5; } 100% { transform: translate(115vw, 25vh) scale(0.4); opacity: 0; } }
      @keyframes batFly2 { 0% { transform: translate(115vw, 50vh) scale(0.35) rotate(180deg); opacity: 0; } 10% { opacity: 0.4; } 90% { opacity: 0.4; } 100% { transform: translate(-15vw, 60vh) scale(0.35) rotate(180deg); opacity: 0; } }
      @keyframes batFly3 { 0% { transform: translate(-10vw, 18vh) scale(0.3); opacity: 0; } 10% { opacity: 0.4; } 90% { opacity: 0.4; } 100% { transform: translate(115vw, 12vh) scale(0.3); opacity: 0; } }
      @keyframes batFlap { 0%, 100% { transform: scaleY(1); } 40% { transform: scaleY(0.4); } }

      @keyframes sceneIn { 0% { opacity: 0; transform: scale(1.04); filter: blur(12px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
      .scene-in { animation: sceneIn 0.8s cubic-bezier(0.22, 1, 0.36, 1); }

      @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      .fade-up { animation: fadeUp 0.6s ease-out both; }
      .fade-up-1 { animation: fadeUp 0.6s 0.1s ease-out both; }
      .fade-up-2 { animation: fadeUp 0.6s 0.2s ease-out both; }
      .fade-up-3 { animation: fadeUp 0.6s 0.3s ease-out both; }
      .fade-up-4 { animation: fadeUp 0.6s 0.4s ease-out both; }

      @keyframes sigilPulse { 0%, 100% { filter: drop-shadow(0 0 8px ${V.bloodBri}80); } 50% { filter: drop-shadow(0 0 24px ${V.bloodNeon}); } }
      @keyframes glowPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.04); } }
      @keyframes polaroidDevelop { 0% { filter: brightness(0.2) contrast(2); opacity: 0.3; } 100% { filter: brightness(1) contrast(1); opacity: 1; } }

      @keyframes lacyRotateCW  { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes lacyRotateCCW { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }

      .v-card { transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
      .v-card:hover { transform: translateY(-3px); }
      .v-btn { transition: all 0.25s ease; position: relative; overflow: hidden; }

      .v-input, .v-textarea {
        background: rgba(8, 4, 12, 0.65); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border: 1px solid ${V.edgeRedDim}; color: ${V.text}; padding: 12px 16px;
        font-family: 'Inter', sans-serif; font-size: 15px; outline: none;
        transition: all 0.25s ease; width: 100%; box-sizing: border-box;
      }
      .v-input:focus, .v-textarea:focus {
        border-color: ${V.bloodBri}; background: rgba(15, 8, 18, 0.85);
        box-shadow: 0 0 0 1px ${V.bloodBri}50, 0 0 24px ${V.bloodBri}20;
      }
      .v-textarea { resize: vertical; min-height: 60px; }

      .cut-md { clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px); }
      .cut-lg { clip-path: polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px); }
      .cut-sm { clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); }
      .cut-tl { clip-path: polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px); }
    `}</style>
  );
}
