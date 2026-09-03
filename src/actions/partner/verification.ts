"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success, type ActionResult } from "@/src/lib/api/response";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB



export async function uploadVerificationDocument(
  formData: FormData
): Promise<ActionResult<{ id: string; documentUrl: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be logged in to upload documents.");
    }

    // Retrieve profile to find partner_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("partner_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return failure("profile.not_found", "User profile not found.");
    }

    let partnerId = profile.partner_id;

    // Fallback: check if partner is owned by user directly
    if (!partnerId) {
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (partner) {
        partnerId = partner.id;
      }
    }

    if (!partnerId) {
      return failure("partner.not_found", "No partner account associated with your profile.");
    }

    const documentType = (formData.get("documentType") as string)?.trim();
    if (!documentType) {
      return failure("validation.failed", "Document type is required.");
    }

    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return failure("validation.failed", "Please select a valid document file.");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return failure("validation.file_too_large", "Document file must be 10MB or smaller.");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return failure(
        "validation.invalid_format",
        "Invalid file format. Please upload a PDF, PNG, JPEG, or WEBP file."
      );
    }

    // Sanitize filename
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${partnerId}/${Date.now()}_${sanitizedFilename}`;

    const admin = createAdminClient();

    // Upload to partner-documents bucket
    const { error: uploadError } = await admin.storage
      .from("partner-documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Verification doc storage error:", uploadError);
      return failure("storage.upload_failed", "Failed to upload document file: " + uploadError.message);
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("partner-documents").getPublicUrl(storagePath);

    // Insert record into partner_verification_documents
    const { data: docRecord, error: insertError } = await admin
      .from("partner_verification_documents")
      .insert({
        partner_id: partnerId,
        document_url: publicUrl,
        document_type: documentType,
        status: "pending",
      })
      .select("id, document_url")
      .single();

    if (insertError || !docRecord) {
      console.error("Verification doc insert error:", insertError);
      return failure("db.insert_failed", "Failed to register document record: " + (insertError?.message || ""));
    }

    revalidatePath("/dashboard/verification");
    revalidatePath("/admin/partners");

    return success({
      id: docRecord.id,
      documentUrl: docRecord.document_url,
    });
  } catch (err) {
    console.error("Unexpected error in uploadVerificationDocument:", err);
    return failure("unexpected.error", "An unexpected error occurred while uploading.");
  }
}

export async function deleteVerificationDocument(
  documentId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return failure("auth.unauthorized", "You must be logged in to delete documents.");
    }

    // Find profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("partner_id, role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return failure("profile.not_found", "Profile not found.");
    }

    const admin = createAdminClient();

    // Fetch document details
    const { data: doc, error: docError } = await admin
      .from("partner_verification_documents")
      .select("id, partner_id, status, document_url")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return failure("doc.not_found", "Document record not found.");
    }

    // Validate ownership
    if (profile.role !== "admin" && doc.partner_id !== profile.partner_id) {
      return failure("auth.forbidden", "You are not authorized to delete this document.");
    }

    // Only pending or rejected documents can be deleted by partners
    if (profile.role !== "admin" && doc.status === "approved") {
      return failure(
        "doc.immutable",
        "Approved verification documents cannot be deleted. Contact support if changes are needed."
      );
    }

    // Delete record from table
    const { error: deleteError } = await admin
      .from("partner_verification_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      return failure("db.delete_failed", "Failed to remove document record.");
    }

    revalidatePath("/dashboard/verification");
    revalidatePath("/admin/partners");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deleteVerificationDocument:", err);
    return failure("unexpected.error", "An unexpected error occurred while deleting.");
  }
}
