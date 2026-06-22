// Deity picker modal — tabs: generic presets, campaign deities, forge your own.
// Verbatim from the prototype.

import React, { useState } from 'react';
import { X, Compass, Edit3 } from 'lucide-react';
import CornerBrackets from './CornerBrackets.jsx';
import GMWhisper from './GMWhisper.jsx';
import PrimaryButton from './PrimaryButton.jsx';
import GhostButton from './GhostButton.jsx';
import GodBannerBuilder, { DEFAULT_BANNER } from './GodBannerBuilder.jsx';
import { DEITY_PRESETS } from '../../data/index.js';

const DeityModal = ({ open, onClose, onSelect }) => {
  const [tab, setTab] = useState('preset');
  const [creating, setCreating] = useState({
    name: '', sanctification: 'Holy', edicts: '', anathema: '',
    domains: [], favoredWeapon: '', sacredAnimal: '',
    banner: DEFAULT_BANNER,
  });

  if (!open) return null;

  const finalizeCreate = () => {
    onSelect({ ...creating, custom: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-pf-bg/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-6">
        <div className="relative w-full max-w-6xl bg-pf-bg-card border border-pf-brass my-8">
          <CornerBrackets active />

          <div className="flex items-center justify-between p-6 border-b border-pf-brass-dim/30">
            <div>
              <p className="font-display text-xs tracking-[0.3em] text-pf-brass uppercase">Divine Patron</p>
              <h2 className="font-display text-3xl text-pf-bone">Choose or Forge a God</h2>
            </div>
            <button onClick={onClose} className="text-pf-stone hover:text-pf-bone transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex border-b border-pf-brass-dim/30">
            {[
              { k: 'preset', label: 'Generic Presets' },
              { k: 'campaign', label: 'Campaign Deities' },
              { k: 'create', label: 'Forge Your Own' },
            ].map(t => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex-1 py-4 font-display text-xs tracking-[0.2em] uppercase transition-all border-b-2
                            ${tab === t.k ? 'border-pf-brass text-pf-bone' : 'border-transparent text-pf-stone hover:text-pf-parchment'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {tab === 'preset' && (
              <>
                <GMWhisper>
                  Presets are Guildstew-original archetypes — generic enough to drop into any setting. Your GM may have created campaign-specific gods (next tab) or you can forge your own.
                </GMWhisper>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {DEITY_PRESETS.map(d => {
                    const Icon = d.icon;
                    return (
                      <button
                        key={d.id}
                        onClick={() => { onSelect(d); onClose(); }}
                        className="relative text-left p-5 bg-pf-bg-elev border border-pf-brass-dim/30 hover:border-pf-brass transition-all"
                      >
                        <CornerBrackets />
                        <div className="flex items-start gap-4 mb-3">
                          <div className="p-2 bg-pf-brass/10 border border-pf-brass/30">
                            <Icon size={26} className="text-pf-brass" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-display text-lg text-pf-bone">{d.name}</h4>
                            <p className="font-display text-[10px] tracking-[0.2em] text-pf-brass uppercase mt-0.5">
                              {d.sanctification} · {d.favoredWeapon}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-pf-stone font-body italic mb-3">{d.flavor}</p>
                        <div className="space-y-1.5 text-xs font-body">
                          <div><span className="text-pf-brass uppercase tracking-wider text-[10px]">Edicts: </span><span className="text-pf-parchment">{d.edicts}</span></div>
                          <div><span className="text-pf-brass uppercase tracking-wider text-[10px]">Anathema: </span><span className="text-pf-parchment">{d.anathema}</span></div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-pf-brass-dim/20">
                          <div className="flex gap-1.5 flex-wrap">
                            {d.domains.map(dom => (
                              <span key={dom} className="px-2 py-0.5 text-[10px] font-mono bg-pf-brass/10 text-pf-brass border border-pf-brass/30">
                                {dom.toUpperCase()}
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            {d.sacredColors.map((c, i) => (
                              <span key={i} className="w-4 h-4 border border-pf-brass-dim/40" style={{ background: c }} />
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tab === 'campaign' && (
              <div className="text-center py-16">
                <Compass size={48} className="text-pf-brass-dim mx-auto mb-4" />
                <p className="font-display text-sm tracking-[0.2em] text-pf-stone uppercase mb-2">No Campaign Deities Yet</p>
                <p className="font-body text-sm text-pf-stone max-w-md mx-auto leading-relaxed">
                  When a GM creates deities for their campaign, they appear here for players to choose from. Ask your GM, or forge your own and submit for approval.
                </p>
              </div>
            )}

            {tab === 'create' && (
              <div className="space-y-5">
                <GMWhisper>
                  Your god needs Edicts (what they uphold), Anathema (what they forbid), a Sanctification (Holy / Unholy / Neither), a Favored Weapon, and a Holy Symbol. Custom deities are submitted to your GM for approval before becoming canonical in the campaign.
                </GMWhisper>

                <div className="grid grid-cols-12 gap-5">
                  {/* Left col: identity */}
                  <div className="col-span-12 lg:col-span-6 space-y-4">
                    <div>
                      <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Deity Name</label>
                      <input
                        value={creating.name}
                        onChange={e => setCreating(c => ({ ...c, name: e.target.value }))}
                        placeholder="The Iron-Wreathed"
                        className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                                   focus:border-pf-brass focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Sanctification</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Holy', 'Unholy', 'Neither'].map(s => (
                          <button
                            key={s}
                            onClick={() => setCreating(c => ({ ...c, sanctification: s }))}
                            className={`py-2 font-display text-[11px] tracking-[0.15em] uppercase border transition-all
                                        ${creating.sanctification === s
                                          ? 'border-pf-brass bg-pf-brass/10 text-pf-bone'
                                          : 'border-pf-brass-dim/30 text-pf-stone hover:border-pf-brass-dim'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Edicts</label>
                      <textarea
                        rows={3}
                        value={creating.edicts}
                        onChange={e => setCreating(c => ({ ...c, edicts: e.target.value }))}
                        placeholder="Tend the wounded. Keep your word. Burn the wicked."
                        className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                                   focus:border-pf-brass focus:outline-none transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Anathema</label>
                      <textarea
                        rows={3}
                        value={creating.anathema}
                        onChange={e => setCreating(c => ({ ...c, anathema: e.target.value }))}
                        placeholder="Murder a guest. Refuse aid to a child. Lie under sacred oath."
                        className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                                   focus:border-pf-brass focus:outline-none transition-all resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Favored Weapon</label>
                        <input
                          value={creating.favoredWeapon}
                          onChange={e => setCreating(c => ({ ...c, favoredWeapon: e.target.value }))}
                          placeholder="Longsword"
                          className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                                     focus:border-pf-brass focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Sacred Animal</label>
                        <input
                          value={creating.sacredAnimal}
                          onChange={e => setCreating(c => ({ ...c, sacredAnimal: e.target.value }))}
                          placeholder="Stag"
                          className="w-full bg-pf-bg-elev border border-pf-brass-dim/30 px-4 py-2.5 text-pf-bone font-body
                                     focus:border-pf-brass focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-display text-[10px] tracking-[0.25em] text-pf-brass uppercase block mb-1.5">Domains (up to 4)</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Sun', 'Moon', 'Death', 'Life', 'Fire', 'Water', 'Earth', 'Air', 'Healing', 'Trickery', 'War', 'Tyranny', 'Knowledge', 'Travel', 'Family', 'Nature', 'Creation', 'Destruction'].map(dom => {
                          const picked = creating.domains.includes(dom);
                          return (
                            <button
                              key={dom}
                              onClick={() => setCreating(c => ({
                                ...c,
                                domains: picked ? c.domains.filter(d => d !== dom) : c.domains.length < 4 ? [...c.domains, dom] : c.domains
                              }))}
                              className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider border transition-all
                                          ${picked
                                            ? 'border-pf-brass bg-pf-brass/10 text-pf-bone'
                                            : 'border-pf-brass-dim/30 text-pf-stone hover:border-pf-brass-dim'}`}
                            >
                              {dom}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right col: God Banner Builder */}
                  <div className="col-span-12 lg:col-span-6">
                    <GodBannerBuilder
                      banner={creating.banner}
                      onChange={b => setCreating(c => ({ ...c, banner: b }))}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-pf-brass-dim/30">
                  <p className="text-xs text-pf-stone font-body italic">
                    Submitted deities require GM approval before becoming canonical.
                  </p>
                  <div className="flex gap-3">
                    <GhostButton onClick={onClose}>Cancel</GhostButton>
                    <PrimaryButton onClick={finalizeCreate} disabled={!creating.name}>
                      <Edit3 size={14} className="inline-block mr-2 -mt-0.5" />
                      Submit for Approval
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeityModal;
