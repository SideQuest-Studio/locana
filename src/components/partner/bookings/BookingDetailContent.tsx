"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  CalendarDays,
  CreditCard,
  BedDouble,
  LogIn,
  LogOut,
  XCircle,
  Loader2,
  Check,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { StatusBadge } from "@/src/components/partner/dashboard/StatusBadge";
import type { BookingStatus, PartnerBookingDetail } from "@/src/types/database.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  BOOKING_NOT_FOUND: "Booking not found.",
  INVALID_STATUS_TRANSITION: "This action is not allowed for the booking's current status.",
  INVALID_ROOM: "One or more selected rooms do not belong to this booking's room type.",
  INVALID_ROOM_COUNT: "Select at least one room.",
  ROOM_ALREADY_ASSIGNED: "One or more selected rooms are already assigned.",
  ROOMS_NOT_ASSIGNED: "Assign at least one room before checking in.",
};

function rpcErrorMessage(msg: string | undefined) {
  if (!msg) return "Something went wrong. Please try again.";
  return RPC_ERROR_MESSAGES[msg] ?? msg;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GuestAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G";
  return (
    <div className="w-12 h-12 rounded-full bg-[#1E88E5]/10 flex items-center justify-center text-[#1E88E5] font-bold shrink-0">
      {initials}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-[#F0DFC2] shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-[#1F2A2E] uppercase tracking-wide mb-4">
        <span className="text-[#0E7C7B]">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BookingDetailContentProps {
  detail: PartnerBookingDetail;
  allowCancel: boolean;
}

export function BookingDetailContent({ detail, allowCancel }: BookingDetailContentProps) {
  const router = useRouter();
  const { booking, guest } = detail;
  const fields = {
    guestName: [guest?.first_name, guest?.last_name].filter(Boolean).join(" ") || "Guest",
    nights: nightsBetween(booking.check_in, booking.check_out),
  };

  const canAssignRooms = ["confirmed", "checked_in"].includes(booking.status);
  const canCheckIn = booking.status === "confirmed";
  const canCheckOut = booking.status === "checked_in";
  const canCancel = allowCancel && ["pending_payment", "confirmed", "checked_in"].includes(booking.status);

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    detail.assigned_rooms.map((r) => r.id)
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const toggleRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const runAction = async (rpcName: string, friendlyLabel: string, args: Record<string, unknown> = {}) => {
    setActionLoading(rpcName);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc(rpcName, { p_booking_id: booking.id, ...args });
      if (error) {
        toast.error(friendlyLabel + " failed", { description: rpcErrorMessage(error.message) });
        return;
      }
      toast.success(friendlyLabel + " successful");
      setShowCancel(false);
      setCancelReason("");
      router.refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignRooms = () => {
    const toAssign = selectedRoomIds.filter(
      (id) => !detail.assigned_rooms.some((r) => r.id === id)
    );
    if (toAssign.length === 0) return;
    runAction(
      "partner_assign_rooms",
      toAssign.length === 1 ? "Room assignment" : "Room assignments",
      { p_room_ids: toAssign }
    );
  };

  const handleUnassignRooms = () => {
    const toUnassign = selectedRoomIds.filter((id) =>
      detail.assigned_rooms.some((r) => r.id === id)
    );
    if (toUnassign.length === 0) return;
    runAction("partner_unassign_rooms", "Room release", { p_room_ids: toUnassign });
  };

  const pendingAssign = selectedRoomIds.filter((id) => !detail.assigned_rooms.some((r) => r.id === id));
  const pendingUnassign = selectedRoomIds.filter((id) =>
    detail.assigned_rooms.some((r) => r.id === id)
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-[#0E7C7B] hover:text-[#0B5E5D] font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1F2A2E]" style={{ fontFamily: "var(--font-display)" }}>
              BK-{booking.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-[#64716F] mt-1">
              Booked {formatDateTime(booking.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status as BookingStatus} />
            <span className="text-xs font-semibold text-[#64716F]">
              Payment: {booking.payment_status}
            </span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {(canCheckIn || canCheckOut || canCancel) && (
        <div className="bg-white rounded-2xl border border-[#F0DFC2] shadow-sm p-4 flex flex-wrap gap-2">
          {canCheckIn && (
            <button
              onClick={() => runAction("partner_check_in_booking", "Check-in")}
              disabled={actionLoading !== null || detail.assigned_rooms.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E7C7B] text-white text-sm font-semibold hover:bg-[#0B5E5D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === "partner_check_in_booking" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Check In
            </button>
          )}
          {canCheckIn && detail.assigned_rooms.length === 0 && (
            <span className="text-xs text-[#64716F] self-center">
              Assign at least one room to enable check-in.
            </span>
          )}
          {canCheckOut && (
            <button
              onClick={() => runAction("partner_check_out_booking", "Check-out")}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E7C7B] text-white text-sm font-semibold hover:bg-[#0B5E5D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === "partner_check_out_booking" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Check Out
            </button>
          )}
          {canCancel && !showCancel && (
            <button
              onClick={() => setShowCancel(true)}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Cancel Booking
            </button>
          )}
          {canCancel && showCancel && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (optional)"
                className="flex-1 w-full px-3 py-2 rounded-xl border border-[#F0DFC2] text-sm text-[#1F2A2E] placeholder:text-[#B4B4B4] focus:outline-none focus:ring-2 focus:ring-teal"
              />
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    runAction("partner_cancel_booking", "Cancellation", { p_reason: cancelReason || null })
                  }
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === "partner_cancel_booking" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => {
                    setShowCancel(false);
                    setCancelReason("");
                  }}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 rounded-xl border border-[#F0DFC2] text-sm font-semibold text-[#64716F] hover:bg-[#FDECD2]/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest */}
        <Card title="Guest" icon={<UserIcon />}>
          <div className="flex items-center gap-4">
            <GuestAvatar name={fields.guestName} />
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#1F2A2E] truncate">{fields.guestName}</p>
              {guest?.email && (
                <p className="flex items-center gap-1.5 text-sm text-[#64716F] truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {guest.email}
                </p>
              )}
              {guest?.phone_number && (
                <p className="flex items-center gap-1.5 text-sm text-[#64716F]">
                  <Phone className="h-3.5 w-3.5 shrink-0" /> {guest.phone_number}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Stay details */}
        <Card title="Stay Details" icon={<CalendarDays className="h-4 w-4" />}>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-[#64716F] uppercase tracking-wide">Check-in</dt>
              <dd className="font-semibold text-[#1F2A2E] mt-0.5">{formatDate(booking.check_in)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64716F] uppercase tracking-wide">Check-out</dt>
              <dd className="font-semibold text-[#1F2A2E] mt-0.5">{formatDate(booking.check_out)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64716F] uppercase tracking-wide">Nights</dt>
              <dd className="font-semibold text-[#1F2A2E] mt-0.5">{fields.nights}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64716F] uppercase tracking-wide">Guests</dt>
              <dd className="font-semibold text-[#1F2A2E] mt-0.5">
                {booking.adults_count} adult{booking.adults_count !== 1 ? "s" : ""}
                {booking.children_count > 0
                  ? `, ${booking.children_count} child${booking.children_count !== 1 ? "ren" : ""}`
                  : ""}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-[#64716F] uppercase tracking-wide">Room type</dt>
              <dd className="font-semibold text-[#1F2A2E] mt-0.5">
                {detail.room_type?.name_en}
                {detail.room_type?.capacity ? ` · up to ${detail.room_type.capacity}` : ""}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-[#64716F] uppercase tracking-wide">Property</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-[#1F2A2E] mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-[#1E88E5]" />
                {detail.property?.name || "—"}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Payment */}
        <Card title="Payment" icon={<CreditCard className="h-4 w-4" />}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#64716F]">Subtotal</dt>
              <dd className="font-semibold text-[#1F2A2E]">{formatCurrency(booking.subtotal)}</dd>
            </div>
            {booking.discount_amount > 0 && (
              <div className="flex justify-between">
                <dt className="text-[#64716F]">Discount</dt>
                <dd className="font-semibold text-green-600">−{formatCurrency(booking.discount_amount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-[#F0DFC2] pt-2">
              <dt className="font-semibold text-[#1F2A2E]">Total</dt>
              <dd className="font-semibold text-[#1F2A2E]">{formatCurrency(booking.total_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#64716F]">Downpayment</dt>
              <dd className="font-semibold text-[#1F2A2E]">{formatCurrency(booking.downpayment_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#64716F]">Balance due</dt>
              <dd className="font-semibold text-[#1F2A2E]">{formatCurrency(booking.balance_due)}</dd>
            </div>
          </dl>

          {detail.payments.length > 0 && (
            <div className="mt-4 border-t border-[#F0DFC2] pt-3 space-y-2">
              <p className="text-xs font-bold text-[#1F2A2E] uppercase tracking-wide">Payment attempts</p>
              {detail.payments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#64716F]">
                    {pay.provider?.replace("paymongo_", "").toUpperCase() || "—"}
                    <span className="text-xs">{formatDateTime(pay.created_at)}</span>
                  </span>
                  <span className="font-semibold text-[#1F2A2E]">
                    {formatCurrency(pay.amount)}
                    <span className="ml-2 text-xs text-[#64716F]">{pay.status}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Room assignment */}
        <Card title="Rooms" icon={<BedDouble className="h-4 w-4" />}>
          {detail.assigned_rooms.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {detail.assigned_rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => canAssignRooms && toggleRoom(room.id)}
                  disabled={!canAssignRooms}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    canAssignRooms && pendingUnassign.includes(room.id)
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-[#0E7C7B]/5 border-[#0E7C7B]/20 text-[#0B5E5D]"
                  } ${canAssignRooms ? "" : "cursor-default"}`}
                >
                  {room.room_number}
                  {room.floor ? ` · ${room.floor}` : ""}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64716F] mb-3">No rooms assigned yet.</p>
          )}

          {canAssignRooms && detail.available_rooms.length > 0 && (
            <>
              <p className="text-xs text-[#64716F] uppercase tracking-wide mb-2">
                Available units
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {detail.available_rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => toggleRoom(room.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedRoomIds.includes(room.id)
                        ? "bg-[#0E7C7B] text-white border-[#0E7C7B]"
                        : "bg-white border-[#F0DFC2] text-[#64716F] hover:border-[#0E7C7B]/40"
                    }`}
                  >
                    {room.room_number}
                    {room.floor ? ` · ${room.floor}` : ""}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAssignRooms}
                  disabled={actionLoading !== null || pendingAssign.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E7C7B] text-white text-sm font-semibold hover:bg-[#0B5E5D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading === "partner_assign_rooms" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Assign Selected ({pendingAssign.length})
                </button>
                {pendingUnassign.length > 0 && (
                  <button
                    onClick={handleUnassignRooms}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Release {pendingUnassign.length > 1 ? `${pendingUnassign.length} rooms` : "room"}
                  </button>
                )}
              </div>
            </>
          )}

          {canAssignRooms && detail.available_rooms.length === 0 && (
            <p className="text-xs text-[#64716F]">
              No available units for this room type. Mark a unit as available in Rooms first.
            </p>
          )}
        </Card>
      </div>

      {/* Status timeline */}
      <Card title="Status Timeline" icon={<TimelineIcon />}>
        {detail.status_history.length === 0 ? (
          <p className="text-sm text-[#64716F]">No history recorded.</p>
        ) : (
          <ol className="space-y-4">
            {detail.status_history.map((entry, i) => (
              <li key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0E7C7B] mt-1.5" />
                  {i < detail.status_history.length - 1 && (
                    <span className="w-px flex-1 bg-[#F0DFC2]" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-semibold text-[#1F2A2E]">
                    {entry.from_status ? `${entry.from_status.replace(/_/g, " ")} → ` : ""}
                    {entry.to_status.replace(/_/g, " ")}
                  </p>
                  {entry.note && <p className="text-xs text-[#64716F] mt-0.5">{entry.note}</p>}
                  <p className="text-[11px] text-[#B4B4B4] mt-0.5">{formatDateTime(entry.created_at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

// Small inline icon helpers (kept above the tree to avoid re-renders)
function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}