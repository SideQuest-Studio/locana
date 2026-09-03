"use client";

import Image from "next/image";
import { ArrowRight, MoreHorizontal, ChevronDown } from "lucide-react";
import { useState } from "react";
import { StatusBadge, type BookingStatus } from "@/src/components/partner/dashboard/StatusBadge";
import type { PartnerBookingRow } from "@/src/types/database.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function GuestCell({ row }: { row: PartnerBookingRow }) {
  const initials = row.guest_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {row.guest_avatar_url ? (
        <Image
          src={row.guest_avatar_url}
          alt={row.guest_name}
          width={36}
          height={36}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[#1E88E5]/10 flex items-center justify-center text-[#1E88E5] text-xs font-bold shrink-0">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1F2A2E] truncate">{row.guest_name}</p>
        <p className="text-xs text-[#64716F] truncate">{row.guest_email}</p>
        {row.guest_phone && (
          <p className="text-[11px] text-[#64716F] truncate">{row.guest_phone}</p>
        )}
      </div>
    </div>
  );
}

function ListingCell({ row }: { row: PartnerBookingRow }) {
  return (
    <div className="flex items-center gap-3">
      {row.listing_image ? (
        <Image
          src={row.listing_image}
          alt={row.listing_name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-[#F0DFC2] flex items-center justify-center text-[#64716F] text-xs font-bold shrink-0">
          {row.listing_name[0]}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1F2A2E] truncate">{row.listing_name}</p>
        <p className="text-xs text-[#64716F] truncate">{row.listing_location}</p>
      </div>
    </div>
  );
}

function ContextMenu({ row }: { row: PartnerBookingRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-[#64716F] hover:bg-[#F0DFC2]/60 transition-colors"
        aria-label="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-[#F0DFC2] shadow-xl py-1.5 z-50 animate-fadeIn">
            <button
              onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-[#1F2A2E] hover:bg-[#F0DFC2]/50 transition-colors"
            >
              View Details
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-[#1F2A2E] hover:bg-[#F0DFC2]/50 transition-colors"
            >
              Print Confirmation
            </button>
            {row.status !== "cancelled" && row.status !== "checked_out" && (
              <button
                onClick={() => setOpen(false)}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BookingsDataTableProps {
  bookings: PartnerBookingRow[];
}

export function BookingsDataTable({ bookings }: BookingsDataTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#F0DFC2] p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#F0DFC2]/60 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#64716F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#1F2A2E]">No bookings found</p>
        <p className="text-xs text-[#64716F] mt-1">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] overflow-hidden">
      {/* Desktop table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0DFC2] bg-[#FAFAFA]">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Booking ID
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Guest
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Listing
              </th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Check-in / Out
              </th>
              <th className="text-center px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Guests
              </th>
              <th className="text-right px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Amount
              </th>
              <th className="text-center px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Status
              </th>
              <th className="text-center px-5 py-3 text-[11px] font-bold text-[#64716F] uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0DFC2]">
            {bookings.map((row) => (
              <tr
                key={row.booking_id}
                className="hover:bg-[#FDECD2]/20 transition-colors"
              >
                {/* Booking ID + Date */}
                <td className="px-5 py-4">
                  <p className="text-sm font-bold text-[#1F2A2E]">{row.booking_ref}</p>
                  <p className="text-[11px] text-[#64716F]">{formatDateTime(row.booking_date)}</p>
                </td>

                {/* Guest */}
                <td className="px-5 py-4">
                  <GuestCell row={row} />
                </td>

                {/* Listing */}
                <td className="px-5 py-4">
                  <ListingCell row={row} />
                </td>

                {/* Check-in / Check-out */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2A2E]">{formatDate(row.check_in)}</p>
                      <p className="text-[11px] text-[#64716F]">Check-in</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[#64716F] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#1F2A2E]">{formatDate(row.check_out)}</p>
                      <p className="text-[11px] text-[#64716F]">Check-out</p>
                    </div>
                  </div>
                </td>

                {/* Guests */}
                <td className="px-5 py-4 text-center">
                  <p className="text-sm font-semibold text-[#1F2A2E]">
                    {row.adults_count + row.children_count}
                  </p>
                  <p className="text-[11px] text-[#64716F]">
                    {row.adults_count} Adult{row.adults_count !== 1 ? "s" : ""}
                    {row.children_count > 0
                      ? `, ${row.children_count} Child${row.children_count !== 1 ? "ren" : ""}`
                      : ""}
                  </p>
                </td>

                {/* Amount */}
                <td className="px-5 py-4 text-right">
                  <p className="text-sm font-bold text-[#1F2A2E]">
                    {formatCurrency(row.total_amount)}
                  </p>
                </td>

                {/* Status */}
                <td className="px-5 py-4 text-center">
                  <StatusBadge status={row.status as BookingStatus} size="sm" />
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="px-3 py-1.5 rounded-lg border border-[#1E88E5]/30 text-xs font-semibold text-[#1E88E5] hover:bg-[#1E88E5]/10 transition-colors">
                      View Details
                    </button>
                    <ContextMenu row={row} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-[#F0DFC2]">
        {bookings.map((row) => (
          <div key={row.booking_id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-[#1F2A2E]">{row.booking_ref}</p>
                <p className="text-[11px] text-[#64716F]">{formatDateTime(row.booking_date)}</p>
              </div>
              <StatusBadge status={row.status as BookingStatus} size="sm" />
            </div>
            <GuestCell row={row} />
            <ListingCell row={row} />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-[#1F2A2E]">{formatDate(row.check_in)}</span>
              <ArrowRight className="h-3 w-3 text-[#64716F]" />
              <span className="font-semibold text-[#1F2A2E]">{formatDate(row.check_out)}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#1F2A2E]">{formatCurrency(row.total_amount)}</p>
              <button className="px-3 py-1.5 rounded-lg border border-[#1E88E5]/30 text-xs font-semibold text-[#1E88E5] hover:bg-[#1E88E5]/10 transition-colors">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function BookingsDataTableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] overflow-hidden animate-pulse">
      <div className="hidden md:block">
        <div className="bg-[#FAFAFA] border-b border-[#F0DFC2] px-5 py-3">
          <div className="flex gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-2.5 bg-[#F0DFC2] rounded flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-[#F0DFC2] last:border-0">
            <div className="flex items-center gap-5">
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-[#F0DFC2] rounded w-20" />
                <div className="h-2 bg-[#F0DFC2] rounded w-24" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#F0DFC2]" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 bg-[#F0DFC2] rounded w-28" />
                  <div className="h-2 bg-[#F0DFC2] rounded w-20" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-2.5 bg-[#F0DFC2] rounded w-24" />
                <div className="h-2 bg-[#F0DFC2] rounded w-16" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-2.5 bg-[#F0DFC2] rounded w-20" />
                <div className="h-2 bg-[#F0DFC2] rounded w-20" />
              </div>
              <div className="h-2.5 bg-[#F0DFC2] rounded w-8" />
              <div className="h-2.5 bg-[#F0DFC2] rounded w-16" />
              <div className="h-5 bg-[#F0DFC2] rounded-full w-16" />
              <div className="h-6 bg-[#F0DFC2] rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
