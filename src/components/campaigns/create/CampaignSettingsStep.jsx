import React from "react";
import { Label } from "@/components/ui/label";
import { TIME_OPTIONS } from "@/utils/sessionTime";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar, Users } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Step 2 — basic campaign settings. Just the bare minimum at
 * creation time: schedule, player cap, and a public / private
 * visibility toggle. Everything else (safety tools config, co-GMs,
 * mole settings, etc.) lives on the full CampaignSettings page
 * after the campaign exists.
 */
export default function CampaignSettingsStep({ data, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Campaign Settings</h2>
        <p className="text-sm text-gray-400">
          Quick settings — schedule + player cap. You can tweak these later from
          Campaign Settings.
        </p>
      </div>

      <section className="bg-[#1E2430] rounded-xl p-5 border border-[#2A3441] space-y-4">
        <div className="flex items-center gap-2 text-[#37F2D1]">
          <Calendar className="w-4 h-4" />
          <h3 className="font-bold">Session schedule</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-1 block text-sm">Session day</Label>
            <select
              value={data.session_day || ""}
              onChange={(e) => onChange({ session_day: e.target.value })}
              className="w-full bg-[#0b1220] border border-gray-700 text-white rounded px-3 py-2 text-sm"
            >
              <option value="">Not scheduled yet</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-white mb-1 block text-sm">Start time</Label>
            <Select
              value={data.session_time || "__none"}
              onValueChange={(v) => onChange({ session_time: v === "__none" ? "" : v })}
            >
              <SelectTrigger className="bg-[#0b1220] border-gray-700 text-white">
                <SelectValue placeholder="Select time…" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-slate-700 text-white max-h-64">
                <SelectItem value="__none">Not scheduled yet</SelectItem>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Used for session reminders. Leave blank if you're still figuring it out.
        </p>
      </section>

      <section className="bg-[#1E2430] rounded-xl p-5 border border-[#2A3441] space-y-4">
        <div className="flex items-center gap-2 text-[#37F2D1]">
          <Users className="w-4 h-4" />
          <h3 className="font-bold">Players</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-1 block text-sm">Maximum players</Label>
            <Select
              value={String(data.max_players ?? 6)}
              onValueChange={(v) => onChange({ max_players: Number(v) })}
            >
              <SelectTrigger className="bg-[#0b1220] border-gray-700 text-white">
                <SelectValue placeholder="Max players" />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} Players</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Maximum 8 players + 1 GM per campaign.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-white mb-1 block text-sm">Open recruitment</Label>
              <p className="text-[11px] text-gray-500">
                When on, your campaign shows up in Join Campaign searches.
              </p>
            </div>
            <Switch
              checked={data.open_recruitment !== false}
              onCheckedChange={(v) => onChange({ open_recruitment: !!v })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
