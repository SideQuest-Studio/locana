"use client";

import React from "react";
import Image from "next/image";
import { MapPin, Star, Heart, ArrowRight } from "lucide-react";
import { Attraction } from "@/src/lib/attractions";

interface DestinationCardProps {
  attraction: Attraction;
  onPlanTrip: (attraction: Attraction) => void;
  variant?: "grid" | "wide";
}

export default function DestinationCard({
  attraction,
  onPlanTrip,
  variant = "grid",
}: DestinationCardProps) {
  const [liked, setLiked] = React.useState(false);

  return (
    <article
      className={`group bg-white rounded-[28px] overflow-hidden border border-[#F0DFC2] shadow-[0_12px_30px_-16px_rgba(31,42,46,0.18)] hover:shadow-[0_28px_55px_-20px_rgba(31,42,46,0.28)] hover:-translate-y-2 transition-all duration-500 flex flex-col ${
        variant === "wide" ? "sm:flex-row" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${variant === "wide" ? "sm:w-2/5 aspect-[4/3] sm:aspect-auto" : "aspect-[4/3]"}`}
      >
        <Image
          src={attraction.image}
          alt={attraction.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {attraction.badge && (
          <span className="absolute top-4 left-4 bg-[#1E88E5] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
            {attraction.badge}
          </span>
        )}
        <button
          onClick={() => setLiked(v => !v)}
          aria-label="Save destination"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-colors hover:bg-white"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${liked ? "fill-[#1E88E5] text-[#1E88E5]" : "text-[#1F2A2E]"}`}
          />
        </button>
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-full text-[11px] font-bold text-[#1F2A2E] shadow-sm">
          <Star className="h-3 w-3 text-[#F4A93E] fill-[#F4A93E]" />
          {attraction.rating}
          <span className="text-[#64716F] font-medium">
            ({attraction.reviewsCount.toLocaleString()})
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 text-[#0E7C7B] text-[11px] font-bold uppercase tracking-wider">
          <MapPin className="h-3.5 w-3.5" />
          {attraction.location}
        </div>
        <h3
          className="text-lg font-semibold mt-2 leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {attraction.name}
        </h3>
        <p className="text-[13px] text-[#64716F] leading-relaxed mt-2 flex-1">
          {attraction.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {attraction.tags.slice(0, 2).map(t => (
            <span
              key={t}
              className="text-[10px] font-bold uppercase tracking-wide bg-[#FDECD2] text-[#B87A1B] px-2.5 py-1 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 pt-5 border-t border-dashed border-[#F0DFC2]">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64716F] block">
              From
            </span>
            <span
              className="text-xl font-semibold text-[#1F2A2E]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ₱{attraction.price.toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => onPlanTrip(attraction)}
            className="group/btn inline-flex items-center gap-1.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all hover:-translate-y-0.5 shadow-[0_8px_18px_-6px_rgba(30,136,229,0.5)]"
          >
            Plan This Trip
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
