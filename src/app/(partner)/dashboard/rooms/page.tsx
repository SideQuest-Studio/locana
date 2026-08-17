import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";
import {
  RoomsManagement,
  type RoomTypeWithUnits,
} from "@/src/components/partner/rooms/rooms-management";
import Link from "next/link";
import { Building2 } from "lucide-react";

export default async function RoomsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!profile.partner) redirect("/account?pending=partner");

  const supabase = await createClient();

  // 1. Fetch Property record for this partner
  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("partner_id", profile.partner.id)
    .maybeSingle();

  if (!property) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#F0DFC2] bg-white p-12 text-center shadow-sm">
        <Building2 className="w-12 h-12 text-[#64716F]/40 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1F2A2E]">Property profile required first</h2>
        <p className="text-xs text-[#64716F] mt-1 max-w-sm mx-auto">
          Please set up your property profile (name, municipality, address) before configuring room types.
        </p>
        <Link
          href="/dashboard/property"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2]"
        >
          Go to Property Setup
        </Link>
      </div>
    );
  }

  // 2. Fetch Room Types and nested individual units
  const { data: roomTypes, error } = await supabase
    .from("room_types")
    .select("*, rooms(*)")
    .eq("property_id", property.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading room types:", error);
  }

  return (
    <RoomsManagement
      propertyId={property.id}
      roomTypes={(roomTypes as RoomTypeWithUnits[]) || []}
    />
  );
}
