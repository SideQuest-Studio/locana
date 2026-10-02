"use server";

import { revalidatePath } from "next/cache";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
import { dbFailure } from "@/src/lib/api/db-errors";
import { requirePartner } from "@/src/lib/auth/partner-guard";
import { z } from "zod";

export interface DayAvailabilityRecord {
  date: string; // YYYY-MM-DD
  available_count: number;
  booked: number;
  rooms_left: number;
  price: number;
  is_override: boolean;
  price_override: number | null;
  minimum_stay: number | null;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  is_blocked: boolean;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
const MAX_RANGE_DAYS = 366;

function daysBetween(start: string, end: string) {
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
}

const singleOverrideSchema = z.object({
  room_type_id: z.string().uuid(),
  date: isoDate,
  available_count: z.number().int().min(0),
  price_override: z.number().min(0).nullable().optional(),
  minimum_stay: z.number().int().min(1).nullable().optional(),
  closed_to_arrival: z.boolean().default(false),
  closed_to_departure: z.boolean().default(false),
});

export type SingleOverrideInput = z.infer<typeof singleOverrideSchema>;

const bulkOverrideSchema = z
  .object({
    room_type_id: z.string().uuid(),
    start_date: isoDate,
    end_date: isoDate,
    available_count: z.number().int().min(0),
    price_override: z.number().min(0).nullable().optional(),
    minimum_stay: z.number().int().min(1).nullable().optional(),
    closed_to_arrival: z.boolean().default(false),
    closed_to_departure: z.boolean().default(false),
  })
  .refine((v) => v.end_date >= v.start_date && daysBetween(v.start_date, v.end_date) <= MAX_RANGE_DAYS, {
    message: "Choose an end date on or after the start date, within one year.",
    path: ["end_date"],
  });

export type BulkOverrideInput = z.infer<typeof bulkOverrideSchema>;

const resetSchema = z
  .object({ roomTypeId: z.string().uuid(), startDate: isoDate, endDate: isoDate })
  .refine((v) => v.endDate >= v.startDate && daysBetween(v.startDate, v.endDate) <= MAX_RANGE_DAYS);

function revalidateAvailabilityPages() {
  revalidatePath("/dashboard/availability");
  revalidatePath("/search");
}

export async function fetchMonthlyAvailability(
  roomTypeId: string,
  year: number,
  month: number
): Promise<
  ActionResult<{
    days: Record<string, DayAvailabilityRecord>;
    basePrice: number;
    totalInventory: number;
  }>
> {
  try {
    const guard = await requirePartner();
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    const validMonth = Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
    if (!z.string().uuid().safeParse(roomTypeId).success || !validMonth) {
      return failure("validation.failed", "Invalid request.");
    }

    const { data: roomType } = await supabase
      .from("room_types")
      .select("id, base_price, total_inventory")
      .eq("id", roomTypeId)
      .maybeSingle();
    if (!roomType) {
      return failure("room_type.not_found", "Room type not found.");
    }

    const monthStr = String(month).padStart(2, "0");
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const startStr = `${year}-${monthStr}-01`;
    const endStr = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, "0")}`;

    const [{ data: overrides, error: overrideError }, { data: calendar, error: calendarError }] = await Promise.all([
      supabase
        .from("room_type_availability")
        .select("*")
        .eq("room_type_id", roomTypeId)
        .gte("date", startStr)
        .lte("date", endStr),
      supabase.rpc("get_partner_room_calendar", { p_room_type_id: roomTypeId, p_from: startStr, p_to: endStr }),
    ]);

    if (overrideError || calendarError) {
      console.error("Fetch availability error:", overrideError ?? calendarError);
      return dbFailure(overrideError ?? calendarError, "availability.fetch_failed");
    }

    const overrideByDate = new Map((overrides ?? []).map((o) => [o.date, o]));
    const nightByDate = new Map(
      ((calendar ?? []) as { night: string; price: number; booked: number; rooms_left: number; minimum_stay: number }[]).map(
        (n) => [n.night, n]
      )
    );
    const basePrice = Number(roomType.base_price);
    const days: Record<string, DayAvailabilityRecord> = {};

    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dateKey = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
      const custom = overrideByDate.get(dateKey);
      const night = nightByDate.get(dateKey);
      const availableCount = custom ? custom.available_count : roomType.total_inventory;
      const priceOverride =
        custom?.price_override !== null && custom?.price_override !== undefined ? Number(custom.price_override) : null;

      days[dateKey] = {
        date: dateKey,
        available_count: availableCount,
        booked: night?.booked ?? 0,
        rooms_left: night?.rooms_left ?? availableCount,
        // Same nightly price a guest is quoted: override, else base + pricing rule.
        price: night ? Number(night.price) : priceOverride ?? basePrice,
        is_override: Boolean(custom),
        price_override: priceOverride,
        minimum_stay: custom?.minimum_stay ?? (night && night.minimum_stay > 1 ? night.minimum_stay : null),
        closed_to_arrival: Boolean(custom?.closed_to_arrival),
        closed_to_departure: Boolean(custom?.closed_to_departure),
        is_blocked: availableCount === 0,
      };
    }

    return success({ days, basePrice, totalInventory: roomType.total_inventory });
  } catch (err) {
    console.error("Unexpected error in fetchMonthlyAvailability:", err);
    return failure("unexpected.error", "Failed to fetch calendar availability.");
  }
}

export async function saveDailyOverride(input: SingleOverrideInput): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    const parsed = singleOverrideSchema.safeParse(input);
    if (!parsed.success) {
      return failure("validation.failed", "Invalid input parameters.", parsed.error.flatten().fieldErrors);
    }

    const { error } = await supabase.from("room_type_availability").upsert(
      {
        room_type_id: parsed.data.room_type_id,
        date: parsed.data.date,
        available_count: parsed.data.available_count,
        price_override: parsed.data.price_override ?? null,
        minimum_stay: parsed.data.minimum_stay ?? null,
        closed_to_arrival: parsed.data.closed_to_arrival,
        closed_to_departure: parsed.data.closed_to_departure,
      },
      { onConflict: "room_type_id, date" }
    );

    if (error) {
      console.error("Save date override error:", error);
      return dbFailure(error, "availability.save_failed");
    }

    revalidateAvailabilityPages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in saveDailyOverride:", err);
    return failure("unexpected.error", "An error occurred while saving override.");
  }
}

export async function bulkUpdateAvailability(
  input: BulkOverrideInput
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    const parsed = bulkOverrideSchema.safeParse(input);
    if (!parsed.success) {
      return failure("validation.failed", "Invalid bulk update parameters.", parsed.error.flatten().fieldErrors);
    }

    const { data: updatedCount, error } = await supabase.rpc("bulk_upsert_availability_rpc", {
      p_room_type_id: parsed.data.room_type_id,
      p_start_date: parsed.data.start_date,
      p_end_date: parsed.data.end_date,
      p_available_count: parsed.data.available_count,
      p_price_override: parsed.data.price_override ?? null,
      p_minimum_stay: parsed.data.minimum_stay ?? null,
      p_closed_to_arrival: parsed.data.closed_to_arrival,
      p_closed_to_departure: parsed.data.closed_to_departure,
    });

    if (error) {
      console.error("Bulk availability update error:", error);
      return dbFailure(error, "availability.bulk_failed");
    }

    revalidateAvailabilityPages();
    return success({ updatedCount: updatedCount || 0 });
  } catch (err) {
    console.error("Unexpected error in bulkUpdateAvailability:", err);
    return failure("unexpected.error", "An error occurred during bulk update.");
  }
}

export async function resetAvailabilityDates(
  roomTypeId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!resetSchema.safeParse({ roomTypeId, startDate, endDate }).success) {
      return failure("validation.failed", "Invalid request.");
    }

    const { error } = await supabase
      .from("room_type_availability")
      .delete()
      .eq("room_type_id", roomTypeId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      console.error("Reset availability error:", error);
      return dbFailure(error, "availability.reset_failed");
    }

    revalidateAvailabilityPages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in resetAvailabilityDates:", err);
    return failure("unexpected.error", "An error occurred while resetting dates.");
  }
}
