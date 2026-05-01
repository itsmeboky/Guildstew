import React, { useState } from "react";

function FeatureCard({ title, body, imageUrl, layoutFlavor, alt }) {
  const [failed, setFailed] = useState(false);
  const isBrutal = layoutFlavor === "brutal";
  const isIndustrial = layoutFlavor === "industrial";

  const cardStyle = {
    backgroundColor: "var(--gpl-bg-tertiary)",
    color: "var(--gpl-text-primary)",
    borderRadius: isIndustrial ? 0 : isBrutal ? 0 : 6,
    border: isBrutal
      ? "3px solid var(--gpl-accent)"
      : isIndustrial
        ? "1px solid var(--gpl-text-secondary)"
        : "1px solid rgba(255,255,255,0.08)",
    borderLeft: isIndustrial ? "4px solid var(--gpl-accent)" : undefined,
    overflow: "hidden",
  };

  return (
    <article style={cardStyle} className="flex flex-col">
      <div
        className="w-full aspect-[16/10] flex items-center justify-center"
        style={{ backgroundColor: "var(--gpl-bg-secondary)" }}
      >
        {imageUrl && !failed ? (
          <img
            src={imageUrl}
            alt={alt || ""}
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
            Feature image · 800×500
          </div>
        )}
      </div>
      <div className="p-6">
        <h3
          className="text-xl mb-3"
          style={{
            fontFamily: "var(--gpl-heading-font)",
            fontWeight: 800,
            color: "var(--gpl-text-primary)",
            textTransform: isBrutal ? "uppercase" : "none",
            letterSpacing: isBrutal ? "0.04em" : "0",
          }}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{
            color: "var(--gpl-text-secondary)",
            fontFamily: "var(--gpl-body-font)",
          }}
        >
          {body}
        </p>
      </div>
    </article>
  );
}

// Two-card pack contents grid: "what's in the pack."
export default function GamePackContents({
  listing,
  feature1Url,
  feature2Url,
  layoutFlavor,
}) {
  return (
    <section className="px-6 md:px-12 py-12 md:py-16 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          title={listing.pack_feature_1_title}
          body={listing.pack_feature_1_body}
          imageUrl={feature1Url}
          layoutFlavor={layoutFlavor}
          alt="Pack feature 1"
        />
        <FeatureCard
          title={listing.pack_feature_2_title}
          body={listing.pack_feature_2_body}
          imageUrl={feature2Url}
          layoutFlavor={layoutFlavor}
          alt="Pack feature 2"
        />
      </div>
    </section>
  );
}
