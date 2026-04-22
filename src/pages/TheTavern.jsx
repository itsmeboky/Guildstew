import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Flame, Search, ChefHat, Award, Store, Plus, Package, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { getWalletBalance, getGuildWalletBalance } from "@/lib/spiceWallet";
import { listTavernItems } from "@/lib/tavernClient";
import { listEntitlements } from "@/lib/tavernEntitlements";
import { formatSpice } from "@/config/spiceConfig";
import { TAVERN_CATEGORIES, SORT_OPTIONS } from "@/config/tavernCategories";
import { TAVERN_PALETTE as P, TAVERN_HEADER_GRADIENT } from "@/config/tavernPalette";
import BuySpiceDialog from "@/components/tavern/BuySpiceDialog";
import TavernItemCard from "@/components/tavern/TavernItemCard";
import TavernItemDetailDialog from "@/components/tavern/TavernItemDetailDialog";
import CreatorUploadDialog from "@/components/tavern/CreatorUploadDialog";

/**
 * The Tavern — warm cream + orange marketplace.
 *
 * Palette lives in `src/config/tavernPalette.js`. The page leaves
 * the dark campaign-management theme behind and switches to a
 * warm commerce feel — white backgrounds, peach borders, salmon
 * CTAs — so the shopping surface is clearly differentiated.
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

  const { data: entitlements = [] } = useQuery({
    queryKey: ["tavernEntitlements", user?.id, sub.guildOwnerId],
    queryFn: () => listEntitlements(user.id, { currentGuildId: sub.guildOwnerId }),
    enabled: !!user?.id,
  });

  const ownedIds = useMemo(
    () => new Set(entitlements.map((e) => e.item_id)),
    [entitlements],
  );

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
    <div className="min-h-screen" style={{ backgroundColor: P.pageBg, color: P.textPrimary }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black flex items-center gap-3" style={{ color: P.accentDeep }}>
              <Store className="w-8 h-8" />
              The Tavern
            </h1>
            <p className="text-sm mt-1" style={{ color: P.textSecondary }}>
              Cosmetic goods, priced in Spice. Brewed by our cooks and the community.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="rounded-lg px-4 py-2"
              style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}` }}
            >
              <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: P.accentDeep }}>Spice</p>
              <p className="text-lg font-black flex items-center gap-1" style={{ color: P.textPrimary }}>
                <Flame className="w-4 h-4" style={{ color: P.accent }} />
                {formatSpice(wallet?.balance || 0)}
              </p>
            </div>

            {sub.guildOwnerId && (
              <div
                className="rounded-lg px-4 py-2"
                style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}` }}
              >
                <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#7c3aed" }}>Guild Spice</p>
                <p className="text-lg font-black flex items-center gap-1" style={{ color: P.textPrimary }}>
                  <Flame className="w-4 h-4" style={{ color: "#a855f7" }} />
                  {formatSpice(guildWallet?.balance || 0)}
                </p>
              </div>
            )}

            <Button
              onClick={() => setSpiceOpen(true)}
              className="font-bold"
              style={{ backgroundColor: P.accent, color: P.textPrimary }}
            >
              Buy Spice
            </Button>
            <Link to={createPageUrl("MyCollection")}>
              <Button variant="outline" style={{ borderColor: P.accent, color: P.accentDeep, backgroundColor: P.card }}>
                <Package className="w-4 h-4 mr-1" /> My Collection
              </Button>
            </Link>
            <Button
              onClick={() => setUploadOpen(true)}
              variant="outline"
              style={{ borderColor: P.accent, color: P.accentDeep, backgroundColor: P.card }}
            >
              <Plus className="w-4 h-4 mr-1" /> Sell on Tavern
            </Button>
          </div>
        </div>

        <div className="-mt-4 text-right">
          <Link
            to={createPageUrl("CreatorDashboard")}
            className="text-[11px] hover:underline"
            style={{ color: P.textSecondary }}
          >
            Manage your listings →
          </Link>
        </div>

        {official.length > 0 && (
          <FeaturedRow
            title="House Special"
            subtitle="Official Guildstew content"
            icon={ChefHat}
            items={official}
            cardProps={cardProps}
          />
        )}
        {featured.length > 0 && (
          <FeaturedRow
            title="Chef's Choice"
            subtitle={`Featured creators · ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}`}
            icon={Award}
            items={featured}
            cardProps={cardProps}
          />
        )}

        {/* Category + filter bar */}
        <div
          className="rounded-lg p-4 space-y-3"
          style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}` }}
        >
          <div className="flex flex-wrap gap-2">
            <CategoryTab value="all" label="All" current={selectedCategory} onClick={setSelectedCategory} />
            {TAVERN_CATEGORIES.map((c) => (
              <CategoryTab key={c.value} value={c.value} label={c.label} current={selectedCategory} onClick={setSelectedCategory} icon={c.icon} />
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textSecondary }} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="pl-9"
                style={{ backgroundColor: P.pageBg, border: `1px solid ${P.cardBorder}`, color: P.textPrimary }}
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full md:w-64" style={{ backgroundColor: P.pageBg, border: `1px solid ${P.cardBorder}`, color: P.textPrimary }}>
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
          <div
            className="text-center py-20 rounded-lg"
            style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}`, color: P.textSecondary }}
          >
            <Store className="w-10 h-10 mx-auto mb-2 opacity-60" />
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
      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
      style={active
        ? { backgroundColor: P.accent, color: P.textPrimary, border: `1px solid ${P.accent}` }
        : { backgroundColor: P.card, color: P.textPrimary, border: `1px solid ${P.cardBorder}` }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function FeaturedRow({ title, subtitle, icon: Icon, items, cardProps }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: TAVERN_HEADER_GRADIENT }}
        >
          <Icon className="w-5 h-5" style={{ color: P.textPrimary }} />
        </div>
        <div>
          <h2 className="text-xl font-black" style={{ color: P.textPrimary }}>{title}</h2>
          <p className="text-xs" style={{ color: P.textSecondary }}>{subtitle}</p>
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
