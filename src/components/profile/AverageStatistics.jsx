import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export default function AverageStatistics({ characters }) {
  // Calculate average stats from all characters
  const calculateAverages = () => {
    if (!characters || characters.length === 0) {
      return [
        { stat: 'DPS', value: 0 },
        { stat: 'Healing', value: 0 },
        { stat: 'Nat 20s', value: 0 },
        { stat: 'Nat 1s', value: 0 },
        { stat: 'Accuracy', value: 0 },
        { stat: 'Defense', value: 0 },
        { stat: 'Critical Hits', value: 0 },
        { stat: 'Downed', value: 0 }
      ];
    }

    const totals = characters.reduce((acc, char) => {
      const stats = char.stats || {};
      return {
        dps: acc.dps + (stats.dps || 0),
        healing: acc.healing + (stats.healing || 0),
        nat_20s: acc.nat_20s + (stats.nat_20s || 0),
        nat_1s: acc.nat_1s + (stats.nat_1s || 0),
        accuracy: acc.accuracy + (stats.accuracy || 0),
        defense: acc.defense + (stats.defense || 0),
        critical_hits: acc.critical_hits + (stats.critical_hits || 0),
        downed: acc.downed + (stats.downed || 0)
      };
    }, {
      dps: 0, healing: 0, nat_20s: 0, nat_1s: 0,
      accuracy: 0, defense: 0, critical_hits: 0, downed: 0
    });

    const count = characters.length;
    return [
      { stat: 'DPS', value: Math.round(totals.dps / count) },
      { stat: 'Healing', value: Math.round(totals.healing / count) },
      { stat: 'Nat 20s', value: Math.round(totals.nat_20s / count) },
      { stat: 'Nat 1s', value: Math.round(totals.nat_1s / count) },
      { stat: 'Accuracy', value: Math.round(totals.accuracy / count) },
      { stat: 'Defense', value: Math.round(totals.defense / count) },
      { stat: 'Critical Hits', value: Math.round(totals.critical_hits / count) },
      { stat: 'Downed', value: Math.round(totals.downed / count) }
    ];
  };

  const data = calculateAverages();

  return (
    <div className="bg-[#2A3441] rounded-2xl p-6">
      <h3 className="text-lg font-bold mb-4">Average Statistics</h3>
      
      <div className="bg-gradient-to-br from-slate-100 to-blue-50 rounded-xl p-6">
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={data}>
            <PolarGrid stroke="#94a3b8" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: '#475569', fontSize: 11 }} />
            <Radar
              name="Stats"
              dataKey="value"
              stroke="#37F2D1"
              fill="#37F2D1"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {data.slice(0, 8).map((item) => (
          <div key={item.stat} className="flex justify-between">
            <span className="text-gray-400">{item.stat}:</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}