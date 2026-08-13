"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Users, ChevronRight, BookOpen } from "lucide-react";
import { StatusBadge, type BookingStatus } from "./StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BookingRowData {
  id: string;
  guest: {
    name: string;
    email: string;
    phone: string;
    initials: string;
  };
  listing: {
    name: string;
    location: string;
    image: string;
  };
  checkIn: string;
  checkOut: string;
  guests: number;
  status: BookingStatus;
}

// ─── Single booking row ───────────────────────────────────────────────────────

function BookingRow({ booking }: { booking: BookingRowData }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-[#F0DFC2]/60 last:border-0">
      {/* Guest */}
      <div className="flex items-start gap-3 sm:w-56 shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#1E88E5]/15 flex items-center justify-center shrink-0 text-sm font-bold text-[#1E88E5]">
          {booking.guest.initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1F2A2E] truncate">{booking.guest.name}</p>
          <p className="text-[11px] text-[#64716F]">Booking ID: #{booking.id}</p>
          <p className="text-[11px] text-[#64716F] truncate">{booking.guest.email}</p>
          <p className="text-[11px] text-[#64716F]">{booking.guest.phone}</p>
        </div>
      </div>

      {/* Listing */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-[60px] h-[50px] rounded-xl overflow-hidden shrink-0 bg-[#F0DFC2]">
          <Image
            src={booking.listing.image}
            alt={booking.listing.name}
            width={60}
            height={50}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1F2A2E] truncate">
            {booking.listing.name}
          </p>
          <p className="text-[11px] text-[#64716F] truncate">{booking.listing.location}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-[#64716F]">
              <Calendar className="h-3 w-3 shrink-0" />
              {booking.checkIn} – {booking.checkOut}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#64716F]">
              <Users className="h-3 w-3 shrink-0" />
              {booking.guests} Guest{booking.guests !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Status + action */}
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={booking.status} />
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-xs font-semibold text-[#1F2A2E] hover:bg-[#1E88E5] hover:text-white hover:border-[#1E88E5] transition-all duration-150 whitespace-nowrap"
        >
          View Booking
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function RecentBookings({ bookings }: { bookings: BookingRowData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-[#1F2A2E]">Recent Bookings</h2>
        <Link
          href="/dashboard/bookings"
          className="text-xs font-semibold text-[#1E88E5] hover:text-[#1565C0] transition-colors"
        >
          View all bookings →
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F0DFC2] flex items-center justify-center mx-auto mb-3">
            <BookOpen className="h-6 w-6 text-[#64716F]" />
          </div>
          <p className="text-sm font-semibold text-[#1F2A2E]">No bookings yet</p>
          <p className="text-xs text-[#64716F] mt-1 max-w-xs mx-auto">
            When guests book your property, they'll appear here.
          </p>
        </div>
      ) : (
        <div>
          {bookings.map(b => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function RecentBookingsSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] p-5 animate-pulse">
      <div className="h-4 bg-[#F0DFC2] rounded w-40 mb-4" />
      {[1, 2, 3].map(n => (
        <div key={n} className="flex gap-4 py-4 border-b border-[#F0DFC2]/60 last:border-0">
          <div className="w-10 h-10 rounded-full bg-[#F0DFC2] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#F0DFC2] rounded w-32" />
            <div className="h-2.5 bg-[#F0DFC2] rounded w-48" />
            <div className="h-2.5 bg-[#F0DFC2] rounded w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
