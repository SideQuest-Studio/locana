"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";
import SearchBar from "@/src/components/ui/SearchBar";
import { useWishlist } from "@/src/context/WishlistContext";
import type { SearchResultItem, SearchResponse } from "@/src/types/search.types";
import {
  MapPin,
  Star,
  Heart,
  SlidersHorizontal,
  ArrowUpDown,
  Building2,
  BedDouble,
  Sparkles,
  Check,
  X,
  Calendar,
  Users,
  ShieldCheck,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const MUNICIPALITIES = [
  "All Quezon",
  "Lucena City",
  "Lucban",
  "Tayabas",
  "Pagbilao",
  "Infanta & Real",
  "Sariaya",
  "Dolores",
  "Tiaong",
];

const PROPERTY_TYPES = [
  { id: "all", label: "All Stays" },
  { id: "resort", label: "Resorts" },
  { id: "hotel", label: "Hotels" },
  { id: "homestay", label: "Homestays & Cabins" },
];

const AMENITY_FILTERS = [
  "Swimming Pool",
  "Free Breakfast",
  "Beachfront",
  "Wifi",
  "Air Conditioning",
  "Pet Friendly",
  "Nature Trail",
  "Spa",
];

export function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") || "";
  const initialCheckIn = searchParams.get("checkIn") || "";
  const initialCheckOut = searchParams.get("checkOut") || "";
  const initialGuests = searchParams.get("guests") || "";
  const initialType = searchParams.get("type") || "all";
  const initialArea = searchParams.get("area") || "All Quezon";

  // Filter States
  const [query, setQuery] = useState(initialQ);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedArea, setSelectedArea] = useState(initialArea);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("recommended");

  // Drawer / Details Modal State
  const [selectedProperty, setSelectedProperty] = useState<SearchResultItem | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Data Loading
  const [allProperties, setAllProperties] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isWishlisted, toggleWishlist } = useWishlist();

  // Fetch properties from database API
  const fetchProperties = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        // If query was empty or area search, get all properties
        setAllProperties(data.categories.properties || data.results.filter(r => r.type === "property"));
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
    setQuery(searchParams.get("q") || "");
    setCheckIn(searchParams.get("checkIn") || "");
    setCheckOut(searchParams.get("checkOut") || "");
    setGuests(searchParams.get("guests") || "");
    if (searchParams.get("type")) setSelectedType(searchParams.get("type")!);
    if (searchParams.get("area")) setSelectedArea(searchParams.get("area")!);
  }, [searchParams]);

  // Filter properties client-side based on all active criteria
  const filteredProperties = useMemo(() => {
    return allProperties.filter((p) => {
      // 1. Property Type
      if (selectedType !== "all" && p.propertyType !== selectedType) {
        return false;
      }

      // 2. Municipality / Area
      if (selectedArea !== "All Quezon") {
        const areaMatch =
          p.areaName?.toLowerCase().includes(selectedArea.toLowerCase()) ||
          p.location.toLowerCase().includes(selectedArea.toLowerCase()) ||
          p.address?.toLowerCase().includes(selectedArea.toLowerCase());
        if (!areaMatch) return false;
      }

      // 3. Price Filter
      const propPrice = p.price || 3000;
      if (priceRange === "under3k" && propPrice >= 3000) return false;
      if (priceRange === "3kto5k" && (propPrice < 3000 || propPrice > 5000)) return false;
      if (priceRange === "above5k" && propPrice < 5000) return false;

      // 4. Rating Filter
      if (minRating > 0 && (p.rating || 4.5) < minRating) return false;

      // 5. Amenities
      if (selectedAmenities.length > 0) {
        const propAmenities = p.amenities || [];
        const hasAll = selectedAmenities.every((amenity) =>
          propAmenities.some((pa) => pa.toLowerCase().includes(amenity.toLowerCase()))
        );
        if (!hasAll) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "popular") return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      return 0; // recommended default
    });
  }, [allProperties, selectedType, selectedArea, priceRange, minRating, selectedAmenities, sortBy]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const clearAllFilters = () => {
    setQuery("");
    setSelectedType("all");
    setSelectedArea("All Quezon");
    setPriceRange("all");
    setSelectedAmenities([]);
    setMinRating(0);
    setSortBy("recommended");
    router.push("/search");
  };

  // Calculate stay duration if dates provided
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkIn, checkOut]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EE] text-[#1F2A2E]">
      <Navbar solid={true} />

      {/* TOP SEARCH HEADER */}
      <section className="pt-28 pb-8 px-4 sm:px-6 lg:px-8 border-b border-[#F0DFC2]/80 bg-[#FFFDF9]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-[#1F2A2E]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Search Quezon Province Stays
              </h1>
              <p className="text-xs sm:text-sm text-[#64716F] mt-0.5">
                Instant bookings for certified resorts, heritage hotels & eco-cabins
              </p>
            </div>
            {query && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E88E5]/10 text-[#1E88E5] text-xs font-semibold self-start sm:self-auto">
                <MapPin className="h-3.5 w-3.5" />
                Query: &ldquo;{query}&rdquo;
              </span>
            )}
          </div>

          {/* Search bar widget */}
          <div className="flex justify-center w-full">
            <div className="max-w-5xl">
              <SearchBar
                initialQuery={query}
                initialCheckIn={checkIn}
                initialCheckOut={checkOut}
                initialGuests={guests}
                compact={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      < div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" >
        {/* HORIZONTAL QUICK FILTER PILLS */}
        < div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6" >
          {/* Property Type Pills */}
          < div className="flex items-center gap-1.5 shrink-0" >
            {
              PROPERTY_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedType(t.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedType === t.id
                    ? "bg-[#1E88E5] text-white shadow-sm"
                    : "bg-white text-[#1F2A2E] border border-[#E2D1B8] hover:bg-[#F0DFC2]/40"
                    }`}
                >
                  {t.label}
                </button>
              ))
            }
          </div >

          <div className="h-5 w-px bg-[#E2D1B8] mx-1 shrink-0" />

          {/* Municipality Selector */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-3.5 py-2 bg-white border border-[#E2D1B8] rounded-full text-xs font-bold text-[#1F2A2E] outline-none shrink-0 focus:border-[#1E88E5] cursor-pointer"
          >
            {MUNICIPALITIES.map((area) => (
              <option key={area} value={area}>
                {area === "All Quezon" ? "📍 All Municipalities" : `📍 ${area}`}
              </option>
            ))}
          </select>

          {/* Price Range Selector */}
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="px-3.5 py-2 bg-white border border-[#E2D1B8] rounded-full text-xs font-bold text-[#1F2A2E] outline-none shrink-0 focus:border-[#1E88E5] cursor-pointer"
          >
            <option value="all">💵 Any Price</option>
            <option value="under3k">💵 Under ₱3,000/night</option>
            <option value="3kto5k">💵 ₱3,000 - ₱5,000/night</option>
            <option value="above5k">💵 ₱5,000+/night</option>
          </select>

          {/* Rating Selector */}
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="px-3.5 py-2 bg-white border border-[#E2D1B8] rounded-full text-xs font-bold text-[#1F2A2E] outline-none shrink-0 focus:border-[#1E88E5] cursor-pointer"
          >
            <option value="0">⭐ Any Rating</option>
            <option value="4.5">⭐ 4.5+ Stars</option>
            <option value="4.8">⭐ 4.8+ Stars</option>
          </select>

          {/* Sort Selector */}
          <div className="ml-auto shrink-0 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-[#64716F] hidden md:inline">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2 bg-white border border-[#E2D1B8] rounded-full text-xs font-bold text-[#1F2A2E] outline-none focus:border-[#1E88E5] cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Reviewed</option>
            </select>
          </div>
        </div >

        {/* AMENITIES FILTER CHIPS */}
        < div className="flex flex-wrap items-center gap-1.5 mb-6" >
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64716F] mr-1">
            Amenities:
          </span>
          {
            AMENITY_FILTERS.map((amenity) => {
              const isSelected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${isSelected
                    ? "bg-[#0E7C7B] text-white font-bold shadow-xs"
                    : "bg-white/80 text-[#1F2A2E] border border-[#E2D1B8] hover:bg-white"
                    }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {amenity}
                </button>
              );
            })
          }

          {
            (selectedType !== "all" ||
              selectedArea !== "All Quezon" ||
              priceRange !== "all" ||
              selectedAmenities.length > 0 ||
              minRating > 0 ||
              query) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-red-600 font-bold hover:underline ml-2 flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" /> Reset Filters
              </button>
            )
          }
        </div >

        {/* RESULTS BAR */}
        < div className="flex items-center justify-between mb-6 pb-2 border-b border-[#F0DFC2]" >
          <p className="text-sm font-bold text-[#1F2A2E]">
            {isLoading ? (
              <span>Searching database...</span>
            ) : (
              <span>
                {filteredProperties.length}{" "}
                {filteredProperties.length === 1 ? "property" : "properties"} found in Quezon
                Province
              </span>
            )}
          </p>

          {
            checkIn && checkOut && (
              <div className="text-xs text-[#0E7C7B] font-bold flex items-center gap-1.5 bg-[#0E7C7B]/10 px-3 py-1 rounded-full">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {nights} {nights === 1 ? "Night" : "Nights"} stay
                </span>
              </div>
            )
          }
        </div >

        {/* LOADING SKELETON */}
        {
          isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-3xl p-4 border border-[#F0DFC2] animate-pulse space-y-3"
                >
                  <div className="w-full aspect-[4/3] bg-gray-200 rounded-2xl" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-full mt-4" />
                </div>
              ))}
            </div>
          )
        }

        {/* RESULTS GRID */}
        {
          !isLoading && filteredProperties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => {
                const totalPrice = (property.price || 3000) * nights;
                const downpaymentAmount = Math.round(totalPrice * 0.3);

                return (
                  <article
                    key={property.id}
                    className="group bg-white rounded-3xl overflow-hidden border border-[#F0DFC2] hover:border-[#1E88E5]/50 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    {/* Image Container */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
                      <Image
                        src={property.image || "/hero.jpg"}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

                      {/* Top Badges */}
                      <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-[#1F2A2E] shadow-sm">
                          {property.badge || "Resort"}
                        </span>
                        {property.featured && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#1E88E5] text-white shadow-sm flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Featured
                          </span>
                        )}
                      </div>

                      {/* Wishlist Button */}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(property.id)}
                        aria-label="Toggle Wishlist"
                        className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#1F2A2E] hover:bg-white transition-all shadow-sm"
                      >
                        <Heart
                          className={`h-4 w-4 ${isWishlisted(property.id)
                            ? "fill-[#1E88E5] text-[#1E88E5]"
                            : "text-[#1F2A2E]"
                            }`}
                        />
                      </button>

                      {/* Location overlay */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 text-white/90">
                          <MapPin className="h-3.5 w-3.5 text-[#F4A93E]" />
                          {property.areaName || property.location}
                        </p>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Rating & Partner Info */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-[#1F2A2E]">
                            <Star className="h-3.5 w-3.5 text-[#F4A93E] fill-[#F4A93E]" />
                            <span>{property.rating || 4.9}</span>
                            <span className="text-[#64716F] font-normal">
                              ({(property.reviewsCount || 120).toLocaleString()} reviews)
                            </span>
                          </div>
                          {property.partnerName && (
                            <span className="text-[11px] font-semibold text-[#0E7C7B] truncate max-w-[140px]">
                              {property.partnerName}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3
                          className="text-lg font-bold text-[#1F2A2E] group-hover:text-[#1E88E5] transition-colors line-clamp-1"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {property.title}
                        </h3>

                        {/* Subtitle / Description */}
                        <p className="text-xs text-[#64716F] line-clamp-2 mt-1 leading-relaxed">
                          {property.subtitle}
                        </p>

                        {/* Amenities Pills */}
                        {property.amenities && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {property.amenities.slice(0, 3).map((am) => (
                              <span
                                key={am}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5EBDD] text-[#64716F]"
                              >
                                {am}
                              </span>
                            ))}
                            {property.amenities.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5EBDD] text-[#64716F]">
                                +{property.amenities.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Price & Action */}
                      <div className="mt-5 pt-3.5 border-t border-[#F0DFC2]/60 flex items-end justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-extrabold text-[#0E7C7B]">
                              ₱{(property.price || 3000).toLocaleString()}
                            </span>
                            <span className="text-xs text-[#64716F]">/ night</span>
                          </div>
                          {nights > 1 && (
                            <p className="text-[11px] text-[#64716F]">
                              ₱{totalPrice.toLocaleString()} total ({nights} nights)
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProperty(property);
                            setSelectedRoomIndex(0);
                            setActiveImageIndex(0);
                          }}
                          className="px-4 py-2.5 bg-gradient-to-r from-[#1E88E5] to-[#0E7C7B] hover:from-[#1976D2] hover:to-[#0B6968] text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>View Stays</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        }

        {/* EMPTY STATE */}
        {
          !isLoading && filteredProperties.length === 0 && (
            <div className="py-16 px-4 text-center max-w-lg mx-auto bg-white rounded-3xl border border-[#F0DFC2] shadow-sm my-8">
              <div className="w-14 h-14 rounded-2xl bg-[#1E88E5]/10 text-[#1E88E5] flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-7 w-7" />
              </div>
              <h3
                className="text-xl font-bold text-[#1F2A2E]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                No stays match your criteria
              </h3>
              <p className="text-xs sm:text-sm text-[#64716F] mt-2 leading-relaxed">
                We couldn&apos;t find any properties matching &ldquo;{query || selectedArea}&rdquo;
                with the selected filters. Try broadening your price range or clearing some amenities.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-6 px-6 py-3 rounded-full bg-[#1E88E5] text-white text-xs font-bold shadow-md hover:bg-[#1565C0] transition-all"
              >
                Reset All Filters
              </button>
            </div>
          )
        }
      </div >

      {/* PROPERTY PREVIEW & BOOKING DRAWER MODAL */}
      {
        selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[#1F2A2E]/70 backdrop-blur-md transition-opacity animate-fadeIn"
              onClick={() => setSelectedProperty(null)}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-3xl bg-[#FFFDF9] rounded-3xl shadow-2xl border border-[#F0DFC2] overflow-hidden z-10 animate-scaleUp max-h-[90vh] flex flex-col">
              {/* Top Bar */}
              <div className="h-2 w-full bg-gradient-to-r from-[#1E88E5] via-[#0E7C7B] to-[#F4A93E]" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-5 right-5 p-2 rounded-full text-[#1F2A2E]/60 hover:text-[#1F2A2E] hover:bg-[#F0DFC2]/60 transition-colors z-20"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Scrollable Content */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
                {/* Photo Gallery Banner */}
                <div className="space-y-2">
                  <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden bg-gray-100 border border-[#E2D1B8]">
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
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#1F2A2E]">
                      {selectedProperty.badge || "Verified Partner"}
                    </div>
                  </div>

                  {/* Thumbnails if multiple */}
                  {selectedProperty.images && selectedProperty.images.length > 1 && (
                    <div className="flex gap-2">
                      {selectedProperty.images.map((img, idx) => (
                        <button
                          key={img}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === idx
                            ? "border-[#1E88E5] scale-105"
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
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0E7C7B] mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {selectedProperty.partnerName || "Verified Partner Property"} ·{" "}
                      {selectedProperty.areaName || "Quezon Province"}
                    </span>
                  </div>

                  <h2
                    className="text-2xl font-bold text-[#1F2A2E]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {selectedProperty.title}
                  </h2>

                  <p className="text-xs text-[#64716F] flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-[#1E88E5] shrink-0" />
                    <span>{selectedProperty.address || selectedProperty.location}</span>
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1 font-bold text-[#1F2A2E]">
                      <Star className="h-4 w-4 text-[#F4A93E] fill-[#F4A93E]" />
                      <span>{selectedProperty.rating || 4.9}</span>
                      <span className="text-[#64716F]">
                        ({(selectedProperty.reviewsCount || 120).toLocaleString()} reviews)
                      </span>
                    </div>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Instant Confirmation
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white p-4 rounded-2xl border border-[#F0DFC2]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E]/70 mb-2">
                    About this property
                  </h4>
                  <p className="text-xs sm:text-sm text-[#1F2A2E]/80 leading-relaxed">
                    {selectedProperty.subtitle}
                  </p>

                  {selectedProperty.highlights && (
                    <div className="mt-3 pt-3 border-t border-[#F0DFC2]/60 space-y-1">
                      {selectedProperty.highlights.map((hl) => (
                        <p key={hl} className="text-xs text-[#1F2A2E]/80 flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-[#0E7C7B] shrink-0" />
                          <span>{hl}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amenities */}
                {selectedProperty.amenities && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E]/70 mb-2">
                      Included Amenities
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedProperty.amenities.map((am) => (
                        <div
                          key={am}
                          className="p-2.5 rounded-xl bg-white border border-[#E2D1B8] text-xs font-semibold text-[#1F2A2E] flex items-center gap-2"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-[#1E88E5]" />
                          <span>{am}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Room Types Selector */}
                {selectedProperty.roomTypes && selectedProperty.roomTypes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E]/70 mb-2">
                      Select Room Type
                    </h4>
                    <div className="space-y-2">
                      {selectedProperty.roomTypes.map((room, idx) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setSelectedRoomIndex(idx)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${selectedRoomIndex === idx
                            ? "bg-[#1E88E5]/5 border-[#1E88E5] shadow-xs"
                            : "bg-white border-[#E2D1B8] hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRoomIndex === idx
                                ? "border-[#1E88E5] bg-[#1E88E5]"
                                : "border-[#E2D1B8]"
                                }`}
                            >
                              {selectedRoomIndex === idx && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#1F2A2E]">{room.name}</p>
                              <p className="text-xs text-[#64716F]">
                                {room.description || `Capacity: up to ${room.capacity} guests`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-[#0E7C7B]">
                              ₱{room.price.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[#64716F] block">/ night</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price & Downpayment Breakdown */}
                {(() => {
                  const currentRoomPrice =
                    selectedProperty.roomTypes?.[selectedRoomIndex]?.price ||
                    selectedProperty.price ||
                    3000;
                  const totalCost = currentRoomPrice * nights;
                  const downpayment = Math.round(totalCost * 0.3);
                  const balanceDue = totalCost - downpayment;

                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E88E5]/10 to-[#0E7C7B]/10 border border-[#1E88E5]/20 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-[#1F2A2E]">
                        <span>
                          ₱{currentRoomPrice.toLocaleString()} × {nights}{" "}
                          {nights === 1 ? "night" : "nights"}
                        </span>
                        <span className="font-semibold">₱{totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-emerald-800 font-bold border-t border-[#1E88E5]/20 pt-2">
                        <span>Instant Downpayment Due Now (30%)</span>
                        <span className="text-sm">₱{downpayment.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#64716F]">
                        <span>Remaining Balance (Due at Check-in)</span>
                        <span>₱{balanceDue.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Action Footer */}
              <div className="p-4 sm:p-6 bg-[#FBF3E6] border-t border-[#F0DFC2] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#64716F]">Total for {nights} night(s)</p>
                  <p className="text-xl font-extrabold text-[#0E7C7B]">
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
                    className="px-4 py-3 rounded-2xl border border-[#E2D1B8] bg-white text-xs font-bold text-[#1F2A2E] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <Link
                    href="/login"
                    className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-[#1E88E5] to-[#0E7C7B] hover:from-[#1976D2] hover:to-[#0B6968] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2"
                  >
                    <span>Instant Book with 30% Deposit</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <Footer />
    </div >
  );
}
