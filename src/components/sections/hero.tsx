"use client"

import { CheckCircle2, Compass, MapPin, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { ATTRACTIONS } from "@/src/data/attractions";

export default function Hero() {

  // Search form state
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [searchResultsMsg, setSearchResultsMsg] = useState<string | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let count = 0;

    ATTRACTIONS.forEach(attraction => {
      const matchLoc = !searchLocation || attraction.location.toLowerCase().includes(searchLocation.toLowerCase());
      const matchCat = searchCategory === "all" || attraction.category === searchCategory;
      if (matchLoc && matchCat) {
        count++;
      }
    });

    setSearchResultsMsg(`Found ${count} eco-attractions matching your filters. See selections below.`);
    setTimeout(() => setSearchResultsMsg(null), 5000);
  };

  return (
    <section className="relative bg-white py-16 md:py-24 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Text details */}
          <div className="lg:col-span-6 flex flex-col items-start">

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-50 border border-slate-200/60 text-slate-500 font-semibold text-[10px] uppercase tracking-wider mb-6">
              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
              <span>Sustainable Philippines Reservations</span>
            </div>

            {/* Tagline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mb-4">
              Explore, Discover, Recover <br />
              <span className="text-teal-750 font-serif italic font-normal">and breathe</span> with nature near to you.
            </h1>

            <p className="text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed mb-8">
              DIP connects conscious travelers with certified indigenous tour guides in low-impact, biological preservation areas. Avoid crowds, support local stewards, and breathe in protected spaces.
            </p>

            {/* Minimal Search widget */}
            <div className="w-full bg-[#fbfdfc] border border-slate-200 rounded-xl p-4 shadow-xs">
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Location Selector */}
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-teal-600" /> Destination
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Palawan, Batanes"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
                  />
                </div>

                {/* Category Selector */}
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Compass className="h-3 w-3 text-teal-600" /> Category
                  </label>
                  <select
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-700"
                  >
                    <option value="all">All Landscapes</option>
                    <option value="beaches">Beaches & Lagoons</option>
                    <option value="mountains">Mountains & Hills</option>
                    <option value="waterfalls">Waterfalls & Canyons</option>
                    <option value="forests">Palm Canopy</option>
                  </select>
                </div>

                {/* Search CTA */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-teal-750 hover:bg-teal-800 text-white rounded-md text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search Options</span>
                  </button>
                </div>

              </form>

              {/* Toast alerts */}
              {searchResultsMsg && (
                <div className="mt-3 px-3 py-1.5 bg-teal-50/60 border border-teal-100 text-teal-700 text-[11px] rounded-md flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{searchResultsMsg}</span>
                </div>
              )}
            </div>

          </div>

          {/* Visual element on right */}
          <div className="lg:col-span-6 relative aspect-video lg:aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <Image
              src="/hero.jpg"
              alt="El Nido Palawan Lagoon"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 border border-slate-100 rounded-lg p-3 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Featured Preserve</span>
                <span className="text-xs font-bold text-slate-800">Twin Lagoons, El Nido</span>
              </div>
              <div className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Palawan
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
