import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Award, Trash2, Plus, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { TITLE_CATALOG } from "@/config/titleCatalog";

/**
 * Admin → Titles.
 *
 * Lets staff award titles that can't be earned automatically — Chef
 * de Cuisine, Founding Backer, plus any one-off recognition. Reads
 * `title_catalog` so newly-seeded titles appear without a redeploy.
 *
 * Two surfaces:
 *   - Catalog (read-only) showing every defined title, its rule, and
 *     the count of users who currently hold it.
 *   - Grants table — search a user by username/email, pick a title,
 *     award. Existing grants list with a revoke button.
 */
export default function TitlesTab({ adminId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [chosenTitle, setChosenTitle] = useState("");
  const [chosenUser, setChosenUser] = useState(null);

  // Pull the live catalog so any rows added by a SQL deploy past
  // 20261120 show up automatically.
  const { data: catalog = TITLE_CATALOG } = useQuery({
    queryKey: ["adminTitleCatalog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("title_catalog")
        .select("*")
        .order("sort_order", { ascending: true });
      return data && data.length ? data : TITLE_CATALOG;
    },
  });

  const { data: grants = [] } = useQuery({
    queryKey: ["adminUserTitles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_titles")
        .select("id, user_id, title_id, granted_at, granted_by, note")
        .order("granted_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  // Profiles for the grants table (so we can show usernames, not UUIDs).
  const granteeIds = useMemo(
    () => Array.from(new Set(grants.map((g) => g.user_id).filter(Boolean))),
    [grants],
  );
  const { data: granteeProfiles = [] } = useQuery({
    queryKey: ["adminTitleGrantees", granteeIds.sort().join(",")],
    queryFn: async () => {
      if (granteeIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, email, display_title")
        .in("user_id", granteeIds);
      return data || [];
    },
    enabled: granteeIds.length > 0,
  });
  const profileFor = (uid) => granteeProfiles.find((p) => p.user_id === uid) || null;

  // User search for the "Grant title" form. ilike on username + email
  // returns up to 8 matches as the admin types.
  const term = search.trim();
  const { data: matches = [] } = useQuery({
    queryKey: ["adminUserSearch", term],
    queryFn: async () => {
      if (term.length < 2) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, username, full_name, email")
        .or(`username.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(8);
      return data || [];
    },
    enabled: term.length >= 2,
  });

  const counts = useMemo(() => {
    const map = {};
    for (const g of grants) map[g.title_id] = (map[g.title_id] || 0) + 1;
    return map;
  }, [grants]);

  const award = useMutation({
    mutationFn: async () => {
      if (!chosenUser?.user_id) throw new Error("Pick a user first.");
      if (!chosenTitle) throw new Error("Pick a title first.");
      const { error } = await supabase.from("user_titles").insert({
        user_id: chosenUser.user_id,
        title_id: chosenTitle,
        granted_by: adminId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      const titleLabel = catalog.find((t) => t.id === chosenTitle)?.label || chosenTitle;
      toast.success(`Awarded "${titleLabel}" to ${chosenUser?.username || chosenUser?.email}`);
      setChosenUser(null);
      setSearch("");
      setChosenTitle("");
      queryClient.invalidateQueries({ queryKey: ["adminUserTitles"] });
    },
    onError: (err) => {
      console.error("Award title", err);
      toast.error(`Couldn't award: ${err?.message || err}`);
    },
  });

  const revoke = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("user_titles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Title revoked");
      queryClient.invalidateQueries({ queryKey: ["adminUserTitles"] });
    },
    onError: (err) => {
      console.error("Revoke title", err);
      toast.error(`Couldn't revoke: ${err?.message || err}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Titles</h2>
        <p className="text-xs text-slate-500">
          Catalog of display titles + manual grants for Founding Backer, Chef de Cuisine, and one-off awards.
        </p>
      </div>

      {/* Catalog overview */}
      <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-[#0b1220] text-[11px] uppercase tracking-widest text-slate-400">
          Catalog ({catalog.length})
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Unlock rule</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-right px-3 py-2">Holders</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="px-3 py-2 text-white font-bold">
                  <span className="inline-flex items-center gap-1">
                    {t.is_exclusive && <Crown className="w-3 h-3 text-amber-400" />}
                    {t.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {t.unlock_rule}{t.unlock_value ? ` · ${t.unlock_value}` : ""}
                </td>
                <td className="px-3 py-2 text-slate-300 text-xs">{t.description}</td>
                <td className="px-3 py-2 text-right text-slate-400">{counts[t.id] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grant form */}
      <div className="bg-[#1E2430] border border-slate-700 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#37F2D1]" /> Grant a title
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-500 block mb-1">
              User (search by username or email)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                value={chosenUser ? (chosenUser.username || chosenUser.email) : search}
                onChange={(e) => { setChosenUser(null); setSearch(e.target.value); }}
                className="pl-9 bg-[#0b1220] border-slate-700 text-white"
                placeholder="kithra…"
              />
            </div>
            {!chosenUser && matches.length > 0 && (
              <div className="mt-1 bg-[#0b1220] border border-slate-700 rounded max-h-48 overflow-y-auto">
                {matches.map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setChosenUser(m)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-sm flex items-center justify-between"
                  >
                    <span className="text-white font-bold">{m.username || m.full_name || "?"}</span>
                    <span className="text-[11px] text-slate-500">{m.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-500 block mb-1">
              Title to award
            </label>
            <Select value={chosenTitle} onValueChange={setChosenTitle}>
              <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white">
                <SelectValue placeholder="Pick a title…" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b1220] border-slate-700 text-white">
                {catalog.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => award.mutate()}
          disabled={!chosenUser?.user_id || !chosenTitle || award.isPending}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          <Plus className="w-4 h-4 mr-1" /> {award.isPending ? "Awarding…" : "Grant title"}
        </Button>
      </div>

      {/* Existing grants */}
      <div className="bg-[#1E2430] border border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-[#0b1220] text-[11px] uppercase tracking-widest text-slate-400">
          Active grants ({grants.length})
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#0b1220] text-slate-400 text-[11px] uppercase tracking-widest">
            <tr>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Granted</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {grants.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-500 py-8">
                  No manual grants yet.
                </td>
              </tr>
            ) : (
              grants.map((g) => {
                const p = profileFor(g.user_id);
                const t = catalog.find((c) => c.id === g.title_id);
                return (
                  <tr key={g.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">
                      <p className="text-white font-bold">{p?.username || p?.full_name || g.user_id.slice(0, 8)}</p>
                      <p className="text-[10px] text-slate-500">{p?.email}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-200">{t?.label || g.title_id}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {new Date(g.granted_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Revoke "${t?.label || g.title_id}" from ${p?.username || g.user_id}?`)) {
                            revoke.mutate(g.id);
                          }
                        }}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
