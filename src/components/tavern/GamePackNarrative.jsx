import React from "react";

// Pull quote + about paragraphs. The pull quote uses the accent font and
// the body uses the body font; layout flavor controls divider treatment.
export default function GamePackNarrative({ listing, layoutFlavor }) {
  const paragraphs = Array.isArray(listing.about_paragraphs)
    ? listing.about_paragraphs
    : [];

  const isIndustrial = layoutFlavor === "industrial";
  const isBrutal = layoutFlavor === "brutal";

  return (
    <section className="px-6 md:px-12 py-12 md:py-16 max-w-4xl mx-auto">
      {listing.hero_pull_quote && (
        <blockquote
          className="text-xl md:text-2xl italic leading-relaxed"
          style={{
            color: "var(--gpl-text-primary)",
            fontFamily: "var(--gpl-body-font)",
            borderLeft: isIndustrial ? "3px solid var(--gpl-accent)" : "none",
            paddingLeft: isIndustrial ? "1rem" : 0,
            textAlign: isBrutal ? "center" : "left",
            textTransform: isBrutal ? "uppercase" : "none",
          }}
        >
          “{listing.hero_pull_quote}”
        </blockquote>
      )}

      <div
        className="mt-8 space-y-5"
        style={{
          color: "var(--gpl-text-secondary)",
          fontFamily: "var(--gpl-body-font)",
        }}
      >
        {paragraphs.map((p, i) => (
          <p key={i} className="text-base md:text-lg leading-relaxed">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}
