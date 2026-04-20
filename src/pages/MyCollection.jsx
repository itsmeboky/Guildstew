import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Store, Check, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import { listEntitlements } from "@/lib/tavernEntitlements";
import {
  getActiveCosmetics, applyCosmetic, clearCosmetic, isItemActive, slotForCategory,
} from "@/lib/activeCosmetics";
import {
  TAVERN_CATEGORIES, CATEGORY_LABEL, categoryIcon,
} from "@/config/tavernCategories";
import { createPageUrl } from "@/utils";

/**
 * My Collection.
 *
 * Everything the user has access to right now — personal purchases
 * and guild purchases accessible via their current guild. Each card
 * has an Apply / Applied toggle that sets the right
 * `active_cosmetics` slot. Guild-owned items are visually
 * distinguished with a purple badge so the user knows that item
 * follows their guild membership.
 */
export default function MyCollection() {
  const { user } = useAuth();
  const sub = useSubscription();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: entitlements = [] } = useQuery({
    queryKey: ["tavernEntitlements", user?.id, sub.guildOwnerId],
    queryFn: () => listEntitlements(user.id, { currentGuildId: sub.guildOwnerId }),
    enabled: !!user?.id,
  });

  const itemIds = useMemo(() => entitlements.map((e) => e.item_id), [entitlements]);

  const { data: items = [] } = useQuery({
    queryKey: ["tavernEntitledItems", itemIds.sort().join(",")],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      const { data } = await supabase
        .from("tavern_items")
        .select("*")
        .in("id", itemIds);
      return data || [];
    },
    enabled: itemIds.length > 0,
  });

  const { data: activeCosmetics = {} } = useQuery({
    queryKey: ["activeCosmetics", user?.id],
    queryFn: () => getActiveCosmetics(user.id),
    enabled: !!user?.id,
  });

  const personal = [];
  const guild = [];
  for (const it of items) {
    const ent = entitlements.find((e) => e.item_id === it.id);
    if (ent?.source === "guild") guild.push(it);
    else personal.push(it);
  }

  const applyMut = useMutation({
    mutationFn: async ({ item }) => applyCosmetic(user.id, item.category, item.id),
    onSuccess: (_, { item }) => {
      toast.success(`${item.name} applied`);
      queryClient.invalidateQueries({ queryKey: ["activeCosmetics", user.id] });
    },
    onError: () => toast.error("Could not apply cosmetic"),
  });

  const clearMut = useMutation({
    mutationFn: async ({ item }) => clearCosmetic(user.id, item.category),
    onSuccess: (_, { item }) => {
      toast.success(`${item.name} removed`);
      queryClient.invalidateQueries({ queryKey: ["activeCosmetics", user.id] });
    },
    onError: () => toast.error("Could not remove cosmetic"),
  });

  const filter = (list) =>
    categoryFilter === "all" ? list : list.filter((i) => i.category === categoryFilter);

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-amber-200 flex items-center gap-3">
              <Package className="w-7 h-7 text-amber-400" />
              My Collection
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Cosmetics you own. Toggle any item to apply or remove it.
            </p>
          </div>
          <Link to={createPageUrl("TheTavern")}>
            <Button variant="outline" className="border-amber-500/40 text-amber-200">
              <Store className="w-4 h-4 mr-1" /> Back to the Tavern
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill label="All" value="all" current={categoryFilter} onClick={setCategoryFilter} />
          {TAVERN_CATEGORIES.map((c) => (
            <Pill key={c.value} label={c.label} value={c.value} current={categoryFilter} onClick={setCategoryFilter} icon={c.icon} />
          ))}
        </div>

        <Section
          title="Personal Items"
          subtitle="Bought with your Spice wallet."
          items={filter(personal)}
          activeCosmetics={activeCosmetics}
          onApply={(item) => applyMut.mutate({ item })}
          onClear={(item) => clearMut.mutate({ item })}
        />

        <Section
          title="Guild Items"
          subtitle="Shared with the rest of your guild. Leaving the guild removes access."
          badge="guild"
          items={filter(guild)}
          activeCosmetics={activeCosmetics}
          onApply={(item) => applyMut.mutate({ item })}
          onClear={(item) => clearMut.mutate({ item })}
        />
      </div>
    </div>
  );
}

function Pill({ label, value, current, onClick, icon: Icon }) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
        active
          ? "bg-amber-500 text-amber-950 border-amber-500"
          : "bg-[#1E2430] text-slate-300 border-slate-700 hover:border-slate-500"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

function Section({ title, subtitle, items, activeCosmetics, onApply, onClear, badge }) {
  if (!items || items.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
        <p className="text-sm text-slate-500 italic mt-4">Nothing here yet.</p>
      </section>
    );
  }
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {badge === "guild" && (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300">
            <Users className="w-3 h-3" /> Shared
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <CollectionCard
            key={item.id}
            item={item}
            isActive={isItemActive(activeCosmetics, item.category, item.id)}
            guild={badge === "guild"}
            onApply={() => onApply(item)}
            onClear={() => onClear(item)}
          />
        ))}
      </div>
    </section>
  );
}

function CollectionCard({ item, isActive, guild, onApply, onClear }) {
  const Icon = categoryIcon(item.category);
  const hasSlot = !!slotForCategory(item.category);
  return (
    <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden flex flex-col">
      <div className="h-32 bg-[#050816] relative">
        {item.preview_image_url ? (
          <img src={item.preview_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <Icon className="w-10 h-10" />
          </div>
        )}
        {guild && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-purple-600 text-white shadow">
            <Users className="w-3 h-3" /> Guild
          </span>
        )}
        {isActive && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow">
            <Check className="w-3 h-3" /> Applied
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-sm font-bold text-white line-clamp-1">{item.name}</h3>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {CATEGORY_LABEL[item.category] || item.category}
        </p>
        <div className="mt-auto pt-3">
          {hasSlot ? (
            isActive ? (
              <Button size="sm" variant="outline" className="w-full" onClick={onClear}>
                Remove
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
                onClick={onApply}
              >
                Apply
              </Button>
            )
          ) : (
            <p className="text-[10px] text-slate-500 italic text-center">
              Browsed from the character creator
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
