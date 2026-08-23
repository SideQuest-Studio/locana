import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";
import { RatesManagement, type RatePlanItem, type PricingRuleItem } from "@/src/components/partner/rates/rates-management";
import type { RoomType } from "@/src/types/database.types";
import Link from "next/link";
import { BedDouble } from "lucide-react";

export default async function RatesPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!profile.partner) redirect("/account?pending=partner");

  const supabase = await createClient();

  // 1. Fetch Property
  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("partner_id", profile.partner.id)
    .maybeSingle();

  if (!property) {
    redirect("/dashboard/property");
  }

  // 2. Fetch Room Types
  const { data: rawRoomTypes } = await supabase
    .from("room_types")
    .select("*")
    .eq("property_id", property.id)
    .order("created_at", { ascending: false });

  const roomTypes: RoomType[] = (rawRoomTypes as RoomType[]) || [];

  if (roomTypes.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#F0DFC2] bg-white p-12 text-center shadow-sm">
        <BedDouble className="w-12 h-12 text-[#64716F]/40 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1F2A2E]">No room types found</h2>
        <p className="text-xs text-[#64716F] mt-1 max-w-sm mx-auto">
          Please add your room types first before setting up tiered rate plans and dynamic pricing rules.
        </p>
        <Link
          href="/dashboard/rooms"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2]"
        >
          Configure Room Types
        </Link>
      </div>
    );
  }

  const roomTypeIds = roomTypes.map((rt) => rt.id);

  // 3. Fetch Rate Plans for these Room Types
  const { data: rawRatePlans } = await supabase
    .from("rate_plans")
    .select("*")
    .in("room_type_id", roomTypeIds)
    .order("created_at", { ascending: false });

  const ratePlans: RatePlanItem[] = (rawRatePlans as RatePlanItem[]) || [];

  // 4. Fetch Pricing Rules for this Property
  const { data: rawPricingRules } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("property_id", property.id)
    .order("priority", { ascending: false });

  const pricingRules: PricingRuleItem[] = (rawPricingRules as PricingRuleItem[]) || [];

  return (
    <RatesManagement
      propertyId={property.id}
      roomTypes={roomTypes}
      initialRatePlans={ratePlans}
      initialPricingRules={pricingRules}
    />
  );
}
