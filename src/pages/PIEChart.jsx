import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Award, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";

/**
 * P.I.E. (Player Intelligence & Experience) chart. Reads aggregated
 * combat stats from the character_stats table — the GMPanel writes
 * every damage / heal / kill / crit / nat 20 / death save during
 * play, so the cards here are live as soon as combat starts.
 */
export default function PIEChart() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: characters = [] } = useQuery({
    queryKey: ['userCharacters', user?.id || user?.email],
    queryFn: async () => {
      // Try id-based linkage first; fall back to email since older
      // rows still set created_by to the user's email.
      const byId = user?.id
        ? await base44.entities.Character.filter({ created_by: user.id }).catch(() => [])
        : [];
      if (byId.length > 0) return byId;
      if (user?.email) {
        return base44.entities.Character.filter({ created_by: user.email }).catch(() => []);
      }
      return [];
    },
    enabled: !!user,
    initialData: []
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['userCampaigns', user?.id],
    queryFn: async () => {
      const all = await base44.entities.Campaign.list().catch(() => []);
      return all.filter(c => c.game_master_id === user?.id || c.player_ids?.includes(user?.id));
    },
    enabled: !!user,
    initialData: []
  });

  // Pull all character_stats rows for the user's characters. One
  // row per (character, campaign) pair — sum across rows so the PIE
  // chart represents lifetime totals across every campaign.
  const { data: characterStats = [] } = useQuery({
    queryKey: ['characterStats', characters.map((c) => c.id).sort().join(',')],
    queryFn: async () => {
      if (characters.length === 0) return [];
      const all = [];
      for (const c of characters) {
        try {
          const rows = await base44.entities.CharacterStat.filter({ character_id: c.id });
          for (const r of rows) all.push({ ...r, character: c });
        } catch { /* table may not exist yet — keep going */ }
      }
      return all;
    },
    enabled: characters.length > 0,
    initialData: [],
    refetchInterval: 30000,
  });

  // --- Aggregations ---
  const aggregateStats = characterStats.reduce((acc, s) => {
    acc.total_damage_dealt   += Number(s.total_damage_dealt   || 0);
    acc.total_damage_taken   += Number(s.total_damage_taken   || 0);
    acc.total_healing_done   += Number(s.total_healing_done   || 0);
    acc.nat_20s              += Number(s.nat_20s              || 0);
    acc.nat_1s               += Number(s.nat_1s               || 0);
    acc.crits_landed         += Number(s.crits_landed         || 0);
    acc.attacks_hit          += Number(s.attacks_hit          || 0);
    acc.attacks_missed       += Number(s.attacks_missed       || 0);
    acc.kills                += Number(s.kills                || 0);
    acc.times_downed         += Number(s.times_downed         || 0);
    acc.death_saves_passed   += Number(s.death_saves_passed   || 0);
    acc.death_saves_failed   += Number(s.death_saves_failed   || 0);
    acc.spells_cast          += Number(s.spells_cast          || 0);
    acc.conditions_inflicted += Number(s.conditions_inflicted || 0);
    acc.conditions_received  += Number(s.conditions_received  || 0);
    acc.rounds_in_combat     += Number(s.rounds_in_combat     || 0);
    acc.highest_single_damage = Math.max(acc.highest_single_damage, Number(s.highest_single_damage || 0));
    acc.most_healing_single_spell = Math.max(acc.most_healing_single_spell, Number(s.most_healing_single_spell || 0));
    return acc;
  }, {
    total_damage_dealt: 0, total_damage_taken: 0, total_healing_done: 0,
    nat_20s: 0, nat_1s: 0, crits_landed: 0,
    attacks_hit: 0, attacks_missed: 0, kills: 0,
    times_downed: 0, death_saves_passed: 0, death_saves_failed: 0,
    spells_cast: 0, conditions_inflicted: 0, conditions_received: 0,
    rounds_in_combat: 0,
    highest_single_damage: 0, most_healing_single_spell: 0,
  });

  // Derived metrics — clamped so the radar chart still has shape
  // even with sparse data.
  const totalAttacks = aggregateStats.attacks_hit + aggregateStats.attacks_missed;
  const accuracyPct = totalAttacks > 0
    ? Math.round((aggregateStats.attacks_hit / totalAttacks) * 100)
    : 0;
  const critRatePct = aggregateStats.attacks_hit > 0
    ? Math.round((aggregateStats.crits_landed / aggregateStats.attacks_hit) * 100)
    : 0;
  const killDeathRatio = aggregateStats.kills / Math.max(aggregateStats.times_downed, 1);
  const avgDamagePerRound = aggregateStats.rounds_in_combat > 0
    ? Math.round(aggregateStats.total_damage_dealt / aggregateStats.rounds_in_combat)
    : 0;

  const getPlaystyleDescription = () => {
    if (characters.length === 0) {
      return "Create your first character to see your overall playstyle analysis!";
    }
    if (characterStats.length === 0) {
      return "Stats will start filling in once you take your first combat action — damage dealt, healing done, crits, kills, and death saves are all tracked live.";
    }
    const isDamageDealer = avgDamagePerRound > 8 && aggregateStats.total_damage_dealt > aggregateStats.total_healing_done * 1.5;
    const isHealer = aggregateStats.total_healing_done > Math.max(aggregateStats.total_damage_dealt / 2, 50);
    const isTank = aggregateStats.total_damage_taken > aggregateStats.total_damage_dealt && aggregateStats.times_downed <= 1;
    const isLucky = aggregateStats.nat_20s > aggregateStats.nat_1s;
    const isReckless = aggregateStats.times_downed > characters.length * 2;

    let description = "Based on your gameplay across all characters, ";
    if (isDamageDealer && !isTank) {
      description += "you favor aggressive, high-damage playstyles. You excel at dealing devastating blows to enemies. ";
    } else if (isHealer) {
      description += "you're a natural support player. Your focus on healing keeps your party alive. ";
    } else if (isTank) {
      description += "you prefer the role of protector. You absorb damage so your allies don't have to. ";
    } else {
      description += "you maintain a balanced approach to combat — versatile, adapting to whatever the situation demands. ";
    }
    if (isLucky) {
      description += "The dice favor you — your natural 20s outpace your critical failures. ";
    } else if (aggregateStats.nat_1s > 10 && aggregateStats.nat_1s > aggregateStats.nat_20s) {
      description += "Your dice rolls have been unpredictable lately, with more critical failures than successes. ";
    }
    description += isReckless
      ? "However, your tendency to drop in combat suggests more cautious positioning could pay off."
      : "Your survival instincts are solid, keeping you in the fight when it matters most.";
    return description;
  };

  // The radar chart presents normalized 0–100 values. Each axis
  // takes either an absolute count clamped at 100 or a percentage.
  const radarData = [
    { stat: 'DPR',         value: Math.min(100, avgDamagePerRound) },
    { stat: 'Healing',     value: Math.min(100, Math.round(aggregateStats.total_healing_done / 10)) },
    { stat: 'Accuracy',    value: accuracyPct },
    { stat: 'Crit Rate',   value: critRatePct },
    { stat: 'Resilience',  value: Math.max(0, 100 - aggregateStats.times_downed * 20) },
  ];

  const diceData = [
    { name: 'Nat 20s', value: aggregateStats.nat_20s, fill: '#37F2D1' },
    { name: 'Nat 1s', value: aggregateStats.nat_1s, fill: '#FF5722' }
  ];

  // Per-character roll-up for the "By Character" tab. Sums each
  // character's rows across every campaign they've played in.
  const characterCards = characters.map((c) => {
    const rows = characterStats.filter((s) => s.character_id === c.id);
    const totals = rows.reduce((acc, r) => {
      acc.damage += Number(r.total_damage_dealt || 0);
      acc.healing += Number(r.total_healing_done || 0);
      acc.kills += Number(r.kills || 0);
      return acc;
    }, { damage: 0, healing: 0, kills: 0 });
    return { character: c, totals };
  });

  const CharacterCard = ({ character, totals }) => (
    <Link
      to={`${createPageUrl("CharacterAnalytics")}?id=${character.id}`}
      className="bg-[#2A3441] rounded-xl overflow-hidden hover:ring-2 hover:ring-[#37F2D1] transition-all cursor-pointer group"
    >
      <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 relative overflow-hidden">
        {character.avatar_url && (
          <img
            src={character.avatar_url}
            alt={character.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{character.name}</h3>
        <p className="text-sm text-gray-400 mb-3">Level {character.level} {character.class}</p>
        <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
          <div>
            <div className="text-[#37F2D1] font-bold">{totals.damage}</div>
            <div className="text-gray-500 uppercase tracking-wider">DMG</div>
          </div>
          <div>
            <div className="text-[#22c55e] font-bold">{totals.healing}</div>
            <div className="text-gray-500 uppercase tracking-wider">Heal</div>
          </div>
          <div>
            <div className="text-[#fbbf24] font-bold">{totals.kills}</div>
            <div className="text-gray-500 uppercase tracking-wider">Kills</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {character.tags?.slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-xs border-[#37F2D1] text-[#37F2D1]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">P.I.E. Chart</h1>
          <p className="text-gray-400">Player Intelligence &amp; Experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SummaryCard icon={TrendingUp} accent="#37F2D1" label="Total Characters" value={characters.length} />
          <SummaryCard icon={Award} accent="#FF5722" label="Campaigns" value={campaigns.length} />
          <SummaryCard icon={Target} accent="#a855f7" label="Total Hours" value={`${campaigns.reduce((acc, c) => acc + (c.total_hours || 0), 0)}h`} />
        </div>

        {/* Overall Playstyle Description */}
        <div className="bg-[#2A3441] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#37F2D1]">Your Overall Playstyle</h2>
          <p className="text-gray-300 leading-relaxed text-base">
            {getPlaystyleDescription()}
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#2A3441]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="characters" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              By Character
            </TabsTrigger>
            <TabsTrigger value="dice" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              Dice Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#2A3441] rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Combat Profile</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#37F2D1" strokeOpacity={0.3} />
                    <PolarAngleAxis dataKey="stat" stroke="#fff" />
                    <PolarRadiusAxis stroke="#37F2D1" />
                    <Radar name="Stats" dataKey="value" stroke="#37F2D1" fill="#37F2D1" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#2A3441] rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold mb-4">Lifetime Totals</h3>
                <StatRow label="Damage Dealt" value={aggregateStats.total_damage_dealt} accent="#FF5722" />
                <StatRow label="Damage Taken" value={aggregateStats.total_damage_taken} accent="#ef4444" />
                <StatRow label="Healing Done" value={aggregateStats.total_healing_done} accent="#22c55e" />
                <StatRow label="Kills" value={aggregateStats.kills} accent="#fbbf24" />
                <StatRow label="Times Downed" value={aggregateStats.times_downed} accent="#a855f7" />
                <div className="pt-3 border-t border-gray-700 grid grid-cols-2 gap-4 text-sm">
                  <Derived label="Accuracy" value={`${accuracyPct}%`} />
                  <Derived label="Crit Rate" value={`${critRatePct}%`} />
                  <Derived label="K/D Ratio" value={killDeathRatio.toFixed(2)} />
                  <Derived label="Avg DPR" value={avgDamagePerRound} />
                  <Derived label="Highest Hit" value={aggregateStats.highest_single_damage} />
                  <Derived label="Big Heal" value={aggregateStats.most_healing_single_spell} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="characters">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {characterCards.map(({ character, totals }) => (
                <CharacterCard key={character.id} character={character} totals={totals} />
              ))}
              {characters.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No characters yet. Create your first character to see their analytics!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dice">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#2A3441] rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Dice Roll Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={diceData}>
                    <XAxis dataKey="name" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <Tooltip contentStyle={{ backgroundColor: '#2A3441', border: 'none' }} />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#2A3441] rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Luck Rating</h3>
                <div className="space-y-6">
                  <LuckBar label="Natural 20s" value={aggregateStats.nat_20s} other={aggregateStats.nat_1s} accent="#37F2D1" />
                  <LuckBar label="Natural 1s" value={aggregateStats.nat_1s} other={aggregateStats.nat_20s} accent="#FF5722" />
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Overall Luck Score</p>
                    <p className="text-4xl font-bold text-[#37F2D1]">
                      {aggregateStats.nat_20s + aggregateStats.nat_1s > 0
                        ? Math.round((aggregateStats.nat_20s / (aggregateStats.nat_20s + aggregateStats.nat_1s)) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, accent, label, value }) {
  return (
    <div className="bg-[#2A3441] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}33` }}>
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className="font-bold text-xl" style={{ color: accent }}>{value}</span>
    </div>
  );
}

function Derived({ label, value }) {
  return (
    <div className="bg-[#1E2430] rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function LuckBar({ label, value, other, accent }) {
  const total = value + other;
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold" style={{ color: accent }}>{value}</span>
      </div>
      <div className="h-3 bg-[#1E2430] rounded-full overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: `linear-gradient(to right, ${accent}, ${accent}aa)` }}
        />
      </div>
    </div>
  );
}
