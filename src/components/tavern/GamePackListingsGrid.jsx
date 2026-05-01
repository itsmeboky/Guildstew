import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Package, ChevronRight } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { TAVERN_PALETTE as P } from "@/config/tavernPalette";

function formatPrice(cents) {
  if (cents == null) return "FREE";
  return `$${(cents / 100).toFixed(2)}`;
}

function resolvePublicUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from("user-assets").getPublicUrl(path);
  return data?.publicUrl || null;
}

// Surfaces the marketing-side game pack listings. Each card links to
// /tavern/packs/:slug where the per-system themed product page takes
// over. Cards stay in Tavern brand colors so the grid reads as one
// coherent shelf.
export default function GamePackListingsGrid() {
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["gamePackListings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_pack_listings")
        .select(
          "id, slug, display_name, subtitle, genre_tag, price_cents, hero_image_path",
        )
        .eq("status", "published")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div
        className="text-center py-10 rounded-lg"
        style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}`, color: P.textSecondary }}
      >
        Loading game systems…
      </div>
    );
  }

  if (listings.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-lg font-black"
            style={{ color: P.textPrimary }}
          >
            Game Systems
          </h2>
          <p className="text-xs" style={{ color: P.textSecondary }}>
            Tap a system to see what&apos;s in the pack.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}

function ListingCard({ listing }) {
  const heroUrl = resolvePublicUrl(listing.hero_image_path);
  const [failed, setFailed] = React.useState(false);

  return (
    <Link
      to={`/tavern/packs/${listing.slug}`}
      className="block rounded-lg overflow-hidden transition-shadow hover:shadow-md"
      style={{ backgroundColor: P.card, border: `1px solid ${P.cardBorder}` }}
    >
      <div
        className="h-32 relative"
        style={{ backgroundColor: P.pageBg }}
      >
        {heroUrl && !failed ? (
          <img
            src={heroUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: P.cardBorder }}
          >
            <Package className="w-8 h-8" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div
          className="text-[10px] uppercase tracking-widest mb-1"
          style={{ color: P.accentDeep }}
        >
          {listing.genre_tag}
        </div>
        <h3
          className="text-base font-black leading-tight"
          style={{ color: P.textPrimary }}
        >
          {listing.display_name}
        </h3>
        {listing.subtitle && (
          <p
            className="text-xs italic mt-0.5"
            style={{ color: P.textSecondary }}
          >
            {listing.subtitle}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span
            className="text-sm font-black"
            style={{ color: listing.price_cents == null ? "#059669" : P.accentDeep }}
          >
            {formatPrice(listing.price_cents)}
          </span>
          <span
            className="text-xs inline-flex items-center gap-1"
            style={{ color: P.textSecondary }}
          >
            View pack <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
