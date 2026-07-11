"use client";

import React from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import SearchBar from "@/src/components/ui/SearchBar";
import { STATS, ATTRACTIONS } from "@/src/lib/attractions";
import { useCountUp } from "@/src/hooks/useCountUp";

function StatPill({
  value,
  suffix,
  label,
  decimals,
}: {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  const { ref, value: animated } = useCountUp(value, decimals ?? 0);
  return (
    <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-3 min-w-[128px]">
      <div
        className="text-white text-xl font-bold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span ref={ref}>{animated}</span>
        {suffix}
      </div>
      <div className="text-white/70 text-[10px] uppercase tracking-wider font-bold mt-0.5">
        {label}
      </div>
    </div>
  );
}

export default function HeroSection() {
  const preview1 = ATTRACTIONS[1];
  const preview2 = ATTRACTIONS[2];

  return (
    <section className="relative min-h-[100svh] flex flex-col overflow-visible">
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero.jpg"
          alt="El Nido Palawan lagoon"
          fill
          priority
          className="object-cover kenburns"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1F2A2E]/50 via-[#1F2A2E]/20 to-[#0B5E5D]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E88E5]/10 to-transparent" />
      </div>

      {/* Floating mini destination previews */}
      <div
        className="hidden lg:flex absolute right-10 top-32 flex-col items-end gap-2 float z-10"
        style={{ ["--float-rot" as string]: "3deg" }}
      >
        <div className="w-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30">
          <div className="relative aspect-square">
            <Image src={preview1.image} alt={preview1.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-2 left-2.5 text-white text-[11px] font-bold">
              {preview1.location}
            </span>
          </div>
        </div>
      </div>
      <div
        className="hidden lg:flex absolute left-10 bottom-56 flex-col gap-2 float-slow z-10"
        style={{ ["--float-rot" as string]: "-4deg" }}
      >
        <div className="w-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30">
          <div className="relative aspect-[4/5]">
            <Image src={preview2.image} alt={preview2.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-2 left-2.5 text-white text-[11px] font-bold">
              {preview2.location}
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 pt-28">
        <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-full mb-7">
          Sustainable Philippines Escapes
        </span>

        <h1
          className="text-white text-[42px] sm:text-[64px] md:text-[76px] leading-[1.02] font-semibold max-w-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your next adventure
          <br />
          starts <span className="text-[#F4A93E]">near you</span>
        </h1>

        <p className="text-white/85 text-base sm:text-lg max-w-xl mt-6 leading-relaxed">
          Discover hidden lagoons, wind-swept hills, and jungle rivers — booked directly with
          the local guides who protect them.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {STATS.map(s => (
            <StatPill
              key={s.label}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              decimals={s.decimals}
            />
          ))}
        </div>
      </div>

      {/* Search bar overlapping the wave */}
      <div className="relative z-20 max-w-5xl mx-auto w-full px-5 sm:px-8 -mb-8 sm:-mb-10">
        <SearchBar />
      </div>

      {/* Curved wave transition into next section */}
      <div className="relative z-10 -mt-1">
        <svg
          viewBox="0 0 1440 120"
          className="w-full h-[70px] sm:h-[110px]"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,48 L1440,120 L0,120 Z"
            fill="#FFF8EE"
          />
        </svg>
      </div>
    </section>
  );
}
