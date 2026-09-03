"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  CalendarDays,
  Users,
  Heart,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PartnerHeaderProps {
  partnerName?: string;
  avatarInitial?: string;
}

export function PartnerHeader({
  partnerName = "Partner",
  avatarInitial,
}: PartnerHeaderProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [whereTo, setWhereTo] = useState("");
  const [dateRange] = useState("May 24 – May 26");
  const [guests] = useState("2 Guests");

  const initial = avatarInitial ?? partnerName[0]?.toUpperCase() ?? "P";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#F0DFC2] shadow-[0_2px_12px_-4px_rgba(31,42,46,0.08)]">
      <div className="flex items-center gap-4 px-5 sm:px-8 h-16">

        {/* ── Logo ── */}
        <Link href="/" className="shrink-0 flex items-center gap-2">
          {/* Use the same DIP logo pattern as the rest of the app */}
          <div className="w-8 h-8 rounded-full bg-[#1E88E5] flex items-center justify-center text-white text-xs font-bold">
            D
          </div>
          <div className="hidden sm:flex flex-col">
            <span
              className="text-base font-bold text-[#1F2A2E] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              DIP
            </span>
            <span className="text-[10px] text-[#64716F] leading-tight">
              Discover. Book. Experience.
            </span>
          </div>
        </Link>

        {/* ── Search bar (desktop) ── */}
        <div className="hidden md:flex flex-1 items-center rounded-full border border-[#F0DFC2] bg-[#FAFAFA] divide-x divide-[#F0DFC2] overflow-hidden max-w-2xl mx-auto">
          {/* Where to */}
          <div className="flex items-center gap-2 px-4 py-2 flex-1">
            <Search className="h-4 w-4 text-[#64716F] shrink-0" />
            <input
              type="text"
              value={whereTo}
              onChange={(e) => setWhereTo(e.target.value)}
              placeholder="Where are you going?"
              className="bg-transparent text-sm text-[#1F2A2E] placeholder-[#A8AD9C] focus:outline-none w-full"
            />
          </div>

          {/* Dates */}
          <button className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1F2A2E] hover:bg-[#F0DFC2]/40 transition-colors whitespace-nowrap">
            <CalendarDays className="h-4 w-4 text-[#64716F]" />
            {dateRange}
          </button>

          {/* Guests */}
          <button className="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1F2A2E] hover:bg-[#F0DFC2]/40 transition-colors whitespace-nowrap">
            <Users className="h-4 w-4 text-[#64716F]" />
            {guests}
          </button>

          {/* Search button */}
          <button className="m-1.5 px-5 py-2 rounded-full bg-[#1E88E5] text-white text-sm font-bold hover:bg-[#1565C0] transition-colors whitespace-nowrap">
            Search
          </button>
        </div>

        {/* ── Right side actions ── */}
        <div className="flex items-center gap-4 ml-auto shrink-0">
          {/* Wishlist */}
          <button
            aria-label="Wishlist"
            className="hidden sm:flex flex-col items-center text-[#64716F] hover:text-[#1E88E5] transition-colors"
          >
            <Heart className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Wishlist</span>
          </button>

          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="hidden sm:flex flex-col items-center text-[#64716F] hover:text-[#1E88E5] transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-0.5">Notifications</span>
            {/* Unread dot */}
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
          </button>

          {/* Partner avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#F0DFC2] hover:border-[#1E88E5] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#1E88E5] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initial}
              </div>
              <span className="hidden sm:inline text-sm font-semibold text-[#1F2A2E]">
                {partnerName}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#64716F]" />
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-[#F0DFC2] shadow-xl py-1.5 z-50 animate-fadeIn">
                <Link
                  href="/account"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1F2A2E] hover:bg-[#F0DFC2]/50 transition-colors"
                >
                  My Account
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1F2A2E] hover:bg-[#F0DFC2]/50 transition-colors"
                >
                  Partner Dashboard
                </Link>
                <hr className="my-1 border-[#F0DFC2]" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl text-[#64716F] hover:bg-[#F0DFC2]/60 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile search drawer ── */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 bg-white border-t border-[#F0DFC2] space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#F0DFC2] rounded-xl px-4 py-2.5">
            <Search className="h-4 w-4 text-[#64716F] shrink-0" />
            <input
              type="text"
              placeholder="Where are you going?"
              className="bg-transparent text-sm text-[#1F2A2E] placeholder-[#A8AD9C] focus:outline-none flex-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#F0DFC2] rounded-xl px-3 py-2">
              <CalendarDays className="h-4 w-4 text-[#64716F]" />
              <span className="text-sm text-[#1F2A2E]">{dateRange}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#F0DFC2] rounded-xl px-3 py-2">
              <Users className="h-4 w-4 text-[#64716F]" />
              <span className="text-sm text-[#1F2A2E]">{guests}</span>
            </div>
          </div>
          <button className="w-full py-3 rounded-xl bg-[#1E88E5] text-white text-sm font-bold hover:bg-[#1565C0] transition-colors">
            Search
          </button>
        </div>
      )}

      {/* Backdrop for dropdown */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </header>
  );
}