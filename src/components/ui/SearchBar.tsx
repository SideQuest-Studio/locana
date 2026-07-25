"use client";

import React, { useState } from "react";
import { MapPin, Compass, Calendar, Users, Search, CheckCircle2 } from "lucide-react";
import { ATTRACTIONS } from "@/src/lib/attractions";

export default function SearchBar() {
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("all");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");
  const [resultsMsg, setResultsMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = ATTRACTIONS.filter(a => {
      const matchLoc = !location || a.location.toLowerCase().includes(location.toLowerCase());
      const matchCat = category === "all" || a.category === category;
      return matchLoc && matchCat;
    }).length;
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
              Where to
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Palawan, Batanes, Cebu..."
              className="text-sm font-semibold bg-transparent focus:outline-none placeholder-[#A8AD9C]"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-3">
          <Compass className="h-4 w-4 text-[#0E7C7B] shrink-0" />
          <div className="flex flex-col text-left w-full">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64716F]">
              Experience
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="text-sm font-semibold bg-transparent focus:outline-none"
            >
              <option value="all">Any landscape</option>
              <option value="beaches">Beaches & Lagoons</option>
              <option value="mountains">Mountains & Hills</option>
              <option value="waterfalls">Waterfalls & Canyons</option>
              <option value="forests">Rivers & Canopy</option>
            </select>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-3">
          <Calendar className="h-4 w-4 text-[#F4A93E] shrink-0" />
          <div className="flex flex-col text-left w-full">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64716F]">
              When
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-sm font-semibold bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 px-4 sm:px-5 py-3">
          <Users className="h-4 w-4 text-[#1E88E5] shrink-0" />
          <div className="flex flex-col text-left w-full">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#64716F]">
              Travelers
            </label>
            <select
              value={guests}
              onChange={e => setGuests(e.target.value)}
              className="text-sm font-semibold bg-transparent focus:outline-none"
            >
              <option value="1">1 Adult</option>
              <option value="2">2 Adults</option>
              <option value="3">2 Adults, 1 Child</option>
              <option value="4">Family (4+)</option>
            </select>
          </div>
        </div>

        <div className="p-1.5 sm:pl-3">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1E88E5] hover:bg-[#E85A3B] text-white rounded-full px-6 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95 shadow-[0_10px_24px_-8px_rgba(255,107,74,0.55)]"
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
