import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star, FileText, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import LazyImage from "@/components/ui/LazyImage";
import { supabase } from "@/api/supabaseClient";

const HERO_SLIDES = [
  {
    id: 1,
    image: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/365f3ff13_HeroBannerImage1.png",
    buttonText: "Support Us",
    buttonLink: "https://www.kickstarter.com/",
    showText: false,
    buttonOffset: 45
  },
  {
    id: 2,
    image: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/8d4c5234f_HeroBannerImage2.png",
    title: "Build Your Worlds With Ease",
    subtitle: "Guildstew gives GMs and players everything they need—from character sheets to world bibles—all in one intuitive platform.",
    buttonText: "Get Started",
    buttonLink: createPageUrl("CreateCampaign"),
    showText: true
  },
  {
    id: 3,
    image: "https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/c2982a68e_HeroBannerImage3.png", // Updated image URL
    title: "Try our Character Creator",
    subtitle: "See exactly what Guildstew is capable of.",
    buttonText: "Start Creating",
    buttonLink: createPageUrl("CharacterLibrary"),
    showText: true,
    backgroundPosition: 'left center'
  }
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Admin-managed hero banners. Falls back to the hard-coded
  // HERO_SLIDES above when no admin banners exist, so the homepage
  // keeps rendering on a fresh environment.
  const { data: adminBanners = [] } = useQuery({
    queryKey: ['homepageBanners'],
    queryFn: async () => {
      const { data } = await supabase
        .from('homepage_banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const slides = adminBanners.length > 0
    ? adminBanners.map((b) => ({
        id: b.id,
        image: b.image_url,
        title: b.title || undefined,
        subtitle: b.subtitle || undefined,
        buttonText: b.link_url ? (b.title ? 'Learn More' : undefined) : undefined,
        buttonLink: b.link_url || undefined,
        showText: !!(b.title || b.subtitle),
      }))
    : HERO_SLIDES;

  const { data: products } = useQuery({
    queryKey: ['topProducts'],
    queryFn: () => base44.entities.Product.filter({ category: 'game_pack' }, '-rating', 10),
    initialData: []
  });

  // Admin-set overrides for the two homepage marketing tiles. When a
  // row exists, it wins over the auto-derived `products[0]` card.
  const { data: siteConfig = {} } = useQuery({
    queryKey: ['siteConfig'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['homepage_newest_gamepack', 'homepage_top_selling']);
      const out = {};
      for (const row of data || []) out[row.key] = row.value || {};
      return out;
    },
  });
  const newestOverride = siteConfig.homepage_newest_gamepack || null;
  const topSellingOverride = siteConfig.homepage_top_selling || null;

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['homepageBlogPosts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, category, summary, cover_image_url, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: latestVersion } = useQuery({
    queryKey: ['homepageLatestVersion'],
    queryFn: async () => {
      const { data } = await supabase
        .from('version_history')
        .select('version, title, description, release_date')
        .order('release_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });

  const { data: recentVersions = [] } = useQuery({
    queryKey: ['homepageRecentVersions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('version_history')
        .select('version, title, description, release_date')
        .order('release_date', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Merge recent blog posts + versions into a single time-sorted
  // feed for the Latest Updates card. Each row carries a `type` so
  // the card can pick the right icon.
  const latestUpdates = React.useMemo(() => {
    const merged = [
      ...(blogPosts || []).map((p) => ({
        key: `blog-${p.id}`,
        title: p.title,
        description: p.summary || "",
        date: p.published_at,
        type: "blog",
        link: `/blog/${p.slug}`,
      })),
      ...(recentVersions || []).map((v, i) => ({
        key: `ver-${v.version || i}`,
        title: `${v.version} — ${v.title}`,
        description: v.description || "",
        date: v.release_date,
        type: "version",
        link: "/changelog",
      })),
    ];
    return merged
      .filter((u) => u.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [blogPosts, recentVersions]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7500);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % Math.max(1, slides.length));
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % Math.max(1, slides.length));

  return (
    <div className="theme-homepage-bg relative min-h-screen bg-white">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          transition: background 0.2s;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>

      {/* Banner Wallpaper */}
      <div className="absolute top-0 left-0 right-0 h-[33vh] overflow-hidden">
        <LazyImage
          src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/7a4e888b3_BannerHome.png"
          alt="Banner"
          className="absolute inset-0 w-full h-full"
          imageClassName="object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white" />
      </div>

      {/* pt-44 (~176px) keeps the hero row clear of the nav and
          gives Ladle the vertical runway she needs above the
          hero box — the content cards below inherit that breathing
          room for free without their own margin. */}
      <div className="relative z-10 p-8 pt-64">
        <div className="max-w-[1600px] mx-auto">
          {/* Top Row */}
          <div className="grid grid-cols-12 gap-6 mb-6 relative">
            {/* Character Space — Karliah, peeking in from the left.
                Swapped from the static PNG to the animated GIF
                (same bucket / same base filename, just .gif). Shifted
                down slightly so the left-hand peek doesn't crowd
                the hero row. */}
            <div className="col-span-2 relative">
              <img
                src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/ffd089d34_KarliahNewArt.gif"
                alt="Karliah mascot"
                className="absolute h-[535px] w-auto object-contain z-10 pointer-events-none"
                style={{ top: '-40px', right: '-85px' }}
              />
            </div>

            {/* Hero Slider — z-20 so the Ladle mascot (z-0 below)
                can sit behind its top edge and look perched. Solid
                #FF5722 base matches the orange used by the content
                cards below; the slide images layer on top, and any
                uncovered pixel shows the theme orange instead of
                leaking Ladle through from behind. */}
            <div className="col-span-7 relative rounded-3xl overflow-hidden h-[420px] z-20 bg-[#FF5722]">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <LazyImage
                    src={slide.image}
                    alt="Hero"
                    className="absolute inset-0 w-full h-full"
                    imageClassName={`object-top ${slide.backgroundPosition === 'left center' ? 'object-left' : ''}`}
                  />
                  <div className="absolute inset-0" 
                    style={{
                      backgroundSize: 'cover',
                      backgroundPosition: slide.backgroundPosition || 'center'
                    }}
                  >
                  <div className="relative h-full flex items-center justify-center" style={slide.buttonOffset ? { paddingTop: `${slide.buttonOffset}px` } : {}}>
                    <div className="text-center px-12 max-w-3xl">
                      {slide.showText && (
                        <>
                          <h1 className="text-4xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                            {slide.title}
                          </h1>
                          <p className="text-lg text-white mb-8 drop-shadow-md">
                            {slide.subtitle}
                          </p>
                        </>
                      )}
                      {slide.buttonLink.startsWith('http') ? (
                        <a
                          href={slide.buttonLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-[#2A3441] hover:bg-[#1E2430] text-white px-12 py-4 rounded-2xl font-bold text-lg transition-colors"
                        >
                          {slide.buttonText}
                        </a>
                      ) : (
                        <Link to={slide.buttonLink}>
                          <Button className="bg-[#2A3441] hover:bg-[#1E2430] text-white px-12 py-4 rounded-2xl font-bold text-lg">
                            {slide.buttonText}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              ))}

              <button
                onClick={prevSlide}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full transition-colors z-20"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-3 rounded-full transition-colors z-20"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`transition-all rounded-full ${
                      index === currentSlide 
                        ? 'bg-white w-10 h-2.5' 
                        : 'bg-white/40 w-2.5 h-2.5 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right Column */}
            <div className="col-span-3 flex flex-col gap-6 h-[420px]">
              {/* Version History */}
              <Link
                to="/changelog"
                className="rounded-3xl p-5 relative overflow-hidden block hover:brightness-110 transition"
              >
                <div className="theme-homepage-card absolute inset-0" />
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-2">Version History</h3>
                  {latestVersion ? (
                    <div className="text-white">
                      <div className="font-bold text-sm">
                        {latestVersion.version}
                        {latestVersion.release_date && (
                          <span className="text-xs opacity-80 ml-2">
                            {new Date(latestVersion.release_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      <div className="text-sm opacity-90 line-clamp-2">
                        {latestVersion.title}
                        {latestVersion.description && ` — ${latestVersion.description}`}
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/80 text-xs italic">First release coming soon.</p>
                  )}
                </div>
              </Link>

              {/* Latest Updates — merged feed of recent blog posts +
                  version releases, newest first. */}
              <div className="rounded-3xl p-5 flex-1 relative overflow-hidden">
                <div className="theme-homepage-card absolute inset-0" />
                <div className="relative z-10 h-full flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">Latest Updates</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {latestUpdates.length === 0 ? (
                      <p className="text-white/80 text-xs italic text-center mt-4">
                        News lands here as new posts or releases go live.
                      </p>
                    ) : (
                      latestUpdates.map((u) => (
                        <Link key={u.key} to={u.link} className="block cursor-pointer group">
                          <p className="text-white text-base font-semibold group-hover:text-[#37F2D1] transition-colors flex items-center gap-1.5">
                            {u.type === "version"
                              ? <Rocket className="w-3.5 h-3.5 opacity-90" />
                              : <FileText className="w-3.5 h-3.5 opacity-90" />}
                            <span className="line-clamp-1">{u.title}</span>
                          </p>
                          {u.description && (
                            <p className="text-white/70 text-sm mt-1 line-clamp-2">{u.description}</p>
                          )}
                          <p className="text-white/60 text-xs mt-1">{relativeTime(u.date)}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ladle mascot — perched on the hero box's top-right
                corner. Lives at the grid row level (not inside the
                hero box — that has overflow-hidden) with a lower
                z-index than the box, so her bottom is visually
                clipped by the box top edge to sell the "perched"
                illusion. Hidden on small screens to keep the
                mobile layout uncluttered. */}
            <img
              src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/hero/ladleanimation1.gif"
              alt="Ladle mascot"
              className="hidden md:block absolute w-[320px] h-auto pointer-events-none z-0"
              style={{ right: 'calc(25% + 40px)', top: '-205px' }}
            />
          </div>

          {/* Bottom Row — sits immediately below the hero row with
              normal spacing; the mascots get their breathing room
              from the hero section's top padding, not from a gap
              between the hero and these cards. */}
          <div className="grid grid-cols-12 gap-6 mb-8">
            {/* Newest Game Pack — admin override wins over the
                auto-derived products[0] card so marketing can
                hand-pick what's featured. */}
            <div className="col-span-2 rounded-3xl p-5 h-[320px] flex flex-col relative overflow-hidden">
              <div className="theme-homepage-card absolute inset-0" />
              <div className="relative z-10 flex flex-col h-full">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Newest Game Pack</h3>
                {newestOverride?.name ? (
                  <ConfigCard config={newestOverride} />
                ) : products.length > 0 ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 rounded-2xl mb-3 min-h-0 overflow-hidden relative">
                      <LazyImage
                        src={products[0].cover_image_url}
                        alt={products[0].name}
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                    <p className="text-white text-sm font-semibold text-center line-clamp-2">{products[0].name}</p>
                    <p className="text-white text-lg font-bold text-center mt-1">${products[0].price}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Top Selling Game Packs — admin can replace the auto
                top-5 grid with a single curated card via site_config. */}
            <div className="col-span-7 rounded-3xl p-5 h-[320px] relative overflow-hidden">
              <div className="theme-homepage-card absolute inset-0" />
              <div className="relative z-10 h-full flex flex-col">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Top Selling Game Packs</h3>
                {topSellingOverride?.name ? (
                  <ConfigCard config={topSellingOverride} large />
                ) : (
                <div className="grid grid-cols-5 gap-4 flex-1">
                  {products.slice(0, 5).map(product => (
                    <div key={product.id} className="group cursor-pointer flex flex-col">
                      <div className="flex-1 rounded-2xl mb-2 relative overflow-hidden group-hover:scale-105 transition-transform min-h-0">
                        <LazyImage 
                          src={product.cover_image_url}
                          alt={product.name}
                          className="absolute inset-0 w-full h-full"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded z-10">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-white text-xs font-semibold">{product.rating || 4.8}</span>
                        </div>
                      </div>
                      <p className="text-white text-xs font-semibold text-center line-clamp-2 group-hover:text-[#37F2D1] transition-colors">
                        {product.name}
                      </p>
                      <p className="text-white text-sm font-bold text-center mt-1">${product.price}</p>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>

            {/* Blog */}
            <div className="col-span-3 rounded-3xl p-5 h-[320px] relative overflow-hidden">
              <div className="theme-homepage-card absolute inset-0" />
              <div className="relative z-10 h-full flex flex-col">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Blog</h3>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {blogPosts.length === 0 ? (
                    <p className="text-white/70 text-xs text-center italic mt-4">
                      New posts land here as they're published.
                    </p>
                  ) : (
                    blogPosts.slice(0, 5).map((post) => (
                      <Link
                        to={`/blog/${post.slug}`}
                        key={post.id}
                        className="block cursor-pointer group"
                      >
                        {post.cover_image_url && (
                          <div className="h-20 rounded-lg mb-2 overflow-hidden relative">
                            <LazyImage
                              src={post.cover_image_url}
                              alt={post.title}
                              className="absolute inset-0 w-full h-full"
                            />
                          </div>
                        )}
                        <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                          {(post.category || "article").replace(/_/g, " ")}
                        </span>
                        <p className="text-white text-sm mt-1 font-semibold group-hover:text-[#37F2D1] transition-colors line-clamp-2">
                          {post.title}
                        </p>
                        {post.summary && (
                          <p className="text-white/70 text-[11px] mt-0.5 line-clamp-2">
                            {post.summary}
                          </p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * Rough "N minutes / hours / days / weeks ago" formatter for the
 * Latest Updates feed. Keeps units coarse — exact time isn't useful
 * on a marketing card.
 */
/**
 * Render an admin-configured homepage card.
 *
 * Used by both "Newest Game Pack" (compact) and "Top Selling" (large)
 * tiles when a `site_config` row overrides the auto-derived content.
 * `config` shape: { name, image, description, link_url }.
 */
function ConfigCard({ config, large = false }) {
  const { name, image, description, link_url } = config || {};
  const body = (
    <div className={`flex-1 flex flex-col min-h-0 ${large ? "justify-center" : ""}`}>
      {image && (
        <div className="flex-1 rounded-2xl mb-3 min-h-0 overflow-hidden relative">
          <LazyImage src={image} alt={name || ""} className="absolute inset-0 w-full h-full" />
        </div>
      )}
      {name && <p className={`text-white font-bold text-center ${large ? "text-2xl" : "text-sm"}`}>{name}</p>}
      {description && (
        <p className="text-white/80 text-xs text-center mt-1 line-clamp-2">{description}</p>
      )}
    </div>
  );
  if (link_url) {
    const external = /^https?:\/\//.test(link_url);
    if (external) {
      return <a href={link_url} target="_blank" rel="noopener noreferrer" className="contents">{body}</a>;
    }
    return <Link to={link_url} className="contents">{body}</Link>;
  }
  return body;
}

function relativeTime(input) {
  if (!input) return "";
  const t = new Date(input).getTime();
  if (Number.isNaN(t)) return "";
  const delta = Math.max(0, Date.now() - t);

  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (delta < min) return "just now";
  if (delta < hour) return Math.round(delta / min) + " min ago";
  if (delta < day) return Math.round(delta / hour) + "h ago";
  if (delta < week) return Math.round(delta / day) + "d ago";
  if (delta < month) return Math.round(delta / week) + "w ago";
  if (delta < year) return Math.round(delta / month) + "mo ago";
  return Math.round(delta / year) + "y ago";
}