"use client";

import React, { useMemo, useRef } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, MapPin, Star, Heart } from "lucide-react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import { ATTRACTIONS } from "@/src/lib/attractions";
import { useReveal } from "@/src/hooks/useReveal";
import { useWishlist } from "@/src/context/WishlistContext";
import type { CategoryKey } from "../lib/categories";

interface FeaturedDestinationsProps {
  /** When set to a destination-type category, only matching destinations show. */
  filterCategory?: CategoryKey | null;
}

export default function FeaturedDestinations({ filterCategory }: FeaturedDestinationsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const revealRef = useReveal<HTMLDivElement>();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const destinations = useMemo(() => {
    if (
      filterCategory &&
      (filterCategory === "stays" ||
        filterCategory === "destinations" ||
        filterCategory === "experiences")
    ) {
      return ATTRACTIONS.filter(a => a.exploreCategory === filterCategory);
    }
    return ATTRACTIONS;
  }, [filterCategory]);

  const scroll = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section
      id="destinations"
      className="py-20 sm:py-28 scroll-mt-20 relative overflow-hidden"
    >
      {/* Organic blob accents */}
      <div className="absolute -left-24 top-10 w-72 h-72 rounded-full bg-[#F4A93E]/10 blur-2xl pointer-events-none" />
      <div className="absolute -right-16 bottom-0 w-56 h-56 rounded-full bg-[#0E7C7B]/10 blur-2xl pointer-events-none" />

      <div ref={revealRef} className="max-w-400 mx-auto px-5 sm:px-8 relative">
        <div className="reveal flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <SectionTitle
            eyebrow="Get Inspired"
            title={
              <>
                Featured <br className="hidden sm:block" /> Destinations
              </>
            }
            subtitle="Every preserve is capped at strict daily visitor counts, so the view stays this good for the next traveler too."
            eyebrowColor="gold"
          />
          <div className="flex gap-2 self-start sm:self-end">
            <button
              onClick={() => scroll(-1)}
              className="w-12 h-12 rounded-full bg-white border border-[#F0DFC2] flex items-center justify-center hover:bg-[#FDECD2] transition-colors shadow-sm"
              aria-label="Scroll left"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-12 h-12 rounded-full bg-[#1E88E5] text-white flex items-center justify-center hover:bg-[#1565C0] transition-colors shadow-[0_8px_20px_-6px_rgba(30,136,229,0.5)]"
              aria-label="Scroll right"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="reveal reveal-delay-1 flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 -mx-5 px-5 sm:mx-0 sm:px-0"
        >
          {destinations.map(a => (
            <article
              key={a.id}
              className="group snap-start shrink-0 w-[78vw] sm:w-[320px] relative rounded-[28px] overflow-hidden aspect-[3/4]"
            >
              <Image
                src={a.image}
                alt={a.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              <button
                onClick={() => toggleWishlist(a.id)}
                aria-label="Toggle wishlist"
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
              >
                <Heart
                  className={`h-4 w-4 ${isWishlisted(a.id) ? "fill-[#1E88E5] text-[#1E88E5]" : "text-[#1F2A2E]"}`}
                />
              </button>

              <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-[#1F2A2E] shadow-sm">
                <Star className="h-3 w-3 text-[#F4A93E] fill-[#F4A93E]" />
                {a.rating}
                <span className="text-[#64716F] font-medium">
                  ({a.reviewsCount.toLocaleString()})
                </span>
              </div>

              <div className="absolute bottom-5 left-5 right-5">
                <div className="flex items-center gap-1 text-white/90 text-[11px] font-bold uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5" />
                  {a.location}
                </div>
                <h3
                  className="text-white text-xl font-semibold leading-tight mt-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {a.name}
                </h3>
              </div>
            </article>
          ))}

          {destinations.length === 0 && (
            <div className="w-full py-16 text-center text-[#64716F] text-sm">
              No destinations in this category yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
