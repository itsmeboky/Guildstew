import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { patchSettingsDomain, getUserSettings } from "@/lib/userSettings";
import { Row, SectionHeader } from "@/pages/Settings";

/**
 * Settings → Accessibility.
 *
 * Every toggle here writes to `settings.accessibility` and is read
 * by `SettingsApplier`, which maps each preference to either a CSS
 * variable (`--font-scale`), a class on `<html>` (`theme-light`,
 * `dyslexia`, `high-contrast`, `reduced-motion`, `color-blind-*`),
 * or a font @import (dyslexia pulls OpenDyslexic from the CDN).
 * Components that want to react — the dice roller checks the
 * reduced-motion class and swaps to an instant-result mode, for
 * example — just read the class list.
 */
export default function AccessibilityTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: state = { settings: {} } } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: () => getUserSettings(user.id),
    enabled: !!user?.id,
  });
  const a11y = state.settings.accessibility || {};

  const save = useMutation({
    mutationFn: (patch) => patchSettingsDomain(user.id, "accessibility", patch),
    onSuccess: () => {
      toast.success("Saved", { duration: 1200 });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
    },
  });

  return (
    <>
      <SectionHeader
        title="Accessibility"
        subtitle="Make Guildstew work for you. Changes apply immediately."
      />

      <Row
        label="Display mode"
        description="Light mode is an experimental inversion for now — dark mode is still the recommended look."
      >
        <Select
          value={a11y.displayMode || "dark"}
          onValueChange={(v) => save.mutate({ displayMode: v })}
        >
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row
        label="Dyslexia-friendly mode"
        description="Switches the body font to OpenDyslexic, increases letter-spacing, and widens line-height."
      >
        <Switch
          checked={!!a11y.dyslexia}
          onCheckedChange={(v) => save.mutate({ dyslexia: v })}
        />
      </Row>

      <Row
        label="High contrast mode"
        description="Pure black / white text, heavier borders, thicker focus outlines. Removes decorative blur."
      >
        <Switch
          checked={!!a11y.highContrast}
          onCheckedChange={(v) => save.mutate({ highContrast: v })}
        />
      </Row>

      <Row
        label="Color blind mode"
        description="Swaps problematic red / green accent pairs for palettes that stay distinct for your vision type."
      >
        <Select
          value={a11y.colorBlindMode || "off"}
          onValueChange={(v) => save.mutate({ colorBlindMode: v })}
        >
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="protanopia">Protanopia (red-weak)</SelectItem>
            <SelectItem value="deuteranopia">Deuteranopia (green-weak)</SelectItem>
            <SelectItem value="tritanopia">Tritanopia (blue-weak)</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row
        label="Reduced motion"
        description="Disables animations and transitions. The dice roller shows instant results instead of the tumble sequence."
      >
        <Switch
          checked={!!a11y.reducedMotion}
          onCheckedChange={(v) => save.mutate({ reducedMotion: v })}
        />
      </Row>

      <Row
        label="Screen reader hints"
        description="Turns on extra aria-label / aria-describedby attributes throughout the UI."
      >
        <Switch
          checked={!!a11y.screenReaderHints}
          onCheckedChange={(v) => save.mutate({ screenReaderHints: v })}
        />
      </Row>
    </>
  );
}
