"use server";

import { revalidatePath } from "next/cache";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
import { dbFailure } from "@/src/lib/api/db-errors";
import { requirePartner } from "@/src/lib/auth/partner-guard";
import { z } from "zod";
import type { RoomStatus } from "@/src/types/database.types";

const roomTypeSchema = z.object({
  name_en: z.string().min(2, "Room name in English is required"),
  name_fil: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_fil: z.string().optional().nullable(),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  max_adults: z.coerce.number().min(1, "Max adults must be at least 1").default(2),
  max_children: z.coerce.number().min(0).default(0),
  base_price: z.coerce.number().min(1, "Base price must be greater than 0"),
  total_inventory: z.coerce.number().min(1, "Inventory must be at least 1"),
  size_sqm: z.coerce.number().nullable().optional(),
  bed_configuration: z.string().optional().nullable(),
});

export type RoomTypeInput = z.infer<typeof roomTypeSchema>;

const roomStatusSchema = z.enum(["available", "occupied", "maintenance"]);

const roomUnitSchema = z.object({
  room_number: z.string().min(1, "Unit identifier / room number is required"),
  floor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: roomStatusSchema.default("available"),
});

export type RoomUnitInput = z.infer<typeof roomUnitSchema>;

const batchSchema = z.object({
  roomTypeId: z.string().uuid(),
  prefix: z.string().max(20),
  startNumber: z.number().int().min(0),
  count: z.number().int().min(1, "Batch count must be between 1 and 50.").max(50, "Batch count must be between 1 and 50."),
  floor: z.string().max(20).optional(),
});

const idSchema = z.string().uuid();

function invalidRequest() {
  return failure("validation.failed", "Invalid request.");
}

function revalidateRoomPages() {
  revalidatePath("/dashboard/rooms");
  revalidatePath("/dashboard/availability");
  revalidatePath("/search");
}

function roomTypeRow(data: RoomTypeInput) {
  return {
    name_en: data.name_en,
    name_fil: data.name_fil || data.name_en,
    description_en: data.description_en || null,
    description_fil: data.description_fil || null,
    capacity: data.capacity,
    max_adults: data.max_adults,
    max_children: data.max_children,
    base_price: data.base_price,
    total_inventory: data.total_inventory,
    size_sqm: data.size_sqm || null,
    bed_configuration: data.bed_configuration || null,
  };
}

export async function createRoomType(data: RoomTypeInput): Promise<ActionResult<{ id: string }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!ctx.propertyId) {
      return failure("property.missing", "Create your property profile first.");
    }

    const parsed = roomTypeSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix form validation errors.", parsed.error.flatten().fieldErrors);
    }

    const { data: newRoomType, error } = await supabase
      .from("room_types")
      .insert({ property_id: ctx.propertyId, ...roomTypeRow(parsed.data) })
      .select("id")
      .single();

    if (error || !newRoomType) {
      console.error("Create room type error:", error);
      return dbFailure(error, "room_type.create_failed");
    }

    revalidateRoomPages();
    return success({ id: newRoomType.id });
  } catch (err) {
    console.error("Unexpected error in createRoomType:", err);
    return failure("unexpected.error", "An error occurred while creating the room type.");
  }
}

export async function updateRoomType(roomTypeId: string, data: RoomTypeInput): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!idSchema.safeParse(roomTypeId).success || !ctx.propertyId) return invalidRequest();

    const parsed = roomTypeSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix form validation errors.", parsed.error.flatten().fieldErrors);
    }

    const { data: updated, error } = await supabase
      .from("room_types")
      .update({ ...roomTypeRow(parsed.data), updated_at: new Date().toISOString() })
      .eq("id", roomTypeId)
      .eq("property_id", ctx.propertyId)
      .select("id");

    if (error) {
      console.error("Update room type error:", error);
      return dbFailure(error, "room_type.update_failed");
    }
    if (!updated?.length) {
      return failure("room_type.not_found", "Room type not found.");
    }

    revalidateRoomPages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in updateRoomType:", err);
    return failure("unexpected.error", "An error occurred while updating the room type.");
  }
}

export async function deleteRoomType(roomTypeId: string): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!idSchema.safeParse(roomTypeId).success || !ctx.propertyId) return invalidRequest();

    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("room_type_id", roomTypeId);
    if (bookingCount) {
      return failure("room_type.has_bookings", "This room type has bookings and can't be deleted.");
    }

    const { error: unitsError } = await supabase.from("rooms").delete().eq("room_type_id", roomTypeId);
    if (unitsError) {
      console.error("Delete room units error:", unitsError);
      return dbFailure(unitsError, "room_type.delete_failed");
    }

    const { data: deleted, error } = await supabase
      .from("room_types")
      .delete()
      .eq("id", roomTypeId)
      .eq("property_id", ctx.propertyId)
      .select("id");

    if (error) {
      console.error("Delete room type error:", error);
      return dbFailure(error, "room_type.delete_failed");
    }
    if (!deleted?.length) {
      return failure("room_type.not_found", "Room type not found.");
    }

    revalidateRoomPages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deleteRoomType:", err);
    return failure("unexpected.error", "An error occurred while deleting the room type.");
  }
}

export async function addRoomUnit(roomTypeId: string, data: RoomUnitInput): Promise<ActionResult<{ id: string }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!idSchema.safeParse(roomTypeId).success) return invalidRequest();

    const parsed = roomUnitSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Room number is required.");
    }

    const { data: newUnit, error } = await supabase
      .from("rooms")
      .insert({
        room_type_id: roomTypeId,
        room_number: parsed.data.room_number.trim(),
        floor: parsed.data.floor?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: parsed.data.status,
      })
      .select("id")
      .single();

    if (error || !newUnit) {
      console.error("Add room unit error:", error);
      return dbFailure(error, "room.create_failed");
    }

    revalidatePath("/dashboard/rooms");
    return success({ id: newUnit.id });
  } catch (err) {
    console.error("Unexpected error in addRoomUnit:", err);
    return failure("unexpected.error", "An error occurred while adding room unit.");
  }
}

export async function updateRoomUnitStatus(roomId: string, status: RoomStatus): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!idSchema.safeParse(roomId).success || !roomStatusSchema.safeParse(status).success) {
      return invalidRequest();
    }

    const { data: updated, error } = await supabase
      .from("rooms")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", roomId)
      .select("id");

    if (error) {
      console.error("Update room status error:", error);
      return dbFailure(error, "room.update_failed");
    }
    if (!updated?.length) {
      return failure("room.not_found", "Room unit not found.");
    }

    revalidatePath("/dashboard/rooms");
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in updateRoomUnitStatus:", err);
    return failure("unexpected.error", "An error occurred while updating status.");
  }
}

export async function deleteRoomUnit(roomId: string): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!idSchema.safeParse(roomId).success) return invalidRequest();

    const { data: deleted, error } = await supabase.from("rooms").delete().eq("id", roomId).select("id");

    if (error) {
      console.error("Delete room unit error:", error);
      return dbFailure(error, "room.delete_failed");
    }
    if (!deleted?.length) {
      return failure("room.not_found", "Room unit not found.");
    }

    revalidatePath("/dashboard/rooms");
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deleteRoomUnit:", err);
    return failure("unexpected.error", "An error occurred while deleting room unit.");
  }
}

export async function batchCreateRoomUnits(
  roomTypeId: string,
  prefix: string,
  startNumber: number,
  count: number,
  floor?: string
): Promise<ActionResult<{ created: number }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    const parsed = batchSchema.safeParse({ roomTypeId, prefix, startNumber, count, floor });
    if (!parsed.success) {
      const message = parsed.error.flatten().fieldErrors.count?.[0] ?? "Invalid batch parameters.";
      return failure("validation.failed", message);
    }

    const units = Array.from({ length: parsed.data.count }, (_, i) => {
      const num = parsed.data.startNumber + i;
      return {
        room_type_id: parsed.data.roomTypeId,
        room_number: parsed.data.prefix.trim() ? `${parsed.data.prefix.trim()} ${num}` : `${num}`,
        floor: parsed.data.floor?.trim() || null,
        status: "available" as RoomStatus,
      };
    });

    const { error } = await supabase.from("rooms").insert(units);
    if (error) {
      console.error("Batch create room units error:", error);
      return dbFailure(error, "room.create_failed");
    }

    revalidatePath("/dashboard/rooms");
    return success({ created: units.length });
  } catch (err) {
    console.error("Unexpected error in batchCreateRoomUnits:", err);
    return failure("unexpected.error", "An error occurred during batch unit creation.");
  }
}
