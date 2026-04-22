import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Check, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { TAVERN_PALETTE as P } from "@/config/tavernPalette";

/**
 * Game Packs — real-money TTRPG system bundles.
 *
 * Distinct from the cosmetic tavern_items grid: these carry USD
 * prices and route through Stripe Checkout rather than the Spice
 * wallet. D&D 5e is seeded as `is_free = true` and renders with an
 * "Included" badge instead of a Buy button.
 *
 * The Stripe Checkout call targets an Edge Function that doesn't
 * exist yet; we try it and fall back to a clear error toast so the
 * UI still signals the right failure mode until the endpoint lands.
 */
export default function GamePacksGrid() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: packs = [] } = useQuery({
    queryKey: ["gamePacks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_packs")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const { data: owned = [] } = useQuery({
    queryKey: ["ownedGamePacks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("game_pack_purchases")
        .select("pack_id")
        .eq("user_id", user.id);
      return (data || []).map((r) => r.pack_id);
    },
    enabled: !!user?.id,
  });
  const ownedSet = new Set(owned);

  const buy = useMutation({
    mutationFn: async (pack) => {
      if (!user?.id || !user?.email) throw new Error("Sign in first.");
      const { data, error } = await supabase.functions.invoke("create-gamepack-checkout", {
        body: {
          pack_id: pack.id,
          user_id: user.id,
          user_email: user.email,
          success_url: `${window.location.origin}/TheTavern?pack=success&slug=${pack.slug}`,
          cancel_url: `${window.location.origin}/TheTavern?pack=cancelled`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return data;
      }
      throw new Error("Stripe checkout endpoint isn't available yet.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ownedGamePacks", user?.id] });
    },
    onError: (err) => {
      console.error("Buy game pack", err);
      toast.error(`Checkout unavailable: ${err?.message || err}`);
    },
  });

  if (packs.length === 0) {
    return (
      <div
        className="text-center py-16 rounded-lg"
        style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}`, color: P.textSecondary }}
      >
        <Package className="w-10 h-10 mx-auto mb-2 opacity-60" />
        <p className="text-sm">No game packs available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex items-start gap-3 rounded-lg p-4"
        style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}` }}
      >
        <Sparkles className="w-5 h-5 mt-0.5" style={{ color: P.accent }} />
        <p className="text-sm" style={{ color: P.textSecondary }}>
          <strong style={{ color: P.textPrimary }}>Game Packs</strong> are full TTRPG systems —
          races, classes, monsters, and spells bundled together. Priced in real money, purchased once,
          yours forever. <em>D&amp;D 5e is included with every account.</em>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack) => (
          <GamePackCard
            key={pack.id}
            pack={pack}
            owned={ownedSet.has(pack.id)}
            busy={buy.isPending}
            onBuy={() => buy.mutate(pack)}
          />
        ))}
      </div>
    </>
  );
}

function GamePackCard({ pack, owned, busy, onBuy }) {
  const isFree = !!pack.is_free;

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}` }}
    >
      <div
        className="h-40 relative overflow-hidden"
        style={{ backgroundColor: P.pageBg }}
      >
        {pack.image_url ? (
          <img src={pack.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: P.cardBorder }}>
            <Package className="w-10 h-10" />
          </div>
        )}
        {pack.logo_url && (
          <img
            src={pack.logo_url}
            alt={`${pack.name} logo`}
            className="absolute bottom-3 left-3 h-8 drop-shadow"
          />
        )}
        {isFree && (
          <span className="absolute top-2 right-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-600 text-white shadow inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> Included
          </span>
        )}
        {!isFree && owned && (
          <span className="absolute top-2 right-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-600 text-white shadow inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> Owned
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-black" style={{ color: P.textPrimary }}>{pack.name}</h3>
        {pack.description && (
          <p className="text-xs mt-1 line-clamp-3" style={{ color: P.textSecondary }}>{pack.description}</p>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between gap-2">
          <div>
            {isFree ? (
              <p className="text-lg font-black" style={{ color: "#059669" }}>
                FREE
              </p>
            ) : (
              <p className="text-2xl font-black" style={{ color: P.accentDeep }}>
                ${Number(pack.price_usd).toFixed(2)}
              </p>
            )}
            <p className="text-[10px]" style={{ color: P.textSecondary }}>
              {isFree ? "Included with every account" : "One-time purchase · Stripe checkout"}
            </p>
          </div>

          {isFree ? null : owned ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 text-xs font-bold rounded px-3 py-2"
              style={{ backgroundColor: "#e2e8f0", color: P.textSecondary }}
            >
              <Lock className="w-3 h-3" /> Unlocked
            </button>
          ) : (
            <button
              type="button"
              onClick={onBuy}
              disabled={busy}
              className="inline-flex items-center gap-1 text-sm font-black rounded-md px-4 py-2 transition-colors disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #635BFF 0%, #00D4FF 100%)",
                color: "#ffffff",
                boxShadow: "0 0 12px rgba(99, 91, 255, 0.2)",
              }}
            >
              {busy ? "…" : "Buy"}
              <span className="text-[10px] opacity-80 ml-1">via Stripe</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
