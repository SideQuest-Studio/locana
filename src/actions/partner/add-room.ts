"use server";

import { createClient } from "@/src/lib/supabase/server";
import { failure, success } from "@/src/lib/api/response";
import { revalidatePath } from "next/cache";

export async function addRoom(data: { room_type_id: string; room_number: string; floor?: string }) {
  const supabase = await createClient();
  
  const { error } = await supabase.from("rooms").insert({
    room_type_id: data.room_type_id,
    room_number: data.room_number,
    floor: data.floor,
    status: "available",
  });

  if (error) {
    return failure("room.add_failed", "Could not add room: " + error.message);
  }

  revalidatePath("/dashboard/rooms");
  return success(undefined);
}
