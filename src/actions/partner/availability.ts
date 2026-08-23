"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
import { z } from "zod";

export interface DayAvailabilityRecord {
  date: string; // YYYY-MM-DD
  available_count: number;
  price: number;
  is_override: boolean;
  price_override: number | null;
  minimum_stay: number | null;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  is_blocked: boolean;
}

const singleOverrideSchema = z.object({
  room_type_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  available_count: z.number().min(0),
  price_override: z.number().nullable().optional(),
  minimum_stay: z.number().nullable().optional(),
  closed_to_arrival: z.boolean().default(false),
  closed_to_departure: z.boolean().default(false),
});

export type SingleOverrideInput = z.infer<typeof singleOverrideSchema>;

const bulkOverrideSchema = z.object({
  room_type_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
  available_count: z.number().min(0),
  price_override: z.number().nullable().optional(),
  minimum_stay: z.number().nullable().optional(),
  closed_to_arrival: z.boolean().default(false),
  closed_to_departure: z.boolean().default(false),
});

export type BulkOverrideInput = z.infer<typeof bulkOverrideSchema>;

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
    const admin = createAdminClient();

    // 1. Fetch Room Type details
    const { data: roomType, error: rtError } = await admin
      .from("room_types")
      .select("id, base_price, total_inventory")
      .eq("id", roomTypeId)
      .single();

    if (rtError || !roomType) {
      return failure("room_type.not_found", "Room type not found.");
    }

    // Format start and end date of the month
    const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    // 2. Fetch all custom overrides for this date range
    const { data: overrides, error: ovError } = await admin
      .from("room_type_availability")
      .select("*")
      .eq("room_type_id", roomTypeId)
      .gte("date", startStr)
      .lte("date", endStr);

    if (ovError) {
      console.error("Fetch availability error:", ovError);
    }

    const overrideMap = new Map((overrides || []).map((o) => [o.date, o]));
    const days: Record<string, DayAvailabilityRecord> = {};

    for (let d = 1; d <= lastDayOfMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const custom = overrideMap.get(dateKey);

      if (custom) {
        days[dateKey] = {
          date: dateKey,
          available_count: custom.available_count,
          price: custom.price_override !== null && custom.price_override !== undefined
            ? Number(custom.price_override)
            : Number(roomType.base_price),
          is_override: true,
          price_override: custom.price_override ? Number(custom.price_override) : null,
          minimum_stay: custom.minimum_stay,
          closed_to_arrival: Boolean(custom.closed_to_arrival),
          closed_to_departure: Boolean(custom.closed_to_departure),
          is_blocked: custom.available_count === 0,
        };
      } else {
        days[dateKey] = {
          date: dateKey,
          available_count: roomType.total_inventory,
          price: Number(roomType.base_price),
          is_override: false,
          price_override: null,
          minimum_stay: null,
          closed_to_arrival: false,
          closed_to_departure: false,
          is_blocked: false,
        };
      }
    }

    return success({
      days,
      basePrice: Number(roomType.base_price),
      totalInventory: roomType.total_inventory,
    });
  } catch (err) {
    console.error("Unexpected error in fetchMonthlyAvailability:", err);
    return failure("unexpected.error", "Failed to fetch calendar availability.");
  }
}

export async function saveDailyOverride(
  input: SingleOverrideInput
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be signed in.");
    }

    const parsed = singleOverrideSchema.safeParse(input);
    if (!parsed.success) {
      return failure("validation.failed", "Invalid input parameters.");
    }

    const admin = createAdminClient();

    const { error: upsertError } = await admin
      .from("room_type_availability")
      .upsert(
        {
          room_type_id: parsed.data.room_type_id,
          date: parsed.data.date,
          available_count: parsed.data.available_count,
          price_override: parsed.data.price_override || null,
          minimum_stay: parsed.data.minimum_stay || null,
          closed_to_arrival: parsed.data.closed_to_arrival,
          closed_to_departure: parsed.data.closed_to_departure,
        },
        { onConflict: "room_type_id, date" }
      );

    if (upsertError) {
      return failure("db.upsert_failed", "Failed to save date override: " + upsertError.message);
    }

    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be signed in.");
    }

    const parsed = bulkOverrideSchema.safeParse(input);
    if (!parsed.success) {
      return failure("validation.failed", "Invalid bulk update parameters.");
    }

    const admin = createAdminClient();

    const { data: updatedCount, error: rpcError } = await admin.rpc(
      "bulk_upsert_availability_rpc",
      {
        p_room_type_id: parsed.data.room_type_id,
        p_start_date: parsed.data.start_date,
        p_end_date: parsed.data.end_date,
        p_available_count: parsed.data.available_count,
        p_price_override: parsed.data.price_override || null,
        p_minimum_stay: parsed.data.minimum_stay || null,
        p_closed_to_arrival: parsed.data.closed_to_arrival,
        p_closed_to_departure: parsed.data.closed_to_departure,
      }
    );

    if (rpcError) {
      return failure("db.bulk_failed", "Failed to apply bulk update: " + rpcError.message);
    }

    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

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
    const admin = createAdminClient();

    const { error: deleteError } = await admin
      .from("room_type_availability")
      .delete()
      .eq("room_type_id", roomTypeId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (deleteError) {
      return failure("db.delete_failed", "Failed to reset dates: " + deleteError.message);
    }

    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in resetAvailabilityDates:", err);
    return failure("unexpected.error", "An error occurred while resetting dates.");
  }
}
