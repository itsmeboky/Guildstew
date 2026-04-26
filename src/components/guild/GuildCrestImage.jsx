import React from "react";
import { Shield } from "lucide-react";

/**
 * Reusable crest avatar.
 *
 * Renders the guild's flattened-PNG crest at any size, falling back
 * to a muted shield silhouette (#2a3441 fill / #4a5568 stroke) when
 * no crest has been saved yet. Used by:
 *   - GuildHallHeader (120px)
 *   - AppSidebar Guild Hall row (24px)
 *   - Profile / member-card slots (40-60px)
 *
 * Reads either `crest_image_url` (the new column from 20261125) or
 * `crest_url` (the legacy column from 20261123) so older guild rows
 * keep working without a backfill.
 */
export default function GuildCrestImage({
  guild,
  size = 40,
  rounded = 6,
  className = "",
  title = "",
}) {
  const url = guild?.crest_image_url || guild?.crest_url || null;
  const dim = `${size}px`;
  const baseStyle = {
    width: dim,
    height: dim,
    borderRadius: `${rounded}px`,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (url) {
    return (
      <img
        src={url}
        alt={title || "Guild crest"}
        title={title}
        className={className}
        style={{ ...baseStyle, objectFit: "contain" }}
      />
    );
  }
  return (
    <span
      title={title || "No crest set"}
      className={className}
      style={{
        ...baseStyle,
        backgroundColor: "transparent",
      }}
    >
      <Shield
        style={{ width: "75%", height: "75%" }}
        strokeWidth={1.5}
        fill="#2a3441"
        stroke="#4a5568"
      />
    </span>
  );
}
