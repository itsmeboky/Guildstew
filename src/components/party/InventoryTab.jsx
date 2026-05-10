import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Sword, Coins, BookOpen } from "lucide-react";
import { safeText } from "@/utils/safeRender";
import { base44 } from "@/api/base44Client";
import { isCipherInventoryItem, getCipherItem } from "@/config/cipherInventoryItems";
import CipherModal from "@/components/worldLore/CipherModal";

const CURRENCY_ORDER = [
  { key: "pp", label: "PP", color: "#e5e7eb" },
  { key: "gp", label: "GP", color: "#fbbf24" },
  { key: "ep", label: "EP", color: "#a7f3d0" },
  { key: "sp", label: "SP", color: "#cbd5e1" },
  { key: "cp", label: "CP", color: "#f97316" },
];

export default function InventoryTab({ character }) {
  const items = Array.isArray(character?.inventory) ? character.inventory : [];
  const currency = character?.currency || {};
  const [openCipherType, setOpenCipherType] = useState(null);

  // Cipher items query the campaign's mapping at modal-open time.
  // Loaded only if there's a cipher item in this inventory — no
  // network call for non-rogue / non-druid characters.
  const hasAnyCipher = items.some(isCipherInventoryItem);
  const { data: campaign } = useQuery({
    queryKey: ["campaign", character?.campaign_id],
    queryFn: () =>
      base44.entities.Campaign.filter({ id: character.campaign_id }).then(
        (r) => r[0],
      ),
    enabled: !!character?.campaign_id && hasAnyCipher,
  });

  const { equipped, unequipped } = useMemo(() => {
    const eq = [];
    const un = [];
    for (const raw of items) {
      const item = typeof raw === "string" ? { name: raw } : (raw || {});
      if (item.equipped) eq.push(item);
      else un.push(item);
    }
    return { equipped: eq, unequipped: un };
  }, [items]);

  if (items.length === 0 && !Object.values(currency).some(Boolean)) {
    return (
      <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-10 text-center text-slate-500 text-sm">
        Inventory is empty.
      </div>
    );
  }

  const onCipherItemOpen = (item) => {
    const cfg = getCipherItem(item.id) || getCipherItem(item.name);
    if (cfg?.cipher_type) setOpenCipherType(cfg.cipher_type);
  };

  return (
    <div className="space-y-5">
      {equipped.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-widest text-amber-400 font-bold border-b border-amber-500/20 pb-1 mb-2 flex items-center gap-2">
            <Sword className="w-3 h-3" /> Equipped
          </div>
          <ItemGrid items={equipped} onCipherItemOpen={onCipherItemOpen} />
        </section>
      )}

      {unequipped.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-700 pb-1 mb-2 flex items-center gap-2">
            <Package className="w-3 h-3" /> Carried
          </div>
          <ItemGrid items={unequipped} onCipherItemOpen={onCipherItemOpen} />
        </section>
      )}

      <section>
        <div className="text-[11px] uppercase tracking-widest text-yellow-400 font-bold border-b border-yellow-500/20 pb-1 mb-2 flex items-center gap-2">
          <Coins className="w-3 h-3" /> Currency
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {CURRENCY_ORDER.map(({ key, label, color }) => (
            <div
              key={key}
              className="bg-[#0b1220] border border-[#1e293b] rounded-lg px-3 py-2 text-center min-w-[64px]"
            >
              <div className="text-[10px] uppercase tracking-widest" style={{ color }}>{label}</div>
              <div className="text-white font-bold">{Number(currency[key] || 0)}</div>
            </div>
          ))}
        </div>
      </section>

      <CipherModal
        open={!!openCipherType}
        onClose={() => setOpenCipherType(null)}
        cipherType={openCipherType}
        campaign={campaign}
      />
    </div>
  );
}

function ItemGrid({ items, onCipherItemOpen }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {items.map((item, idx) => {
        const cipher = isCipherInventoryItem(item);
        const Tag = cipher ? "button" : "div";
        const tagProps = cipher
          ? {
              type: "button",
              onClick: () => onCipherItemOpen?.(item),
              className:
                "bg-[#0b1220] border border-[#1e293b] hover:border-[#37F2D1] rounded-lg p-2 flex items-center gap-2 text-left transition cursor-pointer",
              title: `Open ${safeText(item.name) || "cipher"}`,
            }
          : {
              className:
                "bg-[#0b1220] border border-[#1e293b] rounded-lg p-2 flex items-center gap-2",
              title: safeText(item.description || item.desc || ""),
            };
        return (
          <Tag key={`${safeText(item.name) || "item"}-${idx}`} {...tagProps}>
            {item.image_url ? (
              <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-slate-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-bold truncate flex items-center gap-1">
                {safeText(item.name) || "Unnamed item"}
                {cipher && <BookOpen className="w-3 h-3 text-[#37F2D1] flex-shrink-0" />}
              </div>
              {(item.quantity ?? 1) > 1 && (
                <div className="text-[10px] text-slate-400">×{safeText(item.quantity)}</div>
              )}
            </div>
          </Tag>
        );
      })}
    </div>
  );
}
