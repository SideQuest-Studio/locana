"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import { Group73DestinationSelector } from "./group-73-destination-selector";
import { Group74DateRangePicker } from "./group-74-date-range-picker";
import { Group75GuestsRoomsSelector } from "./group-75-guests-rooms-selector";
import type {
  SearchResultItem,
  GuestsBreakdown,
  SearchActivePopover,
} from "@/src/types/search.types";

export interface Group72SearchBarProps {
  initialQuery?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
  onSearchChange?: (params: { q: string; checkIn: string; checkOut: string; guests: string }) => void;
  onSearchSubmit?: (params: {
    q: string;
    checkIn: string;
    checkOut: string;
    guests: string;
    adults: number;
    children: number;
    rooms: number;
    pets: boolean;
  }) => void;
  compact?: boolean;
}

export function Group72SearchBar({
  initialQuery = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = "",
  onSearchChange,
  onSearchSubmit,
  compact = false,
}: Group72SearchBarProps) {
  const router = useRouter();

  // Search Parameters State
  const [whereTo, setWhereTo] = useState(initialQuery);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guestsBreakdown, setGuestsBreakdown] = useState<GuestsBreakdown>(() => {
    const num = parseInt(initialGuests, 10);
    return {
      adults: isNaN(num) || num < 1 ? 2 : num,
      children: 0,
      infants: 0,
      rooms: 1,
      pets: false,
    };
  });

  // Active Popover State (null | "destination" | "checkIn" | "checkOut" | "guests")
  const [activePopover, setActivePopover] = useState<SearchActivePopover>(null);
  const [resultsMsg, setResultsMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWhereTo(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setCheckIn(initialCheckIn);
  }, [initialCheckIn]);

  useEffect(() => {
    setCheckOut(initialCheckOut);
  }, [initialCheckOut]);

  // Click outside to close any open popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format Helper for dates in the search bar
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const totalGuests = guestsBreakdown.adults + guestsBreakdown.children;

  // Handle Destination Select -> auto-advance to date picker
  const handleDestinationSelect = (item: SearchResultItem) => {
    setWhereTo(item.title);
    if (!checkIn) {
      setActivePopover("checkIn");
    } else if (!checkOut) {
      setActivePopover("checkOut");
    } else {
      setActivePopover(null);
    }
  };

  // Handle Dates Selected
  const handleDatesChange = (newCheckIn: string, newCheckOut: string) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    if (newCheckIn && newCheckOut) {
      // Auto-advance to guests if not set
      setActivePopover("guests");
    }
  };

  // Execute Search
  const executeSearch = () => {
    setActivePopover(null);

    const guestsString = String(totalGuests);

    if (onSearchChange) {
      onSearchChange({
        q: whereTo.trim(),
        checkIn,
        checkOut,
        guests: guestsString,
      });
      return;
    }

    if (onSearchSubmit) {
      onSearchSubmit({
        q: whereTo.trim(),
        checkIn,
        checkOut,
        guests: guestsString,
        adults: guestsBreakdown.adults,
        children: guestsBreakdown.children,
        rooms: guestsBreakdown.rooms,
        pets: guestsBreakdown.pets,
      });
      return;
    }

    const params = new URLSearchParams();
    if (whereTo.trim()) params.set("q", whereTo.trim());
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (totalGuests > 0) params.set("guests", guestsString);
    if (guestsBreakdown.rooms > 1) params.set("rooms", String(guestsBreakdown.rooms));
    if (guestsBreakdown.pets) params.set("pets", "true");

    router.push(`/search?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* FIGMA EXACT MATCH GROUP 72 SEARCH BAR (Rectangle 81: #FFFFFF, radius: 10px) */}
      <div
        className={`bg-white rounded-[10px] shadow-[0_12px_36px_-10px_rgba(1,35,78,0.18)] border transition-all ${
          activePopover ? "border-[#005CE5] ring-2 ring-[#005CE5]/15" : "border-[#E5E9F2]"
        } p-2.5 sm:p-3`}
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-0 lg:divide-x lg:divide-[#9197A8]/30"
        >
          {/* FIELD 1: WHERE TO? (Trigger for Group 73) */}
          <div
            onClick={() =>
              setActivePopover(activePopover === "destination" ? null : "destination")
            }
            className={`flex-1 relative flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              activePopover === "destination"
                ? "bg-[#EBF2FC]"
                : "hover:bg-[#F8FAFD]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full min-w-0">
              <label className="text-[12px] sm:text-[13px] font-semibold text-[#132555] tracking-tight cursor-pointer">
                Where to?
              </label>
              <div className="text-xs sm:text-[13px] font-medium text-[#132555] truncate">
                {whereTo.trim() ? (
                  <span className="font-bold text-[#05326B]">{whereTo}</span>
                ) : (
                  <span className="text-[#57617E]">Search Quezon destinations...</span>
                )}
              </div>
            </div>

            {whereTo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setWhereTo("");
                }}
                className="p-1 rounded-full text-[#57617E] hover:text-[#132555] hover:bg-gray-100 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* FIELD 2: CHECK-IN (Trigger for Group 74) */}
          <div
            onClick={() =>
              setActivePopover(activePopover === "checkIn" ? null : "checkIn")
            }
            className={`flex-1 relative flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              activePopover === "checkIn"
                ? "bg-[#EBF2FC]"
                : "hover:bg-[#F8FAFD]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full min-w-0">
              <label className="text-[12px] sm:text-[13px] font-semibold text-[#132555] tracking-tight cursor-pointer">
                Check-in
              </label>
              <div className="text-xs sm:text-[13px] font-medium text-[#132555] truncate">
                {checkIn ? (
                  <span className="font-bold text-[#05326B]">{formatShortDate(checkIn)}</span>
                ) : (
                  <span className="text-[#57617E]">Add date</span>
                )}
              </div>
            </div>
          </div>

          {/* FIELD 3: CHECK-OUT (Trigger for Group 74) */}
          <div
            onClick={() =>
              setActivePopover(activePopover === "checkOut" ? null : "checkOut")
            }
            className={`flex-1 relative flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              activePopover === "checkOut"
                ? "bg-[#EBF2FC]"
                : "hover:bg-[#F8FAFD]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full min-w-0">
              <label className="text-[12px] sm:text-[13px] font-semibold text-[#132555] tracking-tight cursor-pointer">
                Check-out
              </label>
              <div className="text-xs sm:text-[13px] font-medium text-[#132555] truncate">
                {checkOut ? (
                  <span className="font-bold text-[#05326B]">{formatShortDate(checkOut)}</span>
                ) : (
                  <span className="text-[#57617E]">Add date</span>
                )}
              </div>
            </div>
          </div>

          {/* FIELD 4: GUESTS (Trigger for Group 75) */}
          <div
            onClick={() =>
              setActivePopover(activePopover === "guests" ? null : "guests")
            }
            className={`flex-1 relative flex items-center gap-3 px-3 sm:px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              activePopover === "guests"
                ? "bg-[#EBF2FC]"
                : "hover:bg-[#F8FAFD]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F0F4FA] flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-[#05326B]" />
            </div>
            <div className="flex flex-col text-left w-full min-w-0">
              <label className="text-[12px] sm:text-[13px] font-semibold text-[#132555] tracking-tight cursor-pointer">
                Guests & Rooms
              </label>
              <div className="text-xs sm:text-[13px] font-medium text-[#132555] truncate">
                {totalGuests > 0 ? (
                  <span className="font-bold text-[#05326B]">
                    {totalGuests} {totalGuests === 1 ? "Guest" : "Guests"}
                    {guestsBreakdown.rooms > 1 ? `, ${guestsBreakdown.rooms} Rooms` : ""}
                  </span>
                ) : (
                  <span className="text-[#57617E]">Add guests</span>
                )}
              </div>
            </div>
          </div>

          {/* SEARCH BUTTON (Rectangle 82: #05326B, radius: 10px) */}
          <div className="p-1 lg:pl-3">
            <button
              type="submit"
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 bg-[#05326B] hover:bg-[#01234E] active:bg-[#031d40] text-white rounded-[10px] px-8 py-3.5 text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* FEEDBACK NOTIFICATION */}
      {resultsMsg && (
        <div className="mt-3 px-4 py-2.5 bg-[#01864C]/10 border border-[#01864C]/20 text-[#01864C] text-xs font-semibold rounded-[10px] flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#01864C]" />
          <span>{resultsMsg}</span>
        </div>
      )}

      {/* FLOATING POPOVER CONTAINER FOR ACTIVE LAYOUT */}
      {activePopover && (
        <div className="absolute top-full left-0 right-0 mt-3 z-50 animate-fadeIn">
          {/* GROUP 73: WHERE TO / DESTINATION SELECTOR */}
          {activePopover === "destination" && (
            <Group73DestinationSelector
              value={whereTo}
              onChange={setWhereTo}
              onSelect={handleDestinationSelect}
              onClose={() => setActivePopover(null)}
            />
          )}

          {/* GROUP 74: CHECK-IN & CHECK-OUT DATE RANGE PICKER */}
          {(activePopover === "checkIn" || activePopover === "checkOut") && (
            <Group74DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onDatesChange={handleDatesChange}
              onClose={() => setActivePopover(null)}
            />
          )}

          {/* GROUP 75: GUESTS & ROOMS SELECTOR */}
          {activePopover === "guests" && (
            <Group75GuestsRoomsSelector
              value={guestsBreakdown}
              onChange={setGuestsBreakdown}
              onClose={() => setActivePopover(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
