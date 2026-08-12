"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Building2,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface BookingItem {
  id: string;
  check_in: string;
  check_out: string;
  adults_count: number;
  children_count: number;
  subtotal: number;
  total_amount: number;
  downpayment_amount: number;
  balance_due: number;
  status: string;
  payment_status: string;
  created_at: string;
  room_type?: {
    id: string;
    name_en: string;
    base_price: number;
    capacity: number;
    property?: {
      id: string;
      name: string;
      slug: string;
      address: string;
      property_type: string;
      area?: { name_en: string };
      images?: { image_url: string; is_cover: boolean }[];
    };
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async (showToast = false) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();

      if (res.ok && data.success) {
        setBookings(data.bookings || []);
        if (showToast) {
          toast.success("Bookings refreshed");
        }
      } else {
        if (res.status === 401) {
          toast.info("Please sign in to view your bookings");
        }
      }
    } catch (err) {
      console.error("Failed to load bookings:", err);
      toast.error("Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const calculateNights = (inDate: string, outDate: string) => {
    const start = new Date(inDate).getTime();
    const end = new Date(outDate).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E9F2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#132555]">My Reservations</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#05326B]/10 text-[#05326B]">
              {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#57617E] mt-1">
            Manage your upcoming stays, check-in dates, and downpayment balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchBookings(true)}
            className="p-2 rounded-xl border border-[#E5E9F2] bg-white hover:bg-[#F8FAFD] text-[#57617E] hover:text-[#132555] transition-colors cursor-pointer"
            title="Refresh Bookings"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-[#005CE5]" : ""}`} />
          </button>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold shadow-xs transition-all"
          >
            <span>Book New Stay</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl p-6 border border-[#E5E9F2] animate-pulse space-y-4"
            >
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-10 bg-gray-100 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Bookings List */}
      {!isLoading && bookings.length > 0 && (
        <div className="space-y-5">
          {bookings.map((booking) => {
            const prop = booking.room_type?.property;
            const nights = calculateNights(booking.check_in, booking.check_out);
            const coverImg =
              prop?.images?.find((img) => img.is_cover)?.image_url ||
              prop?.images?.[0]?.image_url ||
              "/hero.jpg";
            const refCode = `DIP-${booking.id.substring(0, 8).toUpperCase()}`;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-[#E5E9F2] overflow-hidden shadow-xs hover:border-[#005CE5]/40 transition-all flex flex-col md:flex-row"
              >
                {/* Photo */}
                <div className="relative w-full md:w-64 aspect-[16/10] md:aspect-auto shrink-0 bg-gray-100">
                  <Image
                    src={coverImg}
                    alt={prop?.name || "Property"}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#132555]/85 text-white backdrop-blur-xs">
                    {refCode}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-[#132555]">
                        {prop?.name || "Quezon Stay"}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#01864C]/10 text-[#01864C] flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Instant Hold Active</span>
                      </span>
                    </div>

                    <p className="text-xs text-[#57617E] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#005CE5] shrink-0" />
                      <span>{prop?.address || `${prop?.area?.name_en || "Quezon"}, Philippines`}</span>
                    </p>

                    <div className="inline-block px-2.5 py-1 rounded-lg bg-[#F8FAFD] border border-[#E5E9F2] text-xs font-semibold text-[#132555]">
                      Room: {booking.room_type?.name_en || "Standard Room"}
                    </div>
                  </div>

                  {/* Dates & Cost Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#E5E9F2] text-xs">
                    <div>
                      <span className="text-[10px] text-[#57617E] block uppercase font-bold">Check-in</span>
                      <span className="font-bold text-[#132555]">{booking.check_in}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#57617E] block uppercase font-bold">Check-out</span>
                      <span className="font-bold text-[#132555]">{booking.check_out}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#57617E] block uppercase font-bold">30% Downpayment</span>
                      <span className="font-bold text-[#01864C]">
                        ₱{Number(booking.downpayment_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#57617E] block uppercase font-bold">Balance at Check-in</span>
                      <span className="font-bold text-[#132555]">
                        ₱{Number(booking.balance_due || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && bookings.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[#E5E9F2] bg-white p-12 text-center max-w-lg mx-auto my-8 space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#05326B]/10 text-[#05326B] flex items-center justify-center mx-auto">
            <Building2 className="h-7 w-7 text-[#05326B]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#132555]">No bookings found</h3>
            <p className="text-xs sm:text-sm text-[#57617E] mt-1.5 leading-relaxed">
              You don&apos;t have any active reservations yet. Explore verified Quezon Province resorts and book instantly with a 30% downpayment.
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#05326B] hover:bg-[#01234E] text-white text-xs font-bold shadow-xs transition-all"
          >
            <span>Browse Stays &amp; Resorts</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
