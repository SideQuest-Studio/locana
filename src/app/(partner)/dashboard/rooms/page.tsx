import { createClient } from "@/src/lib/supabase/server";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { RoomTypeForm } from "@/src/components/partner/room-type-form";

export default async function RoomsPage() {
  const profile = await getUserProfile();
  if (!profile || !profile.partner_id) redirect("/login");

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("partner_id", profile.partner_id)
    .single();

  if (!property) return <p>Property not set up yet.</p>;

  const { data: roomTypes } = await supabase
    .from("room_types")
    .select("*")
    .eq("property_id", property.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1F2A2E]">Room Types</h1>
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6">
        <RoomTypeForm propertyId={property.id} />
      </div>
      
      <div className="grid gap-4">
        {roomTypes?.map((rt) => (
          <div key={rt.id} className="p-4 border rounded-xl">
            <h3 className="font-bold">{rt.name_en}</h3>
            <p className="text-sm">Base Price: {rt.base_price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
