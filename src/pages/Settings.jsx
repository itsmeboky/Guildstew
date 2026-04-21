import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Palette, Eye, Bell, Shield, Scale, CreditCard, ArrowRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { useSubscription } from "@/lib/SubscriptionContext";
import {
  getUserSettings, patchSettingsDomain, patchNotifications,
} from "@/lib/userSettings";
import { openBillingPortal } from "@/api/billingClient";
import { supabase } from "@/api/supabaseClient";
import AppearanceTab from "@/components/settings/AppearanceTab";
import AccessibilityTab from "@/components/settings/AccessibilityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import PrivacyTab from "@/components/settings/PrivacyTab";
import LegalTab from "@/components/settings/LegalTab";

/**
 * /settings — tabbed preferences surface.
 *
 * Tabs: Appearance · Accessibility · Notifications · Privacy & Security · Legal.
 * `?tab=subscription` keeps working for the existing billing deep-link
 * by routing to a built-in Subscription tab.
 *
 * Every toggle / radio / select auto-saves via `patchSettingsDomain`
 * or `patchNotifications` and flips a small "Saved" toast. The
 * actual visual / CSS-variable application happens in
 * `SettingsApplier` which reads the same columns on app load.
 */
const TABS = [
  { id: "appearance",    label: "Appearance",         icon: Palette },
  { id: "accessibility", label: "Accessibility",      icon: Eye },
  { id: "notifications", label: "Notifications",      icon: Bell },
  { id: "privacy",       label: "Privacy & Security", icon: Shield },
  { id: "legal",         label: "Legal",              icon: Scale },
  { id: "subscription",  label: "Subscription",       icon: CreditCard },
];

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("tab") || "appearance";
    } catch { return "appearance"; }
  });

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Customize how Guildstew looks and behaves.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-[#1E2430] flex flex-wrap h-auto p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="data-[state=active]:bg-[#37F2D1] data-[state=active]:text-[#050816] gap-1.5"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="appearance"    className="mt-6 space-y-4">
            <AppearanceTab />
          </TabsContent>
          <TabsContent value="accessibility" className="mt-6 space-y-4">
            <AccessibilityTab />
          </TabsContent>
          <TabsContent value="notifications" className="mt-6 space-y-4">
            <NotificationsTab />
          </TabsContent>
          <TabsContent value="privacy"       className="mt-6 space-y-4">
            <PrivacyTab />
          </TabsContent>
          <TabsContent value="legal"         className="mt-6 space-y-4">
            <LegalTab />
          </TabsContent>
          <TabsContent value="subscription"  className="mt-6 space-y-4">
            <SubscriptionPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ComingLater({ title }) {
  return (
    <Row label={title}>
      <p className="text-sm text-slate-500 italic">Coming online in the next step.</p>
    </Row>
  );
}

/**
 * Label-on-left, control-on-right row primitive used across tabs.
 */
export function Row({ label, description, children }) {
  return (
    <div className="flex items-start justify-between gap-4 bg-[#1E2430] border border-slate-700 rounded-lg p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div className="pt-2">
      <h2 className="text-lg font-black text-white">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function SubscriptionPanel() {
  const sub = useSubscription();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const openPortal = async () => {
    if (!user?.id) { toast.error("Sign in first."); return; }
    setBusy(true);
    try {
      await openBillingPortal(user.id);
    } catch (err) {
      toast.error(err?.message || "Billing portal unavailable.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionHeader title="Subscription" subtitle="Your current plan and billing." />
      <Row label="Current plan" description={sub.tierData?.priceLabel}>
        <span
          className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest rounded-full px-2 py-1"
          style={{
            backgroundColor: `${sub.tierData?.badgeColor || "#37F2D1"}33`,
            color: sub.tierData?.badgeColor || "#37F2D1",
            border: `1px solid ${sub.tierData?.badgeColor || "#37F2D1"}66`,
          }}
        >
          {sub.tierData?.badgeIcon} {sub.tierData?.name}
        </span>
      </Row>
      <Row
        label="Manage subscription"
        description="Change your plan, update your payment method, or cancel — handled in the Stripe billing portal."
      >
        <Button
          onClick={openPortal}
          disabled={busy}
          className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
        >
          {busy ? "Opening…" : <>Open Portal <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </Row>
    </>
  );
}
