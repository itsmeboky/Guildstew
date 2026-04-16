import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { base44 } from "@/api/base44Client";
import TradeOfferCard from "./TradeOfferCard";

/**
 * Trades panel for a player character. Loads every trade offer in
 * the campaign that involves the viewing character and splits them
 * into incoming pending / outgoing pending / recent history.
 */
export default function TradesPanel({ campaignId, viewingCharacterId, characters = [] }) {
  const { data: offers = [] } = useQuery({
    queryKey: ["tradeOffers", campaignId, viewingCharacterId],
    queryFn: async () => {
      if (!campaignId || !viewingCharacterId) return [];
      try {
        const rows = await base44.entities.TradeOffer.filter({ campaign_id: campaignId });
        return rows.filter(
          (r) => r.sender_character_id === viewingCharacterId || r.receiver_character_id === viewingCharacterId,
        );
      } catch {
        return [];
      }
    },
    enabled: !!campaignId && !!viewingCharacterId,
    initialData: [],
    refetchInterval: 10000,
  });

  const characterMap = useMemo(() => {
    const m = {};
    for (const c of characters) if (c?.id) m[c.id] = c;
    return m;
  }, [characters]);

  const sorted = useMemo(() => {
    const byDate = [...offers].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
    return {
      incoming: byDate.filter((o) => o.status === "pending" && o.receiver_character_id === viewingCharacterId),
      outgoing: byDate.filter((o) => o.status === "pending" && o.sender_character_id === viewingCharacterId),
      history: byDate.filter((o) => o.status !== "pending").slice(0, 10),
    };
  }, [offers, viewingCharacterId]);

  if (!viewingCharacterId) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Select a character to see their trades.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Section
        title={`Incoming (${sorted.incoming.length})`}
        accent="#37F2D1"
        empty="No pending trade offers — you're in the clear."
        offers={sorted.incoming}
        viewingCharacterId={viewingCharacterId}
        characterMap={characterMap}
        campaignId={campaignId}
      />
      <Section
        title={`Outgoing (${sorted.outgoing.length})`}
        accent="#fbbf24"
        empty="You haven't sent any trades yet."
        offers={sorted.outgoing}
        viewingCharacterId={viewingCharacterId}
        characterMap={characterMap}
        campaignId={campaignId}
      />
      <Section
        title="Recent history"
        accent="#8B5CF6"
        empty="No past trades."
        offers={sorted.history}
        viewingCharacterId={viewingCharacterId}
        characterMap={characterMap}
        campaignId={campaignId}
      />
    </div>
  );
}

function Section({ title, accent, empty, offers, viewingCharacterId, characterMap, campaignId }) {
  return (
    <div className="bg-[#0b1220] border border-[#1e293b] rounded-xl p-3">
      <h3 className="text-xs font-black uppercase tracking-[0.22em] mb-2 flex items-center gap-1.5" style={{ color: accent }}>
        <Handshake className="w-3.5 h-3.5" />
        {title}
      </h3>
      {offers.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">{empty}</p>
      ) : (
        <div className="space-y-2">
          {offers.map((o) => (
            <TradeOfferCard
              key={o.id}
              offer={o}
              viewingCharacterId={viewingCharacterId}
              characterMap={characterMap}
              campaignId={campaignId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
