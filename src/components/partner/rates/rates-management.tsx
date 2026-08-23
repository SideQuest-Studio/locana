"use client";

import React, { useState, useTransition } from "react";
import {
  Coins,
  Calendar,
  Sparkles,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Sliders,
  TrendingUp,
  Tag,
  BedDouble,
  Layers,
  Clock,
  ShieldAlert,
} from "lucide-react";
import type { RoomType } from "@/src/types/database.types";
import {
  createRatePlan,
  updateRatePlan,
  deleteRatePlan,
  createPricingRule,
  updatePricingRule,
  togglePricingRule,
  deletePricingRule,
  type RatePlanInput,
  type PricingRuleInput,
} from "@/src/actions/partner/rates";

export interface RatePlanItem {
  id: string;
  room_type_id: string;
  name_en: string;
  name_fil: string | null;
  description: string | null;
  price_modifier: number;
  minimum_stay: number | null;
  cancellation_policy: string | null;
  includes_breakfast: boolean;
  is_default: boolean;
  created_at: string;
}

export interface PricingRuleItem {
  id: string;
  property_id: string;
  room_type_id: string | null;
  name: string;
  rule_type: "weekend" | "seasonal" | "holiday" | "date_range";
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[];
  price_modifier: number;
  minimum_stay: number | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

interface RatesManagementProps {
  propertyId: string;
  roomTypes: RoomType[];
  initialRatePlans: RatePlanItem[];
  initialPricingRules: PricingRuleItem[];
}

const DAYS_MAP: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export function RatesManagement({
  propertyId,
  roomTypes,
  initialRatePlans,
  initialPricingRules,
}: RatesManagementProps) {
  const [activeTab, setActiveTab] = useState<"rate_plans" | "pricing_rules">("rate_plans");
  const [ratePlans, setRatePlans] = useState<RatePlanItem[]>(initialRatePlans);
  const [pricingRules, setPricingRules] = useState<PricingRuleItem[]>(initialPricingRules);

  // Rate Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RatePlanItem | null>(null);
  const [planForm, setPlanForm] = useState<RatePlanInput>({
    room_type_id: roomTypes[0]?.id || "",
    name_en: "",
    name_fil: "",
    description: "",
    price_modifier: 0,
    minimum_stay: 1,
    cancellation_policy: "Free cancellation up to 48 hours before check-in.",
    includes_breakfast: false,
    is_default: false,
  });

  // Pricing Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRuleItem | null>(null);
  const [ruleForm, setRuleForm] = useState<PricingRuleInput>({
    name: "",
    rule_type: "weekend",
    room_type_id: null,
    start_date: null,
    end_date: null,
    days_of_week: [5, 6], // Fri, Sat
    price_modifier: 500,
    minimum_stay: 1,
    priority: 1,
    is_active: true,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Summary counts
  const totalPlans = ratePlans.length;
  const activeRules = pricingRules.filter((r) => r.is_active).length;
  const hasWeekendRule = pricingRules.some((r) => r.is_active && r.rule_type === "weekend");
  const breakfastPlansCount = ratePlans.filter((p) => p.includes_breakfast).length;

  const roomTypeMap = new Map(roomTypes.map((rt) => [rt.id, rt]));

  // ── Handlers: Rate Plans ──────────────────────────────────────────────────

  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanForm({
      room_type_id: roomTypes[0]?.id || "",
      name_en: "",
      name_fil: "",
      description: "",
      price_modifier: 0,
      minimum_stay: 1,
      cancellation_policy: "Free cancellation up to 48 hours before check-in.",
      includes_breakfast: false,
      is_default: false,
    });
    setErrorMessage(null);
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: RatePlanItem) => {
    setEditingPlan(plan);
    setPlanForm({
      room_type_id: plan.room_type_id,
      name_en: plan.name_en,
      name_fil: plan.name_fil || "",
      description: plan.description || "",
      price_modifier: plan.price_modifier,
      minimum_stay: plan.minimum_stay || 1,
      cancellation_policy: plan.cancellation_policy || "",
      includes_breakfast: plan.includes_breakfast,
      is_default: plan.is_default,
    });
    setErrorMessage(null);
    setIsPlanModalOpen(true);
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      if (editingPlan) {
        const res = await updateRatePlan(editingPlan.id, planForm);
        if (!res.success) {
          setErrorMessage(res.error.message);
        } else {
          setRatePlans((prev) =>
            prev.map((p) =>
              p.id === editingPlan.id
                ? {
                    ...p,
                    ...planForm,
                    name_fil: planForm.name_fil || null,
                    description: planForm.description || null,
                    cancellation_policy: planForm.cancellation_policy || null,
                  }
                : planForm.is_default && p.room_type_id === planForm.room_type_id
                ? { ...p, is_default: false }
                : p
            )
          );
          setSuccessMessage("Rate plan updated successfully!");
          setIsPlanModalOpen(false);
        }
      } else {
        const res = await createRatePlan(planForm);
        if (!res.success) {
          setErrorMessage(res.error.message);
        } else {
          const newPlan: RatePlanItem = {
            id: res.data.id,
            room_type_id: planForm.room_type_id,
            name_en: planForm.name_en,
            name_fil: planForm.name_fil || null,
            description: planForm.description || null,
            price_modifier: planForm.price_modifier,
            minimum_stay: planForm.minimum_stay || 1,
            cancellation_policy: planForm.cancellation_policy || null,
            includes_breakfast: planForm.includes_breakfast,
            is_default: planForm.is_default,
            created_at: new Date().toISOString(),
          };
          setRatePlans((prev) => [newPlan, ...prev]);
          setSuccessMessage("New rate plan created!");
          setIsPlanModalOpen(false);
        }
      }
    });
  };

  const handleDeletePlan = (planId: string) => {
    if (!confirm("Are you sure you want to delete this rate plan?")) return;

    startTransition(async () => {
      const res = await deleteRatePlan(planId);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setRatePlans((prev) => prev.filter((p) => p.id !== planId));
      }
    });
  };

  // ── Handlers: Pricing Rules ───────────────────────────────────────────────

  const openCreateRuleModal = () => {
    setEditingRule(null);
    setRuleForm({
      name: "",
      rule_type: "weekend",
      room_type_id: null,
      start_date: null,
      end_date: null,
      days_of_week: [5, 6],
      price_modifier: 500,
      minimum_stay: 1,
      priority: 1,
      is_active: true,
    });
    setErrorMessage(null);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: PricingRuleItem) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      rule_type: rule.rule_type,
      room_type_id: rule.room_type_id || null,
      start_date: rule.start_date || null,
      end_date: rule.end_date || null,
      days_of_week: rule.days_of_week || [],
      price_modifier: rule.price_modifier,
      minimum_stay: rule.minimum_stay || null,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setErrorMessage(null);
    setIsRuleModalOpen(true);
  };

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      if (editingRule) {
        const res = await updatePricingRule(editingRule.id, propertyId, ruleForm);
        if (!res.success) {
          setErrorMessage(res.error.message);
        } else {
          setPricingRules((prev) =>
            prev.map((r) =>
              r.id === editingRule.id
                ? {
                    ...r,
                    ...ruleForm,
                    room_type_id: ruleForm.room_type_id || null,
                    start_date: ruleForm.start_date || null,
                    end_date: ruleForm.end_date || null,
                  }
                : r
            )
          );
          setSuccessMessage("Pricing rule updated successfully!");
          setIsRuleModalOpen(false);
        }
      } else {
        const res = await createPricingRule(propertyId, ruleForm);
        if (!res.success) {
          setErrorMessage(res.error.message);
        } else {
          const newRule: PricingRuleItem = {
            id: res.data.id,
            property_id: propertyId,
            room_type_id: ruleForm.room_type_id || null,
            name: ruleForm.name,
            rule_type: ruleForm.rule_type,
            start_date: ruleForm.start_date || null,
            end_date: ruleForm.end_date || null,
            days_of_week: ruleForm.days_of_week,
            price_modifier: ruleForm.price_modifier,
            minimum_stay: ruleForm.minimum_stay || null,
            priority: ruleForm.priority,
            is_active: ruleForm.is_active,
            created_at: new Date().toISOString(),
          };
          setPricingRules((prev) => [newRule, ...prev]);
          setSuccessMessage("Pricing rule created successfully!");
          setIsRuleModalOpen(false);
        }
      }
    });
  };

  const handleToggleRule = (ruleId: string, currentActive: boolean) => {
    startTransition(async () => {
      const res = await togglePricingRule(ruleId, !currentActive);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setPricingRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentActive } : r))
        );
      }
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this pricing rule?")) return;

    startTransition(async () => {
      const res = await deletePricingRule(ruleId);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setPricingRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    });
  };

  const toggleDayOfWeek = (day: number) => {
    setRuleForm((prev) => {
      const exists = prev.days_of_week.includes(day);
      return {
        ...prev,
        days_of_week: exists
          ? prev.days_of_week.filter((d) => d !== day)
          : [...prev.days_of_week, day].sort(),
      };
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A2E]">Rates & Pricing Engine</h1>
          <p className="text-sm text-[#64716F] mt-1">
            Configure tiered rate plans (breakfast bundled, flexible) and dynamic pricing rules (weekend surcharges, festival peaks).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "rate_plans" ? (
            <button
              onClick={openCreatePlanModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-sm font-semibold hover:bg-[#1976D2] shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Rate Plan
            </button>
          ) : (
            <button
              onClick={openCreateRuleModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-sm font-semibold hover:bg-[#1976D2] shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Pricing Rule
            </button>
          )}
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Overview KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#64716F]">Rate Plans</p>
          <p className="text-2xl font-bold text-[#1F2A2E] mt-1">{totalPlans}</p>
          <p className="text-[10px] text-[#64716F] mt-0.5">Tiered pricing options</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#64716F]">Active Pricing Rules</p>
          <p className="text-2xl font-bold text-[#1E88E5] mt-1">{activeRules}</p>
          <p className="text-[10px] text-[#64716F] mt-0.5">Automated date modifiers</p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#64716F]">Weekend Surge</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {hasWeekendRule ? "Enabled" : "Off"}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">
            {hasWeekendRule ? "Friday & Saturday rates active" : "Standard base rates apply"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase text-[#64716F]">Breakfast Packages</p>
          <p className="text-2xl font-bold text-[#1F2A2E] mt-1">{breakfastPlansCount}</p>
          <p className="text-[10px] text-[#64716F] mt-0.5">Bundled meal plans</p>
        </div>
      </div>

      {/* ── Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-[#F0DFC2] pb-px">
        <button
          onClick={() => setActiveTab("rate_plans")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === "rate_plans"
              ? "bg-white border-t border-x border-[#F0DFC2] text-[#1E88E5] shadow-sm -mb-px"
              : "text-[#64716F] hover:text-[#1F2A2E] hover:bg-[#FAF7F2]"
          }`}
        >
          <Tag className="w-4 h-4" />
          Rate Plans ({ratePlans.length})
        </button>

        <button
          onClick={() => setActiveTab("pricing_rules")}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all ${
            activeTab === "pricing_rules"
              ? "bg-white border-t border-x border-[#F0DFC2] text-[#1E88E5] shadow-sm -mb-px"
              : "text-[#64716F] hover:text-[#1F2A2E] hover:bg-[#FAF7F2]"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Dynamic Pricing Rules ({pricingRules.length})
        </button>
      </div>

      {/* ── TAB 1: Rate Plans List ──────────────────────────────────── */}
      {activeTab === "rate_plans" && (
        <div className="space-y-6">
          {ratePlans.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#F0DFC2] bg-white p-12 text-center shadow-sm">
              <Tag className="w-12 h-12 text-[#64716F]/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1F2A2E]">No rate plans created yet</h3>
              <p className="text-xs text-[#64716F] mt-1 max-w-sm mx-auto">
                Add rate plans to offer bundled amenities like complimentary breakfast or non-refundable discounts.
              </p>
              <button
                onClick={openCreatePlanModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2]"
              >
                <Plus className="w-4 h-4" /> Create Rate Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ratePlans.map((plan) => {
                const roomType = roomTypeMap.get(plan.room_type_id);
                const mod = Number(plan.price_modifier);
                const modText =
                  mod > 0
                    ? `+₱${mod.toLocaleString()} / night`
                    : mod < 0
                    ? `-₱${Math.abs(mod).toLocaleString()} / night`
                    : "₱0 (Base Rate)";

                return (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-[#F0DFC2] bg-white p-5 shadow-sm flex flex-col justify-between hover:border-[#1E88E5]/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1E88E5] truncate max-w-[160px]">
                          {roomType?.name_en || "Room Type"}
                        </span>
                        {plan.is_default && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Default
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#1F2A2E] leading-snug">
                        {plan.name_en}
                      </h3>
                      {plan.name_fil && (
                        <p className="text-[11px] text-[#64716F] italic mt-0.5">
                          {plan.name_fil}
                        </p>
                      )}

                      <div className="mt-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#F0DFC2] space-y-1.5 text-xs text-[#1F2A2E]">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-[#64716F]">Price Adjustment:</span>
                          <span className={mod > 0 ? "text-[#1E88E5]" : mod < 0 ? "text-emerald-600" : ""}>
                            {modText}
                          </span>
                        </div>

                        {plan.includes_breakfast && (
                          <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-[11px]">
                            <Coffee className="w-3.5 h-3.5" />
                            Complimentary Breakfast Included
                          </div>
                        )}

                        {plan.minimum_stay && plan.minimum_stay > 1 && (
                          <div className="text-[11px] text-[#64716F]">
                            Minimum Stay: {plan.minimum_stay} Nights
                          </div>
                        )}
                      </div>

                      {plan.cancellation_policy && (
                        <p className="text-[10px] text-[#64716F] mt-2.5 line-clamp-2">
                          Policy: {plan.cancellation_policy}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F0DFC2] flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditPlanModal(plan)}
                        className="p-1.5 rounded-lg border border-[#F0DFC2] text-slate-600 hover:text-[#1E88E5] hover:bg-blue-50 transition-colors"
                        title="Edit rate plan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-1.5 rounded-lg border border-[#F0DFC2] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete rate plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Dynamic Pricing Rules List ───────────────────────── */}
      {activeTab === "pricing_rules" && (
        <div className="space-y-6">
          {pricingRules.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#F0DFC2] bg-white p-12 text-center shadow-sm">
              <TrendingUp className="w-12 h-12 text-[#64716F]/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#1F2A2E]">No pricing rules configured</h3>
              <p className="text-xs text-[#64716F] mt-1 max-w-sm mx-auto">
                Set up automated price surges for weekend getaways, peak festival dates (e.g. Pahiyas in Lucban), and seasonal holidays.
              </p>
              <button
                onClick={openCreateRuleModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2]"
              >
                <Plus className="w-4 h-4" /> Create Pricing Rule
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pricingRules.map((rule) => {
                const targetRoomType = rule.room_type_id
                  ? roomTypeMap.get(rule.room_type_id)?.name_en
                  : "All Room Types";
                const mod = Number(rule.price_modifier);
                const modText =
                  mod > 0
                    ? `+₱${mod.toLocaleString()} surcharge`
                    : `-₱${Math.abs(mod).toLocaleString()} discount`;

                const typeBadgeColors = {
                  weekend: "bg-purple-100 text-purple-800 border-purple-200",
                  seasonal: "bg-blue-100 text-blue-800 border-blue-200",
                  holiday: "bg-amber-100 text-amber-800 border-amber-200",
                  date_range: "bg-emerald-100 text-emerald-800 border-emerald-200",
                }[rule.rule_type];

                return (
                  <div
                    key={rule.id}
                    className={`rounded-2xl border p-5 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      rule.is_active ? "border-[#F0DFC2]" : "border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeBadgeColors}`}
                        >
                          {rule.rule_type}
                        </span>
                        <h3 className="text-sm font-bold text-[#1F2A2E]">{rule.name}</h3>
                        <span className="text-[10px] text-[#64716F] font-semibold px-2 py-0.5 rounded bg-slate-100">
                          Scope: {targetRoomType}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#64716F]">
                        {rule.rule_type === "weekend" && rule.days_of_week?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Active on:{" "}
                            {rule.days_of_week.map((d) => DAYS_MAP[d]).join(", ")}
                          </span>
                        )}

                        {rule.start_date && rule.end_date && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {rule.start_date} → {rule.end_date}
                          </span>
                        )}

                        {rule.minimum_stay && rule.minimum_stay > 1 && (
                          <span className="font-semibold text-amber-800">
                            Min {rule.minimum_stay} Nights
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400">
                          Priority: {rule.priority}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-[#F0DFC2]">
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#1E88E5]">{modText}</p>
                        <p className="text-[10px] text-[#64716F]">per night</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule.id, rule.is_active)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            rule.is_active ? "bg-[#1E88E5]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              rule.is_active ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => openEditRuleModal(rule)}
                          className="p-2 rounded-xl border border-[#F0DFC2] text-slate-600 hover:text-[#1E88E5] hover:bg-blue-50 transition-colors"
                          title="Edit rule"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-2 rounded-xl border border-[#F0DFC2] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Rate Plan ────────────────────────────────────────── */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1F2A2E]">
                  {editingPlan ? "Edit Rate Plan" : "Create New Rate Plan"}
                </h3>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePlanSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  Applies to Room Type *
                </label>
                <select
                  value={planForm.room_type_id}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, room_type_id: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#F0DFC2] bg-white px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  required
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name_en} (Base ₱{Number(rt.base_price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Rate Plan Name (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Breakfast Included Package"
                    value={planForm.name_en}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, name_en: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Rate Plan Name (FIL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kasama ang Almusal"
                    value={planForm.name_fil || ""}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, name_fil: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Price Modifier (₱ / night)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500 or -200"
                    value={planForm.price_modifier}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        price_modifier: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                  <p className="text-[10px] text-[#64716F] mt-0.5">
                    Added to or discounted from room base price
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Minimum Stay (Nights)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.minimum_stay}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        minimum_stay: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>
              </div>

              {/* Breakfast & Default Toggles */}
              <div className="space-y-2 p-3.5 rounded-xl bg-[#FAF7F2] border border-[#F0DFC2]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1F2A2E]">
                  <input
                    type="checkbox"
                    checked={planForm.includes_breakfast}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        includes_breakfast: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-[#1E88E5]"
                  />
                  <span className="flex items-center gap-1">
                    <Coffee className="w-3.5 h-3.5 text-amber-700" />
                    Complimentary Breakfast Included
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1F2A2E]">
                  <input
                    type="checkbox"
                    checked={planForm.is_default}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, is_default: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#1E88E5]"
                  />
                  <span>Set as default rate plan for this room type</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  Cancellation Policy
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Free cancellation up to 48 hours before arrival."
                  value={planForm.cancellation_policy || ""}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      cancellation_policy: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#F0DFC2] p-2.5 text-xs focus:outline-none focus:border-[#1E88E5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F0DFC2]">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Pricing Rule ─────────────────────────────────────── */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1F2A2E]">
                  {editingRule ? "Edit Pricing Rule" : "Create Dynamic Pricing Rule"}
                </h3>
              </div>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRuleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pahiyas Festival Surge or Weekend Surcharge"
                  value={ruleForm.name}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Rule Category *
                  </label>
                  <select
                    value={ruleForm.rule_type}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        rule_type: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] bg-white px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  >
                    <option value="weekend">Weekend Surge</option>
                    <option value="holiday">Holiday Peak</option>
                    <option value="seasonal">Seasonal Rate</option>
                    <option value="date_range">Custom Date Range</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Scope (Room Type)
                  </label>
                  <select
                    value={ruleForm.room_type_id || ""}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        room_type_id: e.target.value || null,
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] bg-white px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  >
                    <option value="">All Room Types</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Days of week selector if weekend/recurrent */}
              {ruleForm.rule_type === "weekend" && (
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                    Select Active Days
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const isSelected = ruleForm.days_of_week.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => toggleDayOfWeek(day)}
                          className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            isSelected
                              ? "bg-[#1E88E5] border-[#1E88E5] text-white"
                              : "bg-white border-[#F0DFC2] text-[#64716F] hover:bg-[#FAF7F2]"
                          }`}
                        >
                          {DAYS_MAP[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date range pickers if seasonal/holiday/date_range */}
              {ruleForm.rule_type !== "weekend" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={ruleForm.start_date || ""}
                      onChange={(e) =>
                        setRuleForm({ ...ruleForm, start_date: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={ruleForm.end_date || ""}
                      onChange={(e) =>
                        setRuleForm({ ...ruleForm, end_date: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Price Modifier (₱) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 800"
                    value={ruleForm.price_modifier}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        price_modifier: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Min Stay (Nights)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 2"
                    value={ruleForm.minimum_stay || ""}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        minimum_stay: Number(e.target.value) || null,
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2A2E] mb-1">
                    Rule Priority
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.priority}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        priority: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-[#F0DFC2] px-3 py-2 text-xs focus:outline-none focus:border-[#1E88E5]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F0DFC2]">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
