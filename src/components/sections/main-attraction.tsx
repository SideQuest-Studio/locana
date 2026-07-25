"use client"

import { ChevronRight, MapPin, Star } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Attraction } from "@/types";
import { ATTRACTIONS } from "@/data/attractions";

interface MainAttractionProps {
  openBookingModal: (attraction: Attraction) => void;
}

export default function MainAttraction({ openBookingModal }: MainAttractionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredAttractions = useMemo(() => {
    return ATTRACTIONS.filter(a => activeCategory === "all" || a.category === activeCategory);
  }, [activeCategory]);


  return (
    <section id="destinations" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-100">
        <div className="max-w-xl">
          <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
            Curated Escapes
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            Protected Nature Reserves
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            All bookings are capped at strict daily visitor counts. Check availability and secure slots with verified Ivatan, Cebuano, and Palawan local councils.
          </p>
        </div>

        {/* Filtering tabs */}
        <div className="flex flex-wrap gap-1.5 mt-4 md:mt-0">
          {["all", "beaches", "mountains", "waterfalls", "forests"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors duration-250 ${activeCategory === cat
                ? "bg-teal-750 text-slate-900"
                : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Attractions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredAttractions.map((attraction) => (
          <article
            key={attraction.id}
            className="bg-white border border-slate-200/70 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col h-full group"
          >
            {/* Card Image Area */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
              <Image
                src={attraction.image}
                alt={attraction.name}
                fill
                className="object-cover"
              />

              {/* Rating Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded bg-white/95 border border-slate-100 text-[10px] font-bold text-slate-800">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span>{attraction.rating}</span>
              </div>
            </div>

            {/* Card Details */}
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-1 text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                <MapPin className="h-3 w-3 text-teal-650" />
                <span>{attraction.location}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-2 block">
                {attraction.name}
              </h3>

              <p className="text-xs text-slate-500 mt-2 flex-1 leading-relaxed">
                {attraction.description}
              </p>

              {/* Highlights Tags */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {attraction.tags.slice(0, 2).map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-slate-50 text-slate-500 border border-slate-200/50"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <hr className="border-slate-100 my-4" />

              {/* Price and Action */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Pass Fee</span>
                  <span className="text-sm font-bold text-slate-800">
                    ₱{attraction.price.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={() => openBookingModal(attraction)}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 border border-slate-200 hover:border-teal-700 hover:bg-slate-50 text-slate-700 hover:text-teal-750 text-xs font-semibold rounded-md transition-all"
                >
                  <span>Reserve Slot</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
