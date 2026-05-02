import React, { useState } from "react";

// Theme + dice bonus section: "you also get the visual layer for free."
export default function GamePackThemeBonus({
  listing,
  themeDiceUrl,
  layoutFlavor,
}) {
  const [failed, setFailed] = useState(false);
  const isBrutal = layoutFlavor === "brutal";
  const isIndustrial = layoutFlavor === "industrial";

  return (
    <section
      className="px-6 md:px-12 py-12 md:py-16"
      style={{ backgroundColor: "var(--gpl-bg-secondary)" }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div
          className="aspect-[4/3] w-full flex items-center justify-center"
          style={{
            backgroundColor: "var(--gpl-bg-tertiary)",
            border: isBrutal
              ? "3px solid var(--gpl-accent)"
              : isIndustrial
                ? "1px solid var(--gpl-text-secondary)"
                : "1px solid rgba(255,255,255,0.08)",
            borderRadius: isIndustrial ? 0 : isBrutal ? 0 : 6,
            overflow: "hidden",
            transform: isBrutal ? "rotate(-1deg)" : "none",
          }}
        >
          {themeDiceUrl && !failed ? (
            <img
              src={themeDiceUrl}
              alt="Theme & dice preview"
              className="w-full h-full object-cover"
              onError={() => setFailed(true)}
            />
          ) : (
            <div
              style={{
                color: "var(--gpl-text-secondary)",
                fontFamily: "var(--gpl-accent-font)",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Theme + dice · 800×600
            </div>
          )}
        </div>

        <div>
          <div
            className="text-[12px] uppercase tracking-[0.25em] mb-3"
            style={{
              color: "var(--gpl-accent)",
              fontFamily: "var(--gpl-accent-font)",
            }}
          >
            {listing.theme_section_header}
          </div>
          <h2
            className="text-2xl md:text-3xl mb-4"
            style={{
              fontFamily: "var(--gpl-heading-font)",
              fontWeight: 800,
              color: "var(--gpl-text-primary)",
              textTransform: isBrutal ? "uppercase" : "none",
              fontStyle: !isBrutal && !isIndustrial ? "italic" : "normal",
              letterSpacing: isBrutal ? "0.04em" : "0",
            }}
          >
            {listing.theme_section_tagline}
          </h2>
          <p
            className="text-base leading-relaxed"
            style={{
              color: "var(--gpl-text-secondary)",
              fontFamily: "var(--gpl-body-font)",
            }}
          >
            {listing.theme_section_body}
          </p>
        </div>
      </div>
    </section>
  );
}
