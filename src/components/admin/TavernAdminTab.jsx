import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, ChefHat, Award, Trash2, Star } from "lucide-react";
import SpiceIcon from "@/components/tavern/SpiceIcon";
import { supabase } from "@/api/supabaseClient";
import { formatSpice } from "@/config/spiceConfig";
import { CATEGORY_LABEL } from "@/config/tavernCategories";

/**
 * Admin → Tavern.
 *
 * Moderation surface for tavern_items. Admins can:
 *   - flip `is_official` (House Special) for Guildstew items,
 *   - flip `is_featured` + stamp `featured_month` for Chef's Choice,
 *   - remove a listing (sets status to 'removed') for policy violations.
 *
 * Pulls all items — including non-active ones — via the admin query
 * so removed or pending listings are still visible here.
 */
export default function TavernAdminTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: items = [] } = useQuery({
    queryKey: ["adminTavernItems"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tavern_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (i.name || "").toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const toggleOfficial = useMutation({
    mutationFn: async ({ id, value }) => {
      const { error } = await supabase.from("tavern_items").update({ is_official: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("House Special updated");
      queryClient.invalidateQueries({ queryKey: ["adminTavernItems"] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
      queryClient.invalidateQueries({ queryKey: ["tavernOfficial"] });
    },
    onError: (err) => { console.error("Toggle official", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, value }) => {
      const { error } = await supabase
        .from("tavern_items")
        .update({
          is_featured: value,
          featured_month: value ? currentMonth : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chef's Choice updated");
      queryClient.invalidateQueries({ queryKey: ["adminTavernItems"] });
      queryClient.invalidateQueries({ queryKey: ["tavernFeatured"] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
    },
    onError: (err) => { console.error("Toggle featured", err); toast.error(`Failed to save: ${err?.message || err}`); },
  });

  const removeItem = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("tavern_items").update({ status: "removed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing removed");
      queryClient.invalidateQueries({ queryKey: ["adminTavernItems"] });
      queryClient.invalidateQueries({ queryKey: ["tavernItems"] });
    },
    onError: (err) => { console.error("Remove listing", err); toast.error(`Failed to remove: ${err?.message || err}`); },
  });

  const counts = useMemo(() => ({
    total: items.length,
    featured: items.filter((i) => i.is_featured && i.featured_month === currentMonth).length,
    official: items.filter((i) => i.is_official).length,
    removed: items.filter((i) => i.status === "removed").length,
  }), [items, currentMonth]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white">Tavern</h2>
          <p className="text-xs text-slate-500">
            {counts.total} listings · {counts.featured}/10 Chef's Choice this month · {counts.official} House Special · {counts.removed} removed
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#0b1220] border-slate-700 text-white h-8 w-72"
              placeholder="Search items / category…"
            />
          </div>
          {["all", "active", "pending", "removed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`text-[11px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${
                statusFilter === s
                  ? "bg-amber-500 text-amber-950 border-amber-500"
                  : "bg-[#0b1220] text-slate-400 border-slate-700 hover:border-slate-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Price</th>
              <th className="text-left px-3 py-2">Rating</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">House Special</th>
              <th className="text-center px-3 py-2">Chef's Choice</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-500 py-10">
                  No listings match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((i) => {
                const avg = i.rating_count > 0 ? (i.rating_sum / i.rating_count).toFixed(1) : "—";
                return (
                  <tr key={i.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {i.preview_image_url ? (
                          <img src={i.preview_image_url} className="w-10 h-10 rounded object-cover" alt="" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-[#050816] border border-slate-700" />
                        )}
                        <div>
                          <p className="text-white font-bold">{i.name}</p>
                          <p className="text-[10px] text-slate-500">{i.purchase_count || 0} sold</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-400">{CATEGORY_LABEL[i.category] || i.category}</td>
                    <td className="px-3 py-2 text-amber-200">
                      <span className="inline-flex items-center gap-1">
                        <SpiceIcon size={12} color="#fbbf24" /> {formatSpice(i.price)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {avg}
                        <span className="text-slate-600">({i.rating_count || 0})</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                        i.status === "active" ? "bg-emerald-900/40 text-emerald-300" :
                        i.status === "pending" ? "bg-amber-900/40 text-amber-300" :
                        i.status === "removed" ? "bg-red-900/40 text-red-300" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={!!i.is_official}
                        onCheckedChange={(v) => toggleOfficial.mutate({ id: i.id, value: v })}
                      />
                      {i.is_official && <ChefHat className="w-3 h-3 mx-auto text-orange-400 mt-1" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch
                        checked={!!i.is_featured && i.featured_month === currentMonth}
                        onCheckedChange={(v) => toggleFeatured.mutate({ id: i.id, value: v })}
                      />
                      {i.is_featured && i.featured_month === currentMonth && (
                        <Award className="w-3 h-3 mx-auto text-amber-400 mt-1" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {i.status !== "removed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove ${i.name}? This hides it from the Tavern.`)) {
                              removeItem.mutate(i.id);
                            }
                          }}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500">
        House Special items bypass the creator split (100% Guildstew revenue). Chef's Choice stamps <code>featured_month={currentMonth}</code> — toggle off to pull an item from this month's carousel.
      </p>
    </div>
  );
}
