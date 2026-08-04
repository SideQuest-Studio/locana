"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success } from "@/src/lib/api/response";
import { updateUserRoleSchema } from "@/src/lib/validations/auth";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return null;
  return { userId: user.id, profile };
}

/**
 * Server action to alter a user's role (admin, partner_owner, partner_staff, customer/user).
 * Callable by platform administrators.
 */
export async function updateUserRole(raw: unknown) {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return failure("auth.forbidden", "Admin access required.");
  }

  const parsed = updateUserRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return failure("validation.failed", "Invalid parameters", parsed.error.flatten().fieldErrors);
  }

  const { userId, role, partnerId, staffRole } = parsed.data;
  const admin = createAdminClient();

  // Call the update_user_role RPC function which handles profile update & auth metadata sync
  const { error } = await admin.rpc("update_user_role", {
    p_user_id: userId,
    p_role: role,
    p_partner_id: partnerId ?? null,
    p_staff_role: staffRole ?? null,
  });

  if (error) {
    console.error("Failed to update user role:", error);
    return failure("role.update_failed", error.message || "Failed to update user role.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/partners");

  return success({ userId, role, partnerId, staffRole });
}
