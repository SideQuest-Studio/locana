"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  MapPin,
  Building2,
  BedDouble,
  Sparkles,
  TrendingUp,
  Star,
  ChevronRight,
  Loader2,
  X,
  Compass,
} from "lucide-react";
import type { SearchResultItem, SearchResponse } from "@/src/types/search.types";

export interface Group73DestinationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: SearchResultItem) => void;
  onClose?: () => void;
  standalone?: boolean;
}

const POPULAR_QUEZON_TOWNS = [
  { name: "Lucban", icon: "🌾", tag: "Heritage & Pahiyas" },
  { name: "Lucena City", icon: "🏙️", tag: "Provincial Capital" },
  { name: "Tayabas", icon: "🏛️", tag: "Historic Bridges" },
  { name: "Pagbilao", icon: "🏖️", tag: "Puting Buhangin Beach" },
  { name: "Infanta & Real", icon: "🏄", tag: "Pacific Surfing" },
  { name: "Sariaya", icon: "🏡", tag: "Ancestral & Eco-farm" },
  { name: "Dolores", icon: "⛰️", tag: "Mt. Banahaw Springs" },
  { name: "Tiaong", icon: "🌿", tag: "Nature & Lake Escapes" },
];

export function Group73DestinationSelector({
  value,
  onChange,
  onSelect,
  onClose,
  standalone = false,
}: Group73DestinationSelectorProps) {
  const [recommendations, setRecommendations] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = async (q: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error("Failed to fetch destinations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(value);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val);
    }, 160);
  };

  const handleTownClick = (townName: string) => {
    onChange(townName);
    fetchResults(townName);
    const mockItem: SearchResultItem = {
      id: `town-${townName.toLowerCase().replace(/\s+/g, "-")}`,
      type: "area",
      title: townName,
      subtitle: `Explore stays in ${townName}, Quezon`,
      location: `${townName}, Quezon`,
      areaName: townName,
    };
    onSelect(mockItem);
  };

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
        return <Compass className="h-4 w-4 text-[#005CE5]" />;
    }
  };

  return (
    <div
      className={`bg-white rounded-[14px] shadow-[0_20px_50px_-10px_rgba(1,35,78,0.22)] border border-[#E5E9F2] overflow-hidden ${
        standalone ? "w-full max-w-xl mx-auto" : "w-full"
      }`}
    >
      {/* Figma Header Bar */}
      <div className="px-5 py-3.5 bg-[#F8FAFD] border-b border-[#E5E9F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#005CE5]/10 flex items-center justify-center">
            <Compass className="h-3.5 w-3.5 text-[#005CE5]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#132555] tracking-tight">
              {value.trim() ? `Search results for "${value}"` : "Where to in Quezon Province?"}
            </h4>
            <p className="text-[10px] text-[#57617E]">
              {value.trim()
                ? `${recommendations?.total || 0} matching destinations & stays`
                : "Select a municipality or popular nature resort"}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#57617E] hover:text-[#132555] hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Internal Search Input for Direct Navigation */}
      <div className="p-3 border-b border-[#F0F4FA] bg-white">
        <div className="relative flex items-center">
          <MapPin className="absolute left-3 h-4 w-4 text-[#05326B] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder="Search municipality, resort name, or keyword..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-[13px] font-medium text-[#132555] bg-[#F8FAFD] border border-[#E5E9F2] rounded-lg focus:outline-none focus:border-[#005CE5] focus:bg-white transition-all placeholder-[#9197A8]"
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 h-3.5 w-3.5 text-[#005CE5] animate-spin" />
          ) : (
            value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  fetchResults("");
                }}
                className="absolute right-2.5 p-1 rounded-full text-[#57617E] hover:text-[#132555]"
              >
                <X className="h-3 w-3" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F0F4FA] p-3 space-y-3">
        {/* SECTION 1: Explore by Municipality */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#57617E]">
              Municipalities in Quezon
            </span>
            <span className="text-[10px] text-[#005CE5] font-semibold">Instant Book</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {POPULAR_QUEZON_TOWNS.map((town) => {
              const isSelected = value.toLowerCase() === town.name.toLowerCase();
              return (
                <button
                  key={town.name}
                  type="button"
                  onClick={() => handleTownClick(town.name)}
                  className={`flex flex-col items-start p-2.5 rounded-[10px] border transition-all text-left group cursor-pointer ${
                    isSelected
                      ? "border-[#005CE5] bg-[#EBF2FC]"
                      : "border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] hover:border-[#005CE5]/30 hover:scale-[1.02]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="text-sm">{town.icon}</span>
                    <span className="text-xs font-bold text-[#132555] truncate group-hover:text-[#005CE5] transition-colors">
                      {town.name}
                    </span>
                  </div>
                  <span className="text-[9px] font-medium text-[#57617E] truncate w-full mt-1">
                    {town.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Dynamic Category Results or Popular Stays */}
        {value.trim() ? (
          <div className="pt-3 space-y-3">
            {/* Resorts & Hotels */}
            {recommendations?.categories.properties && recommendations.categories.properties.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-1 mb-1.5">
                  Resorts & Hotels
                </p>
                <div className="space-y-1">
                  {recommendations.categories.properties.map((item) => (
                    <RecommendationItemRow
                      key={item.id}
                      item={item}
                      onSelect={onSelect}
                      renderTypeIcon={renderTypeIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Room Types */}
            {recommendations?.categories.rooms && recommendations.categories.rooms.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-1 mb-1.5">
                  Room Types & Accommodations
                </p>
                <div className="space-y-1">
                  {recommendations.categories.rooms.map((item) => (
                    <RecommendationItemRow
                      key={item.id}
                      item={item}
                      onSelect={onSelect}
                      renderTypeIcon={renderTypeIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Amenities & Attractions */}
            {recommendations?.categories.amenities && recommendations.categories.amenities.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#57617E] px-1 mb-1.5">
                  Experiences & Amenities
                </p>
                <div className="space-y-1">
                  {recommendations.categories.amenities.map((item) => (
                    <RecommendationItemRow
                      key={item.id}
                      item={item}
                      onSelect={onSelect}
                      renderTypeIcon={renderTypeIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {recommendations && recommendations.results.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-xs font-semibold text-[#132555]">
                  No exact match for &ldquo;{value}&rdquo;
                </p>
                <p className="text-[11px] text-[#57617E] mt-1">
                  Try towns like <strong>Lucban</strong>, <strong>Tayabas</strong>, <strong>Lucena</strong>, or <strong>Pagbilao</strong>.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#57617E]">
                Featured Quezon Stays
              </span>
              <span className="text-[10px] text-[#57617E]">Verified Partners</span>
            </div>

            <div className="space-y-1.5">
              {recommendations?.popular.slice(0, 4).map((item) => (
                <RecommendationItemRow
                  key={item.id}
                  item={item}
                  onSelect={onSelect}
                  renderTypeIcon={renderTypeIcon}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2.5 bg-[#F8FAFD] border-t border-[#E5E9F2] flex items-center justify-between text-[11px] text-[#57617E]">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-[#005CE5]" />
          Instant reservation with 30% downpayment
        </span>
        <span className="font-bold text-[#005CE5]">Quezon, PH</span>
      </div>
    </div>
  );
}

function RecommendationItemRow({
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
      className="w-full text-left p-2 rounded-[10px] hover:bg-[#F8FAFD] border border-transparent hover:border-[#E5E9F2] transition-all flex items-center gap-3 group cursor-pointer"
    >
      {item.image ? (
        <div className="relative w-11 h-11 rounded-[8px] overflow-hidden shrink-0 border border-[#E5E9F2] bg-gray-100">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-[8px] bg-[#F0F4FA] border border-[#E5E9F2] flex items-center justify-center shrink-0">
          {renderTypeIcon(item.type)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#132555] truncate group-hover:text-[#005CE5] transition-colors">
            {item.title}
          </span>
          {item.badge && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#005CE5]/10 text-[#005CE5] shrink-0">
              {item.badge}
            </span>
          )}
          {item.rating && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#132555] shrink-0 ml-auto">
              <Star className="h-3 w-3 text-[#ECBA59] fill-[#ECBA59]" />
              {item.rating}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#57617E] truncate mt-0.5">
          {item.subtitle || item.location}
        </p>
      </div>

      <div className="text-right shrink-0 flex items-center gap-1.5 pl-2">
        {item.price && (
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-[#01864C]">
              ₱{item.price.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#57617E] block">/night</span>
          </div>
        )}
        <ChevronRight className="h-4 w-4 text-[#9197A8] group-hover:text-[#005CE5] group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}
