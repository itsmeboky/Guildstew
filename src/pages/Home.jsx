import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import LazyImage from "@/components/ui/LazyImage";

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

  const { data: products } = useQuery({
    queryKey: ['topProducts'],
    queryFn: () => base44.entities.Product.filter({ category: 'game_pack' }, '-rating', 10),
    initialData: []
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7500);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <div className="relative min-h-screen bg-white">
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
              {HERO_SLIDES.map((slide, index) => (
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
                    imageClassName={slide.backgroundPosition === 'left center' ? 'object-left' : ''}
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
                {HERO_SLIDES.map((_, index) => (
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
              <div className="rounded-3xl p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#FF5722]/60 to-[#FF5722]" />
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white mb-2">Version History</h3>
                  <div className="text-white">
                    <div className="font-bold text-sm">v2.4.0 <span className="text-xs opacity-80">Nov 10</span></div>
                    <div className="text-sm opacity-90">Live streaming integration</div>
                  </div>
                </div>
              </div>

              {/* Latest Updates */}
              <div className="rounded-3xl p-5 flex-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#FF5722]/60 to-[#FF5722]" />
                <div className="relative z-10 h-full flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">Latest Updates</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="cursor-pointer group">
                      <p className="text-white text-base font-semibold group-hover:text-[#37F2D1] transition-colors">New Character Creator Tools</p>
                      <p className="text-white/70 text-sm mt-1">Enhanced customization options for your heroes</p>
                      <p className="text-white/60 text-xs mt-1">2 days ago</p>
                    </div>
                    <div className="cursor-pointer group">
                      <p className="text-white text-base font-semibold group-hover:text-[#37F2D1] transition-colors">Campaign Sharing Features</p>
                      <p className="text-white/70 text-sm mt-1">Share your adventures with friends easily</p>
                      <p className="text-white/60 text-xs mt-1">1 week ago</p>
                    </div>
                    <div className="cursor-pointer group">
                      <p className="text-white text-base font-semibold group-hover:text-[#37F2D1] transition-colors">Enhanced Dice Roller</p>
                      <p className="text-white/70 text-sm mt-1">New animations and sound effects</p>
                      <p className="text-white/60 text-xs mt-1">2 weeks ago</p>
                    </div>
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
              style={{ right: 'calc(25% + 40px)', top: '-200px' }}
            />
          </div>

          {/* Bottom Row — sits immediately below the hero row with
              normal spacing; the mascots get their breathing room
              from the hero section's top padding, not from a gap
              between the hero and these cards. */}
          <div className="grid grid-cols-12 gap-6 mb-8">
            {/* Newest Game Pack */}
            <div className="col-span-2 rounded-3xl p-5 h-[320px] flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-[#FF5722]/60 to-[#FF5722]" />
              <div className="relative z-10 flex flex-col h-full">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Newest Game Pack</h3>
                {products.length > 0 && (
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
                )}
              </div>
            </div>

            {/* Top Selling Game Packs */}
            <div className="col-span-7 rounded-3xl p-5 h-[320px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-[#FF5722]/60 to-[#FF5722]" />
              <div className="relative z-10 h-full flex flex-col">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Top Selling Game Packs</h3>
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
              </div>
            </div>

            {/* Blog */}
            <div className="col-span-3 rounded-3xl p-5 h-[320px] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-[#FF5722]/60 to-[#FF5722]" />
              <div className="relative z-10 h-full flex flex-col">
                <h3 className="text-xl font-bold text-white mb-4 text-center">Blog</h3>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="cursor-pointer group">
                    <div className="h-20 rounded-lg mb-2 overflow-hidden relative">
                      <LazyImage 
                        src="https://images.unsplash.com/photo-1516996087931-5ae405802f9f?w=400&h=200&fit=crop"
                        alt="Blog"
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                    <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">TUTORIAL</span>
                    <p className="text-white text-sm mt-1 font-semibold group-hover:text-[#37F2D1] transition-colors">
                      Getting Started with GuildStew
                    </p>
                  </div>
                  <div className="cursor-pointer group">
                    <div className="h-20 rounded-lg mb-2 overflow-hidden relative">
                      <LazyImage 
                        src="https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=200&fit=crop"
                        alt="Blog"
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                    <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">TIPS</span>
                    <p className="text-white text-sm mt-1 font-semibold group-hover:text-[#37F2D1] transition-colors">
                      Building Epic Campaigns
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}