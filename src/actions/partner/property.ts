"use server";

import { revalidatePath } from "next/cache";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
import { dbFailure } from "@/src/lib/api/db-errors";
import { requirePartner } from "@/src/lib/auth/partner-guard";
import { z } from "zod";

const propertyDetailsSchema = z.object({
  name: z.string().min(2, "Property name must be at least 2 characters"),
  property_type: z.enum(["resort", "hotel", "homestay", "glamping", "villa"]),
  area_id: z.string().uuid("Please select a valid municipality"),
  description_en: z.string().min(10, "English description is required (min 10 characters)"),
  description_fil: z.string().min(10, "Filipino description is required (min 10 characters)"),
  address: z.string().min(5, "Physical address is required"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  check_in_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Invalid time format").default("14:00"),
  check_out_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Invalid time format").default("12:00"),
  early_checkin_fee: z.number().min(0).default(0),
  late_checkout_fee: z.number().min(0).default(0),
  downpayment_rate: z.number().min(0.1).max(1.0).default(0.3),
  amenity_ids: z.array(z.string().uuid()).default([]),
});

export type PropertyDetailsInput = z.infer<typeof propertyDetailsSchema>;

const idSchema = z.string().uuid();
const BUCKET = "property-images";

function revalidatePropertyPages() {
  revalidatePath("/dashboard/property");
  revalidatePath("/dashboard");
  revalidatePath("/search");
}

export async function savePropertyDetails(
  data: PropertyDetailsInput
): Promise<ActionResult<{ propertyId: string }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    const parsed = propertyDetailsSchema.safeParse(data);
    if (!parsed.success) {
      return failure(
        "validation.failed",
        "Please fix form validation errors.",
        parsed.error.flatten().fieldErrors
      );
    }

    const { data: propertyId, error } = await supabase.rpc("save_property_details_rpc", {
      p_name: parsed.data.name,
      p_property_type: parsed.data.property_type,
      p_area_id: parsed.data.area_id,
      p_description_en: parsed.data.description_en,
      p_description_fil: parsed.data.description_fil,
      p_address: parsed.data.address,
      p_latitude: parsed.data.latitude ?? null,
      p_longitude: parsed.data.longitude ?? null,
      p_check_in_time: parsed.data.check_in_time,
      p_check_out_time: parsed.data.check_out_time,
      p_early_checkin_fee: parsed.data.early_checkin_fee,
      p_late_checkout_fee: parsed.data.late_checkout_fee,
      p_downpayment_rate: parsed.data.downpayment_rate,
      p_amenity_ids: parsed.data.amenity_ids,
    });

    if (error || !propertyId) {
      console.error("savePropertyDetails failed:", error);
      return dbFailure(error, "property.save_failed");
    }

    revalidatePropertyPages();
    return success({ propertyId });
  } catch (err) {
    console.error("Unexpected error in savePropertyDetails:", err);
    return failure("unexpected.error", "An error occurred while saving property details.");
  }
}

export async function uploadPropertyImage(
  formData: FormData
): Promise<ActionResult<{ id: string; imageUrl: string }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!ctx.propertyId) {
      return failure("property.missing", "Create your property profile first.");
    }

    const file = formData.get("image") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return failure("validation.failed", "Please choose an image to upload.");
    }
    if (file.size > 10 * 1024 * 1024) {
      return failure("validation.file_too_large", "Image size must be 10MB or less.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return failure("validation.invalid_format", "Please upload a PNG, JPEG, or WEBP photo.");
    }

    const { count: existingCount } = await supabase
      .from("property_images")
      .select("id", { count: "exact", head: true })
      .eq("property_id", ctx.propertyId);

    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${ctx.partnerId}/${ctx.propertyId}/${Date.now()}_${sanitizedFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Image upload error:", uploadError);
      return failure("storage.upload_failed", "Failed to upload photo. Please try again.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { data: imageRecord, error: insertError } = await supabase
      .from("property_images")
      .insert({
        property_id: ctx.propertyId,
        storage_path: storagePath,
        image_url: publicUrl,
        is_cover: !existingCount,
        display_order: (existingCount ?? 0) + 1,
        alt_text: file.name.split(".")[0],
      })
      .select("id, image_url")
      .single();

    if (insertError || !imageRecord) {
      console.error("Image record insert error:", insertError);
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([storagePath]);
      if (cleanupError) console.error("Orphaned upload cleanup failed:", cleanupError);
      return dbFailure(insertError, "image.save_failed");
    }

    revalidatePropertyPages();
    return success({ id: imageRecord.id, imageUrl: imageRecord.image_url });
  } catch (err) {
    console.error("Unexpected error in uploadPropertyImage:", err);
    return failure("unexpected.error", "An error occurred while uploading the photo.");
  }
}

export async function deletePropertyImage(imageId: string): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!idSchema.safeParse(imageId).success || !ctx.propertyId) {
      return failure("validation.failed", "Invalid request.");
    }

    const { data: targetImage } = await supabase
      .from("property_images")
      .select("id, is_cover, storage_path")
      .eq("id", imageId)
      .eq("property_id", ctx.propertyId)
      .maybeSingle();
    if (!targetImage) {
      return failure("image.not_found", "Photo not found.");
    }

    const { error: deleteError } = await supabase.from("property_images").delete().eq("id", imageId);
    if (deleteError) {
      console.error("Image delete error:", deleteError);
      return dbFailure(deleteError, "image.delete_failed");
    }

    if (targetImage.is_cover) {
      const { data: next } = await supabase
        .from("property_images")
        .select("id")
        .eq("property_id", ctx.propertyId)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (next) {
        await supabase.from("property_images").update({ is_cover: true }).eq("id", next.id);
      }
    }

    if (targetImage.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([targetImage.storage_path]);
      if (storageError) console.error("Image file removal failed:", storageError);
    }

    revalidatePropertyPages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deletePropertyImage:", err);
    return failure("unexpected.error", "An error occurred while deleting the photo.");
  }
}

export async function setCoverPropertyImage(imageId: string): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!idSchema.safeParse(imageId).success || !ctx.propertyId) {
      return failure("validation.failed", "Invalid request.");
    }

    const { data: image } = await supabase
      .from("property_images")
      .select("id")
      .eq("id", imageId)
      .eq("property_id", ctx.propertyId)
      .maybeSingle();
    if (!image) {
      return failure("image.not_found", "Photo not found.");
    }

    const { error: clearError } = await supabase
      .from("property_images")
      .update({ is_cover: false })
      .eq("property_id", ctx.propertyId)
      .neq("id", imageId);
    const { error: setError } = await supabase
      .from("property_images")
      .update({ is_cover: true })
      .eq("id", imageId);

    if (clearError || setError) {
      console.error("Set cover error:", clearError ?? setError);
      return dbFailure(clearError ?? setError, "image.update_failed");
    }

    revalidatePropertyPages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in setCoverPropertyImage:", err);
    return failure("unexpected.error", "An error occurred while setting cover photo.");
  }
}
