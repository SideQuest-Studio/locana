"use client";

import {
  Calendar,
  CalendarPlus,
  Building2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { PartnerBookingsStats } from "@/src/types/database.types";

// ─── Config ───────────────────────────────────────────────────────────────────

const CARDS = [
  {
    key: "total_bookings" as const,
    label: "Total Bookings",
    sub: "This month",
    icon: Calendar,
    color: "bg-[#1E88E5]/10 text-[#1E88E5]",
  },
  {
    key: "upcoming_checkins" as const,
    label: "Upcoming Check-ins",
    sub: "In the next 7 days",
    icon: CalendarPlus,
    color: "bg-blue-50 text-blue-600",
  },
  {
    key: "ongoing_stays" as const,
    label: "Ongoing Stays",
    sub: "Currently staying",
    icon: Building2,
    color: "bg-teal-50 text-teal-600",
  },
  {
    key: "completed" as const,
    label: "Completed",
    sub: "This month",
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "cancelled" as const,
    label: "Cancelled",
    sub: "This month",
    icon: XCircle,
    color: "bg-red-50 text-red-500",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface BookingsMetricCardsProps {
  stats: PartnerBookingsStats;
}

export function BookingsMetricCards({ stats }: BookingsMetricCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="bg-white rounded-2xl border border-[#F0DFC2] p-4 flex flex-col gap-2 hover:shadow-[0_8px_24px_-8px_rgba(30,136,229,0.12)] transition-shadow duration-200"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}
              >
                <Icon style={{ width: 20, height: 20 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#64716F] uppercase tracking-wide truncate">
                  {card.label}
                </p>
                <p
                  className="text-2xl font-bold text-[#1F2A2E] leading-none mt-0.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stats[card.key]}
                </p>
              </div>
            </div>
            <p className="text-[11px] font-medium text-[#64716F]">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function BookingsMetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-[#F0DFC2] p-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0DFC2]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2 bg-[#F0DFC2] rounded w-20" />
              <div className="h-6 bg-[#F0DFC2] rounded w-10" />
            </div>
          </div>
          <div className="h-2 bg-[#F0DFC2] rounded w-24 mt-3" />
        </div>
      ))}
    </div>
  );
}
