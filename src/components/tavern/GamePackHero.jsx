import React, { useState } from "react";

// Hero band: art on top with overlay, display name + subtitle + CTAs.
// Layout flavor controls heading transform (caps for brutal) and the
// border weight around the CTA pair.
export default function GamePackHero({
  listing,
  heroUrl,
  layoutFlavor,
  onPrimary,
  onSecondary,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = heroUrl && !imgFailed;

  const overlayStyle =
    listing.theme_tokens?.hero_overlay_style || "dark-fade";

  const overlayClass =
    overlayStyle === "yellow-fade"
      ? "bg-gradient-to-t from-[var(--gpl-bg-primary)] via-[var(--gpl-bg-primary)]/40 to-transparent"
      : overlayStyle === "gradient-bottom"
        ? "bg-gradient-to-t from-[var(--gpl-bg-primary)] via-[var(--gpl-bg-primary)]/70 to-transparent"
        : "bg-gradient-to-t from-[var(--gpl-bg-primary)] via-[var(--gpl-bg-primary)]/60 to-transparent";

  const isBrutal = layoutFlavor === "brutal";
  const isIndustrial = layoutFlavor === "industrial";

  const headingTransform = isBrutal ? "uppercase" : "none";
  const headingWeight = isBrutal ? 900 : 700;
  const headingTracking = isBrutal ? "0.04em" : "0";

  return (
    <section className="relative w-full">
      <div className="relative w-full h-[420px] md:h-[520px] overflow-hidden">
        {showImage ? (
          <img
            src={heroUrl}
            onError={() => setImgFailed(true)}
            alt=""
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--gpl-bg-secondary)",
              color: "var(--gpl-text-secondary)",
              fontFamily: "var(--gpl-accent-font)",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Hero image · 1600×800
          </div>
        )}
        <div className={`absolute inset-0 ${overlayClass}`} />

        <div className="absolute inset-x-0 bottom-0 px-6 md:px-12 pb-10 md:pb-14">
          <div
            className="text-[11px] uppercase tracking-[0.25em] mb-3"
            style={{ color: "var(--gpl-accent)", fontFamily: "var(--gpl-accent-font)" }}
          >
            {listing.genre_tag}
          </div>
          <h1
            className="text-4xl md:text-6xl"
            style={{
              fontFamily: "var(--gpl-heading-font)",
              fontWeight: headingWeight,
              textTransform: headingTransform,
              letterSpacing: headingTracking,
              color: "var(--gpl-text-primary)",
              lineHeight: 1.05,
            }}
          >
            {listing.display_name}
          </h1>
          {listing.subtitle && (
            <div
              className="mt-2 text-base md:text-lg italic opacity-90"
              style={{
                color: "var(--gpl-text-secondary)",
                fontFamily: "var(--gpl-body-font)",
              }}
            >
              {listing.subtitle}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrimary}
              className="px-6 py-3 text-sm font-bold tracking-wide transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: "var(--gpl-accent)",
                color: "var(--gpl-accent-text)",
                fontFamily: "var(--gpl-accent-font)",
                border: isBrutal ? "3px solid var(--gpl-accent-text)" : "none",
                borderRadius: isIndustrial ? 0 : isBrutal ? 0 : 4,
                letterSpacing: isBrutal ? "0.08em" : "0.04em",
              }}
            >
              {listing.cta_primary_label || "Buy Pack"}
            </button>
            <button
              type="button"
              onClick={onSecondary}
              className="px-6 py-3 text-sm font-bold tracking-wide transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "var(--gpl-text-primary)",
                border: "1px solid var(--gpl-text-primary)",
                borderRadius: isIndustrial ? 0 : isBrutal ? 0 : 4,
                fontFamily: "var(--gpl-accent-font)",
                letterSpacing: isBrutal ? "0.08em" : "0.04em",
              }}
            >
              {listing.cta_secondary_label || "Preview"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
