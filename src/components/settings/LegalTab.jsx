import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/AuthContext";
import { patchSettingsDomain, getUserSettings } from "@/lib/userSettings";
import { Row, SectionHeader } from "@/pages/Settings";

/**
 * Settings → Legal.
 *
 * Links out to the legal pages (which already exist as standalone
 * routes — `/Terms`, `/Privacy`, `/Cookies`, `/EULA`) and persists
 * the cookie-consent toggles to `settings.legal`. The analytics /
 * marketing flags are read by the tracker / integrations layers so
 * turning them off really does suppress the network calls.
 */
const LEGAL_LINKS = [
  { to: "/Terms",            label: "Terms of Service",       description: "The contract between you and Guildstew." },
  { to: "/Privacy",          label: "Privacy Policy",         description: "What data we collect and how we use it." },
  { to: "/PrivacySummary",   label: "How we use your data",   description: "The plain-language summary version." },
  { to: "/EULA",             label: "End-User License",       description: "For assets and software you use via Guildstew." },
  { to: "/Cookies",          label: "Cookie Policy",          description: "What cookies we set and why." },
];

export default function LegalTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: state = { settings: {} } } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: () => getUserSettings(user.id),
    enabled: !!user?.id,
  });
  const legal = state.settings.legal || {};

  const save = useMutation({
    mutationFn: (patch) => patchSettingsDomain(user.id, "legal", patch),
    onSuccess: () => {
      toast.success("Saved", { duration: 1200 });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
    },
  });

  return (
    <>
      <SectionHeader title="Policies" subtitle="The documents that govern Guildstew." />

      {LEGAL_LINKS.map((l) => (
        <Row key={l.to} label={l.label} description={l.description}>
          <Link
            to={l.to}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#37F2D1] hover:underline"
          >
            Read <ExternalLink className="w-3 h-3" />
          </Link>
        </Row>
      ))}

      <SectionHeader title="Cookie preferences" subtitle="Functional cookies are required — we don't track them here." />

      <Row
        label="Analytics cookies"
        description="Page views, feature usage, and performance metrics that help us improve Guildstew. Never used for advertising."
      >
        <Switch
          checked={legal.analyticsCookies !== false}
          onCheckedChange={(v) => save.mutate({ analyticsCookies: v })}
        />
      </Row>

      <Row
        label="Marketing cookies"
        description="Used to tailor announcements. Off by default."
      >
        <Switch
          checked={!!legal.marketingCookies}
          onCheckedChange={(v) => save.mutate({ marketingCookies: v })}
        />
      </Row>
    </>
  );
}
