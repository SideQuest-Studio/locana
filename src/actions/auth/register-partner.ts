"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success } from "@/src/lib/api/response";
import { registerPartnerSchema } from "@/src/lib/validations/auth";

export async function registerPartner(raw: unknown) {
  const parsed = registerPartnerSchema.safeParse(raw);
  if (!parsed.success) {
    return failure("validation.failed", "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const { fullName, email, password, businessName, businessEmail, businessPhone } = parsed.data;

  try {
    const admin = createAdminClient();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError || !authData.user) {
      if (authError?.message.includes("already been registered")) {
        return failure("auth.email_taken", "An account with this email already exists.");
      }
      return failure("auth.signup_failed", authError?.message ?? "Could not create account.");
    }

    const userId = authData.user.id;

    const { data: partner, error: partnerError } = await admin
      .from("partners")
      .insert({
        owner_id: userId,
        business_name: businessName,
        business_email: businessEmail || email,
        business_phone: businessPhone || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (partnerError || !partner) {
      await admin.auth.admin.deleteUser(userId);
      return failure("partner.create_failed", "Could not create partner application.");
    }

    const [firstName, ...rest] = fullName.trim().split(" ");
    const lastName = rest.join(" ") || firstName;

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: "partner_owner",
        partner_id: partner.id,
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", userId);

    if (profileError) {
      await admin.from("partners").delete().eq("id", partner.id);
      await admin.auth.admin.deleteUser(userId);
      return failure("profile.update_failed", "Could not finalize partner registration.");
    }

    revalidatePath("/admin/partners");
    return success({ partnerId: partner.id });
  } catch {
    return failure("auth.unexpected", "Something went wrong. Please try again.");
  }
}
