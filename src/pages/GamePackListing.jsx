import React, { useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import GamePackHero from "@/components/tavern/GamePackHero";
import GamePackNarrative from "@/components/tavern/GamePackNarrative";
import GamePackPriceBlock from "@/components/tavern/GamePackPriceBlock";
import GamePackContents from "@/components/tavern/GamePackContents";
import GamePackThemeBonus from "@/components/tavern/GamePackThemeBonus";
import GamePackBookSection from "@/components/tavern/GamePackBookSection";

// Map snake_case theme_tokens to CSS custom properties. Each section reads
// these via var(--gpl-...) so a single token blob restyles the whole page.
const TOKEN_TO_CSS_VAR = {
  bg_primary: "--gpl-bg-primary",
  bg_secondary: "--gpl-bg-secondary",
  bg_tertiary: "--gpl-bg-tertiary",
  text_primary: "--gpl-text-primary",
  text_secondary: "--gpl-text-secondary",
  accent: "--gpl-accent",
  accent_text: "--gpl-accent-text",
  heading_font: "--gpl-heading-font",
  body_font: "--gpl-body-font",
  accent_font: "--gpl-accent-font",
};

function buildCssVars(tokens = {}) {
  const out = {};
  for (const [key, val] of Object.entries(tokens)) {
    const cssKey = TOKEN_TO_CSS_VAR[key];
    if (cssKey && val) out[cssKey] = val;
  }
  return out;
}

function resolvePublicUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from("user-assets").getPublicUrl(path);
  return data?.publicUrl || null;
}

export default function GamePackListing() {
  const { slug } = useParams();
  const narrativeRef = useRef(null);

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ["gamePackListing", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_pack_listings")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const themeTokens = listing?.theme_tokens || {};
  const cssVars = useMemo(() => buildCssVars(themeTokens), [themeTokens]);
  const layoutFlavor = themeTokens.layout_flavor || "elegant";

  // Resolve all imagery once and pass URLs (not paths) down to sections.
  const imageUrls = useMemo(
    () => ({
      hero: resolvePublicUrl(listing?.hero_image_path),
      feature1: resolvePublicUrl(listing?.pack_feature_1_image_path),
      feature2: resolvePublicUrl(listing?.pack_feature_2_image_path),
      themeDice: resolvePublicUrl(listing?.theme_dice_image_path),
      bookCover: resolvePublicUrl(listing?.book_cover_image_path),
    }),
    [listing],
  );

  useEffect(() => {
    document.title = listing?.display_name
      ? `${listing.display_name} · Guildstew`
      : "Game Pack · Guildstew";
  }, [listing]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-8 text-center">
        <h1 className="text-2xl font-black mb-3">Pack not found</h1>
        <p className="text-sm opacity-70 mb-6">
          We couldn&apos;t find a published game pack at this address.
        </p>
        <Link
          to="/TheTavern"
          className="text-sm underline opacity-90 hover:opacity-100"
        >
          ← Back to the Tavern
        </Link>
      </div>
    );
  }

  const handlePrimaryCta = () => {
    // Stripe wiring lands later. Log so the click is observable in dev.
    // eslint-disable-next-line no-console
    console.log("purchase clicked, slug=", slug);
  };

  const handleSecondaryCta = () => {
    narrativeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const rootStyle = {
    ...cssVars,
    backgroundColor: "var(--gpl-bg-primary)",
    color: "var(--gpl-text-primary)",
    fontFamily: "var(--gpl-body-font)",
  };

  return (
    <div
      className="min-h-screen w-full"
      style={rootStyle}
      data-layout-flavor={layoutFlavor}
    >
      <div className="px-4 py-3">
        <Link
          to="/TheTavern"
          className="text-xs uppercase tracking-widest opacity-70 hover:opacity-100"
          style={{ color: "var(--gpl-text-secondary)", fontFamily: "var(--gpl-accent-font)" }}
        >
          ← Tavern
        </Link>
      </div>

      <GamePackHero
        listing={listing}
        heroUrl={imageUrls.hero}
        layoutFlavor={layoutFlavor}
        onPrimary={handlePrimaryCta}
        onSecondary={handleSecondaryCta}
      />

      <div ref={narrativeRef}>
        <GamePackNarrative listing={listing} layoutFlavor={layoutFlavor} />
      </div>

      <GamePackPriceBlock
        listing={listing}
        layoutFlavor={layoutFlavor}
        onPrimary={handlePrimaryCta}
      />

      <GamePackContents
        listing={listing}
        feature1Url={imageUrls.feature1}
        feature2Url={imageUrls.feature2}
        layoutFlavor={layoutFlavor}
      />

      <GamePackThemeBonus
        listing={listing}
        themeDiceUrl={imageUrls.themeDice}
        layoutFlavor={layoutFlavor}
      />

      <GamePackBookSection
        listing={listing}
        bookCoverUrl={imageUrls.bookCover}
        layoutFlavor={layoutFlavor}
      />

      <footer
        className="text-center text-[11px] uppercase tracking-widest py-10 opacity-60"
        style={{ color: "var(--gpl-text-secondary)", fontFamily: "var(--gpl-accent-font)" }}
      >
        {listing.publisher_name}
        {listing.publisher_origin ? ` · ${listing.publisher_origin}` : ""}
      </footer>
    </div>
  );
}
