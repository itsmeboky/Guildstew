import React, { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, Users, Sword, Trophy, ShoppingBag, DollarSign,
  LifeBuoy, Flag, ScrollText, GamepadIcon, Home, Store, Wallet, FileText, Rocket,
  MessageSquare, HelpCircle, BookOpen, Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import OverviewTab from "@/components/admin/OverviewTab";
import UsersTab from "@/components/admin/UsersTab";
import GameplayTab from "@/components/admin/GameplayTab";
import CombatStatsTab from "@/components/admin/CombatStatsTab";
import AchievementsTab from "@/components/admin/AchievementsTab";
import MarketplaceTab from "@/components/admin/MarketplaceTab";
import RevenueTab from "@/components/admin/RevenueTab";
import SupportTicketsTab from "@/components/admin/SupportTicketsTab";
import ReportsModerationTab from "@/components/admin/ReportsModerationTab";
import AdminLogTab from "@/components/admin/AdminLogTab";
import TavernAdminTab from "@/components/admin/TavernAdminTab";
import CashoutsTab from "@/components/admin/CashoutsTab";
import BlogTab from "@/components/admin/BlogTab";
import VersionsTab from "@/components/admin/VersionsTab";
import ForumsTab from "@/components/admin/ForumsTab";
import FAQTab from "@/components/admin/FAQTab";
import DocsTab from "@/components/admin/DocsTab";
import EventsTab from "@/components/admin/EventsTab";
import { supabase as supabaseClient } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";

// Hard-coded override list — anyone here is always admin regardless
// of domain. Aetherian / Guildstew staff domains are auto-admin too
// via the check below.
const ADMIN_EMAILS = ["itsmeboky@aetherianstudios.com"];

function isAdminUser(user) {
  const email = (user?.email || "").toLowerCase();
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  return email.endsWith("@aetherianstudios.com") || email.endsWith("@guildstew.com");
}

const TABS = [
  { id: "overview",     label: "Overview",            icon: LayoutDashboard },
  { id: "users",        label: "Users",               icon: Users },
  { id: "gameplay",     label: "Gameplay",            icon: GamepadIcon },
  { id: "combat",       label: "Combat Stats",        icon: Sword },
  { id: "achievements", label: "Achievements",        icon: Trophy },
  { id: "marketplace",  label: "Marketplace",         icon: ShoppingBag },
  { id: "tavern",       label: "Tavern",              icon: Store },
  { id: "cashouts",     label: "Cashouts",            icon: Wallet },
  { id: "blog",         label: "Blog",                icon: FileText },
  { id: "versions",     label: "Versions",            icon: Rocket },
  { id: "forums",       label: "Forums",              icon: MessageSquare },
  { id: "revenue",      label: "Revenue",             icon: DollarSign },
  { id: "tickets",      label: "Support Tickets",     icon: LifeBuoy },
  { id: "faq",          label: "FAQ",                 icon: HelpCircle },
  { id: "docs",         label: "Documentation",       icon: BookOpen },
  { id: "events",       label: "Community Events",    icon: Calendar },
  { id: "reports",      label: "Reports & Mod",       icon: Flag },
  { id: "log",          label: "Admin Log",           icon: ScrollText },
];

export default function Admin() {
  const { user, isLoadingAuth } = useAuth();
  const [tab, setTab] = useState("overview");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Open-ticket count — surfaces as a badge on the Support Tickets
  // tab so the admin notices pending work without clicking through.
  const { data: openTicketCount = 0 } = useQuery({
    queryKey: ["adminOpenTicketCount"],
    queryFn: async () => {
      const { count } = await supabaseClient
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]);
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 60_000,
  });

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  // Guard — only admin emails (explicit overrides or Aetherian /
  // Guildstew staff domains) get past this point.
  if (!user || !isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-[#0b1220] border-r border-[#1e293b] p-4 flex flex-col">
          <div className="mb-4">
            <h1 className="text-lg font-black text-white tracking-wider">ADMIN</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{user.email}</p>
          </div>
          <Link
            to={createPageUrl("Home")}
            className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-[#37F2D1] border border-[#1e293b] hover:border-[#37F2D1]/60 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Homepage</span>
          </Link>
          <nav className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-[#37F2D1]/15 text-[#37F2D1]"
                      : "text-slate-400 hover:text-white hover:bg-[#1E2430]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{t.label}</span>
                  {t.id === "tickets" && openTicketCount > 0 && (
                    <span className="text-[9px] font-black rounded-full px-1.5 py-0.5 bg-[#37F2D1] text-[#050816] min-w-[18px] text-center">
                      {openTicketCount > 99 ? "99+" : openTicketCount}
                    </span>
                  )}
                  {t.stub && <span className="text-[9px] text-slate-600 uppercase">soon</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="flex items-center justify-end gap-2 mb-4 bg-[#1E2430] border border-[#2A3441] rounded-xl p-3">
            <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Range</label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className="h-8 bg-[#0b1220] border-slate-700 text-white text-xs w-40"
            />
            <span className="text-slate-600 text-xs">→</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className="h-8 bg-[#0b1220] border-slate-700 text-white text-xs w-40"
            />
            {(dateRange.from || dateRange.to) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDateRange({ from: "", to: "" })}
                className="h-8 text-slate-300"
              >
                Clear
              </Button>
            )}
          </div>

          {tab === "overview"     && <OverviewTab     dateRange={dateRange} />}
          {tab === "users"        && <UsersTab        adminId={user.id} />}
          {tab === "gameplay"     && <GameplayTab     dateRange={dateRange} />}
          {tab === "combat"       && <CombatStatsTab />}
          {tab === "achievements" && <AchievementsTab />}
          {tab === "marketplace"  && <MarketplaceTab />}
          {tab === "tavern"       && <TavernAdminTab />}
          {tab === "cashouts"     && <CashoutsTab />}
          {tab === "blog"         && <BlogTab />}
          {tab === "versions"     && <VersionsTab />}
          {tab === "forums"       && <ForumsTab />}
          {tab === "faq"          && <FAQTab />}
          {tab === "docs"         && <DocsTab />}
          {tab === "events"       && <EventsTab />}
          {tab === "revenue"      && <RevenueTab      dateRange={dateRange} />}
          {tab === "tickets"      && <SupportTicketsTab adminId={user.id} />}
          {tab === "reports"      && <ReportsModerationTab adminId={user.id} />}
          {tab === "log"          && <AdminLogTab />}
        </main>
      </div>
    </div>
  );
}
