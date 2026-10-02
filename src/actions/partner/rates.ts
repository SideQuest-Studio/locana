"use server";

import { revalidatePath } from "next/cache";
import { failure, success, type ActionResult } from "@/src/lib/api/response";
import { dbFailure } from "@/src/lib/api/db-errors";
import { requirePartner } from "@/src/lib/auth/partner-guard";
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

const optionalDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").nullable().optional()
);

const pricingRuleSchema = z
  .object({
    name: z.string().min(2, "Rule name is required (e.g. Pahiyas Festival Surge)"),
    rule_type: z.enum(["weekend", "seasonal", "holiday", "date_range"]),
    room_type_id: z.string().uuid().optional().nullable(),
    start_date: optionalDate,
    end_date: optionalDate,
    days_of_week: z.array(z.number().int().min(0).max(6)).default([]),
    price_modifier: z.coerce.number(),
    minimum_stay: z.coerce.number().min(1).optional().nullable(),
    priority: z.coerce.number().min(0).default(0),
    is_active: z.boolean().default(true),
  })
  .refine((rule) => !rule.start_date || !rule.end_date || rule.end_date >= rule.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });

export type PricingRuleInput = z.infer<typeof pricingRuleSchema>;

const idSchema = z.string().uuid();

function invalidRequest() {
  return failure("validation.failed", "Invalid request.");
}

function revalidateRatePages() {
  revalidatePath("/dashboard/rates");
  revalidatePath("/dashboard/availability");
  revalidatePath("/search");
}

function ratePlanRow(data: RatePlanInput) {
  return {
    room_type_id: data.room_type_id,
    name_en: data.name_en,
    name_fil: data.name_fil || data.name_en,
    description: data.description || null,
    price_modifier: data.price_modifier,
    minimum_stay: data.minimum_stay,
    cancellation_policy: data.cancellation_policy || null,
    includes_breakfast: data.includes_breakfast,
    is_default: data.is_default,
  };
}

function pricingRuleRow(data: PricingRuleInput) {
  return {
    room_type_id: data.room_type_id || null,
    name: data.name,
    rule_type: data.rule_type,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    days_of_week: data.days_of_week,
    price_modifier: data.price_modifier,
    minimum_stay: data.minimum_stay || null,
    priority: data.priority,
    is_active: data.is_active,
  };
}

// ── Rate Plans ─────────────────────────────────────────────────────────────

export async function createRatePlan(data: RatePlanInput): Promise<ActionResult<{ id: string }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    const parsed = ratePlanSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix validation errors.", parsed.error.flatten().fieldErrors);
    }

    if (parsed.data.is_default) {
      await supabase.from("rate_plans").update({ is_default: false }).eq("room_type_id", parsed.data.room_type_id);
    }

    const { data: newPlan, error } = await supabase
      .from("rate_plans")
      .insert(ratePlanRow(parsed.data))
      .select("id")
      .single();

    if (error || !newPlan) {
      console.error("Create rate plan error:", error);
      return dbFailure(error, "rate_plan.create_failed");
    }

    revalidateRatePages();
    return success({ id: newPlan.id });
  } catch (err) {
    console.error("Unexpected error in createRatePlan:", err);
    return failure("unexpected.error", "An error occurred while creating rate plan.");
  }
}

export async function updateRatePlan(ratePlanId: string, data: RatePlanInput): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!idSchema.safeParse(ratePlanId).success) return invalidRequest();

    const parsed = ratePlanSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix validation errors.", parsed.error.flatten().fieldErrors);
    }

    if (parsed.data.is_default) {
      await supabase
        .from("rate_plans")
        .update({ is_default: false })
        .eq("room_type_id", parsed.data.room_type_id)
        .neq("id", ratePlanId);
    }

    const { data: updated, error } = await supabase
      .from("rate_plans")
      .update({ ...ratePlanRow(parsed.data), updated_at: new Date().toISOString() })
      .eq("id", ratePlanId)
      .select("id");

    if (error) {
      console.error("Update rate plan error:", error);
      return dbFailure(error, "rate_plan.update_failed");
    }
    if (!updated?.length) {
      return failure("rate_plan.not_found", "Rate plan not found.");
    }

    revalidateRatePages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in updateRatePlan:", err);
    return failure("unexpected.error", "An error occurred while updating rate plan.");
  }
}

export async function deleteRatePlan(ratePlanId: string): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!idSchema.safeParse(ratePlanId).success) return invalidRequest();

    const { data: deleted, error } = await supabase.from("rate_plans").delete().eq("id", ratePlanId).select("id");

    if (error) {
      console.error("Delete rate plan error:", error);
      return dbFailure(error, "rate_plan.delete_failed");
    }
    if (!deleted?.length) {
      return failure("rate_plan.not_found", "Rate plan not found.");
    }

    revalidateRatePages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deleteRatePlan:", err);
    return failure("unexpected.error", "An error occurred while deleting rate plan.");
  }
}

// ── Pricing Rules ──────────────────────────────────────────────────────────

export async function createPricingRule(data: PricingRuleInput): Promise<ActionResult<{ id: string }>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!ctx.propertyId) {
      return failure("property.missing", "Create your property profile first.");
    }

    const parsed = pricingRuleSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix rule validation errors.", parsed.error.flatten().fieldErrors);
    }

    const { data: newRule, error } = await supabase
      .from("pricing_rules")
      .insert({ property_id: ctx.propertyId, ...pricingRuleRow(parsed.data) })
      .select("id")
      .single();

    if (error || !newRule) {
      console.error("Create pricing rule error:", error);
      return dbFailure(error, "pricing_rule.create_failed");
    }

    revalidateRatePages();
    return success({ id: newRule.id });
  } catch (err) {
    console.error("Unexpected error in createPricingRule:", err);
    return failure("unexpected.error", "An error occurred while creating pricing rule.");
  }
}

export async function updatePricingRule(ruleId: string, data: PricingRuleInput): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase, ctx } = guard;

    if (!idSchema.safeParse(ruleId).success || !ctx.propertyId) return invalidRequest();

    const parsed = pricingRuleSchema.safeParse(data);
    if (!parsed.success) {
      return failure("validation.failed", "Please fix rule validation errors.", parsed.error.flatten().fieldErrors);
    }

    const { data: updated, error } = await supabase
      .from("pricing_rules")
      .update({ ...pricingRuleRow(parsed.data), updated_at: new Date().toISOString() })
      .eq("id", ruleId)
      .eq("property_id", ctx.propertyId)
      .select("id");

    if (error) {
      console.error("Update pricing rule error:", error);
      return dbFailure(error, "pricing_rule.update_failed");
    }
    if (!updated?.length) {
      return failure("pricing_rule.not_found", "Pricing rule not found.");
    }

    revalidateRatePages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in updatePricingRule:", err);
    return failure("unexpected.error", "An error occurred while updating pricing rule.");
  }
}

export async function togglePricingRule(ruleId: string, isActive: boolean): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!idSchema.safeParse(ruleId).success || typeof isActive !== "boolean") return invalidRequest();

    const { data: updated, error } = await supabase
      .from("pricing_rules")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", ruleId)
      .select("id");

    if (error) {
      console.error("Toggle pricing rule error:", error);
      return dbFailure(error, "pricing_rule.update_failed");
    }
    if (!updated?.length) {
      return failure("pricing_rule.not_found", "Pricing rule not found.");
    }

    revalidateRatePages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in togglePricingRule:", err);
    return failure("unexpected.error", "An error occurred while toggling rule.");
  }
}

export async function deletePricingRule(ruleId: string): Promise<ActionResult<void>> {
  try {
    const guard = await requirePartner({ manage: true });
    if (!guard.ok) return guard.error;
    const { supabase } = guard;

    if (!idSchema.safeParse(ruleId).success) return invalidRequest();

    const { data: deleted, error } = await supabase.from("pricing_rules").delete().eq("id", ruleId).select("id");

    if (error) {
      console.error("Delete pricing rule error:", error);
      return dbFailure(error, "pricing_rule.delete_failed");
    }
    if (!deleted?.length) {
      return failure("pricing_rule.not_found", "Pricing rule not found.");
    }

    revalidateRatePages();
    return success(undefined);
  } catch (err) {
    console.error("Unexpected error in deletePricingRule:", err);
    return failure("unexpected.error", "An error occurred while deleting rule.");
  }
}
