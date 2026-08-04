"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success } from "@/src/lib/api/response";
import { approvePartnerSchema, rejectPartnerSchema } from "@/src/lib/validations/auth";

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

export async function approvePartner(raw: unknown) {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return failure("auth.forbidden", "Admin access required.");
  }

  const parsed = approvePartnerSchema.safeParse(raw);
  if (!parsed.success) {
    return failure("validation.failed", "Invalid partner ID.");
  }

  const { partnerId } = parsed.data;
  const admin = createAdminClient();

  const { data: before } = await admin.from("partners").select("*").eq("id", partnerId).single();
  if (!before) {
    return failure("partner.not_found", "Partner not found.");
  }

  const { error } = await admin
    .from("partners")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: adminUser.userId,
      rejection_reason: null,
    })
    .eq("id", partnerId);

  if (error) {
    return failure("partner.approve_failed", "Could not approve partner.");
  }

  await admin.from("audit_logs").insert({
    actor_id: adminUser.userId,
    action: "approve",
    entity_type: "partner",
    entity_id: partnerId,
    before_state: before,
    after_state: { ...before, status: "approved" },
  });

  revalidatePath("/admin/partners");
  revalidatePath("/admin");
  return success(undefined);
}

export async function rejectPartner(raw: unknown) {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return failure("auth.forbidden", "Admin access required.");
  }

  const parsed = rejectPartnerSchema.safeParse(raw);
  if (!parsed.success) {
    return failure("validation.failed", "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const { partnerId, reason } = parsed.data;
  const admin = createAdminClient();

  const { data: before } = await admin.from("partners").select("*").eq("id", partnerId).single();
  if (!before) {
    return failure("partner.not_found", "Partner not found.");
  }

  const { error } = await admin
    .from("partners")
    .update({
      status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", partnerId);

  if (error) {
    return failure("partner.reject_failed", "Could not reject partner.");
  }

  await admin.from("audit_logs").insert({
    actor_id: adminUser.userId,
    action: "reject",
    entity_type: "partner",
    entity_id: partnerId,
    before_state: before,
    after_state: { ...before, status: "rejected", rejection_reason: reason },
  });

  revalidatePath("/admin/partners");
  revalidatePath("/admin");
  return success(undefined);
}
