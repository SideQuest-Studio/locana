"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  Building2,
  BedDouble,
  ChevronRight,
  TrendingUp,
  Star,
  Loader2,
} from "lucide-react";
import type { SearchResultItem, SearchResponse } from "@/src/types/search.types";

interface SearchBarProps {
  initialQuery?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
  onSearchChange?: (params: { q: string; checkIn: string; checkOut: string; guests: string }) => void;
  compact?: boolean;
}

export default function SearchBar({
  initialQuery = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = "",
  onSearchChange,
  compact = false,
}: SearchBarProps) {
  const router = useRouter();
  const [whereTo, setWhereTo] = useState(initialQuery);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [resultsMsg, setResultsMsg] = useState<string | null>(null);

  // Recommendations & live search state
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setWhereTo(initialQuery);
  }, [initialQuery]);

  // Fetch search recommendations from database API
  const fetchRecommendations = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error("Search fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWhereTo(val);
    setActiveIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchRecommendations(val);
    }, 180);
  };

  // Fetch initial popular recommendations on focus
  const handleFocus = () => {
    setIsOpen(true);
    if (!recommendations) {
      fetchRecommendations(whereTo);
    }
  };

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle select recommendation -> navigate to /search
  const handleSelect = (item: SearchResultItem) => {
    setWhereTo(item.title);
    setIsOpen(false);
    setActiveIndex(-1);

    const params = new URLSearchParams();
    if (item.title) params.set("q", item.title);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);
    if (item.type === "property" && item.propertyType) {
      params.set("type", item.propertyType);
    }
    if (item.areaName) {
      params.set("area", item.areaName);
    }

    if (onSearchChange) {
      onSearchChange({ q: item.title, checkIn, checkOut, guests });
    } else {
      router.push(`/search?${params.toString()}`);
    }
  };

  // Flat list of currently visible recommendations for keyboard navigation
  const currentItems: SearchResultItem[] = whereTo.trim()
    ? recommendations?.results || []
    : recommendations?.popular || [];

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || currentItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < currentItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : currentItems.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < currentItems.length) {
      e.preventDefault();
      handleSelect(currentItems[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setWhereTo("");
    fetchRecommendations("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);

    const params = new URLSearchParams();
    if (whereTo.trim()) params.set("q", whereTo.trim());
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);

    if (onSearchChange) {
      onSearchChange({ q: whereTo.trim(), checkIn, checkOut, guests });
    } else {
      router.push(`/search?${params.toString()}`);
    }
  };

  // Helper to render icon for type
  const renderTypeIcon = (type: SearchResultItem["type"]) => {
    switch (type) {
      case "property":
        return <Building2 className="h-4 w-4 text-[#005CE5]" />;
      case "room_type":
        return <BedDouble className="h-4 w-4 text-[#01864C]" />;
      case "area":
        return <MapPin className="h-4 w-4 text-[#ECBA59]" />;
      case "amenity":
        return <Sparkles className="h-4 w-4 text-[#FE5F01]" />;
      default:
        return <MapPin className="h-4 w-4 text-[#005CE5]" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* FIGMA EXACT MATCH SEARCH CONTAINER (Rectangle 81: #FFFFFF, radius: 10px) */}
      <div className="bg-white rounded-[10px] shadow-[0_12px_36px_-10px_rgba(1,35,78,0.18)] border border-[#E5E9F2] p-3 sm:p-3.5 transition-all">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:divide-x sm:divide-[#9197A8]/30"
        >
          {/* FIELD 1: WHERE TO? */}
          <div className="flex-1 relative flex items-center gap-3 px-4 sm:px-5 py-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full">
              <label className="text-[13px] font-semibold text-[#132555] tracking-tight">
                Where to?
              </label>
              <div className="flex items-center gap-1 w-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={whereTo}
                  onChange={handleInputChange}
                  onFocus={handleFocus}
                  onKeyDown={handleKeyDown}
                  placeholder="Search destinations, places..."
                  className="text-xs sm:text-[13px] font-medium text-[#132555] bg-transparent focus:outline-none placeholder-[#57617E] w-full"
                  autoComplete="off"
                />
                {isLoading && (
                  <Loader2 className="h-3.5 w-3.5 text-[#005CE5] animate-spin shrink-0" />
                )}
                {whereTo && !isLoading && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 rounded-full text-[#57617E] hover:text-[#132555] hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FIELD 2: CHECK-IN */}
          <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full">
              <label className="text-[13px] font-semibold text-[#132555] tracking-tight">
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="text-xs sm:text-[13px] font-medium text-[#132555] bg-transparent focus:outline-none w-full"
              />
            </div>
          </div>

          {/* FIELD 3: CHECK-OUT */}
          <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full">
              <label className="text-[13px] font-semibold text-[#132555] tracking-tight">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="text-xs sm:text-[13px] font-medium text-[#132555] bg-transparent focus:outline-none w-full"
              />
            </div>
          </div>

          {/* FIELD 4: GUESTS */}
          <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full">
              <label className="text-[13px] font-semibold text-[#132555] tracking-tight">
                Guests
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                placeholder="Add guests"
                className="text-xs sm:text-[13px] font-medium text-[#132555] bg-transparent focus:outline-none placeholder-[#57617E] w-full"
              />
            </div>
          </div>

          {/* SEARCH BUTTON (Rectangle 82: #05326B, radius: 10px) */}
          <div className="p-1 sm:pl-3">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#05326B] hover:bg-[#01234E] active:bg-[#031d40] text-white rounded-[10px] px-8 py-3.5 text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* FEEDBACK MSG */}
      {resultsMsg && (
        <div className="mt-3 px-4 py-2.5 bg-[#01864C]/10 border border-[#01864C]/20 text-[#01864C] text-xs font-semibold rounded-[10px] flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#01864C]" />
          <span>{resultsMsg}</span>
        </div>
      )}

      {/* LIVE RECOMMENDATIONS DROPDOWN POPOVER */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 z-50 bg-white rounded-[14px] shadow-[0_20px_50px_-10px_rgba(1,35,78,0.2)] border border-[#E5E9F2] overflow-hidden animate-fadeIn">
          {/* Header Bar */}
          <div className="px-5 py-3 bg-[#F8FAFD] border-b border-[#E5E9F2] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#132555]">
              <TrendingUp className="h-3.5 w-3.5 text-[#005CE5]" />
              <span>
                {whereTo.trim()
                  ? `Database Recommendations for "${whereTo}"`
                  : "Popular in Quezon Province"}
              </span>
            </div>
            {whereTo.trim() && recommendations && (
              <span className="text-[11px] font-semibold text-[#57617E]">
                {recommendations.total} {recommendations.total === 1 ? "match" : "matches"}
              </span>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F0F4FA] p-2">
            {/* Quick Pills for Empty Query */}
            {!whereTo.trim() && (
              <div className="p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#57617E] mb-2 px-1">
                  Explore by Municipality
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    "Lucena City",
                    "Lucban",
                    "Tayabas",
                    "Pagbilao",
                    "Infanta & Real",
                    "Sariaya",
                    "Dolores",
                  ].map((town) => (
                    <button
                      key={town}
                      type="button"
                      onClick={() => {
                        setWhereTo(town);
                        fetchRecommendations(town);
                        inputRef.current?.focus();
                      }}
                      className="px-3.5 py-1.5 rounded-[8px] bg-[#F8FAFD] hover:bg-[#EBF2FC] border border-[#E5E9F2] text-xs font-semibold text-[#132555] transition-all hover:scale-105 cursor-pointer"
                    >
                      📍 {town}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Category Groups if Query Typed */}
            {whereTo.trim() ? (
              <>
                {/* 1. Towns & Areas */}
                {recommendations?.categories.areas &&
                  recommendations.categories.areas.length > 0 && (
                    <div className="py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-3 py-1">
                        Towns & Municipalities
                      </p>
                      {recommendations.categories.areas.map((item) => (
                        <RecommendationRow
                          key={item.id}
                          item={item}
                          onSelect={handleSelect}
                          renderTypeIcon={renderTypeIcon}
                        />
                      ))}
                    </div>
                  )}

                {/* 2. Properties & Resorts */}
                {recommendations?.categories.properties &&
                  recommendations.categories.properties.length > 0 && (
                    <div className="py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-3 py-1">
                        Resorts & Hotels
                      </p>
                      {recommendations.categories.properties.map((item) => (
                        <RecommendationRow
                          key={item.id}
                          item={item}
                          onSelect={handleSelect}
                          renderTypeIcon={renderTypeIcon}
                        />
                      ))}
                    </div>
                  )}

                {/* 3. Room Types */}
                {recommendations?.categories.rooms &&
                  recommendations.categories.rooms.length > 0 && (
                    <div className="py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-3 py-1">
                        Room Types & Stays
                      </p>
                      {recommendations.categories.rooms.map((item) => (
                        <RecommendationRow
                          key={item.id}
                          item={item}
                          onSelect={handleSelect}
                          renderTypeIcon={renderTypeIcon}
                        />
                      ))}
                    </div>
                  )}

                {/* 4. Amenities & Tags */}
                {recommendations?.categories.amenities &&
                  recommendations.categories.amenities.length > 0 && (
                    <div className="py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-3 py-1">
                        Experiences & Amenities
                      </p>
                      {recommendations.categories.amenities.map((item) => (
                        <RecommendationRow
                          key={item.id}
                          item={item}
                          onSelect={handleSelect}
                          renderTypeIcon={renderTypeIcon}
                        />
                      ))}
                    </div>
                  )}

                {/* No Matches Found */}
                {recommendations && recommendations.results.length === 0 && (
                  <div className="py-8 text-center px-4">
                    <p className="text-sm font-semibold text-[#132555]">
                      No exact match for &ldquo;{whereTo}&rdquo;
                    </p>
                    <p className="text-xs text-[#57617E] mt-1">
                      Try searching for towns like <strong>Lucban</strong>, <strong>Tayabas</strong>,{" "}
                      <strong>Pagbilao</strong>, or keywords like <strong>Resort</strong>, <strong>Villa</strong>, or <strong>Pool</strong>.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Popular Recommendations List when query is empty */
              <div className="py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-3 py-1">
                  Featured Recommendations
                </p>
                {recommendations?.popular.map((item) => (
                  <RecommendationRow
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                    renderTypeIcon={renderTypeIcon}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="px-5 py-2.5 bg-[#F8FAFD] border-t border-[#E5E9F2] flex items-center justify-between text-[11px] text-[#57617E]">
            <span>Click any recommendation to explore available dates</span>
            <span className="font-semibold text-[#005CE5]">Instant Booking</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual recommendation row item
function RecommendationRow({
  item,
  onSelect,
  renderTypeIcon,
}: {
  item: SearchResultItem;
  onSelect: (item: SearchResultItem) => void;
  renderTypeIcon: (type: SearchResultItem["type"]) => React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full text-left p-2.5 sm:p-3 rounded-[10px] hover:bg-[#F8FAFD] hover:shadow-xs transition-all flex items-center gap-3 group cursor-pointer"
    >
      {/* Thumbnail or Icon Box */}
      {item.image ? (
        <div className="relative w-12 h-12 rounded-[8px] overflow-hidden shrink-0 border border-[#E5E9F2] bg-gray-100">
          <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform" />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-[8px] bg-[#F0F4FA] border border-[#E5E9F2] flex items-center justify-center shrink-0">
          {renderTypeIcon(item.type)}
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#132555] truncate group-hover:text-[#005CE5] transition-colors">
            {item.title}
          </span>
          {item.badge && (
            <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#005CE5]/10 text-[#005CE5] shrink-0">
              {item.badge}
            </span>
          )}
          {item.rating && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#132555] shrink-0 ml-auto sm:ml-0">
              <Star className="h-3 w-3 text-[#ECBA59] fill-[#ECBA59]" />
              {item.rating}
            </span>
          )}
        </div>

        <p className="text-xs text-[#57617E] truncate mt-0.5">
          {item.subtitle || item.location}
        </p>
      </div>

      {/* Price or Action Arrow */}
      <div className="text-right shrink-0 flex items-center gap-1.5">
        {item.price && (
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-[#01864C]">
              ₱{item.price.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#57617E] block">/night</span>
          </div>
        )}
        <ChevronRight className="h-4 w-4 text-[#9197A8] group-hover:text-[#005CE5] group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}
