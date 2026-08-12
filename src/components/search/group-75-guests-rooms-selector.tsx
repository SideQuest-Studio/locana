"use client";

import React from "react";
import {
  Users,
  Plus,
  Minus,
  BedDouble,
  Dog,
  Baby,
  RotateCcw,
  Check,
  X,
  Info,
} from "lucide-react";
import type { GuestsBreakdown } from "@/src/types/search.types";

export interface Group75GuestsRoomsSelectorProps {
  value: GuestsBreakdown;
  onChange: (value: GuestsBreakdown) => void;
  onClose?: () => void;
  standalone?: boolean;
}

export function Group75GuestsRoomsSelector({
  value,
  onChange,
  onClose,
  standalone = false,
}: Group75GuestsRoomsSelectorProps) {
  const updateCount = (key: keyof Omit<GuestsBreakdown, "pets">, delta: number) => {
    const minValues: Record<string, number> = {
      adults: 1,
      children: 0,
      infants: 0,
      rooms: 1,
    };
    const maxValues: Record<string, number> = {
      adults: 20,
      children: 10,
      infants: 6,
      rooms: 8,
    };

    const current = value[key];
    const nextVal = Math.max(minValues[key], Math.min(maxValues[key], current + delta));
    onChange({
      ...value,
      [key]: nextVal,
    });
  };

  const togglePets = () => {
    onChange({
      ...value,
      pets: !value.pets,
    });
  };

  const handleReset = () => {
    onChange({
      adults: 2,
      children: 0,
      infants: 0,
      rooms: 1,
      pets: false,
    });
  };

  const totalGuests = value.adults + value.children;

  return (
    <div
      className={`bg-white rounded-[14px] shadow-[0_20px_50px_-10px_rgba(1,35,78,0.22)] border border-[#E5E9F2] overflow-hidden ${
        standalone ? "w-full max-w-md mx-auto" : "w-full"
      }`}
    >
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-[#F8FAFD] border-b border-[#E5E9F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#005CE5]/10 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-[#005CE5]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#132555] tracking-tight">
              Guests & Rooms Selection
            </h4>
            <p className="text-[10px] text-[#57617E]">
              {totalGuests} {totalGuests === 1 ? "Guest" : "Guests"} · {value.rooms}{" "}
              {value.rooms === 1 ? "Room/Cottage" : "Rooms/Cottages"}
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

      {/* Counter List */}
      <div className="p-4 divide-y divide-[#F0F4FA] space-y-3.5 bg-white">
        {/* ROW 1: Adults */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-xs font-bold text-[#132555]">Adults</div>
            <div className="text-[10px] text-[#57617E] mt-0.5">Ages 13 and above</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={value.adults <= 1}
              onClick={() => updateCount("adults", -1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-xs font-bold text-[#132555]">
              {value.adults}
            </span>
            <button
              type="button"
              disabled={value.adults >= 20}
              onClick={() => updateCount("adults", 1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ROW 2: Children */}
        <div className="flex items-center justify-between pt-3.5">
          <div>
            <div className="text-xs font-bold text-[#132555]">Children</div>
            <div className="text-[10px] text-[#57617E] mt-0.5">Ages 2 – 12</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={value.children <= 0}
              onClick={() => updateCount("children", -1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-xs font-bold text-[#132555]">
              {value.children}
            </span>
            <button
              type="button"
              disabled={value.children >= 10}
              onClick={() => updateCount("children", 1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ROW 3: Infants */}
        <div className="flex items-center justify-between pt-3.5">
          <div>
            <div className="text-xs font-bold text-[#132555]">Infants</div>
            <div className="text-[10px] text-[#57617E] mt-0.5">Under 2 (not counted in limit)</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={value.infants <= 0}
              onClick={() => updateCount("infants", -1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-xs font-bold text-[#132555]">
              {value.infants}
            </span>
            <button
              type="button"
              disabled={value.infants >= 6}
              onClick={() => updateCount("infants", 1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ROW 4: Rooms / Cottages */}
        <div className="flex items-center justify-between pt-3.5">
          <div>
            <div className="text-xs font-bold text-[#132555] flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-[#005CE5]" />
              Rooms / Cottages
            </div>
            <div className="text-[10px] text-[#57617E] mt-0.5">Number of units to book</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={value.rooms <= 1}
              onClick={() => updateCount("rooms", -1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-xs font-bold text-[#132555]">
              {value.rooms}
            </span>
            <button
              type="button"
              disabled={value.rooms >= 8}
              onClick={() => updateCount("rooms", 1)}
              className="w-8 h-8 rounded-full border border-[#E5E9F2] bg-[#F8FAFD] hover:bg-[#EBF2FC] active:bg-[#D6E6F8] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-[#132555] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ROW 5: Pets Toggle */}
        <div className="flex items-center justify-between pt-3.5">
          <div>
            <div className="text-xs font-bold text-[#132555] flex items-center gap-1.5">
              <Dog className="h-3.5 w-3.5 text-[#FE5F01]" />
              Pet-Friendly Stays
            </div>
            <div className="text-[10px] text-[#57617E] mt-0.5">Filter for resorts allowing pets</div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={value.pets}
            onClick={togglePets}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              value.pets ? "bg-[#05326B]" : "bg-gray-200"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                value.pets ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Footer info & CTA */}
      <div className="px-4 py-3 bg-[#F8FAFD] border-t border-[#E5E9F2] flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#57617E] hover:text-[#132555] transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
