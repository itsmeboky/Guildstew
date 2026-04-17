import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Twitter, Twitch, Youtube, Instagram } from "lucide-react";

/**
 * The only social platforms Guildstew lets users expose on their
 * profile. Free-form URLs got replaced by this fixed list so the
 * "leaving-Guildstew" interstitial can trust the destination.
 */
export const SOCIAL_PLATFORMS = [
  { key: "discord",   label: "Discord",    icon: MessageCircle, placeholder: "boky#1234",     hint: "Your Discord tag" },
  { key: "twitter",   label: "Twitter / X", icon: Twitter,      placeholder: "@boky",         hint: "Handle without the URL" },
  { key: "twitch",    label: "Twitch",     icon: Twitch,        placeholder: "boky",          hint: "Channel name" },
  { key: "youtube",   label: "YouTube",    icon: Youtube,       placeholder: "https://youtube.com/@boky", hint: "Full channel URL" },
  { key: "instagram", label: "Instagram",  icon: Instagram,     placeholder: "@boky",         hint: "Handle without the URL" },
];

export default function SocialHandlesEditor({ value = {}, onChange }) {
  const setField = (key, v) => {
    onChange?.({ ...value, [key]: v });
  };
  return (
    <div>
      <Label className="text-sm font-semibold text-gray-300 mb-2 block">Social Handles</Label>
      <div className="space-y-2">
        {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, placeholder, hint }) => (
          <div key={key} className="grid grid-cols-[120px,1fr] items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Icon className="w-4 h-4 text-[#37F2D1]" />
              <span>{label}</span>
            </div>
            <div>
              <Input
                value={value?.[key] || ""}
                onChange={(e) => setField(key, e.target.value)}
                placeholder={placeholder}
                className="bg-[#2A3441] border-gray-700 text-white"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
