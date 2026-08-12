"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";
import { Group72SearchBar } from "@/src/components/search/group-72-search-bar";
import {
  SearchFiltersSidebar,
  type SearchFilterState,
} from "@/src/components/search/search-filters-sidebar";
import {
  SearchResultsToolbar,
  type ViewMode,
} from "@/src/components/search/search-results-toolbar";
import { SearchPropertyCard } from "@/src/components/search/search-property-card";
import { SearchInteractiveMap } from "@/src/components/search/search-interactive-map";
import { useWishlist } from "@/src/context/WishlistContext";
import { useAuth } from "@/src/context/AuthContext";
import { toast } from "sonner";
import type { SearchResultItem, SearchResponse } from "@/src/types/search.types";
import {
  MapPin,
  Star,
  Heart,
  Building2,
  Sparkles,
  Check,
  X,
  Calendar,
  Users,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Parameters
  const initialQ = searchParams.get("q") || "";
  const initialCheckIn = searchParams.get("checkIn") || "";
  const initialCheckOut = searchParams.get("checkOut") || "";
  const initialGuests = searchParams.get("guests") || "";
  const initialType = searchParams.get("type");
  const initialArea = searchParams.get("area");

  // Search Bar States
  const [query, setQuery] = useState(initialQ);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);

  // View Mode: grid | list | map
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<string>("recommended");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Comprehensive Filter State
  const [filters, setFilters] = useState<SearchFilterState>({
    selectedTypes: initialType ? [initialType] : [],
    selectedAreas: initialArea && initialArea !== "All Quezon" ? [initialArea] : [],
    minPrice: 0,
    maxPrice: 15000,
    selectedAmenities: [],
    minRating: 0,
    instantBookOnly: false,
    petFriendlyOnly: false,
    freeBreakfastOnly: false,
  });

  // Modal / Drawer Preview State
  const [selectedProperty, setSelectedProperty] = useState<SearchResultItem | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Data Loading
  const [allProperties, setAllProperties] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const { user, openAuthModal } = useAuth();
  const { toggleWishlist, isWishlisted } = useWishlist();

  // Instant booking action via POST /api/bookings
  const handleInstantBook = async () => {
    if (!selectedProperty) return;

    if (!user) {
      toast.info("Sign in required to complete reservation", {
        description: "Please sign in to confirm your 30% downpayment hold.",
        action: {
          label: "Sign In",
          onClick: () => openAuthModal("login"),
        },
      });
      openAuthModal("login");
      return;
    }

    setIsBooking(true);
    const toastId = toast.loading(`Securing reservation for ${selectedProperty.title}...`, {
      description: "Calculating downpayment and securing your dates with our partner.",
    });

    try {
      const selectedRoom =
        selectedProperty.roomTypes?.[selectedRoomIndex] ||
        selectedProperty.roomTypes?.[0];

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedProperty.id,
          roomTypeId: selectedRoom?.id,
          checkIn,
          checkOut,
          adults: Number(guests) || 1,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Booking creation failed", {
          id: toastId,
          description: data.message || "Please check room availability and try again.",
        });
        setIsBooking(false);
        return;
      }

      toast.success(`Booking Confirmed! (${data.booking.referenceNumber})`, {
        id: toastId,
        description: `₱${data.booking.downpaymentAmount.toLocaleString()} (30% deposit) reserved for ${data.booking.propertyName}. Remaining balance due at check-in.`,
        duration: 7000,
      });

      setSelectedProperty(null);
      setIsBooking(false);
      router.push("/account/bookings");
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("Network error while creating booking", {
        id: toastId,
        description: "Please check your connection and try again.",
      });
      setIsBooking(false);
    }
  };

  // Fetch properties from database API
  const fetchProperties = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        const props =
          data.categories?.properties && data.categories.properties.length > 0
            ? data.categories.properties
            : data.results?.filter((r) => r.type === "property") || [];
        setAllProperties(props);
      }
    } catch (err) {
      console.error("Failed to load search results:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(query);
  }, [query, fetchProperties]);

  // Sync state when URL params change
  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    const inParam = searchParams.get("checkIn") || "";
    const outParam = searchParams.get("checkOut") || "";
    const gParam = searchParams.get("guests") || "";
    const tParam = searchParams.get("type");
    const aParam = searchParams.get("area");

    setQuery(qParam);
    setCheckIn(inParam);
    setCheckOut(outParam);
    setGuests(gParam);

    if (tParam || aParam) {
      setFilters((prev) => ({
        ...prev,
        selectedTypes: tParam ? [tParam] : prev.selectedTypes,
        selectedAreas: aParam && aParam !== "All Quezon" ? [aParam] : prev.selectedAreas,
      }));
    }
  }, [searchParams]);

  // Calculate stay duration
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkIn, checkOut]);

  // Filter properties client-side based on all criteria
  const filteredProperties = useMemo(() => {
    return allProperties
      .filter((p) => {
        // 1. Property Type
        if (
          filters.selectedTypes.length > 0 &&
          !filters.selectedTypes
            .map((t) => t.toLowerCase())
            .includes((p.propertyType || "resort").toLowerCase())
        ) {
          return false;
        }

        // 2. Municipality / Area
        if (filters.selectedAreas.length > 0) {
          const areaMatch = filters.selectedAreas.some((selectedArea) => {
            return (
              p.areaName?.toLowerCase().includes(selectedArea.toLowerCase()) ||
              p.location.toLowerCase().includes(selectedArea.toLowerCase()) ||
              p.address?.toLowerCase().includes(selectedArea.toLowerCase())
            );
          });
          if (!areaMatch) return false;
        }

        // 3. Price Filter
        const propPrice = p.price || 3000;
        if (propPrice < filters.minPrice) return false;
        if (filters.maxPrice < 15000 && propPrice > filters.maxPrice) return false;

        // 4. Rating Filter
        if (filters.minRating > 0 && (p.rating || 4.5) < filters.minRating) {
          return false;
        }

        // 5. Free Breakfast Toggle
        if (filters.freeBreakfastOnly) {
          const hasBreakfast = p.amenities?.some((a) =>
            a.toLowerCase().includes("breakfast")
          );
          if (!hasBreakfast) return false;
        }

        // 6. Pet Friendly Toggle
        if (filters.petFriendlyOnly) {
          const hasPets = p.amenities?.some((a) =>
            a.toLowerCase().includes("pet")
          );
          if (!hasPets) return false;
        }

        // 7. Amenities Checklist
        if (filters.selectedAmenities.length > 0) {
          const propAmenities = p.amenities || [];
          const hasAll = filters.selectedAmenities.every((amenity) =>
            propAmenities.some((pa) =>
              pa.toLowerCase().includes(amenity.toLowerCase())
            )
          );
          if (!hasAll) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "popular") return (b.reviewsCount || 0) - (a.reviewsCount || 0);
        return 0; // recommended
      });
  }, [allProperties, filters, sortBy]);

  // Remove individual filter chip
  const handleRemoveFilter = (key: keyof SearchFilterState, value?: string) => {
    if (key === "selectedTypes" && value) {
      setFilters((prev) => ({
        ...prev,
        selectedTypes: prev.selectedTypes.filter((t) => t !== value),
      }));
    } else if (key === "selectedAreas" && value) {
      setFilters((prev) => ({
        ...prev,
        selectedAreas: prev.selectedAreas.filter((a) => a !== value),
      }));
    } else if (key === "selectedAmenities" && value) {
      setFilters((prev) => ({
        ...prev,
        selectedAmenities: prev.selectedAmenities.filter((a) => a !== value),
      }));
    } else if (key === "minPrice" || key === "maxPrice") {
      setFilters((prev) => ({ ...prev, minPrice: 0, maxPrice: 15000 }));
    } else if (key === "minRating") {
      setFilters((prev) => ({ ...prev, minRating: 0 }));
    } else if (key === "instantBookOnly") {
      setFilters((prev) => ({ ...prev, instantBookOnly: false }));
    } else if (key === "freeBreakfastOnly") {
      setFilters((prev) => ({ ...prev, freeBreakfastOnly: false }));
    }
  };

  // Reset all filters
  const handleResetAll = () => {
    setFilters({
      selectedTypes: [],
      selectedAreas: [],
      minPrice: 0,
      maxPrice: 15000,
      selectedAmenities: [],
      minRating: 0,
      instantBookOnly: false,
      petFriendlyOnly: false,
      freeBreakfastOnly: false,
    });
    setQuery("");
    setSortBy("recommended");
    router.push("/search");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFD] text-[#132555]">
      <Navbar solid={true} />

      {/* TOP SEARCH HEADER (Group 72 Master Bar + Popovers) */}
      <section className="pt-24 sm:pt-28 pb-6 px-4 sm:px-6 lg:px-8 bg-white border-b border-[#E5E9F2]">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#005CE5] uppercase tracking-wider mb-1">
                <span>Quezon Province</span>
                <span>&middot;</span>
                <span>Verified Resorts &amp; Hotels</span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold text-[#132555] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Find &amp; Book Stays in Quezon
              </h1>
            </div>

            {query && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#05326B]/10 text-[#05326B] text-xs font-bold self-start sm:self-auto">
                <MapPin className="h-3.5 w-3.5 text-[#005CE5]" />
                Location query: &ldquo;{query}&rdquo;
              </span>
            )}
          </div>

          {/* Group 72 Search Bar Widget */}
          <div className="w-full">
            <Group72SearchBar
              initialQuery={query}
              initialCheckIn={checkIn}
              initialCheckOut={checkOut}
              initialGuests={guests}
              onSearchSubmit={(p) => {
                setQuery(p.q);
                setCheckIn(p.checkIn);
                setCheckOut(p.checkOut);
                setGuests(p.guests);
              }}
            />
          </div>
        </div>
      </section>

      {/* MAIN SEARCH WEBPAGE LAYOUT (Sidebar Filters + Results / Map Canvas) */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* DESKTOP LEFT FILTER SIDEBAR (4 cols on lg) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-24">
            <SearchFiltersSidebar
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleResetAll}
              totalResultsCount={filteredProperties.length}
              availableProperties={allProperties}
            />
          </div>

          {/* MAIN RESULTS CONTAINER (8 cols on lg / 9 cols on xl) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* TOOLBAR (Sort, Grid/List/Map toggle, Result count, Active chips) */}
            <SearchResultsToolbar
              totalCount={allProperties.length}
              filteredCount={filteredProperties.length}
              query={query}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortChange={setSortBy}
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onResetAll={handleResetAll}
              onOpenMobileFilters={() => setMobileFiltersOpen(true)}
              nights={nights}
            />

            {/* LOADING SKELETON */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-2xl p-4 border border-[#E5E9F2] animate-pulse space-y-3"
                  >
                    <div className="w-full aspect-[4/3] bg-gray-200 rounded-xl" />
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-9 bg-gray-200 rounded-xl w-full mt-4" />
                  </div>
                ))}
              </div>
            )}

            {/* VIEW MODE 1: GRID VIEW */}
            {!isLoading && viewMode === "grid" && filteredProperties.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProperties.map((property) => (
                  <SearchPropertyCard
                    key={property.id}
                    property={property}
                    viewMode="grid"
                    nights={nights}
                    onSelectProperty={(p) => {
                      setSelectedProperty(p);
                      setSelectedRoomIndex(0);
                      setActiveImageIndex(0);
                    }}
                  />
                ))}
              </div>
            )}

            {/* VIEW MODE 2: LIST VIEW */}
            {!isLoading && viewMode === "list" && filteredProperties.length > 0 && (
              <div className="space-y-4">
                {filteredProperties.map((property) => (
                  <SearchPropertyCard
                    key={property.id}
                    property={property}
                    viewMode="list"
                    nights={nights}
                    onSelectProperty={(p) => {
                      setSelectedProperty(p);
                      setSelectedRoomIndex(0);
                      setActiveImageIndex(0);
                    }}
                  />
                ))}
              </div>
            )}

            {/* VIEW MODE 3: SPLIT MAP VIEW */}
            {!isLoading && viewMode === "map" && filteredProperties.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Left Card List (5 cols on xl) */}
                <div className="xl:col-span-5 space-y-4 max-h-[750px] overflow-y-auto pr-1">
                  {filteredProperties.map((property) => (
                    <SearchPropertyCard
                      key={property.id}
                      property={property}
                      viewMode="grid"
                      nights={nights}
                      onSelectProperty={(p) => {
                        setSelectedProperty(p);
                        setSelectedRoomIndex(0);
                        setActiveImageIndex(0);
                      }}
                    />
                  ))}
                </div>

                {/* Right Sticky Map (7 cols on xl) */}
                <div className="xl:col-span-7 sticky top-24 h-[600px] xl:h-[750px]">
                  <SearchInteractiveMap
                    properties={filteredProperties}
                    selectedProperty={selectedProperty}
                    onSelectProperty={(p) => setSelectedProperty(p)}
                  />
                </div>
              </div>
            )}

            {/* EMPTY STATE */}
            {!isLoading && filteredProperties.length === 0 && (
              <div className="py-16 px-6 text-center max-w-md mx-auto bg-white rounded-2xl border border-[#E5E9F2] shadow-xs my-6">
                <div className="w-14 h-14 rounded-2xl bg-[#005CE5]/10 text-[#005CE5] flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-7 w-7" />
                </div>
                <h3
                  className="text-lg font-bold text-[#132555]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  No stays match your criteria
                </h3>
                <p className="text-xs text-[#57617E] mt-2 leading-relaxed">
                  We couldn&apos;t find any properties matching &ldquo;{query || "your filters"}&rdquo;. Try widening your price range, removing some amenities, or choosing another municipality.
                </p>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MOBILE SLIDE-OVER FILTER DRAWER */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#132555]/60 backdrop-blur-xs animate-fadeIn"
            onClick={() => setMobileFiltersOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-fadeIn">
            <div className="p-4 border-b border-[#E5E9F2] flex items-center justify-between bg-[#F8FAFD]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#05326B]" />
                <h3 className="text-sm font-bold text-[#132555]">Filter Stays</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 rounded-full text-[#57617E] hover:text-[#132555]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <SearchFiltersSidebar
                filters={filters}
                onFilterChange={setFilters}
                onReset={handleResetAll}
                totalResultsCount={filteredProperties.length}
                availableProperties={allProperties}
              />
            </div>

            <div className="p-4 border-t border-[#E5E9F2] bg-[#F8FAFD] flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetAll}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E9F2] bg-white text-xs font-bold text-[#57617E] hover:text-[#132555]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#05326B] text-white text-xs font-bold shadow-xs hover:bg-[#01234E]"
              >
                Show {filteredProperties.length} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROPERTY PREVIEW & INSTANT BOOKING DRAWER MODAL */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#132555]/70 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => setSelectedProperty(null)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E5E9F2] overflow-hidden z-10 animate-scaleUp max-h-[90vh] flex flex-col">
            {/* Top Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#05326B] via-[#005CE5] to-[#ECBA59]" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#57617E] hover:text-[#132555] hover:bg-gray-100 transition-colors z-20"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Scrollable Content */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {/* Photo Gallery Banner */}
              <div className="space-y-2">
                <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden bg-gray-100 border border-[#E5E9F2]">
                  <Image
                    src={
                      selectedProperty.images?.[activeImageIndex] ||
                      selectedProperty.image ||
                      "/hero.jpg"
                    }
                    alt={selectedProperty.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#132555] shadow-xs">
                    {selectedProperty.badge || "Verified Partner"}
                  </div>
                </div>

                {/* Thumbnails */}
                {selectedProperty.images && selectedProperty.images.length > 1 && (
                  <div className="flex gap-2">
                    {selectedProperty.images.map((img, idx) => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          activeImageIndex === idx
                            ? "border-[#005CE5] scale-105"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image src={img} alt="Thumbnail" fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#01864C] mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {selectedProperty.partnerName || "Verified Partner Property"} ·{" "}
                    {selectedProperty.areaName || "Quezon Province"}
                  </span>
                </div>

                <h2
                  className="text-2xl font-bold text-[#132555]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {selectedProperty.title}
                </h2>

                <p className="text-xs text-[#57617E] flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-[#005CE5] shrink-0" />
                  <span>{selectedProperty.address || selectedProperty.location}</span>
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1 font-bold text-[#132555]">
                    <Star className="h-4 w-4 text-[#ECBA59] fill-[#ECBA59]" />
                    <span>{selectedProperty.rating || 4.9}</span>
                    <span className="text-[#57617E]">
                      ({(selectedProperty.reviewsCount || 120).toLocaleString()} reviews)
                    </span>
                  </div>
                  <span className="text-[#01864C] font-bold bg-[#01864C]/10 px-2 py-0.5 rounded-md">
                    ⚡ Instant Booking Active
                  </span>
                </div>
              </div>

              {/* Description & Highlights */}
              <div className="bg-[#F8FAFD] p-4 rounded-2xl border border-[#E5E9F2]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E] mb-2">
                  About this property
                </h4>
                <p className="text-xs sm:text-sm text-[#132555]/85 leading-relaxed">
                  {selectedProperty.subtitle}
                </p>

                {selectedProperty.highlights && (
                  <div className="mt-3 pt-3 border-t border-[#E5E9F2] space-y-1">
                    {selectedProperty.highlights.map((hl) => (
                      <p key={hl} className="text-xs text-[#132555] flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-[#01864C] shrink-0" />
                        <span>{hl}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Included Amenities */}
              {selectedProperty.amenities && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E] mb-2">
                    Included Amenities
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedProperty.amenities.map((am) => (
                      <div
                        key={am}
                        className="p-2.5 rounded-xl bg-[#F8FAFD] border border-[#E5E9F2] text-xs font-semibold text-[#132555] flex items-center gap-2"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#005CE5]" />
                        <span>{am}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Types Selector */}
              {selectedProperty.roomTypes && selectedProperty.roomTypes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#57617E] mb-2">
                    Select Room Type
                  </h4>
                  <div className="space-y-2">
                    {selectedProperty.roomTypes.map((room, idx) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomIndex(idx)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          selectedRoomIndex === idx
                            ? "bg-[#EBF2FC] border-[#005CE5] ring-2 ring-[#005CE5]/20 shadow-xs"
                            : "bg-white border-[#E5E9F2] hover:bg-[#F8FAFD]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedRoomIndex === idx
                                ? "border-[#005CE5] bg-[#005CE5]"
                                : "border-[#9197A8]"
                            }`}
                          >
                            {selectedRoomIndex === idx && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#132555]">{room.name}</p>
                            <p className="text-xs text-[#57617E]">
                              {room.description || `Capacity: up to ${room.capacity} guests`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-[#01864C]">
                            ₱{room.price.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#57617E] block">/ night</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price & 30% Downpayment Calculation */}
              {(() => {
                const currentRoomPrice =
                  selectedProperty.roomTypes?.[selectedRoomIndex]?.price ||
                  selectedProperty.price ||
                  3000;
                const totalCost = currentRoomPrice * nights;
                const downpayment = Math.round(totalCost * 0.3);
                const balanceDue = totalCost - downpayment;

                return (
                  <div className="p-4 rounded-2xl bg-[#F8FAFD] border border-[#E5E9F2] space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#132555]">
                      <span>
                        ₱{currentRoomPrice.toLocaleString()} × {nights}{" "}
                        {nights === 1 ? "night" : "nights"}
                      </span>
                      <span className="font-semibold">₱{totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#01864C] font-bold border-t border-[#E5E9F2] pt-2">
                      <span>Instant Downpayment Due Now (30%)</span>
                      <span className="text-sm">₱{downpayment.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#57617E]">
                      <span>Remaining Balance (Due at Check-in)</span>
                      <span>₱{balanceDue.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Action Footer */}
            <div className="p-4 sm:p-6 bg-[#F8FAFD] border-t border-[#E5E9F2] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#57617E]">Total for {nights} night(s)</p>
                <p className="text-xl font-extrabold text-[#01864C]">
                  ₱
                  {(
                    (selectedProperty.roomTypes?.[selectedRoomIndex]?.price ||
                      selectedProperty.price ||
                      3000) * nights
                  ).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedProperty(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E9F2] bg-white text-xs font-bold text-[#132555] hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleInstantBook}
                  disabled={isBooking}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBooking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Securing Reservation...</span>
                    </>
                  ) : (
                    <>
                      <span>Instant Book (30% Deposit)</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
