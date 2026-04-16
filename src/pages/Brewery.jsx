import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, User, Globe } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import MyBrewsList from "@/components/homebrew/MyBrewsList";

/**
 * The Brewery — community homebrew hub. Tab 1 (My Brews) ships now;
 * the Browse tab is a placeholder until Task 3 (marketplace) lands.
 *
 * We deliberately resolve the current user via supabase.auth directly
 * instead of the broken `base44.auth.me()` wrapper the rest of the
 * codebase still references; this keeps the Brewery page functional
 * in isolation.
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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <FlaskConical className="w-10 h-10 text-[#37F2D1]" />
          <div>
            <h1 className="text-4xl font-bold">The Brewery</h1>
            <p className="text-gray-400">Brew, share, and install community content.</p>
          </div>
        </div>

        <Tabs defaultValue="mine" className="space-y-6">
          <TabsList className="bg-[#2A3441] border border-gray-700">
            <TabsTrigger value="mine" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <User className="w-4 h-4 mr-2" />
              My Brews
            </TabsTrigger>
            <TabsTrigger value="browse" className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#1E2430]">
              <Globe className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mine">
            <MyBrewsList currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="browse">
            <div className="bg-[#2A3441] rounded-xl p-10 text-center text-slate-400">
              <Globe className="w-12 h-12 mx-auto text-[#37F2D1]/50 mb-3" />
              <p>Browse and install published homebrew from other GMs — coming soon.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
