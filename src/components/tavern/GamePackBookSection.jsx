import React, { useState } from "react";

// Physical book / artifact section. CTA goes to publisher's storefront.
export default function GamePackBookSection({
  listing,
  bookCoverUrl,
  layoutFlavor,
}) {
  const [failed, setFailed] = useState(false);
  const isBrutal = layoutFlavor === "brutal";
  const isIndustrial = layoutFlavor === "industrial";

  return (
    <section className="px-6 md:px-12 py-12 md:py-20">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="md:order-2">
          <div
            className="aspect-[3/4] w-full max-w-sm mx-auto flex items-center justify-center"
            style={{
              backgroundColor: "var(--gpl-bg-tertiary)",
              border: isBrutal
                ? "3px solid var(--gpl-accent)"
                : isIndustrial
                  ? "1px solid var(--gpl-text-secondary)"
                  : "1px solid rgba(255,255,255,0.08)",
              borderRadius: isIndustrial ? 0 : isBrutal ? 0 : 6,
              overflow: "hidden",
              boxShadow: isBrutal
                ? "8px 8px 0 var(--gpl-accent)"
                : isIndustrial
                  ? "none"
                  : "0 12px 36px rgba(0,0,0,0.5)",
            }}
          >
            {bookCoverUrl && !failed ? (
              <img
                src={bookCoverUrl}
                alt="Book cover"
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
                Book cover · 600×800
              </div>
            )}
          </div>
        </div>

        <div className="md:order-1">
          <div
            className="text-[12px] uppercase tracking-[0.25em] mb-3"
            style={{
              color: "var(--gpl-accent)",
              fontFamily: "var(--gpl-accent-font)",
            }}
          >
            {listing.book_section_header}
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
            {listing.book_section_tagline}
          </h2>
          <p
            className="text-base leading-relaxed mb-6"
            style={{
              color: "var(--gpl-text-secondary)",
              fontFamily: "var(--gpl-body-font)",
            }}
          >
            {listing.book_section_body}
          </p>
          {listing.book_purchase_url && (
            <a
              href={listing.book_purchase_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-6 py-3 text-sm font-bold tracking-wide transition-transform hover:scale-[1.02]"
              style={{
                backgroundColor: "var(--gpl-accent)",
                color: "var(--gpl-accent-text)",
                fontFamily: "var(--gpl-accent-font)",
                border: isBrutal ? "3px solid var(--gpl-accent-text)" : "none",
                borderRadius: isIndustrial ? 0 : isBrutal ? 0 : 4,
                letterSpacing: isBrutal ? "0.08em" : "0.04em",
                textTransform: isBrutal ? "uppercase" : "none",
              }}
            >
              {listing.book_cta_label || "Buy the book →"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
