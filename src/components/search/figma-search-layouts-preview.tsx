"use client";

import React, { useState } from "react";
import {
  Group72SearchBar,
} from "./group-72-search-bar";
import {
  Group73DestinationSelector,
} from "./group-73-destination-selector";
import {
  Group74DateRangePicker,
} from "./group-74-date-range-picker";
import {
  Group75GuestsRoomsSelector,
} from "./group-75-guests-rooms-selector";
import {
  Layers,
  MapPin,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  Code2,
  Palette,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import type { GuestsBreakdown, SearchResultItem } from "@/src/types/search.types";

export function FigmaSearchLayoutsPreview() {
  const [activeTab, setActiveTab] = useState<"all" | "72" | "73" | "74" | "75">("all");

  // Sample state for standalone inspection
  const [sampleWhereTo, setSampleWhereTo] = useState("Lucban");
  const [sampleCheckIn, setSampleCheckIn] = useState("2026-08-20");
  const [sampleCheckOut, setSampleCheckOut] = useState("2026-08-23");
  const [sampleGuests, setSampleGuests] = useState<GuestsBreakdown>({
    adults: 2,
    children: 1,
    infants: 0,
    rooms: 1,
    pets: true,
  });

  return (
    <section className="w-full py-12 px-4 sm:px-6 lg:px-8 bg-[#F8FAFD] border-y border-[#E5E9F2]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E9F2] shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#05326B] text-white">
                FIGMA DESIGN SYSTEM
              </span>
              <span className="text-xs font-semibold text-[#005CE5]">
                DIP Landing Page &middot; Search Layouts
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#132555] tracking-tight">
              Figma Search Layouts (Groups 72, 73, 74, 75)
            </h2>
            <p className="text-xs sm:text-sm text-[#57617E]">
              Pixel-perfect implementation of the 4 search layout artboards beside the DIP Landing Page.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F0F4FA] p-1.5 rounded-xl border border-[#E5E9F2]">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              All Groups View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("72")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "72"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              Group 72 (Search Bar)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("73")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "73"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              Group 73 (Where to)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("74")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "74"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              Group 74 (Dates)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("75")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "75"
                  ? "bg-white text-[#05326B] shadow-xs"
                  : "text-[#57617E] hover:text-[#132555]"
              }`}
            >
              Group 75 (Guests)
            </button>
          </div>
        </div>

        {/* COMPOSITE INTERACTIVE GROUP 72 (Integrated Search Bar with Live Popovers) */}
        {(activeTab === "all" || activeTab === "72") && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E9F2] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#05326B] text-white text-xs font-bold flex items-center justify-center">
                  72
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#132555]">
                    Group 72 — Master Search Bar Container & Triggers
                  </h3>
                  <p className="text-xs text-[#57617E]">
                    Rectangle 81 (#FFFFFF, radius: 10px, border #E5E9F2) + Rectangle 82 (#05326B Search CTA)
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#01864C] bg-[#01864C]/10 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="h-3.5 w-3.5" /> Interactive Live
              </span>
            </div>

            <div className="pt-2">
              <Group72SearchBar />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-[11px] text-[#57617E]">
              <div className="bg-[#F8FAFD] p-2.5 rounded-lg border border-[#E5E9F2]">
                <strong className="text-[#132555] block">Trigger 1</strong> Where to? &rarr; Opens Group 73
              </div>
              <div className="bg-[#F8FAFD] p-2.5 rounded-lg border border-[#E5E9F2]">
                <strong className="text-[#132555] block">Trigger 2</strong> Check-in &rarr; Opens Group 74
              </div>
              <div className="bg-[#F8FAFD] p-2.5 rounded-lg border border-[#E5E9F2]">
                <strong className="text-[#132555] block">Trigger 3</strong> Check-out &rarr; Opens Group 74
              </div>
              <div className="bg-[#F8FAFD] p-2.5 rounded-lg border border-[#E5E9F2]">
                <strong className="text-[#132555] block">Trigger 4</strong> Guests &rarr; Opens Group 75
              </div>
            </div>
          </div>
        )}

        {/* GROUP 73: DESTINATION SELECTOR ARTBOARD */}
        {(activeTab === "all" || activeTab === "73") && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E9F2] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#005CE5] text-white text-xs font-bold flex items-center justify-center">
                  73
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#132555]">
                    Group 73 — Where To? &amp; Quezon Municipality Selector
                  </h3>
                  <p className="text-xs text-[#57617E]">
                    Search query input, Quick Municipality Pills (Lucban, Lucena, Tayabas, Pagbilao, Infanta, etc.), and Database Matches
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 max-w-2xl mx-auto">
              <Group73DestinationSelector
                value={sampleWhereTo}
                onChange={setSampleWhereTo}
                onSelect={(item: SearchResultItem) => setSampleWhereTo(item.title)}
                standalone
              />
            </div>
          </div>
        )}

        {/* GROUP 74: DATES & CALENDAR ARTBOARD */}
        {(activeTab === "all" || activeTab === "74") && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E9F2] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#ECBA59] text-white text-xs font-bold flex items-center justify-center">
                  74
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#132555]">
                    Group 74 — Check-in &amp; Check-out Date Range Picker
                  </h3>
                  <p className="text-xs text-[#57617E]">
                    Dual-month calendar view, range highlight, stay length counter, and quick presets (This Weekend, Next Weekend, 3 Days)
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 max-w-3xl mx-auto">
              <Group74DateRangePicker
                checkIn={sampleCheckIn}
                checkOut={sampleCheckOut}
                onDatesChange={(inD, outD) => {
                  setSampleCheckIn(inD);
                  setSampleCheckOut(outD);
                }}
                standalone
              />
            </div>
          </div>
        )}

        {/* GROUP 75: GUESTS & ROOMS SELECTOR ARTBOARD */}
        {(activeTab === "all" || activeTab === "75") && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E9F2] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FE5F01] text-white text-xs font-bold flex items-center justify-center">
                  75
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#132555]">
                    Group 75 — Guests, Rooms &amp; Accommodations Stepper
                  </h3>
                  <p className="text-xs text-[#57617E]">
                    Adults, Children, Infants, Rooms/Cottages increment/decrement steppers + Pet-friendly resort filter toggle
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 max-w-md mx-auto">
              <Group75GuestsRoomsSelector
                value={sampleGuests}
                onChange={setSampleGuests}
                standalone
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
