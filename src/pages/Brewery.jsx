import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical, User, Globe, TrendingUp, Star, Search, Sparkles,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { base44 } from "@/api/base44Client";
import MyBrewsList from "@/components/homebrew/MyBrewsList";
import BreweryCard from "@/components/homebrew/BreweryCard";
import BreweryDetailDialog from "@/components/homebrew/BreweryDetailDialog";
import CreateHomebrewDialog from "@/components/homebrew/CreateHomebrewDialog";
import { useSubscription } from "@/lib/SubscriptionContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

/**
 * The Brewery — community homebrew marketplace.
 *
 * Tabs:
 *   Browse All      — all published brews, newest first
 *   Most Popular    — published brews sorted by lifetime downloads
 *   Top Rated       — published brews sorted by average rating
 *                     (requires at least one review)
 *   My Brews        — the current user's own brews (drafts + published)
 *
 * Search filters by title, description, and tags. The category +
 * system dropdowns narrow further.
 */
export default function Brewery() {
  const { data: currentUser } = useQuery({
    queryKey: ["breweryCurrentUser"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data?.user || null;
    },
  });

  const sub = useSubscription();
  const [tab, setTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [systemFilter, setSystemFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  // One query for the marketplace tabs; we filter / sort client-side
  // so switching between Browse / Popular / Top Rated is instant.
  const { data: publishedBrews = [], isLoading } = useQuery({
    queryKey: ["brewery", "published"],
    queryFn: () => base44.entities.HomebrewRule.filter({ is_published: true }, "-created_at", 200),
    refetchInterval: 30000,
    initialData: [],
  });

  // Minor flag from the merged user profile — honored by hiding
  // any brew tagged 18+ from the marketplace grid.
  const isMinor = !!currentUser?.user_metadata?.is_minor || !!currentUser?.is_minor;

  const filteredBrews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedBrews.filter((b) => {
      if (systemFilter !== "all" && b.game_system !== systemFilter) return false;
      if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
      if (isMinor && b.content_rating === "18+") return false;
      if (!q) return true;
      return (
        (b.title || "").toLowerCase().includes(q)
        || (b.description || "").toLowerCase().includes(q)
        || (Array.isArray(b.tags) && b.tags.some((t) => (t || "").toLowerCase().includes(q)))
      );
    });
  }, [publishedBrews, systemFilter, categoryFilter, searchQuery, isMinor]);

  const sortedForTab = useMemo(() => {
    const list = [...filteredBrews];
    if (tab === "popular") {
      list.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (tab === "top_rated") {
      const avg = (b) => (b.rating_count > 0 ? Number(b.rating_total) / b.rating_count : 0);
      list.sort((a, b) => {
        const diff = avg(b) - avg(a);
        if (diff !== 0) return diff;
        return (b.rating_count || 0) - (a.rating_count || 0);
      });
      // Top Rated hides unrated brews — they'd all tie at 0.
      return list.filter((b) => (b.rating_count || 0) > 0);
    } else {
      // Browse All — default to the server-ordered newest-first list.
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return list;
  }, [filteredBrews, tab]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-10 h-10 text-[#37F2D1]" />
            <div>
              <h1 className="text-4xl font-bold">The Brewery</h1>
              <p className="text-gray-400">
                Discover and share homebrew rules to enhance your campaigns.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (!sub.canUse('homebrew')) {
                toast.error('Homebrew creation requires a Veteran or Guild subscription.');
                return;
              }
              setCreating(true);
            }}
            className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {sub.canUse('homebrew') ? 'Create Homebrew' : 'Create Homebrew (Veteran+)'}
          </Button>
        </div>

        {/* Search + filters — applies to every marketplace tab. */}
        <div className="bg-[#2A3441] border border-[#111827] rounded-xl p-3 mb-4 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or tag"
              className="pl-9 bg-[#0b1220] border-slate-700 text-white"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white md:w-56">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="combat_rules">Combat Rules</SelectItem>
              <SelectItem value="rest_rules">Rest Rules</SelectItem>
              <SelectItem value="character_rules">Character Rules</SelectItem>
              <SelectItem value="spell_modifiers">Spellcasting Rules</SelectItem>
              <SelectItem value="custom_item">Custom Item</SelectItem>
              <SelectItem value="custom_monster">Custom Monster</SelectItem>
              <SelectItem value="custom_spell">Custom Spell</SelectItem>
              <SelectItem value="custom_ability">Custom Ability</SelectItem>
            </SelectContent>
          </Select>
          <Select value={systemFilter} onValueChange={setSystemFilter}>
            <SelectTrigger className="bg-[#0b1220] border-slate-700 text-white md:w-44">
              <SelectValue placeholder="All systems" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Game Systems</SelectItem>
              <SelectItem value="dnd5e">D&D 5e</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-[#2A3441] border border-gray-700">
            <TabsTrigger value="browse" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Globe className="w-4 h-4 mr-2" /> Browse All
            </TabsTrigger>
            <TabsTrigger value="popular" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <TrendingUp className="w-4 h-4 mr-2" /> Most Popular
            </TabsTrigger>
            <TabsTrigger value="top_rated" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Star className="w-4 h-4 mr-2" /> Top Rated
            </TabsTrigger>
            <TabsTrigger value="mine" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <User className="w-4 h-4 mr-2" /> My Brews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <BreweryGrid brews={sortedForTab} onOpen={setSelected} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="popular">
            <BreweryGrid brews={sortedForTab} onOpen={setSelected} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="top_rated">
            <BreweryGrid
              brews={sortedForTab}
              onOpen={setSelected}
              isLoading={isLoading}
              emptyMessage="No rated brews yet — leave a review on something you love!"
            />
          </TabsContent>
          <TabsContent value="mine">
            <MyBrewsList currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>

      <BreweryDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        brew={selected}
        currentUser={currentUser}
      />

      <CreateHomebrewDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}

function BreweryGrid({ brews, onOpen, isLoading, emptyMessage }) {
  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Loading…</div>;
  }
  if (brews.length === 0) {
    return (
      <div className="bg-[#2A3441] rounded-xl p-10 text-center text-slate-400">
        {emptyMessage || "No homebrew matches your filters yet."}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {brews.map((b) => (
        <BreweryCard key={b.id} brew={b} onOpen={() => onOpen(b)} />
      ))}
    </div>
  );
}
