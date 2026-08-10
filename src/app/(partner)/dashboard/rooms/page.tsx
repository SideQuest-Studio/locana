import { createClient } from "@/src/lib/supabase/server";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { RoomTypeForm } from "@/src/components/partner/room-type-form";
import { AddRoomForm } from "@/src/components/partner/add-room-form";

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

  // Fetch room types AND their associated rooms
  const { data: roomTypes } = await supabase
    .from("room_types")
    .select("*, rooms(*)")
    .eq("property_id", property.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1F2A2E]">Room Management</h1>
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6">
        <h2 className="font-bold mb-4">Add Room Type</h2>
        <RoomTypeForm propertyId={property.id} />
      </div>
      
      <div className="grid gap-4">
        {roomTypes?.map((rt) => (
          <div key={rt.id} className="p-4 border rounded-xl bg-white">
            <h3 className="font-bold text-lg">{rt.name_en}</h3>
            <p className="text-sm text-gray-500 mb-2">Base Price: {rt.base_price} | Capacity: {rt.capacity}</p>
            
            <div className="mt-4">
              <h4 className="font-semibold text-sm">Rooms:</h4>
              <div className="flex gap-2 flex-wrap mt-1">
                {rt.rooms?.map((r: any) => (
                  <span key={r.id} className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {r.room_number}
                  </span>
                ))}
              </div>
              <AddRoomForm roomTypeId={rt.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
