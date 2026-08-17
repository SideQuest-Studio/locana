"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
import { z } from "zod";

const ratePlanSchema = z.object({
  room_type_id: z.string().uuid("Room type is required"),
  name_en: z.string().min(2, "Rate plan name in English is required"),
  name_fil: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price_modifier: z.coerce.number().default(0),
  minimum_stay: z.coerce.number().min(1).default(1),
  cancellation_policy: z.string().optional().nullable(),
  includes_breakfast: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

export type RatePlanInput = z.infer<typeof ratePlanSchema>;

const pricingRuleSchema = z.object({
  name: z.string().min(2, "Rule name is required (e.g. Pahiyas Festival Surge)"),
  rule_type: z.enum(["weekend", "seasonal", "holiday", "date_range"]),
  room_type_id: z.string().uuid().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  days_of_week: z.array(z.number().min(0).max(6)).default([]),
  price_modifier: z.coerce.number(),
  minimum_stay: z.coerce.number().min(1).optional().nullable(),
  priority: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type PricingRuleInput = z.infer<typeof pricingRuleSchema>;

// ── Rate Plans ─────────────────────────────────────────────────────────────

export async function createRatePlan(
  data: RatePlanInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = ratePlanSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix validation errors.");
    }

    const admin = createAdminClient();

    // If is_default, reset others for this room_type
    if (parsed.data.is_default) {
      await admin
        .from("rate_plans")
        .update({ is_default: false })
        .eq("room_type_id", parsed.data.room_type_id);
    }

    const { data: newPlan, error } = await admin
      .from("rate_plans")
      .insert({
        room_type_id: parsed.data.room_type_id,
        name_en: parsed.data.name_en,
        name_fil: parsed.data.name_fil || parsed.data.name_en,
        description: parsed.data.description || null,
        price_modifier: parsed.data.price_modifier,
        minimum_stay: parsed.data.minimum_stay,
        cancellation_policy: parsed.data.cancellation_policy || null,
        includes_breakfast: parsed.data.includes_breakfast,
        is_default: parsed.data.is_default,
      })
      .select("id")
      .single();

    if (error || !newPlan) {
      console.error("Create rate plan error:", error);
      return failure("db.insert_failed", "Failed to create rate plan: " + (error?.message || ""));
    }

    revalidatePath("/dashboard/rates");
    revalidatePath("/search");

    return success({ id: newPlan.id });
  } catch (err) {
    console.error("Unexpected error in createRatePlan:", err);
    return failure("unexpected.error", "An error occurred while creating rate plan.");
  }
}

export async function updateRatePlan(
  ratePlanId: string,
  data: RatePlanInput
): Promise<ActionResult<void>> {
  try {
    const parsed = ratePlanSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix validation errors.");
    }

    const admin = createAdminClient();

    if (parsed.data.is_default) {
      await admin
        .from("rate_plans")
        .update({ is_default: false })
        .eq("room_type_id", parsed.data.room_type_id);
    }

    const { error } = await admin
      .from("rate_plans")
      .update({
        room_type_id: parsed.data.room_type_id,
        name_en: parsed.data.name_en,
        name_fil: parsed.data.name_fil || parsed.data.name_en,
        description: parsed.data.description || null,
        price_modifier: parsed.data.price_modifier,
        minimum_stay: parsed.data.minimum_stay,
        cancellation_policy: parsed.data.cancellation_policy || null,
        includes_breakfast: parsed.data.includes_breakfast,
        is_default: parsed.data.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ratePlanId);

    if (error) {
      return failure("db.update_failed", "Failed to update rate plan: " + error.message);
    }

    revalidatePath("/dashboard/rates");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in updateRatePlan:", err);
    return failure("unexpected.error", "An error occurred while updating rate plan.");
  }
}

export async function deleteRatePlan(ratePlanId: string): Promise<ActionResult<void>> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("rate_plans").delete().eq("id", ratePlanId);

    if (error) {
      return failure("db.delete_failed", "Failed to delete rate plan.");
    }

    revalidatePath("/dashboard/rates");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deleteRatePlan:", err);
    return failure("unexpected.error", "An error occurred while deleting rate plan.");
  }
}

// ── Pricing Rules ──────────────────────────────────────────────────────────

export async function createPricingRule(
  propertyId: string,
  data: PricingRuleInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = pricingRuleSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix rule validation errors.");
    }

    const admin = createAdminClient();

    const { data: newRule, error } = await admin
      .from("pricing_rules")
      .insert({
        property_id: propertyId,
        room_type_id: parsed.data.room_type_id || null,
        name: parsed.data.name,
        rule_type: parsed.data.rule_type,
        start_date: parsed.data.start_date || null,
        end_date: parsed.data.end_date || null,
        days_of_week: parsed.data.days_of_week,
        price_modifier: parsed.data.price_modifier,
        minimum_stay: parsed.data.minimum_stay || null,
        priority: parsed.data.priority,
        is_active: parsed.data.is_active,
      })
      .select("id")
      .single();

    if (error || !newRule) {
      console.error("Create pricing rule error:", error);
      return failure("db.insert_failed", "Failed to create pricing rule: " + (error?.message || ""));
    }

    revalidatePath("/dashboard/rates");
    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

    return success({ id: newRule.id });
  } catch (err) {
    console.error("Unexpected error in createPricingRule:", err);
    return failure("unexpected.error", "An error occurred while creating pricing rule.");
  }
}

export async function updatePricingRule(
  ruleId: string,
  propertyId: string,
  data: PricingRuleInput
): Promise<ActionResult<void>> {
  try {
    const parsed = pricingRuleSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix rule validation errors.");
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("pricing_rules")
      .update({
        room_type_id: parsed.data.room_type_id || null,
        name: parsed.data.name,
        rule_type: parsed.data.rule_type,
        start_date: parsed.data.start_date || null,
        end_date: parsed.data.end_date || null,
        days_of_week: parsed.data.days_of_week,
        price_modifier: parsed.data.price_modifier,
        minimum_stay: parsed.data.minimum_stay || null,
        priority: parsed.data.priority,
        is_active: parsed.data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("property_id", propertyId);

    if (error) {
      return failure("db.update_failed", "Failed to update pricing rule: " + error.message);
    }

    revalidatePath("/dashboard/rates");
    revalidatePath("/dashboard/availability");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in updatePricingRule:", err);
    return failure("unexpected.error", "An error occurred while updating pricing rule.");
  }
}

export async function togglePricingRule(
  ruleId: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("pricing_rules")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", ruleId);

    if (error) {
      return failure("db.update_failed", "Failed to toggle pricing rule.");
    }

    revalidatePath("/dashboard/rates");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in togglePricingRule:", err);
    return failure("unexpected.error", "An error occurred while toggling rule.");
  }
}

export async function deletePricingRule(ruleId: string): Promise<ActionResult<void>> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("pricing_rules").delete().eq("id", ruleId);

    if (error) {
      return failure("db.delete_failed", "Failed to delete pricing rule.");
    }

    revalidatePath("/dashboard/rates");
    revalidatePath("/search");

    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deletePricingRule:", err);
    return failure("unexpected.error", "An error occurred while deleting rule.");
  }
}
