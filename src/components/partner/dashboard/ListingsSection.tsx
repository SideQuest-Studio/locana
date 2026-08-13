"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Building2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListingStatus = "active" | "inactive";

export interface ListingCardData {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  status: ListingStatus;
  href: string;
}

// ─── Status badge pill ─────────────────────────────────────────────────────

function ListingStatusPill({ status }: { status: ListingStatus }) {
  return (
    <span
      className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm ${
        status === "active" ? "bg-emerald-500 text-white" : "bg-[#1F2A2E]/75 text-white"
      }`}
    >
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Single listing card ───────────────────────────────────────────────────

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <article className="bg-white rounded-2xl border border-[#F0DFC2] overflow-hidden hover:shadow-[0_8px_28px_-8px_rgba(31,42,46,0.18)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F0DFC2]">
        <Image
          src={listing.image}
          alt={listing.name}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
        <ListingStatusPill status={listing.status} />
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-bold text-[#1F2A2E] leading-snug">{listing.name}</h3>
        <p className="text-[11px] text-[#64716F] mt-0.5">{listing.location}</p>

        <div className="flex items-center gap-1.5 mt-2">
          <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
          <span className="text-xs font-bold text-[#1F2A2E]">{listing.rating}</span>
          <span className="text-xs text-[#64716F]">({listing.reviewCount})</span>
        </div>

        <p className="text-sm font-bold text-[#1F2A2E] mt-2">
          ₱{listing.pricePerNight.toLocaleString()}
          <span className="text-[11px] font-normal text-[#64716F]"> / night</span>
        </p>

        <Link
          href={listing.href}
          className="mt-3 w-full py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#1F2A2E] text-center hover:bg-[#1E88E5] hover:text-white hover:border-[#1E88E5] transition-all duration-150"
        >
          Edit Listing
        </Link>
      </div>
    </article>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function ListingsSection({ listings }: { listings: ListingCardData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#1F2A2E]">My Listings</h2>
        <Link
          href="/dashboard/property"
          className="text-xs font-semibold text-[#1E88E5] hover:text-[#1565C0] transition-colors"
        >
          View all listings →
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="py-14 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F0DFC2] flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-6 w-6 text-[#64716F]" />
          </div>
          <p className="text-sm font-semibold text-[#1F2A2E]">No listings yet</p>
          <p className="text-xs text-[#64716F] mt-1">
            Create your first property to start receiving bookings.
          </p>
          <Link
            href="/dashboard/property"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1565C0] transition-colors"
          >
            Add Your First Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ListingsSectionSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] p-5 animate-pulse">
      <div className="h-4 bg-[#F0DFC2] rounded w-28 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="rounded-2xl border border-[#F0DFC2] overflow-hidden">
            <div className="aspect-[4/3] bg-[#F0DFC2]" />
            <div className="p-4 space-y-2">
              <div className="h-3.5 bg-[#F0DFC2] rounded w-3/4" />
              <div className="h-2.5 bg-[#F0DFC2] rounded w-1/2" />
              <div className="h-3 bg-[#F0DFC2] rounded w-16 mt-3" />
              <div className="h-8 bg-[#F0DFC2] rounded mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
