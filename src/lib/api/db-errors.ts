import { failure, type ActionResult } from "@/src/lib/api/response";

// Reason codes raised by database functions (RAISE EXCEPTION '<CODE>') mapped to client-safe
// error codes and fallback copy. The codes double as i18n keys once the catalogue lands.
const KNOWN: Record<string, { code: string; message: string }> = {
  UNAUTHENTICATED: { code: "booking.unauthenticated", message: "Please sign in to book your stay." },
  PROPERTY_UNAVAILABLE: { code: "booking.property_unavailable", message: "This property isn't taking bookings right now." },
  RATE_PLAN_INVALID: { code: "booking.rate_plan_invalid", message: "That rate isn't available for this room." },
  INVALID_DATES: { code: "booking.invalid_dates", message: "Please choose valid dates (up to 30 nights, starting today or later)." },
  MIN_STAY_NOT_MET: { code: "booking.min_stay_not_met", message: "These dates need a longer minimum stay." },
  CLOSED_TO_ARRIVAL: { code: "booking.closed_to_arrival", message: "Check-in isn't available on that date." },
  CLOSED_TO_DEPARTURE: { code: "booking.closed_to_departure", message: "Check-out isn't available on that date." },
  OVER_CAPACITY: { code: "booking.over_capacity", message: "Too many guests for this room." },
  SOLD_OUT: { code: "booking.sold_out", message: "This room is sold out for your dates." },
  TOO_MANY_HOLDS: { code: "booking.too_many_holds", message: "You already have 3 unpaid reservations. Complete or let one expire before booking another." },
  FORBIDDEN: { code: "partner.forbidden", message: "You don't have permission to do that." },
  BOOKING_NOT_FOUND: { code: "booking.not_found", message: "Booking not found." },
  INVALID_STATUS_TRANSITION: { code: "booking.invalid_transition", message: "That action isn't allowed for this booking's status." },
  ROOM_UNAVAILABLE: { code: "booking.room_unavailable", message: "That room is under maintenance or assigned to another guest for these dates." },
  ROOM_ALREADY_ASSIGNED: { code: "booking.room_already_assigned", message: "That room is already assigned to this booking." },
  ROOMS_NOT_ASSIGNED: { code: "booking.rooms_not_assigned", message: "Assign a room before checking in." },
  INVALID_ROOM: { code: "booking.invalid_room", message: "That room doesn't belong to this booking's room type." },
  INVALID_ROOM_COUNT: { code: "booking.invalid_room_count", message: "Select at least one room." },
};

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function mapDbError(
  error: { message?: string | null } | null | undefined,
  fallbackCode: string
): { code: string; message: string } {
  const raw = error?.message?.trim() ?? "";
  return KNOWN[raw] ?? { code: fallbackCode, message: GENERIC_MESSAGE };
}

export function dbFailure(
  error: { message?: string | null } | null | undefined,
  fallbackCode: string
): ActionResult<never> {
  const mapped = mapDbError(error, fallbackCode);
  return failure(mapped.code, mapped.message);
}
