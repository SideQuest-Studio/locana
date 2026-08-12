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

  if (!property) return <div className="text-gray-600">Property not set up yet.</div>;

  // Fetch room types AND their associated rooms
  const { data: roomTypes } = await supabase
    .from("room_types")
    .select("*, rooms(*)")
    .eq("property_id", property.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
        <p className="text-gray-600 text-sm mt-1">Configure your room types and manage individual units.</p>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-lg text-gray-900 mb-4">Add New Room Type</h2>
        <RoomTypeForm propertyId={property.id} />
      </div>
      
      <div className="grid gap-6">
        {roomTypes?.map((rt) => (
          <div key={rt.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900">{rt.name_en}</h3>
            <p className="text-sm text-gray-500 mt-1">
                Base Price: <span className="font-medium text-gray-900">₱{rt.base_price}</span> | 
                Capacity: <span className="font-medium text-gray-900">{rt.capacity} guests</span>
            </p>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Individual Units:</h4>
              <div className="flex gap-2 flex-wrap mb-4">
                {rt.rooms?.length > 0 ? rt.rooms?.map((r: any) => (
                  <span key={r.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm font-medium">
                    {r.room_number}
                  </span>
                )) : <span className="text-sm text-gray-400 italic">No units added yet</span>}
              </div>
              <AddRoomForm roomTypeId={rt.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
