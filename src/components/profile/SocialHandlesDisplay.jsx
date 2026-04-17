import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SOCIAL_PLATFORMS } from "./SocialHandlesEditor";

/**
 * Takes raw handle values and returns the outbound URL + the
 * human-readable handle we show next to the icon. Falls back to the
 * raw value when a platform doesn't have a URL template (Discord).
 */
function resolveHandle(key, raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const sanitizeHandle = (v) => v.replace(/^@/, "").trim();
  if (key === "discord") {
    return { label: trimmed, url: null };
  }
  if (key === "twitter") {
    const h = sanitizeHandle(trimmed);
    return { label: "@" + h, url: `https://twitter.com/${encodeURIComponent(h)}` };
  }
  if (key === "twitch") {
    const h = sanitizeHandle(trimmed);
    return { label: h, url: `https://twitch.tv/${encodeURIComponent(h)}` };
  }
  if (key === "instagram") {
    const h = sanitizeHandle(trimmed);
    return { label: "@" + h, url: `https://instagram.com/${encodeURIComponent(h)}` };
  }
  if (key === "youtube") {
    // Accept either a full URL or a bare @handle — fall open to
    // whatever the user typed so we don't mangle custom channel URLs.
    if (/^https?:\/\//i.test(trimmed)) return { label: trimmed, url: trimmed };
    const h = sanitizeHandle(trimmed);
    return { label: "@" + h, url: `https://youtube.com/@${encodeURIComponent(h)}` };
  }
  return { label: trimmed, url: trimmed };
}

export default function SocialHandlesDisplay({ handles }) {
  const [pending, setPending] = useState(null);
  const entries = SOCIAL_PLATFORMS
    .map((p) => ({ platform: p, resolved: resolveHandle(p.key, handles?.[p.key]) }))
    .filter((row) => row.resolved);

  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {entries.map(({ platform, resolved }) => {
        const Icon = platform.icon;
        const clickable = !!resolved.url;
        const base = "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors";
        const inner = (
          <>
            <Icon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[160px]">{resolved.label}</span>
          </>
        );
        if (clickable) {
          return (
            <button
              key={platform.key}
              type="button"
              onClick={() => setPending({ platform, resolved })}
              className={`${base} bg-[#1E2430] border-slate-700 text-slate-200 hover:border-[#37F2D1]/60 hover:text-[#37F2D1]`}
              title={resolved.url}
            >
              {inner}
            </button>
          );
        }
        return (
          <span
            key={platform.key}
            className={`${base} bg-[#1E2430] border-slate-700 text-slate-300`}
          >
            {inner}
          </span>
        );
      })}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="bg-[#1E2430] border border-[#37F2D1]/40 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Leaving Guildstew</DialogTitle>
            <DialogDescription className="text-slate-400">
              You're about to visit an external site. Guildstew is not responsible for content
              on third-party websites.
            </DialogDescription>
          </DialogHeader>
          {pending?.resolved?.url && (
            <p className="text-[11px] text-slate-500 font-mono break-all">
              {pending.resolved.url}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const url = pending?.resolved?.url;
                if (url) window.open(url, "_blank", "noopener,noreferrer");
                setPending(null);
              }}
              className="bg-[#37F2D1] hover:bg-[#2dd9bd] text-[#050816] font-bold"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
