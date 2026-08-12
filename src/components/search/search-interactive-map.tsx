"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Star,
  Plus,
  Minus,
  Navigation,
  Layers,
  Sparkles,
  X,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import type { SearchResultItem } from "@/src/types/search.types";

export interface SearchInteractiveMapProps {
  properties: SearchResultItem[];
  selectedProperty: SearchResultItem | null;
  onSelectProperty: (property: SearchResultItem) => void;
  className?: string;
}

// Approximate Quezon Province town coordinates on a normalised 0-100 grid
const TOWN_COORDINATES: Record<string, { x: number; y: number }> = {
  "Lucena City": { x: 48, y: 62 },
  "Lucban": { x: 44, y: 46 },
  "Tayabas": { x: 46, y: 54 },
  "Pagbilao": { x: 58, y: 64 },
  "Infanta & Real": { x: 68, y: 22 },
  "Infanta": { x: 68, y: 20 },
  "Real": { x: 65, y: 26 },
  "Sariaya": { x: 38, y: 68 },
  "Dolores": { x: 32, y: 56 },
  "Tiaong": { x: 26, y: 62 },
  "Mauban": { x: 66, y: 44 },
};

export function SearchInteractiveMap({
  properties,
  selectedProperty,
  onSelectProperty,
  className = "",
}: SearchInteractiveMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePinProperty, setActivePinProperty] = useState<SearchResultItem | null>(null);

  const activeItem = selectedProperty || activePinProperty;

  return (
    <div
      className={`relative w-full h-[600px] lg:h-full min-h-[500px] bg-[#E8F0FA] rounded-2xl border border-[#E5E9F2] overflow-hidden shadow-xs select-none ${className}`}
    >
      {/* MAP STYLIZED SVG CANVAS */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* Background Map Grid & Province Silhouette */}
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D3E2F4" strokeWidth="0.75" />
            </pattern>
            <linearGradient id="land-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5F9F4" />
              <stop offset="100%" stopColor="#E9F2E7" />
            </linearGradient>
            <linearGradient id="water-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2EEFC" />
              <stop offset="100%" stopColor="#D5E6FA" />
            </linearGradient>
          </defs>

          {/* Sea / Ocean background */}
          <rect width="800" height="600" fill="url(#water-gradient)" />
          <rect width="800" height="600" fill="url(#map-grid)" />

          {/* Tayabas Bay & Lamon Bay Water Accents */}
          <path
            d="M 120 540 Q 300 520 480 560 Q 600 580 720 520"
            fill="none"
            stroke="#BFDBFE"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Quezon Province Stylized Landmass Shape */}
          <path
            d="M 180 580 L 220 510 L 260 480 L 320 420 L 410 380 L 460 300 L 530 200 L 580 120 L 610 80 L 640 140 L 610 240 L 540 330 L 520 420 L 560 470 L 640 500 L 600 560 L 460 550 L 340 570 Z"
            fill="url(#land-gradient)"
            stroke="#C9DFC4"
            strokeWidth="2"
          />

          {/* Mount Banahaw & San Cristobal Contour Curves */}
          <circle cx="280" cy="380" r="45" fill="#DCEDD7" opacity="0.6" />
          <circle cx="280" cy="380" r="25" fill="#CFE6C9" opacity="0.8" />
          <text x="280" y="385" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4B6B46">
            ⛰️ Mt. Banahaw
          </text>

          {/* Major Towns / Municipalities Labels */}
          {Object.entries(TOWN_COORDINATES).map(([name, coords]) => (
            <g key={name} transform={`translate(${(coords.x / 100) * 800}, ${(coords.y / 100) * 600})`}>
              <circle cx="0" cy="0" r="3" fill="#05326B" opacity="0.5" />
              <text
                x="0"
                y="14"
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#57617E"
              >
                {name}
              </text>
            </g>
          ))}
        </svg>

        {/* PRICE PIN MARKERS OVERLAY */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {properties.map((property, idx) => {
            const areaKey =
              property.areaName ||
              Object.keys(TOWN_COORDINATES).find((k) =>
                property.location.toLowerCase().includes(k.toLowerCase())
              ) ||
              "Lucena City";

            const baseCoords = TOWN_COORDINATES[areaKey] || { x: 45 + (idx % 5) * 6, y: 50 + (idx % 4) * 5 };
            // Slight jitter for multiple pins in same area
            const posX = baseCoords.x + ((idx % 3) - 1) * 3.5;
            const posY = baseCoords.y + (((idx * 2) % 3) - 1) * 3.5;

            const isSelected = activeItem?.id === property.id;
            const price = property.price || 3000;

            return (
              <div
                key={property.id}
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className="absolute pointer-events-auto z-20"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActivePinProperty(property);
                    onSelectProperty(property);
                  }}
                  onMouseEnter={() => setActivePinProperty(property)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-md transition-all transform hover:scale-110 cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-[#05326B] text-white ring-4 ring-[#05326B]/20 scale-110 z-30"
                      : "bg-white text-[#132555] hover:bg-[#05326B] hover:text-white border border-[#E5E9F2]"
                  }`}
                >
                  <MapPin className="h-3 w-3" />
                  <span>₱{price.toLocaleString()}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAP CONTROLS (Top Right) */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-30">
        <button
          type="button"
          onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 2))}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E9F2] text-[#132555] flex items-center justify-center shadow-xs hover:bg-white transition-colors cursor-pointer"
          aria-label="Zoom In"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75))}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E9F2] text-[#132555] flex items-center justify-center shadow-xs hover:bg-white transition-colors cursor-pointer"
          aria-label="Zoom Out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel(1)}
          className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E9F2] text-[#132555] flex items-center justify-center shadow-xs hover:bg-white transition-colors cursor-pointer"
          aria-label="Reset Map"
        >
          <Navigation className="h-4 w-4" />
        </button>
      </div>

      {/* TOP LEFT MAP INFO BADGE */}
      <div className="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E5E9F2] shadow-xs text-xs font-bold text-[#132555] flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#01864C] animate-pulse" />
        <span>Interactive Map · Quezon Province</span>
      </div>

      {/* FLOATING HOVER / CLICK PROPERTY PREVIEW CARD (Bottom Center) */}
      {activeItem && (
        <div className="absolute bottom-4 inset-x-4 max-w-sm mx-auto z-40 animate-scaleUp">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E5E9F2] p-3 flex gap-3 relative">
            <button
              type="button"
              onClick={() => setActivePinProperty(null)}
              className="absolute top-2 right-2 p-1 rounded-full text-[#57617E] hover:text-[#132555] bg-white/80"
            >
              <X className="h-3 w-3" />
            </button>

            {/* Thumbnail */}
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              <Image
                src={activeItem.image || "/hero.jpg"}
                alt={activeItem.title}
                fill
                className="object-cover"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#ECBA59]">
                <Star className="h-3 w-3 fill-[#ECBA59]" />
                <span className="text-[#132555]">{activeItem.rating || 4.9}</span>
                <span className="text-[#57617E] font-normal">
                  ({activeItem.reviewsCount || 120})
                </span>
              </div>

              <h4 className="text-xs font-bold text-[#132555] truncate mt-0.5">
                {activeItem.title}
              </h4>

              <p className="text-[10px] text-[#57617E] truncate">
                {activeItem.areaName || activeItem.location}
              </p>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#F0F4FA]">
                <span className="text-xs font-extrabold text-[#01864C]">
                  ₱{(activeItem.price || 3000).toLocaleString()}/nt
                </span>

                <button
                  type="button"
                  onClick={() => onSelectProperty(activeItem)}
                  className="px-2.5 py-1 bg-[#05326B] hover:bg-[#01234E] text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Details</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
