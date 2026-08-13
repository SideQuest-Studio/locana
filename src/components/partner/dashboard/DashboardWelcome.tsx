"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

interface DashboardWelcomeProps {
  partnerName?: string;
}

export function DashboardWelcome({ partnerName }: DashboardWelcomeProps) {
  const [dateRange] = useState("May 24 – May 26, 2026");
  const firstName = partnerName?.split(" ")[0] ?? "Partner";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      {/* Greeting */}
      <div>
        <h1
          className="text-2xl font-bold text-[#1F2A2E]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Welcome back, {firstName}!
        </h1>
        <p className="text-sm text-[#64716F] mt-0.5">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Date range selector */}
      <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F0DFC2] bg-white text-sm font-semibold text-[#1F2A2E] hover:border-[#1E88E5] hover:shadow-sm transition-all duration-150 shrink-0 self-start">
        <CalendarDays className="h-4 w-4 text-[#1E88E5]" />
        {dateRange}
        <ChevronDown className="h-3.5 w-3.5 text-[#64716F]" />
      </button>
    </div>
  );
}
