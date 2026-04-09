import React from "react";
import { motion } from "framer-motion";

export default function HistoryTimeline({ entries, campaign, onSelectEntry }) {
  // Sort entries by date
  const sortedEntries = [...entries]
    .filter(e => e.historical_date)
    .sort((a, b) => {
      const aYear = a.historical_date.year || 0;
      const bYear = b.historical_date.year || 0;
      return aYear - bYear;
    });

  if (sortedEntries.length === 0) {
    return (
      <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-12 border border-cyan-400/30 text-center">
        <p className="text-gray-400 text-lg">No historical events yet. Start recording history!</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2A3441]/90 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/30">
      <h2 className="text-xl font-bold text-[#37F2D1] mb-6">Timeline</h2>
      
      <div className="relative max-h-[800px] overflow-y-auto">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#37F2D1] via-[#37F2D1]/50 to-transparent" />
        
        <div className="space-y-4">
          {sortedEntries.map((entry, idx) => {
            const date = entry.historical_date;
            const yearName = campaign?.calendar_system?.year_name || 'Year';
            
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative pl-10"
              >
                {/* Timeline node */}
                <div className="absolute left-1.5 top-3 w-3 h-3 bg-[#37F2D1] rounded-full border-2 border-[#2A3441] shadow-lg shadow-[#37F2D1]/50" />
                
                {/* Content card */}
                <div 
                  onClick={() => onSelectEntry(entry)}
                  className="bg-[#1E2430] rounded-lg p-3 border border-gray-700 hover:border-[#37F2D1] transition-all cursor-pointer group"
                >
                  <div className="text-[#37F2D1] font-bold text-xs mb-1">
                    {yearName} {date.year}
                    {date.era && ` ${date.era}`}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#37F2D1] transition-colors">
                    {entry.title}
                  </h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}