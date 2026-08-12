"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Star,
  Heart,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  BedDouble,
  Check,
} from "lucide-react";
import type { SearchResultItem } from "@/src/types/search.types";
import { useWishlist } from "@/src/context/WishlistContext";

export interface SearchPropertyCardProps {
  property: SearchResultItem;
  viewMode?: "grid" | "list";
  nights?: number;
  onSelectProperty: (property: SearchResultItem) => void;
}

export function SearchPropertyCard({
  property,
  viewMode = "grid",
  nights = 1,
  onSelectProperty,
}: SearchPropertyCardProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [imageIndex, setImageIndex] = useState(0);

  const images = property.images && property.images.length > 0
    ? property.images
    : [property.image || "/hero.jpg"];

  const currentPrice = property.price || 3000;
  const totalPrice = currentPrice * nights;
  const downpayment = Math.round(totalPrice * 0.3);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // GRID VIEW CARD
  if (viewMode === "grid") {
    return (
      <article
        onClick={() => onSelectProperty(property)}
        className="group bg-white rounded-2xl overflow-hidden border border-[#E5E9F2] hover:border-[#005CE5]/40 hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
      >
        {/* Photo Container */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            src={images[imageIndex]}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

          {/* Carousel Arrows if multiple images */}
          {images.length > 1 && (
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={prevImage}
                className="w-7 h-7 rounded-full bg-white/90 text-[#132555] flex items-center justify-center shadow-md hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="w-7 h-7 rounded-full bg-white/90 text-[#132555] flex items-center justify-center shadow-md hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/95 backdrop-blur-md text-[#132555] shadow-xs">
              {property.badge || "Resort"}
            </span>
            {property.featured && (
              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#05326B] text-white shadow-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Featured
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(property.id, property.title);
            }}
            aria-label="Wishlist"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#132555] hover:bg-white transition-all shadow-xs"
          >
            <Heart
              className={`h-4 w-4 ${
                isWishlisted(property.id)
                  ? "fill-[#005CE5] text-[#005CE5]"
                  : "text-[#132555]"
              }`}
            />
          </button>

          {/* Location Bar */}
          <div className="absolute bottom-2.5 left-3 right-3 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 text-white/90 truncate">
              <MapPin className="h-3.5 w-3.5 text-[#ECBA59] shrink-0" />
              {property.areaName || property.location}
            </p>
          </div>
        </div>

        {/* Details Container */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Rating & Partner Info */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1 text-xs font-bold text-[#132555]">
                <Star className="h-3.5 w-3.5 text-[#ECBA59] fill-[#ECBA59]" />
                <span>{property.rating || 4.9}</span>
                <span className="text-[#57617E] font-normal">
                  ({(property.reviewsCount || 120).toLocaleString()})
                </span>
              </div>
              {property.partnerName && (
                <span className="text-[10px] font-bold text-[#01864C] truncate max-w-[130px]">
                  ✓ {property.partnerName}
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className="text-base font-bold text-[#132555] group-hover:text-[#005CE5] transition-colors line-clamp-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {property.title}
            </h3>

            {/* Subtitle */}
            <p className="text-xs text-[#57617E] line-clamp-2 mt-1 leading-relaxed">
              {property.subtitle}
            </p>

            {/* Amenities Pills */}
            {property.amenities && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {property.amenities.slice(0, 3).map((am) => (
                  <span
                    key={am}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0F4FA] text-[#57617E]"
                  >
                    {am}
                  </span>
                ))}
                {property.amenities.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F0F4FA] text-[#57617E]">
                    +{property.amenities.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Price & Action */}
          <div className="mt-4 pt-3 border-t border-[#F0F4FA] flex items-end justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-[#01864C]">
                  ₱{currentPrice.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#57617E]">/ night</span>
              </div>
              <p className="text-[10px] text-[#57617E] mt-0.5">
                ₱{downpayment.toLocaleString()} downpayment
              </p>
            </div>

            <button
              type="button"
              className="px-3.5 py-2 bg-[#05326B] group-hover:bg-[#01234E] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>View Stays</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  // LIST VIEW CARD (Horizontal Row)
  return (
    <article
      onClick={() => onSelectProperty(property)}
      className="group bg-white rounded-2xl overflow-hidden border border-[#E5E9F2] hover:border-[#005CE5]/40 hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row cursor-pointer"
    >
      {/* Left Photo */}
      <div className="relative w-full sm:w-72 aspect-[16/10] sm:aspect-auto shrink-0 bg-gray-100 overflow-hidden">
        <Image
          src={images[imageIndex]}
          alt={property.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        {/* Wishlist */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(property.id, property.title);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#132555] hover:bg-white shadow-xs transition-all"
        >
          <Heart
            className={`h-4 w-4 ${
              isWishlisted(property.id)
                ? "fill-[#005CE5] text-[#005CE5]"
                : "text-[#132555]"
            }`}
          />
        </button>

        <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/95 text-[#132555]">
          {property.badge || "Resort"}
        </span>
      </div>

      {/* Middle Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#57617E]">
              <MapPin className="h-3.5 w-3.5 text-[#005CE5]" />
              <span className="font-semibold">{property.areaName || property.location}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-[#132555]">
              <Star className="h-3.5 w-3.5 text-[#ECBA59] fill-[#ECBA59]" />
              <span>{property.rating || 4.9}</span>
              <span className="text-[#57617E] font-normal">
                ({(property.reviewsCount || 120).toLocaleString()})
              </span>
            </div>
          </div>

          <h3
            className="text-lg font-bold text-[#132555] group-hover:text-[#005CE5] transition-colors mt-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {property.title}
          </h3>

          <p className="text-xs text-[#57617E] line-clamp-2 mt-1.5 leading-relaxed">
            {property.subtitle}
          </p>

          {/* Highlights */}
          {property.highlights && (
            <div className="mt-3 space-y-1">
              {property.highlights.slice(0, 2).map((hl) => (
                <div key={hl} className="flex items-center gap-1.5 text-[11px] text-[#132555]">
                  <Check className="h-3 w-3 text-[#01864C] shrink-0" />
                  <span className="truncate">{hl}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Amenity Pills */}
        {property.amenities && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#F0F4FA]">
            {property.amenities.slice(0, 4).map((am) => (
              <span
                key={am}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F8FAFD] text-[#57617E] border border-[#E5E9F2]"
              >
                {am}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right Pricing & CTA */}
      <div className="p-5 bg-[#F8FAFD] border-t sm:border-t-0 sm:border-l border-[#E5E9F2] flex flex-col justify-between items-end sm:min-w-[180px]">
        <div className="text-right w-full">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] block">
            Nightly Rate
          </span>
          <div className="text-xl font-extrabold text-[#01864C] mt-0.5">
            ₱{currentPrice.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#57617E]">Excl. taxes & fees</span>

          <div className="mt-2 pt-2 border-t border-[#E5E9F2] text-[11px] text-[#132555]">
            <span className="font-bold text-[#05326B]">
              ₱{downpayment.toLocaleString()}
            </span>{" "}
            due today (30%)
          </div>
        </div>

        <button
          type="button"
          className="w-full mt-4 py-2.5 px-4 bg-[#05326B] group-hover:bg-[#01234E] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Reserve</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
