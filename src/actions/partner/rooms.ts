"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
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

const roomUnitSchema = z.object({
  room_number: z.string().min(1, "Unit identifier / room number is required"),
  floor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["available", "occupied", "maintenance"]).default("available"),
});

export type RoomUnitInput = z.infer<typeof roomUnitSchema>;

export async function createRoomType(
  propertyId: string,
  data: RoomTypeInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be logged in.");
    }

    const parsed = roomTypeSchema.safeParse(data);
    if (!parsed.success) {
      return failure(
        "validation.failed",
        "Please fix form validation errors.",
        parsed.error.flatten().fieldErrors
      );
    }

    const admin = createAdminClient();

    const { data: newRoomType, error: insertError } = await admin
      .from("room_types")
      .insert({
        property_id: propertyId,
        name_en: parsed.data.name_en,
        name_fil: parsed.data.name_fil || parsed.data.name_en,
        description_en: parsed.data.description_en || null,
        description_fil: parsed.data.description_fil || null,
        capacity: parsed.data.capacity,
        max_adults: parsed.data.max_adults,
        max_children: parsed.data.max_children,
        base_price: parsed.data.base_price,
        total_inventory: parsed.data.total_inventory,
        size_sqm: parsed.data.size_sqm || null,
        bed_configuration: parsed.data.bed_configuration || null,
      })
      .select("id")
      .single();

    if (insertError || !newRoomType) {
      console.error("Create room type error:", insertError);
      return failure("db.insert_failed", "Failed to create room type: " + (insertError?.message || ""));
    }

    revalidatePath("/dashboard/rooms");
    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

    return success({ id: newRoomType.id });
  } catch (err) {
    console.error("Unexpected error in createRoomType:", err);
    return failure("unexpected.error", "An error occurred while creating the room type.");
  }
}

export async function updateRoomType(
  roomTypeId: string,
  propertyId: string,
  data: RoomTypeInput
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be logged in.");
    }

    const parsed = roomTypeSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix form validation errors.");
    }

    const admin = createAdminClient();

    const { error: updateError } = await admin
      .from("room_types")
      .update({
        name_en: parsed.data.name_en,
        name_fil: parsed.data.name_fil || parsed.data.name_en,
        description_en: parsed.data.description_en || null,
        description_fil: parsed.data.description_fil || null,
        capacity: parsed.data.capacity,
        max_adults: parsed.data.max_adults,
        max_children: parsed.data.max_children,
        base_price: parsed.data.base_price,
        total_inventory: parsed.data.total_inventory,
        size_sqm: parsed.data.size_sqm || null,
        bed_configuration: parsed.data.bed_configuration || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomTypeId)
      .eq("property_id", propertyId);

    if (updateError) {
      return failure("db.update_failed", "Failed to update room type: " + updateError.message);
    }

    revalidatePath("/dashboard/rooms");
    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in updateRoomType:", err);
    return failure("unexpected.error", "An error occurred while updating the room type.");
  }
}

export async function deleteRoomType(
  roomTypeId: string,
  propertyId: string
): Promise<ActionResult<void>> {
  try {
    const admin = createAdminClient();

    // Delete associated individual room units first
    await admin.from("rooms").delete().eq("room_type_id", roomTypeId);

    // Delete room type
    const { error: deleteError } = await admin
      .from("room_types")
      .delete()
      .eq("id", roomTypeId)
      .eq("property_id", propertyId);

    if (deleteError) {
      return failure("db.delete_failed", "Failed to delete room type: " + deleteError.message);
    }

    revalidatePath("/dashboard/rooms");
    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deleteRoomType:", err);
    return failure("unexpected.error", "An error occurred while deleting the room type.");
  }
}

export async function addRoomUnit(
  roomTypeId: string,
  data: RoomUnitInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = roomUnitSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Room number is required.");
    }

    const admin = createAdminClient();

    const { data: newUnit, error } = await admin
      .from("rooms")
      .insert({
        room_type_id: roomTypeId,
        room_number: parsed.data.room_number.trim(),
        floor: parsed.data.floor?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: parsed.data.status as RoomStatus,
      })
      .select("id")
      .single();

    if (error || !newUnit) {
      return failure("db.insert_failed", "Could not add unit: " + (error?.message || ""));
    }

    revalidatePath("/dashboard/rooms");
    return success({ id: newUnit.id });
  } catch (err) {
    console.error("Unexpected error in addRoomUnit:", err);
    return failure("unexpected.error", "An error occurred while adding room unit.");
  }
}

export async function updateRoomUnitStatus(
  roomId: string,
  status: RoomStatus
): Promise<ActionResult<void>> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("rooms")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", roomId);

    if (error) {
      return failure("db.update_failed", "Could not update unit status.");
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
    const admin = createAdminClient();
    const { error } = await admin.from("rooms").delete().eq("id", roomId);

    if (error) {
      return failure("db.delete_failed", "Could not delete room unit.");
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
    if (count <= 0 || count > 50) {
      return failure("validation.failed", "Batch count must be between 1 and 50.");
    }

    const units = [];
    for (let i = 0; i < count; i++) {
      const num = startNumber + i;
      const roomNum = prefix ? `${prefix.trim()} ${num}` : `${num}`;
      units.push({
        room_type_id: roomTypeId,
        room_number: roomNum,
        floor: floor?.trim() || null,
        status: "available" as RoomStatus,
      });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("rooms").insert(units);

    if (error) {
      return failure("db.insert_failed", "Failed to batch create units: " + error.message);
    }

    revalidatePath("/dashboard/rooms");
    return success({ created: count });
  } catch (err) {
    console.error("Unexpected error in batchCreateRoomUnits:", err);
    return failure("unexpected.error", "An error occurred during batch unit creation.");
  }
}
