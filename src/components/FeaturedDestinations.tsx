"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import { ATTRACTIONS } from "@/src/lib/attractions";
import { useReveal } from "@/src/hooks/useReveal";

export default function FeaturedDestinations() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const revealRef = useReveal<HTMLDivElement>();

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
                Discover your <br className="hidden sm:block" /> next escape
              </>
            }
            subtitle="Every preserve is capped at strict daily visitor counts, so the view stays this good for the next traveler too."
            eyebrowColor="gold"
          />
          <div className="flex gap-2 self-start sm:self-end">
            <button
              onClick={() => scroll(-1)}
              className="w-12 h-12 rounded-full bg-white border border-[#c2c8f0] flex items-center justify-center hover:bg-[#9fbbf6] transition-colors shadow-sm"
              aria-label="Scroll left"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-12 h-12 rounded-full bg-[#594aff] text-white flex items-center justify-center hover:bg-[#3437d5] transition-colors shadow-[0_8px_20px_-6px_rgba(255,107,74,0.5)]"
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
          {ATTRACTIONS.map(a => (
            <a
              key={a.id}
              href="#tours"
              className="group snap-start shrink-0 w-[78vw] sm:w-[320px] relative rounded-[28px] overflow-hidden aspect-[3/4]"
            >
              <Image
                src={a.image}
                alt={a.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute top-4 left-4 flex items-center gap-1 text-white/90 text-[11px] font-bold uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5" />
                {a.categoryLabel}
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <h3
                  className="text-white text-xl font-semibold leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {a.location}
                </h3>
                <p className="text-white/70 text-xs mt-1.5 line-clamp-2">{a.description}</p>
                <span className="inline-flex items-center gap-1 mt-3 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
