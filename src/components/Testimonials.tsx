"use client";

import React, { useState } from "react";
import { Star, ArrowLeft, ArrowRight, Quote } from "lucide-react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import { TESTIMONIALS } from "@/src/lib/attractions";
import { useReveal } from "@/src/hooks/useReveal";

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const revealRef = useReveal<HTMLDivElement>();

  const next = () => setIndex(i => (i + 1) % TESTIMONIALS.length);
  const prev = () => setIndex(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section
      id="reviews"
      className="py-20 sm:py-28 bg-[#0E7C7B] relative overflow-hidden scroll-mt-20"
    >
      <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full bg-white/5 spin-slow" />
      <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-[#F4A93E]/10" />

      <div ref={revealRef} className="max-w-4xl mx-auto px-5 sm:px-8 relative text-center">
        <div className="reveal">
          <SectionTitle
            eyebrow="Traveler Stories"
            title="Loved by explorers everywhere"
            align="center"
            eyebrowColor="white"
            light
          />
        </div>

        <div className="reveal reveal-delay-1 bg-white rounded-[32px] p-8 sm:p-12 mt-10 shadow-2xl">
          <Quote className="h-9 w-9 text-[#1E88E5]/30 mx-auto mb-4" />
          <div className="flex justify-center gap-1 mb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 text-[#F4A93E] fill-[#F4A93E]" />
            ))}
          </div>
          <p
            key={index}
            className="text-lg sm:text-2xl leading-snug text-[#1F2A2E] max-w-2xl mx-auto pop-in"
            style={{ fontFamily: "var(--font-display)" }}
          >
            &ldquo;{TESTIMONIALS[index].quote}&rdquo;
          </p>
          <div className="flex items-center justify-center gap-3 mt-7">
            <div className="w-11 h-11 rounded-full bg-[#FDECD2] text-[#B87A1B] flex items-center justify-center font-bold text-sm">
              {TESTIMONIALS[index].initials}
            </div>
            <div className="text-left">
              <div className="font-bold text-sm text-[#1F2A2E]">
                {TESTIMONIALS[index].name}
              </div>
              <div className="text-xs text-[#64716F]">{TESTIMONIALS[index].loc}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prev}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            aria-label="Previous"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/40"}`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            aria-label="Next"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
