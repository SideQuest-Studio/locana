"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
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

export async function savePropertyDetails(
  partnerId: string,
  data: PropertyDetailsInput
): Promise<ActionResult<{ propertyId: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be signed in.");
    }

    const parsed = propertyDetailsSchema.safeParse(data);
    if (!parsed.success) {
      return failure(
        "validation.failed",
        "Please fix form validation errors.",
        parsed.error.flatten().fieldErrors
      );
    }

    const admin = createAdminClient();

    const { data: propertyId, error: rpcError } = await admin.rpc(
      "save_property_details_rpc",
      {
        p_partner_id: partnerId,
        p_name: parsed.data.name,
        p_property_type: parsed.data.property_type,
        p_area_id: parsed.data.area_id,
        p_description_en: parsed.data.description_en,
        p_description_fil: parsed.data.description_fil,
        p_address: parsed.data.address,
        p_latitude: parsed.data.latitude || null,
        p_longitude: parsed.data.longitude || null,
        p_check_in_time: parsed.data.check_in_time,
        p_check_out_time: parsed.data.check_out_time,
        p_early_checkin_fee: parsed.data.early_checkin_fee,
        p_late_checkout_fee: parsed.data.late_checkout_fee,
        p_downpayment_rate: parsed.data.downpayment_rate,
        p_amenity_ids: parsed.data.amenity_ids,
      }
    );

    if (rpcError || !propertyId) {
      console.error("Save property error:", rpcError);
      return failure("db.save_failed", "Failed to save property: " + (rpcError?.message || ""));
    }

    revalidatePath("/dashboard/property");
    revalidatePath("/dashboard");
    revalidatePath("/search");

    return success({ propertyId });
  } catch (err) {
    console.error("Unexpected error in savePropertyDetails:", err);
    return failure("unexpected.error", "An error occurred while saving property details.");
  }
}

export async function uploadPropertyImage(
  propertyId: string,
  partnerId: string,
  formData: FormData
): Promise<ActionResult<{ id: string; imageUrl: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be signed in.");
    }

    const file = formData.get("image") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return failure("validation.failed", "Please choose an image to upload.");
    }

    if (file.size > 10 * 1024 * 1024) {
      return failure("validation.file_too_large", "Image size must be 10MB or less.");
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return failure("validation.invalid_format", "Please upload a PNG, JPEG, or WEBP photo.");
    }

    const admin = createAdminClient();

    // Check existing images count for cover determination
    const { data: existingImages } = await admin
      .from("property_images")
      .select("id, is_cover, display_order")
      .eq("property_id", propertyId);

    const isCover = !existingImages || existingImages.length === 0;
    const nextOrder = (existingImages?.length || 0) + 1;

    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${partnerId}/${propertyId}/${Date.now()}_${sanitizedFilename}`;

    const { error: uploadError } = await admin.storage
      .from("property-images")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      return failure("storage.upload_failed", "Failed to upload photo: " + uploadError.message);
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("property-images").getPublicUrl(storagePath);

    const { data: imageRecord, error: insertError } = await admin
      .from("property_images")
      .insert({
        property_id: propertyId,
        storage_path: storagePath,
        image_url: publicUrl,
        is_cover: isCover,
        display_order: nextOrder,
        alt_text: file.name.split(".")[0],
      })
      .select("id, image_url")
      .single();

    if (insertError || !imageRecord) {
      console.error("Image record insert error:", insertError);
      return failure("db.insert_failed", "Failed to save photo record.");
    }

    revalidatePath("/dashboard/property");
    revalidatePath("/dashboard");
    revalidatePath("/search");

    return success({
      id: imageRecord.id,
      imageUrl: imageRecord.image_url,
    });
  } catch (err) {
    console.error("Unexpected error in uploadPropertyImage:", err);
    return failure("unexpected.error", "An error occurred while uploading the photo.");
  }
}

export async function deletePropertyImage(
  imageId: string,
  propertyId: string
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

    const admin = createAdminClient();

    const { data: targetImage, error: fetchError } = await admin
      .from("property_images")
      .select("id, is_cover, storage_path")
      .eq("id", imageId)
      .eq("property_id", propertyId)
      .single();

    if (fetchError || !targetImage) {
      return failure("image.not_found", "Photo not found.");
    }

    // Delete record from DB
    await admin.from("property_images").delete().eq("id", imageId);

    // If it was cover, set the first available image as new cover
    if (targetImage.is_cover) {
      const { data: remainingImages } = await admin
        .from("property_images")
        .select("id")
        .eq("property_id", propertyId)
        .order("display_order", { ascending: true })
        .limit(1);

      if (remainingImages && remainingImages.length > 0) {
        await admin
          .from("property_images")
          .update({ is_cover: true })
          .eq("id", remainingImages[0].id);
      }
    }

    // Delete from storage (fire and forget)
    if (targetImage.storage_path) {
      await admin.storage.from("property-images").remove([targetImage.storage_path]);
    }

    revalidatePath("/dashboard/property");
    revalidatePath("/dashboard");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deletePropertyImage:", err);
    return failure("unexpected.error", "An error occurred while deleting the photo.");
  }
}

export async function setCoverPropertyImage(
  imageId: string,
  propertyId: string
): Promise<ActionResult<void>> {
  try {
    const admin = createAdminClient();

    // Reset all covers for this property
    await admin
      .from("property_images")
      .update({ is_cover: false })
      .eq("property_id", propertyId);

    // Set new cover
    const { error } = await admin
      .from("property_images")
      .update({ is_cover: true })
      .eq("id", imageId)
      .eq("property_id", propertyId);

    if (error) {
      return failure("db.update_failed", "Failed to set cover photo.");
    }

    revalidatePath("/dashboard/property");
    revalidatePath("/dashboard");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in setCoverPropertyImage:", err);
    return failure("unexpected.error", "An error occurred while setting cover photo.");
  }
}
