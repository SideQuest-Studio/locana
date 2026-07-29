"use client";

import React, { useState } from "react";
import { MapPin, Calendar, Users, Search, CheckCircle2 } from "lucide-react";
import { ATTRACTIONS } from "@/src/lib/attractions";

export default function SearchBar() {
  const [whereTo, setWhereTo] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");
  const [resultsMsg, setResultsMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = ATTRACTIONS.filter(
      a =>
        !whereTo ||
        a.name.toLowerCase().includes(whereTo.toLowerCase()) ||
        a.location.toLowerCase().includes(whereTo.toLowerCase()),
    ).length;
    setResultsMsg(
      `${count} adventure${count === 1 ? "" : "s"} found — scroll down to explore!`,
    );
    setTimeout(() => setResultsMsg(null), 5000);
  };

  return (
    <div className="bg-white rounded-[28px] sm:rounded-full shadow-[0_24px_60px_-20px_rgba(31,42,46,0.35)] p-3 sm:p-3">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 sm:divide-x sm:divide-[#F0DFC2]"
      >
        <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-3">
          <MapPin className="h-4 w-4 text-[#1E88E5] shrink-0" />
          <div className="flex flex-col text-left w-full">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64716F]">
              Where to?
            </label>
            <input
              type="text"
              value={whereTo}
              onChange={e => setWhereTo(e.target.value)}
              placeholder="Search destinations, places..."
              className="text-sm font-semibold bg-transparent focus:outline-none placeholder-[#A8AD9C] w-full"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-3">
          <Calendar className="h-4 w-4 text-[#0E7C7B] shrink-0" />
          <div className="flex flex-col text-left w-full">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64716F]">
              Check-in
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
              className="text-sm font-semibold bg-transparent focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-3">
          <Calendar className="h-4 w-4 text-[#F4A93E] shrink-0" />
          <div className="flex flex-col text-left w-full">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64716F]">
              Check-out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
              className="text-sm font-semibold bg-transparent focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-3">
          <Users className="h-4 w-4 text-[#1E88E5] shrink-0" />
          <div className="flex flex-col text-left w-full">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64716F]">
              Guests
            </label>
            <input
              type="number"
              min={1}
              value={guests}
              onChange={e => setGuests(e.target.value)}
              placeholder="Add guests"
              className="text-sm font-semibold bg-transparent focus:outline-none placeholder-[#A8AD9C] w-full"
            />
          </div>
        </div>

        <div className="p-1.5 sm:pl-3">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1F2A2E] hover:bg-[#0E241D] text-white rounded-full px-6 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </form>

      {resultsMsg && (
        <div className="mt-2 mx-3 mb-1 px-4 py-2.5 bg-[#0E7C7B]/10 text-[#0B5E5D] text-xs font-semibold rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {resultsMsg}
        </div>
      )}
    </div>
  );
}
