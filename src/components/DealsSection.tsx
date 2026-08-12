"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { MapPin, Heart } from "lucide-react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import { ATTRACTIONS } from "../lib/attractions";
import { useReveal } from "@/src/hooks/useReveal";
import { useWishlist } from "@/src/context/WishlistContext";

export default function DealsSection() {
  const revealRef = useReveal<HTMLDivElement>();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { isWishlisted, toggleWishlist } = useWishlist();

  const deals = ATTRACTIONS.filter(a => a.dealDiscountPercent);

  return (
    <section id="deals" className="py-20 sm:py-28 bg-[#FDECD2]/50 scroll-mt-20">
      <div ref={revealRef} className="max-w-400 mx-auto px-5 sm:px-8">
        <div className="reveal mb-10">
          <SectionTitle
            eyebrow="Limited Time"
            title="Top Deals"
            subtitle="Discounted stays and experiences, still capped by the same community quotas."
            eyebrowColor="gold"
          />
        </div>

        <div
          ref={sectionRef}
          className="reveal reveal-delay-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {deals.map(deal => (
            <article
              key={deal.id}
              className="bg-white rounded-[28px] overflow-hidden border border-[#F0DFC2] shadow-[0_12px_30px_-16px_rgba(31,42,46,0.18)] hover:shadow-[0_28px_55px_-20px_rgba(31,42,46,0.28)] hover:-translate-y-2 transition-all duration-500 flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={deal.image} alt={deal.name} fill className="object-cover" />
                <span className="absolute top-4 left-4 bg-[#1F2A2E] text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full">
                  {deal.dealDiscountPercent}% off
                </span>
                <button
                  onClick={() => toggleWishlist(deal.id, deal.name)}
                  aria-label="Toggle wishlist"
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-xs"
                >
                  <Heart
                    className={`h-4 w-4 ${isWishlisted(deal.id) ? "fill-[#005CE5] text-[#005CE5]" : "text-[#1F2A2E]"}`}
                  />
                </button>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 text-[#0E7C7B] text-[11px] font-bold uppercase tracking-wider">
                  <MapPin className="h-3.5 w-3.5" />
                  {deal.location}
                </div>
                <h3
                  className="text-base font-semibold mt-2 leading-snug"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {deal.name}
                </h3>

                <div className="mt-4 pt-4 border-t border-dashed border-[#F0DFC2] flex items-baseline gap-2">
                  <span
                    className="text-lg font-semibold text-[#1F2A2E]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    ₱
                    {Math.round(
                      deal.price * (1 - (deal.dealDiscountPercent ?? 0) / 100),
                    ).toLocaleString()}
                  </span>
                  <span className="text-xs text-[#A8AD9C] line-through">
                    ₱{deal.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#64716F]">/ {deal.dealUnit}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
