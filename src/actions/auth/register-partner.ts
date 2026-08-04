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
    console.log("Admin client initialized. Is SERVICE_ROLE_KEY present?", !!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);

    // 1. Check if user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find((u) => u.email === email);

    let userId: string;

    if (existingUser) {
      // 2. Validate password for existing user
      const { data: authData, error: signInError } = await admin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return failure("auth.invalid_credentials", "Incorrect password for existing account.");
      }
      userId = authData.user.id;
    } else {
      // 3. Create new user if not exists
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

    // 4. Create partner application
    const { data: existingPartner } = await admin
      .from("partners")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    let partnerId = existingPartner?.id;

    if (!partnerId) {
      const { data: newPartnerId, error: partnerError } = await admin.rpc("create_partner_rpc", {
        p_id: crypto.randomUUID(), // Pass a new UUID
        p_owner_id: userId,
        p_business_name: businessName,
        p_business_email: businessEmail || email,
        p_business_phone: businessPhone || null,
      });

      if (partnerError || !newPartnerId) {
        console.error("Partner RPC error:", partnerError);
        return failure("partner.create_failed", `Could not create partner application: ${partnerError?.message || "Unknown error"}`);
      }
      partnerId = newPartnerId;
    }

    // 5. Update profile to partner
    const [firstName, ...rest] = fullName.trim().split(" ");
    const lastName = rest.join(" ") || firstName;

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
      return failure("profile.update_failed", "Could not finalize partner registration.");
    }

    revalidatePath("/admin/partners");
    return success({ partnerId });
  } catch (error) {
    console.error("Registration error:", error);
    return failure("auth.unexpected", "Something went wrong. Please try again.");
  }
}
