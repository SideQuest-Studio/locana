"use client";

import React from "react";
import {
  LayoutGrid,
  List,
  Map,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Calendar,
  Users,
} from "lucide-react";
import type { SearchFilterState } from "./search-filters-sidebar";

export type ViewMode = "grid" | "list" | "map";

export interface SearchResultsToolbarProps {
  totalCount: number;
  filteredCount: number;
  query?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  filters: SearchFilterState;
  onRemoveFilter: (key: keyof SearchFilterState, value?: string) => void;
  onResetAll: () => void;
  onOpenMobileFilters: () => void;
  nights?: number;
}

export function SearchResultsToolbar({
  totalCount,
  filteredCount,
  query,
  checkIn,
  checkOut,
  guests,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  filters,
  onRemoveFilter,
  onResetAll,
  onOpenMobileFilters,
  nights = 1,
}: SearchResultsToolbarProps) {
  // Collect active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];

  if (filters.selectedTypes.length > 0) {
    filters.selectedTypes.forEach((t) => {
      activeChips.push({
        label: `Type: ${t.charAt(0).toUpperCase() + t.slice(1)}`,
        onRemove: () => onRemoveFilter("selectedTypes", t),
      });
    });
  }

  if (filters.selectedAreas.length > 0) {
    filters.selectedAreas.forEach((area) => {
      activeChips.push({
        label: `📍 ${area}`,
        onRemove: () => onRemoveFilter("selectedAreas", area),
      });
    });
  }

  if (filters.minPrice > 0 || filters.maxPrice < 15000) {
    activeChips.push({
      label: `₱${filters.minPrice.toLocaleString()} - ₱${filters.maxPrice.toLocaleString()}`,
      onRemove: () => onRemoveFilter("minPrice"),
    });
  }

  if (filters.minRating > 0) {
    activeChips.push({
      label: `⭐ ${filters.minRating}+ Stars`,
      onRemove: () => onRemoveFilter("minRating"),
    });
  }

  if (filters.instantBookOnly) {
    activeChips.push({
      label: "⚡ Instant Book",
      onRemove: () => onRemoveFilter("instantBookOnly"),
    });
  }

  if (filters.freeBreakfastOnly) {
    activeChips.push({
      label: "☕ Free Breakfast",
      onRemove: () => onRemoveFilter("freeBreakfastOnly"),
    });
  }

  if (filters.selectedAmenities.length > 0) {
    filters.selectedAmenities.forEach((am) => {
      activeChips.push({
        label: `✓ ${am}`,
        onRemove: () => onRemoveFilter("selectedAmenities", am),
      });
    });
  }

  return (
    <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E9F2] shadow-xs">
      {/* TOP ROW: HEADING & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Result summary text */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#132555]">
              {query ? `Stays in "${query}"` : "Stays in Quezon Province"}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#05326B]/10 text-[#05326B]">
              {filteredCount} {filteredCount === 1 ? "stay" : "stays"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#57617E] mt-0.5">
            {checkIn && checkOut && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-[#005CE5]" />
                {nights} {nights === 1 ? "night" : "nights"} stay
              </span>
            )}
            {guests && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-[#005CE5]" />
                {guests} Guests
              </span>
            )}
          </div>
        </div>

        {/* CONTROLS (Mobile Filter Button, View Switcher, Sort Dropdown) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Mobile Filter Button */}
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#05326B] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeChips.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-[#05326B] text-[10px] font-extrabold flex items-center justify-center">
                {activeChips.length}
              </span>
            )}
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#F0F4FA] p-1 rounded-xl border border-[#E5E9F2]">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              title="Grid View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              title="List View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("map")}
              title="Split Map View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "map"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              <Map className="h-4 w-4" />
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#F8FAFD] border border-[#E5E9F2] px-3 py-1.5 rounded-xl">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#57617E] shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#132555] outline-none cursor-pointer pr-1"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Reviewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F0F4FA]">
          <span className="text-[11px] font-bold text-[#57617E] uppercase tracking-wider mr-1">
            Active filters:
          </span>
          {activeChips.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EBF2FC] text-[#05326B] border border-[#005CE5]/20 animate-fadeIn"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="p-0.5 rounded hover:bg-[#005CE5]/10 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onResetAll}
            className="text-xs font-bold text-red-600 hover:underline ml-2 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
