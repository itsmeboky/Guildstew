import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Search, ChefHat, Award, Store, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance, getGuildWalletBalance } from "@/lib/spiceWallet";
import { listTavernItems, getUserPurchases } from "@/lib/tavernClient";
import { formatSpice } from "@/config/spiceConfig";
import { TAVERN_CATEGORIES, SORT_OPTIONS } from "@/config/tavernCategories";
import BuySpiceDialog from "@/components/tavern/BuySpiceDialog";
import TavernItemCard from "@/components/tavern/TavernItemCard";
import TavernItemDetailDialog from "@/components/tavern/TavernItemDetailDialog";
import CreatorUploadDialog from "@/components/tavern/CreatorUploadDialog";

/**
 * The Tavern — Spice-based cosmetic marketplace.
 *
 * Page layout:
 *   1. Header strip with the player's Spice wallet (and guild wallet
 *      if subscribed as guild).
 *   2. Two featured carousels — "House Special" (Guildstew official)
 *      and "Chef's Choice" (featured creators).
 *   3. Category tabs + sort + search.
 *   4. Grid of the active listings that match the filter.
 *
 * Ownership badges are computed from a single getUserPurchases fetch
 * that covers both personal and guild-wallet buys for the user.
 */
export default function TheTavern() {
  const { user } = useAuth();
  const sub = useSubscription();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [search, setSearch] = useState("");
  const [spiceOpen, setSpiceOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const { data: wallet } = useQuery({
    queryKey: ["spiceWallet", user?.id],
    queryFn: () => getWalletBalance(user.id),
    enabled: !!user?.id,
  });

  const { data: guildWallet } = useQuery({
    queryKey: ["guildSpiceWallet", sub.guildOwnerId],
    queryFn: () => getGuildWalletBalance(sub.guildOwnerId),
    enabled: !!sub.guildOwnerId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["tavernItems", selectedCategory, sort, search],
    queryFn: () => listTavernItems({ category: selectedCategory, sort, q: search }),
  });

  const { data: featured = [] } = useQuery({
    queryKey: ["tavernFeatured"],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data } = await supabase
        .from("tavern_items")
        .select("*")
        .eq("is_featured", true)
        .eq("featured_month", currentMonth)
        .eq("status", "active")
        .limit(10);
      return data || [];
    },
  });

  const { data: official = [] } = useQuery({
    queryKey: ["tavernOfficial"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tavern_items")
        .select("*")
        .eq("is_official", true)
        .eq("status", "active")
        .order("purchase_count", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["tavernPurchases", user?.id],
    queryFn: () => getUserPurchases(user.id),
    enabled: !!user?.id,
  });

  const ownedIds = useMemo(() => {
    const set = new Set();
    for (const p of purchases) {
      // A guild-wallet purchase only counts as owned while the user
      // is still a member of that guild. `sub.guildOwnerId` is the
      // current guild's id (falsy when they're not in one).
      if (!p.guild_id || p.guild_id === sub.guildOwnerId) set.add(p.item_id);
    }
    return set;
  }, [purchases, sub.guildOwnerId]);

  // Pull creator names in a batch so the cards don't each hit the
  // network. auth.users isn't exposed — we read the mirrored
  // user_profiles table instead.
  const creatorIds = useMemo(() => {
    const ids = new Set();
    [...items, ...featured, ...official].forEach((i) => i?.creator_id && ids.add(i.creator_id));
    return Array.from(ids);
  }, [items, featured, official]);

  const { data: creators = [] } = useQuery({
    queryKey: ["tavernCreators", creatorIds.sort().join(",")],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name")
        .in("user_id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });

  const creatorName = (id) => {
    const c = creators.find((u) => u.user_id === id);
    return c?.username || c?.full_name || "Guildstew Studios";
  };

  const cardProps = (item) => ({
    item,
    creatorName: creatorName(item.creator_id),
    owned: ownedIds.has(item.id),
    buyerTier: sub.tier,
    onClick: () => setDetailItem(item),
  });

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-amber-200 flex items-center gap-3">
              <Store className="w-8 h-8 text-amber-400" />
              The Tavern
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Cosmetic goods, priced in Spice. Brewed by our cooks and the community.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-[#1E2430] border border-amber-600/30 rounded-lg px-4 py-2">
              <p className="text-[9px] uppercase tracking-widest text-amber-400/70 font-bold">Spice</p>
              <p className="text-lg font-black text-amber-200 flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-400" />
                {formatSpice(wallet?.balance || 0)}
              </p>
            </div>

            {sub.guildOwnerId && (
              <div className="bg-[#1E2430] border border-purple-500/30 rounded-lg px-4 py-2">
                <p className="text-[9px] uppercase tracking-widest text-purple-400/70 font-bold">Guild Spice</p>
                <p className="text-lg font-black text-purple-200 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-purple-400" />
                  {formatSpice(guildWallet?.balance || 0)}
                </p>
              </div>
            )}

            <Button
              onClick={() => setSpiceOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
            >
              Buy Spice
            </Button>
            <Button
              onClick={() => setUploadOpen(true)}
              variant="outline"
              className="border-[#37F2D1]/50 text-[#37F2D1] hover:bg-[#37F2D1]/10"
            >
              <Plus className="w-4 h-4 mr-1" /> Sell on Tavern
            </Button>
          </div>
        </div>

        {/* Featured carousels */}
        {official.length > 0 && (
          <FeaturedRow
            title="House Special"
            subtitle="Official Guildstew content"
            icon={ChefHat}
            accent="orange"
            items={official}
            cardProps={cardProps}
          />
        )}
        {featured.length > 0 && (
          <FeaturedRow
            title="Chef's Choice"
            subtitle={`Featured creators · ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`}
            icon={Award}
            accent="amber"
            items={featured}
            cardProps={cardProps}
          />
        )}

        {/* Category + filter bar */}
        <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <CategoryTab value="all" label="All" current={selectedCategory} onClick={setSelectedCategory} />
            {TAVERN_CATEGORIES.map((c) => (
              <CategoryTab key={c.value} value={c.value} label={c.label} current={selectedCategory} onClick={setSelectedCategory} icon={c.icon} />
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="pl-9 bg-[#050816] border-slate-700 text-white"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full md:w-64 bg-[#050816] border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-[#1E2430]/40 rounded-lg border border-slate-800">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items match this filter yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <TavernItemCard key={item.id} {...cardProps(item)} />
            ))}
          </div>
        )}
      </div>

      <BuySpiceDialog open={spiceOpen} onClose={() => setSpiceOpen(false)} />
      <CreatorUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <TavernItemDetailDialog
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        creatorName={detailItem ? creatorName(detailItem.creator_id) : ""}
      />
    </div>
  );
}

function CategoryTab({ value, label, current, onClick, icon: Icon }) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-amber-500 text-amber-950 border-amber-500"
          : "bg-[#050816] text-slate-300 border-slate-700 hover:border-slate-500"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function FeaturedRow({ title, subtitle, icon: Icon, accent, items, cardProps }) {
  const accentClass = accent === "orange"
    ? "text-orange-400"
    : "text-amber-400";
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-6 h-6 ${accentClass}`} />
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex overflow-x-auto gap-4 pb-2 -mx-2 px-2 snap-x">
        {items.map((item) => (
          <div key={item.id} className="w-60 flex-shrink-0 snap-start">
            <TavernItemCard {...cardProps(item)} />
          </div>
        ))}
      </div>
    </section>
  );
}
