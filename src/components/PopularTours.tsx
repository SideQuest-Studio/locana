"use client";

import React, { useState, useMemo } from "react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import DestinationCard from "@/src/components/ui/DestinationCard";
import { ATTRACTIONS } from "@/src/lib/attractions";
import { useBooking } from "@/src/context/BookingContext";
import { useReveal } from "@/src/hooks/useReveal";

const FILTERS = [
  { key: "all", label: "All Adventures" },
  { key: "beaches", label: "Beaches" },
  { key: "mountains", label: "Mountains" },
  { key: "waterfalls", label: "Waterfalls" },
  { key: "forests", label: "Rivers" },
];

export default function PopularTours() {
  const [active, setActive] = useState("all");
  const { planTrip } = useBooking();
  const revealRef = useReveal<HTMLDivElement>();

  const filtered = useMemo(
    () => ATTRACTIONS.filter(a => active === "all" || a.category === active),
    [active],
  );

  return (
    <section id="tours" className="py-20 sm:py-28 bg-[#FDECD2]/50 scroll-mt-20">
      <div ref={revealRef} className="max-w-400 mx-auto px-5 sm:px-8">
        <div className="reveal flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <SectionTitle
            eyebrow="Most-Loved"
            title="Popular adventures right now"
            subtitle="Hand-verified with regional councils. Every booking directly funds the community that hosts it."
            eyebrowColor="teal"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActive(f.key)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                  active === f.key
                    ? "bg-[#1F2A2E] text-white shadow-md"
                    : "bg-white border border-[#F0DFC2] text-[#64716F] hover:border-[#504aff] hover:text-[#714aff]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="reveal reveal-delay-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map(a => (
            <DestinationCard key={a.id} attraction={a} onPlanTrip={planTrip} />
          ))}
        </div>
      </div>
    </section>
  );
}
