import React from "react";

function formatPrice(cents) {
  if (cents == null) return "FREE";
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

// Sticky price + CTA strip between narrative and pack contents.
export default function GamePackPriceBlock({ listing, layoutFlavor, onPrimary }) {
  const isBrutal = layoutFlavor === "brutal";
  const isIndustrial = layoutFlavor === "industrial";

  return (
    <section
      className="px-6 md:px-12 py-8"
      style={{
        backgroundColor: "var(--gpl-bg-secondary)",
        borderTop: isBrutal
          ? "4px solid var(--gpl-accent)"
          : isIndustrial
            ? "1px solid var(--gpl-text-secondary)"
            : "none",
        borderBottom: isBrutal
          ? "4px solid var(--gpl-accent)"
          : isIndustrial
            ? "1px solid var(--gpl-text-secondary)"
            : "none",
      }}
    >
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.25em] mb-1"
            style={{
              color: "var(--gpl-text-secondary)",
              fontFamily: "var(--gpl-accent-font)",
            }}
          >
            One-time purchase
          </div>
          <div
            className="text-3xl md:text-4xl"
            style={{
              color: "var(--gpl-accent)",
              fontFamily: "var(--gpl-heading-font)",
              fontWeight: 900,
              letterSpacing: isBrutal ? "0.04em" : "0",
            }}
          >
            {formatPrice(listing.price_cents)}
          </div>
        </div>
        <button
          type="button"
          onClick={onPrimary}
          className="px-8 py-4 text-base font-bold tracking-wide transition-transform hover:scale-[1.02]"
          style={{
            backgroundColor: "var(--gpl-accent)",
            color: "var(--gpl-accent-text)",
            fontFamily: "var(--gpl-accent-font)",
            border: isBrutal ? "3px solid var(--gpl-accent-text)" : "none",
            borderRadius: isIndustrial ? 0 : isBrutal ? 0 : 4,
            letterSpacing: isBrutal ? "0.1em" : "0.04em",
            textTransform: isBrutal ? "uppercase" : "none",
          }}
        >
          {listing.cta_primary_label || "Buy Pack"}
        </button>
      </div>
    </section>
  );
}
