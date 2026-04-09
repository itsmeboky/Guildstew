import React, { useState } from "react";
import { Heart, Music, Circle, Triangle, Zap, Plus, Settings, Play } from "lucide-react";
import { spellIcons } from "@/components/dnd5e/spellData";

const basicActionIcons = [
  { name: "Dash", url: "https://static.wixstatic.com/media/5cdfd8_02e46386022f4a57bb7537e0459427ea~mv2.png" },
  { name: "Help", url: "https://static.wixstatic.com/media/5cdfd8_b6c6460902d246a6bb2f34c0d2a84c71~mv2.png" },
  { name: "Grapple", url: "https://static.wixstatic.com/media/5cdfd8_1a20fa07c6a74ad8a2c678a716ec3138~mv2.png" },
  { name: "Throw", url: "https://static.wixstatic.com/media/5cdfd8_f124e759e4f449a1a9514e2ea8046586~mv2.png" },
  { name: "Hide", url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/1f6ba74ba_Hide.png" },
  { name: "Ready", url: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6917dd35b600199681c5b960/4f1e26b5f_ReadyAction.png" }
];

export default function PlayerCenterPanel({ character }) {
  const [activeTab, setActiveTab] = useState("stats"); // stats, skills, background
  const [quickItems, setQuickItems] = useState([null, null, null, null]); // 4 slots

  if (!character) return null;

  // Attributes
  const attributes = character.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const getMod = (score) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Spells
  const spells = character.spells?.known_spells || [];
  const spellsList = [
    ...(character.spells?.cantrips || []),
    ...(character.spells?.level1 || []),
    ...(character.spells?.level2 || []),
    // ... add more if needed
  ].slice(0, 8); // Limit to 8 for display

  const hpPercent = Math.min(((character.hit_points?.current || 0) / (character.hit_points?.max || 1)) * 100, 100);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top Action Bar */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg p-4 flex flex-col gap-4">
        
        {/* Stats Row */}
        <div className="flex items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <StatBubble label="AC" value={character.armor_class} />
            <StatBubble label="INIT" value={getMod(attributes.dex)} />
            <StatBubble label="SPEED" value={character.speed + " ft"} width="w-16" />
          </div>
          
          {/* HP Bar */}
          <div className="flex-1 flex items-center gap-2">
            <Heart className="text-red-500 w-6 h-6" />
            <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden relative border border-gray-700">
              <div className="absolute top-0 left-0 h-full bg-red-500 transition-all" style={{ width: `${hpPercent}%` }} />
            </div>
            <span className="text-xs font-mono text-gray-300">
              {character.hit_points?.current} / {character.hit_points?.max}
            </span>
          </div>

          {/* Action Toggles */}
          <div className="flex gap-1">
            <ToggleIcon icon={Music} color="text-yellow-400" label="Insp" />
            <ToggleIcon icon={Circle} color="text-green-500" label="Act" />
            <ToggleIcon icon={Triangle} color="text-orange-500" label="Bon" />
          </div>
        </div>

        {/* Actions & Spells Row */}
        <div className="flex gap-2 items-center">
          {/* Actions */}
          <div className="flex gap-1">
            {basicActionIcons.slice(0, 4).map((action, i) => (
              <div key={i} className="w-10 h-10 bg-[#111827] rounded border border-gray-700 p-0.5 hover:border-[#37F2D1] cursor-pointer" title={action.name}>
                <img src={action.url} alt={action.name} className="w-full h-full object-cover rounded-sm" />
              </div>
            ))}
          </div>
          
          <div className="w-px h-10 bg-gray-700 mx-2" />

          {/* Spells */}
          <div className="flex gap-1 flex-1 overflow-x-auto custom-scrollbar pb-1">
            {spellsList.map((spell, i) => (
              <div key={i} className="w-10 h-10 bg-[#111827] rounded border border-purple-900/50 p-0.5 hover:border-purple-400 cursor-pointer min-w-[2.5rem]" title={spell.name || spell}>
                {spellIcons[spell.name || spell] ? (
                  <img src={spellIcons[spell.name || spell]} alt={spell.name || spell} className="w-full h-full object-cover rounded-sm" />
                ) : (
                  <div className="w-full h-full bg-purple-900/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                )}
              </div>
            ))}
            {/* Add Spell Slot */}
            <div className="w-10 h-10 bg-[#111827] rounded border border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-gray-500">
              <Plus className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Block */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg flex flex-col flex-1">
        <div className="flex border-b border-[#1e293b]">
          {['stats', 'skills', 'background'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === tab ? "bg-[#1E2430] text-white border-b-2 border-[#37F2D1]" : "text-gray-500 hover:text-gray-300"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="bg-[#111827] rounded p-2 text-center mb-2">
                <span className="text-xs text-gray-400 uppercase block">Saving Throws</span>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  {Object.entries(character.saving_throws || {}).filter(([, v]) => v).map(([stat, v]) => (
                    <span key={stat} className="text-[10px] px-2 py-0.5 bg-gray-700 rounded text-gray-200 uppercase font-bold">
                      {stat} {getMod(attributes[stat])}
                    </span>
                  ))}
                  {Object.keys(character.saving_throws || {}).length === 0 && <span className="text-xs text-gray-600">None</span>}
                </div>
              </div>

              <div className="flex justify-between items-center px-4 py-2 bg-[#111827] rounded mb-2">
                <span className="text-xs text-gray-400 uppercase">Proficiency Bonus</span>
                <span className="font-bold text-[#37F2D1]">+{character.proficiency_bonus}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2 bg-[#111827] rounded mb-4">
                <span className="text-xs text-gray-400 uppercase">Passive Perception</span>
                <span className="font-bold text-white">{character.passive_perception}</span>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(attributes).map(([key, val]) => (
                  <div key={key} className="bg-[#111827] rounded-xl p-2 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">{key}</span>
                    <span className="text-xl font-bold text-white">{getMod(val)}</span>
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 mt-1">
                      {val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(character.skills || {}).map(([skill, proficient]) => (
                <div key={skill} className={`flex justify-between items-center p-2 rounded ${proficient ? "bg-gray-800 border border-gray-600" : "bg-[#111827]"}`}>
                  <span className={`text-xs ${proficient ? "text-white font-bold" : "text-gray-400"}`}>{skill}</span>
                  <span className={`text-xs ${proficient ? "text-[#37F2D1]" : "text-gray-600"}`}>
                    {proficient ? "●" : "○"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'background' && (
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <h4 className="text-xs uppercase text-gray-500 font-bold mb-1">Background</h4>
                <p>{character.background}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase text-gray-500 font-bold mb-1">Traits</h4>
                <p>{character.personality?.traits?.join(", ") || "None"}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase text-gray-500 font-bold mb-1">Ideals</h4>
                <p>{character.personality?.ideals || "None"}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase text-gray-500 font-bold mb-1">Bonds</h4>
                <p>{character.personality?.bonds || "None"}</p>
              </div>
              <div>
                <h4 className="text-xs uppercase text-gray-500 font-bold mb-1">Flaws</h4>
                <p>{character.personality?.flaws || "None"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Items */}
      <div className="bg-[#050816] rounded-2xl border border-[#1e293b] shadow-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-500">Quick Items</h3>
          <Settings className="w-3 h-3 text-gray-600 cursor-pointer hover:text-white" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {quickItems.map((item, i) => (
            <div key={i} className="aspect-square bg-[#111827] rounded-xl border border-gray-800 flex items-center justify-center hover:border-gray-600 cursor-pointer relative">
              {/* Placeholder logic for quick items - would need drag/drop */}
              <span className="text-xs text-gray-700">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBubble({ label, value, width = "w-12" }) {
  return (
    <div className={`${width} h-12 bg-[#111827] rounded-xl border border-gray-700 flex flex-col items-center justify-center`}>
      <span className="text-[8px] text-gray-500 font-bold uppercase">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function ToggleIcon({ icon: Icon, color, label }) {
  return (
    <div className="w-8 h-8 bg-[#111827] rounded-lg border border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-800" title={label}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
}