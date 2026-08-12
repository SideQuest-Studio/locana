import React, { useState, useMemo } from "react";
import type { SearchResultItem } from "@/src/types/search.types";
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  Star,
  Sparkles,
  Building2,
  MapPin,
  ShieldCheck,
  Dog,
  Coffee,
  Waves,
  Wifi,
  Wind,
  Trees,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface SearchFilterState {
  selectedTypes: string[];
  selectedAreas: string[];
  minPrice: number;
  maxPrice: number;
  selectedAmenities: string[];
  minRating: number;
  instantBookOnly: boolean;
  petFriendlyOnly: boolean;
  freeBreakfastOnly: boolean;
}

export interface SearchFiltersSidebarProps {
  filters: SearchFilterState;
  onFilterChange: (newFilters: SearchFilterState) => void;
  onReset: () => void;
  totalResultsCount?: number;
  availableProperties?: SearchResultItem[];
  className?: string;
}

const PROPERTY_TYPES = [
  { id: "resort", label: "Resorts & Eco-Parks" },
  { id: "hotel", label: "Hotels & Heritage Inns" },
  { id: "homestay", label: "Homestays & Cabins" },
  { id: "villa", label: "Private Nature Villas" },
];

const DEFAULT_MUNICIPALITIES = [
  "Lucena City",
  "Lucban",
  "Tayabas City",
  "Pagbilao",
  "Infanta",
  "Real",
  "Sariaya",
  "Dolores",
  "Tiaong",
  "Mauban",
];

const AMENITY_CATEGORIES = [
  {
    name: "Popular Essentials",
    items: [
      { id: "Swimming Pool", label: "Swimming Pool", icon: Waves },
      { id: "Free Breakfast", label: "Free Breakfast", icon: Coffee },
      { id: "Beachfront", label: "Beachfront / Oceanfront", icon: Waves },
      { id: "Wifi", label: "Free High-Speed Wifi", icon: Wifi },
      { id: "Air Conditioning", label: "Air Conditioning", icon: Wind },
    ],
  },
  {
    name: "Nature & Experiences",
    items: [
      { id: "Nature Trail", label: "Nature & Hiking Trails", icon: Trees },
      { id: "Spa", label: "Spa & Natural Springs", icon: Sparkles },
      { id: "Pet Friendly", label: "Pet-Friendly Resort", icon: Dog },
      { id: "Restaurant", label: "On-site Dining / Heirloom Food", icon: Coffee },
    ],
  },
];

export function SearchFiltersSidebar({
  filters,
  onFilterChange,
  onReset,
  totalResultsCount,
  availableProperties = [],
  className = "",
}: SearchFiltersSidebarProps) {
  const [showAllMunicipalities, setShowAllMunicipalities] = useState(false);
  const [priceInputMin, setPriceInputMin] = useState(filters.minPrice);
  const [priceInputMax, setPriceInputMax] = useState(filters.maxPrice);

  // Dynamic municipalities derived from live properties in database
  const computedMunicipalities = useMemo(() => {
    const counts: Record<string, number> = {};
    if (availableProperties.length > 0) {
      availableProperties.forEach((p) => {
        const area = p.areaName || "Quezon";
        counts[area] = (counts[area] || 0) + 1;
      });
      // Merge with default municipalities
      const allTowns = Array.from(
        new Set([...Object.keys(counts), ...DEFAULT_MUNICIPALITIES])
      );
      return allTowns.map((name) => ({
        name,
        count: counts[name] || 0,
      }));
    }
    return DEFAULT_MUNICIPALITIES.map((name) => ({ name, count: 0 }));
  }, [availableProperties]);

  // Dynamic property types counts
  const computedTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    if (availableProperties.length > 0) {
      availableProperties.forEach((p) => {
        const type = (p.propertyType || "resort").toLowerCase();
        counts[type] = (counts[type] || 0) + 1;
      });
    }
    return PROPERTY_TYPES.map((pt) => ({
      ...pt,
      count: counts[pt.id] || 0,
    }));
  }, [availableProperties]);

  // Toggle Property Type Checkbox
  const handleTypeToggle = (typeId: string) => {
    const next = filters.selectedTypes.includes(typeId)
      ? filters.selectedTypes.filter((t) => t !== typeId)
      : [...filters.selectedTypes, typeId];
    onFilterChange({ ...filters, selectedTypes: next });
  };

  // Toggle Municipality Checkbox
  const handleAreaToggle = (areaName: string) => {
    const next = filters.selectedAreas.includes(areaName)
      ? filters.selectedAreas.filter((a) => a !== areaName)
      : [...filters.selectedAreas, areaName];
    onFilterChange({ ...filters, selectedAreas: next });
  };

  // Toggle Amenity Checkbox
  const handleAmenityToggle = (amenityId: string) => {
    const next = filters.selectedAmenities.includes(amenityId)
      ? filters.selectedAmenities.filter((a) => a !== amenityId)
      : [...filters.selectedAmenities, amenityId];
    onFilterChange({ ...filters, selectedAmenities: next });
  };

  // Handle Price Changes
  const handlePriceApply = () => {
    onFilterChange({
      ...filters,
      minPrice: Math.min(priceInputMin, priceInputMax),
      maxPrice: Math.max(priceInputMin, priceInputMax),
    });
  };

  // Check if any filter is active
  const hasActiveFilters =
    filters.selectedTypes.length > 0 ||
    filters.selectedAreas.length > 0 ||
    filters.selectedAmenities.length > 0 ||
    filters.minRating > 0 ||
    filters.minPrice > 0 ||
    filters.maxPrice < 15000 ||
    filters.instantBookOnly ||
    filters.petFriendlyOnly ||
    filters.freeBreakfastOnly;

  return (
    <aside
      className={`bg-white rounded-2xl border border-[#E5E9F2] shadow-xs p-5 space-y-6 ${className}`}
    >
      {/* FILTER HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F0F4FA]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#05326B]/10 flex items-center justify-center text-[#05326B]">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#132555]">Filters</h3>
            {totalResultsCount !== undefined && (
              <p className="text-[11px] text-[#57617E]">
                {totalResultsCount} {totalResultsCount === 1 ? "stay" : "stays"} found
              </p>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-semibold text-[#005CE5] hover:text-[#05326B] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset all</span>
          </button>
        )}
      </div>

      {/* FILTER GROUP 1: INSTANT BOOK & VERIFIED SPECIALS */}
      <div className="space-y-3 pb-5 border-b border-[#F0F4FA]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E]">
          Booking Options
        </h4>
        <div className="space-y-2">
          <label className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E9F2] hover:bg-[#F8FAFD] cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#005CE5]" />
              <div className="text-left">
                <span className="text-xs font-bold text-[#132555] block">Instant Book</span>
                <span className="text-[10px] text-[#57617E] block">Book without waiting</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={filters.instantBookOnly}
              onChange={(e) =>
                onFilterChange({ ...filters, instantBookOnly: e.target.checked })
              }
              className="h-4 w-4 rounded text-[#05326B] focus:ring-[#05326B] border-gray-300 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E9F2] hover:bg-[#F8FAFD] cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <Coffee className="h-4 w-4 text-[#01864C]" />
              <div className="text-left">
                <span className="text-xs font-bold text-[#132555] block">Free Breakfast</span>
                <span className="text-[10px] text-[#57617E] block">Complimentary meals</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={filters.freeBreakfastOnly}
              onChange={(e) =>
                onFilterChange({ ...filters, freeBreakfastOnly: e.target.checked })
              }
              className="h-4 w-4 rounded text-[#05326B] focus:ring-[#05326B] border-gray-300 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* FILTER GROUP 2: PRICE RANGE PER NIGHT */}
      <div className="space-y-3 pb-5 border-b border-[#F0F4FA]">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E]">
            Price per night
          </h4>
          <span className="text-xs font-bold text-[#01864C]">
            ₱{filters.minPrice.toLocaleString()} – ₱{filters.maxPrice.toLocaleString()}
          </span>
        </div>

        {/* Dual Input Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[10px] text-[#57617E] font-medium block mb-1">Min (₱)</label>
            <input
              type="number"
              min={0}
              max={15000}
              step={500}
              value={priceInputMin}
              onChange={(e) => setPriceInputMin(Number(e.target.value))}
              onBlur={handlePriceApply}
              className="w-full px-3 py-1.5 text-xs font-bold text-[#132555] bg-[#F8FAFD] border border-[#E5E9F2] rounded-lg focus:outline-none focus:border-[#005CE5]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#57617E] font-medium block mb-1">Max (₱)</label>
            <input
              type="number"
              min={1000}
              max={25000}
              step={500}
              value={priceInputMax}
              onChange={(e) => setPriceInputMax(Number(e.target.value))}
              onBlur={handlePriceApply}
              className="w-full px-3 py-1.5 text-xs font-bold text-[#132555] bg-[#F8FAFD] border border-[#E5E9F2] rounded-lg focus:outline-none focus:border-[#005CE5]"
            />
          </div>
        </div>

        {/* Range Slider */}
        <div className="pt-2">
          <input
            type="range"
            min={1000}
            max={15000}
            step={500}
            value={filters.maxPrice}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPriceInputMax(val);
              onFilterChange({ ...filters, maxPrice: val });
            }}
            className="w-full accent-[#05326B] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#9197A8] mt-1">
            <span>₱1,000</span>
            <span>₱8,000</span>
            <span>₱15,000+</span>
          </div>
        </div>
      </div>

      {/* FILTER GROUP 3: PROPERTY TYPES CHECKBOXES */}
      <div className="space-y-3 pb-5 border-b border-[#F0F4FA]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E]">
          Property Type
        </h4>
        <div className="space-y-2">
          {computedTypes.map((type) => {
            const isChecked = filters.selectedTypes.includes(type.id);
            return (
              <label
                key={type.id}
                className="flex items-center justify-between text-xs font-medium text-[#132555] hover:text-[#005CE5] cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleTypeToggle(type.id)}
                    className="h-4 w-4 rounded text-[#05326B] focus:ring-[#05326B] border-gray-300 cursor-pointer"
                  />
                  <span className={isChecked ? "font-bold text-[#05326B]" : ""}>
                    {type.label}
                  </span>
                </div>
                <span className="text-[11px] text-[#9197A8] group-hover:text-[#57617E]">
                  ({type.count})
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* FILTER GROUP 4: MUNICIPALITY / LOCATION CHECKBOXES */}
      <div className="space-y-3 pb-5 border-b border-[#F0F4FA]">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E]">
            Municipalities
          </h4>
          {filters.selectedAreas.length > 0 && (
            <span className="text-[10px] font-bold text-[#005CE5]">
              {filters.selectedAreas.length} selected
            </span>
          )}
        </div>

        <div className="space-y-2">
          {(showAllMunicipalities
            ? computedMunicipalities
            : computedMunicipalities.slice(0, 5)
          ).map((mun) => {
            const isChecked = filters.selectedAreas.includes(mun.name);
            return (
              <label
                key={mun.name}
                className="flex items-center justify-between text-xs font-medium text-[#132555] hover:text-[#005CE5] cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleAreaToggle(mun.name)}
                    className="h-4 w-4 rounded text-[#05326B] focus:ring-[#05326B] border-gray-300 cursor-pointer"
                  />
                  <span className={isChecked ? "font-bold text-[#05326B]" : ""}>
                    {mun.name}
                  </span>
                </div>
                <span className="text-[11px] text-[#9197A8] group-hover:text-[#57617E]">
                  ({mun.count})
                </span>
              </label>
            );
          })}
        </div>

        {computedMunicipalities.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAllMunicipalities(!showAllMunicipalities)}
            className="flex items-center gap-1 text-xs font-bold text-[#005CE5] hover:text-[#05326B] transition-colors pt-1 cursor-pointer"
          >
            {showAllMunicipalities ? (
              <>
                <span>Show less</span>
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                <span>Show all {computedMunicipalities.length} municipalities</span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {/* FILTER GROUP 5: GUEST RATINGS */}
      <div className="space-y-3 pb-5 border-b border-[#F0F4FA]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E]">
          Guest Rating
        </h4>
        <div className="space-y-1.5">
          {[
            { val: 4.8, label: "Superb: 4.8+" },
            { val: 4.5, label: "Very Good: 4.5+" },
            { val: 4.0, label: "Good: 4.0+" },
          ].map((r) => {
            const isSelected = filters.minRating === r.val;
            return (
              <button
                key={r.val}
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    minRating: isSelected ? 0 : r.val,
                  })
                }
                className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#05326B] bg-[#EBF2FC] text-[#05326B]"
                    : "border-[#E5E9F2] bg-white text-[#132555] hover:bg-[#F8FAFD]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-[#ECBA59] fill-[#ECBA59]" />
                  <span>{r.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#05326B]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER GROUP 6: AMENITIES & FEATURES CHECKBOXES */}
      <div className="space-y-4">
        {AMENITY_CATEGORIES.map((cat) => (
          <div key={cat.name} className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E]">
              {cat.name}
            </h4>
            <div className="space-y-2">
              {cat.items.map((item) => {
                const isChecked = filters.selectedAmenities.includes(item.id);
                const IconComponent = item.icon;
                return (
                  <label
                    key={item.id}
                    className="flex items-center justify-between text-xs font-medium text-[#132555] hover:text-[#005CE5] cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleAmenityToggle(item.id)}
                        className="h-4 w-4 rounded text-[#05326B] focus:ring-[#05326B] border-gray-300 cursor-pointer"
                      />
                      <IconComponent className="h-3.5 w-3.5 text-[#57617E]" />
                      <span className={isChecked ? "font-bold text-[#05326B]" : ""}>
                        {item.label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
