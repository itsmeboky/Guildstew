import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Package } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";
import { patchSettingsDomain, getUserSettings } from "@/lib/userSettings";
import { getActiveCosmetics, clearCosmetic } from "@/lib/activeCosmetics";
import { supabase } from "@/api/supabaseClient";
import { createPageUrl } from "@/utils";
import { Row, SectionHeader } from "@/pages/Settings";

/**
 * Settings → Appearance.
 *
 * Active cosmetics (theme / dice skin / cursor / sound pack) read
 * from `user_profiles.active_cosmetics` via the shared helper. The
 * Font Size / Sidebar Position / Compact Mode toggles write to
 * `settings.appearance`, which `SettingsApplier` turns into CSS
 * variables / classes on `<html>`.
 */
export default function AppearanceTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: state = { settings: {}, notifications: {} } } = useQuery({
    queryKey: ["userSettings", user?.id],
    queryFn: () => getUserSettings(user.id),
    enabled: !!user?.id,
  });
  const appearance = state.settings.appearance || {};

  const { data: cosmetics = {} } = useQuery({
    queryKey: ["activeCosmetics", user?.id],
    queryFn: () => getActiveCosmetics(user.id),
    enabled: !!user?.id,
  });

  const slotIds = [
    cosmetics.theme_id,
    cosmetics.dice_skin_id,
    cosmetics.cursor_set_id,
    cosmetics.sound_pack_id,
  ].filter(Boolean);

  const { data: slotItems = [] } = useQuery({
    queryKey: ["appearanceSlotItems", slotIds.sort().join(",")],
    queryFn: async () => {
      if (slotIds.length === 0) return [];
      const { data } = await supabase
        .from("tavern_items")
        .select("id, name, preview_image_url, category, file_data")
        .in("id", slotIds);
      return data || [];
    },
    enabled: slotIds.length > 0,
  });
  const itemBySlot = (id) => slotItems.find((i) => i.id === id) || null;

  const save = useMutation({
    mutationFn: (patch) => patchSettingsDomain(user.id, "appearance", patch),
    onSuccess: () => {
      toast.success("Saved", { duration: 1200 });
      queryClient.invalidateQueries({ queryKey: ["userSettings", user?.id] });
    },
  });

  const clearMut = useMutation({
    mutationFn: (category) => clearCosmetic(user.id, category),
    onSuccess: () => {
      toast.success("Removed", { duration: 1200 });
      queryClient.invalidateQueries({ queryKey: ["activeCosmetics", user?.id] });
    },
  });

  const changeLink = (
    <Link
      to={createPageUrl("MyCollection")}
      className="inline-flex items-center gap-1 text-xs font-bold text-[#37F2D1] hover:underline"
    >
      Change <Package className="w-3 h-3" />
    </Link>
  );

  const CosmeticRow = ({ category, label, slotKey, description }) => {
    const itemId = cosmetics[slotKey];
    const item = itemId ? itemBySlot(itemId) : null;
    return (
      <Row label={label} description={description}>
        <div className="flex items-center gap-2">
          {item ? (
            <>
              {item.preview_image_url && (
                <img
                  src={item.preview_image_url}
                  alt=""
                  className="w-8 h-8 rounded object-cover border border-slate-700"
                />
              )}
              <span className="text-xs text-white font-bold max-w-[140px] truncate">
                {item.name}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-500 italic">None applied</span>
          )}
          <div className="flex flex-col gap-1 ml-2">
            {changeLink}
            {item && (
              <button
                type="button"
                onClick={() => clearMut.mutate(category)}
                className="text-[10px] text-rose-300 hover:underline text-left"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </Row>
    );
  };

  return (
    <>
      <SectionHeader
        title="Applied cosmetics"
        subtitle="Manage what you've equipped from the Tavern."
      />
      <CosmeticRow
        category="ui_theme"
        label="Active theme"
        slotKey="theme_id"
        description="Applies a UI theme purchased from the Tavern."
      />
      <CosmeticRow
        category="dice_skin"
        label="Active dice skin"
        slotKey="dice_skin_id"
        description="The material + lighting the dice roller uses."
      />
      <CosmeticRow
        category="cursor_set"
        label="Active cursor set"
        slotKey="cursor_set_id"
      />
      <CosmeticRow
        category="sound_pack"
        label="Active sound pack"
        slotKey="sound_pack_id"
      />

      <SectionHeader title="Preferences" />

      <Row
        label="Font size"
        description="Affects base text size across the app."
      >
        <Select
          value={appearance.fontSize || "medium"}
          onValueChange={(v) => save.mutate({ fontSize: v })}
        >
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
            <SelectItem value="xlarge">Extra Large</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row
        label="Sidebar position"
        description="Which side of the screen the app sidebar anchors to."
      >
        <Select
          value={appearance.sidebarPosition || "left"}
          onValueChange={(v) => save.mutate({ sidebarPosition: v })}
        >
          <SelectTrigger className="bg-[#050816] border-slate-700 text-white w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </Row>

      <Row
        label="Compact mode"
        description="Reduces padding and spacing for a denser layout."
      >
        <Switch
          checked={!!appearance.compactMode}
          onCheckedChange={(v) => save.mutate({ compactMode: v })}
        />
      </Row>
    </>
  );
}
