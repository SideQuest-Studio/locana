"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Building2, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { getWishlistPropertiesAction } from "@/src/actions/customer/wishlist";
import { useWishlist } from "@/src/context/WishlistContext";
import { SearchPropertyCard } from "@/src/components/search/search-property-card";
import type { SearchResultItem } from "@/src/types/search.types";

export default function WishlistPage() {
  const { wishlist, refreshWishlist } = useWishlist();
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWishlist = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.error("Failed to load wishlist page data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [wishlist.size]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E9F2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#132555]">Saved Stays &amp; Wishlist</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#05326B]/10 text-[#05326B]">
              {items.length} {items.length === 1 ? "saved stay" : "saved stays"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#57617E] mt-1">
            Properties in Quezon Province you saved to your account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWishlist}
            className="p-2 rounded-xl border border-[#E5E9F2] bg-white hover:bg-[#F8FAFD] text-[#57617E] hover:text-[#132555] transition-colors"
            title="Refresh Wishlist"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-[#005CE5]" : ""}`} />
          </button>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold shadow-xs transition-all"
          >
            <span>Explore More Stays</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl p-4 border border-[#E5E9F2] animate-pulse space-y-3"
            >
              <div className="w-full aspect-[4/3] bg-gray-200 rounded-xl" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Wishlist Items Grid */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((property) => (
            <SearchPropertyCard
              key={property.id}
              property={property}
              viewMode="grid"
              onSelectProperty={(p) => {
                window.location.href = `/search?q=${encodeURIComponent(p.title)}`;
              }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#E5E9F2] bg-white p-12 text-center max-w-lg mx-auto my-8 space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#005CE5]/10 text-[#005CE5] flex items-center justify-center mx-auto">
            <Heart className="h-7 w-7 text-[#005CE5]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#132555]">Your wishlist is currently empty</h3>
            <p className="text-xs sm:text-sm text-[#57617E] mt-1.5 leading-relaxed">
              Explore Quezon Province&apos;s best eco-resorts, heritage hotels, and beach cabins.
              Click the heart icon on any stay to save it here for later.
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span>Start Exploring Stays</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
