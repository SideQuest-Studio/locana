"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success } from "@/src/lib/api/response";
import { registerPartnerSchema } from "@/src/lib/validations/auth";

export async function registerPartner(formData: FormData) {
  // Convert FormData to plain object for validation
  const data = Object.fromEntries(formData.entries());
  
  const parsed = registerPartnerSchema.safeParse(data);
  if (!parsed.success) {
    return failure("validation.failed", "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const file = formData.get("document") as File;
  if (!file) {
    return failure("validation.failed", "Document is required.");
  }

  const { fullName, email, password, businessName, businessEmail, businessPhone } = parsed.data;

  try {
    const admin = createAdminClient();

    // 1. Authenticate or create user in Supabase Auth
    let userId: string;

    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Validate password for existing user
      const { data: authData, error: signInError } = await admin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return failure("auth.invalid_credentials", "Incorrect password for existing account.");
      }
      userId = authData.user.id;
    } else {
      // Create new user if not exists
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authData.user) {
        return failure("auth.signup_failed", authError?.message ?? "Could not create account.");
      }
      userId = authData.user.id;
    }

    // 2. Ensure the user profile exists in public.profiles BEFORE creating any partner data
    const [firstName, ...rest] = fullName.trim().split(" ");
    const lastName = rest.join(" ") || firstName;

    const { error: profileUpsertError } = await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          role: "partner_owner",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileUpsertError) {
      console.error("Profile creation error:", profileUpsertError);
      return failure("profile.create_failed", "Could not initialize user profile. Partner application aborted.");
    }

    // Verify profile exists in public.profiles
    const { data: profileCheck, error: profileCheckError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileCheckError || !profileCheck) {
      console.error("Profile check failed:", profileCheckError);
      return failure("profile.not_found", "User profile could not be verified. Partner application aborted.");
    }

    // 3. Only after user and profile are verified to exist, create partner application
    const { data: existingPartner } = await admin
      .from("partners")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    let partnerId = existingPartner?.id;

    if (!partnerId) {
      const { data: newPartnerId, error: partnerError } = await admin.rpc("create_partner_rpc", {
        p_owner_id: userId,
        p_business_name: businessName,
        p_business_email: businessEmail || email,
        p_business_phone: businessPhone || null,
      });

      if (partnerError || !newPartnerId) {
        console.error("Partner RPC error:", partnerError);
        return failure(
          "partner.create_failed",
          `Could not create partner application: ${partnerError?.message || "Unknown error"}`
        );
      }
      partnerId = newPartnerId;
    }

    // 4. Upload verification document
    const fileName = `${partnerId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await admin.storage
      .from("partner-documents")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return failure("partner.upload_failed", "Could not upload document.");
    }

    const { data: { publicUrl } } = admin.storage.from("partner-documents").getPublicUrl(fileName);

    // 5. Insert document record
    const { error: docError } = await admin
      .from("partner_verification_documents")
      .insert({
        partner_id: partnerId,
        document_url: publicUrl,
        document_type: file.type,
      });

    if (docError) {
      console.error("Doc insert error:", docError);
      return failure("partner.doc_insert_failed", "Could not record document.");
    }

    // 6. Finalize profile with partner_id
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: "partner_owner",
        partner_id: partnerId,
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return failure("profile.update_failed", "Could not finalize partner registration.");
    }

    revalidatePath("/admin/partners");
    return success({ partnerId });
  } catch (error) {
    console.error("Registration error:", error);
    return failure("auth.unexpected", "Something went wrong. Please try again.");
  }
}


