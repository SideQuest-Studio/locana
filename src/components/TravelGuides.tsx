"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import { GUIDES } from "@/src/lib/guides";
import { useReveal } from "@/src/hooks/useReveal";

export default function TravelGuides() {
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <section id="guides" className="py-20 sm:py-28 scroll-mt-20">
      <div ref={revealRef} className="max-w-400 mx-auto px-5 sm:px-8">
        <div className="reveal mb-10">
          <SectionTitle
            eyebrow="Read Up"
            title="Travel Guides"
            subtitle="Practical, locally-sourced guides for planning your trip around the Philippines."
            eyebrowColor="blue"
          />
        </div>

        <div className="reveal reveal-delay-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GUIDES.map(guide => (
            <article
              key={guide.id}
              className="bg-white rounded-[28px] overflow-hidden border border-[#F0DFC2] shadow-[0_12px_30px_-16px_rgba(31,42,46,0.18)] hover:shadow-[0_28px_55px_-20px_rgba(31,42,46,0.28)] hover:-translate-y-2 transition-all duration-500 flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1E88E5]/15 to-[#0E7C7B]/25 flex items-center justify-center">
                <BookOpen className="h-9 w-9 text-[#0E7C7B]" strokeWidth={1.5} />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3
                  className="text-sm font-semibold leading-snug flex-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {guide.title}
                </h3>
                <p className="text-xs text-[#A8AD9C] mt-3">
                  {guide.date} &middot; {guide.readTime}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
