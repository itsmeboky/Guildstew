import React, { useState, useEffect } from "react";
// import { Coins } from "lucide-react";

export default function MoneyCounter({ currency, onChange, readOnly = false }) {
  const [localCurrency, setLocalCurrency] = useState(currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Only sync from props if not currently editing to prevent overwriting user input during typing/refetching
    if (currency && !isEditing) {
      setLocalCurrency(currency);
    }
  }, [currency, isEditing]);

  const handleChange = (type, value) => {
    // Prevent NaN
    const val = value === '' ? 0 : parseInt(value);
    const newCurrency = { ...localCurrency, [type]: isNaN(val) ? 0 : val };
    setLocalCurrency(newCurrency);
  };

  const handleSave = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    if (onChange) onChange(localCurrency);
  };

  const formatAmount = (amount) => {
    if (!amount) return 0;
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return amount;
  };

  if (isEditing && !readOnly) {
    return (
      <div className="bg-[#0b1220] rounded-xl p-3 border border-[#37F2D1] shadow-lg w-full min-w-[240px] relative z-50">
        <div className="grid grid-cols-5 gap-2 mb-3">
          {['gp', 'sp', 'cp', 'pp', 'ep'].map(type => (
            <div key={type} className="flex flex-col items-center">
              <span className={`text-[9px] uppercase mb-1 font-bold ${
                type === 'gp' ? 'text-yellow-500' : 
                type === 'sp' ? 'text-slate-400' : 
                type === 'cp' ? 'text-orange-700' : 
                type === 'pp' ? 'text-slate-200' : 'text-slate-500'
              }`}>{type}</span>
              <input
                type="number"
                value={localCurrency[type] || ''}
                onChange={(e) => handleChange(type, e.target.value)}
                className="w-full bg-[#1a1f2e] border border-[#2A3441] rounded px-1 py-1 text-center text-xs text-white focus:border-[#37F2D1] outline-none"
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <button 
          onClick={handleSave}
          className="w-full bg-[#37F2D1] text-[#1E2430] text-[10px] font-bold py-1.5 rounded hover:bg-[#2dd9bd] transition-colors"
        >
          Save Wallet
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => !readOnly && setIsEditing(true)}
      className={`bg-[#0b1220] rounded-lg px-1.5 py-1 border border-[#111827] flex items-center ${!readOnly ? 'cursor-pointer hover:border-slate-600' : ''}`}
    >
      <div className="flex items-center gap-1">
        {[
          { type: 'gp', color: 'text-yellow-500' },
          { type: 'sp', color: 'text-slate-400' },
          { type: 'cp', color: 'text-orange-700' },
          { type: 'pp', color: 'text-slate-200' },
          { type: 'ep', color: 'text-slate-500' },
        ].map(({ type, color }) => (
          <div key={type} className="flex flex-col items-center min-w-[24px]">
            <span className={`text-[10px] font-bold leading-none ${localCurrency[type] > 0 ? 'text-white' : 'text-slate-600'}`}>
              {formatAmount(localCurrency[type] || 0)}
            </span>
            <span className={`text-[7px] uppercase font-bold ${color} mt-0.5`}>
              {type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}