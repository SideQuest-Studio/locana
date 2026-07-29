"use client";

import React, { useState } from "react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import { CATEGORIES, type CategoryKey } from "../lib/categories";
import { useReveal } from "@/src/hooks/useReveal";

interface CategorySectionProps {
  onSelectCategory: (key: CategoryKey) => void;
}

export default function CategorySection({ onSelectCategory }: CategorySectionProps) {
  const [active, setActive] = useState<CategoryKey | null>(null);
  const [eventsNotice, setEventsNotice] = useState(false);
  const revealRef = useReveal<HTMLDivElement>();

  const handleClick = (key: CategoryKey) => {
    if (key === "events") {
      setEventsNotice(true);
      setTimeout(() => setEventsNotice(false), 4000);
      return;
    }
    setActive(prev => (prev === key ? null : key));
    onSelectCategory(key);
  };

  return (
    <section id="categories" className="py-16 sm:py-20 scroll-mt-20">
      <div ref={revealRef} className="max-w-400 mx-auto px-5 sm:px-8">
        <div className="reveal mb-10">
          <SectionTitle
            eyebrow="Browse"
            title="Explore by Category"
            subtitle="Whether it's a place to stay, a place to see, or something to do — start here."
            eyebrowColor="teal"
          />
        </div>

        <div className="reveal reveal-delay-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {CATEGORIES.map(({ key, label, desc, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => handleClick(key)}
                className={`flex flex-col items-center text-center gap-3 rounded-2xl border p-5 transition-all ${
                  isActive
                    ? "border-[#1E88E5] bg-[#1E88E5]/5"
                    : "border-[#F0DFC2] bg-white hover:border-[#1E88E5]/40 hover:-translate-y-0.5"
                }`}
              >
                <div
                  className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? "bg-[#1E88E5] text-white" : "bg-[#FDECD2] text-[#B87A1B]"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1F2A2E]">{label}</div>
                  <div className="text-[11px] text-[#64716F] mt-0.5 leading-snug">{desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {eventsNotice && (
          <div className="reveal mt-4 px-4 py-3 bg-[#FDECD2]/70 border border-[#F0DFC2] text-[#B87A1B] text-sm rounded-2xl">
            Events are coming soon — check back for festivals, concerts, and local happenings.
          </div>
        )}
      </div>
    </section>
  );
}
