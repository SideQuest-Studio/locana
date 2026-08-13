"use client";

import Link from "next/link";
import {
  Store,
  Calendar as CalendarIcon,
  Luggage,
  Star,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatCardData {
  id: string;
  title: string;
  value: number | string;
  description: string;
  /** Key of ICON_MAP below */
  icon: string;
  trend?: string | null;
  trendType?: "up" | "down" | null;
  actionLabel: string;
  actionHref: string;
}

// ─── Icon registry ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Store,
  CalendarIcon,
  Luggage,
  Star,
};

// ─── Star row for rating card ─────────────────────────────────────────────

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= Math.floor(value);
        const half = !filled && n - value < 1 && n - value > 0;
        return (
          <svg key={n} className="h-3.5 w-3.5" viewBox="0 0 20 20">
            {(filled || half) && (
              <defs>
                <linearGradient id={`g-${n}`}>
                  <stop
                    offset={filled ? "100%" : `${(1 - (n - value)) * 100}%`}
                    stopColor="#F59E0B"
                  />
                  <stop
                    offset={filled ? "100%" : `${(1 - (n - value)) * 100}%`}
                    stopColor="#D1D5DB"
                  />
                </linearGradient>
              </defs>
            )}
            <path
              fill={filled ? "#F59E0B" : half ? `url(#g-${n})` : "#D1D5DB"}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        );
      })}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

export function StatCard({ stat }: { stat: StatCardData }) {
  const Icon = ICON_MAP[stat.icon] ?? Store;
  const isRating = stat.id === "rating";

  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] p-5 flex flex-col gap-3 hover:shadow-[0_8px_24px_-8px_rgba(30,136,229,0.15)] transition-shadow duration-200">
      {/* Top row */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#1E88E5]/10 flex items-center justify-center shrink-0">
          <Icon className="text-[#1E88E5]" style={{ width: 22, height: 22 }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
            {stat.title}
          </p>

          <p
            className="text-[32px] font-bold text-[#1F2A2E] leading-none mt-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {stat.value}
          </p>

          {isRating && <StarRow value={Number(stat.value)} />}

          <p
            className={`text-xs mt-1.5 font-medium flex items-center gap-0.5 ${
              stat.trendType === "up"
                ? "text-emerald-600"
                : stat.trendType === "down"
                  ? "text-red-500"
                  : "text-[#64716F]"
            }`}
          >
            {stat.trendType === "up" && <TrendingUp className="h-3 w-3 mr-0.5" />}
            {stat.trendType === "down" && <TrendingDown className="h-3 w-3 mr-0.5" />}
            {stat.description}
          </p>
        </div>
      </div>

      {/* Action link */}
      <Link
        href={stat.actionHref}
        className="flex items-center justify-between pt-3 border-t border-[#F0DFC2] text-xs font-semibold text-[#1E88E5] hover:text-[#1565C0] transition-colors group"
      >
        <span>{stat.actionLabel}</span>
        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#F0DFC2]" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-2.5 bg-[#F0DFC2] rounded w-24" />
          <div className="h-8 bg-[#F0DFC2] rounded w-14" />
          <div className="h-2.5 bg-[#F0DFC2] rounded w-32" />
        </div>
      </div>
      <div className="h-3.5 bg-[#F0DFC2] rounded mt-5" />
    </div>
  );
}
