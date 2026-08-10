"use server";

import { createClient } from "@/src/lib/supabase/server";
import { failure, success } from "@/src/lib/api/response";
import { revalidatePath } from "next/cache";

export async function updateProperty(partnerId: string, data: any) {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc("update_property_rpc", {
    p_partner_id: partnerId,
    p_name: data.name,
    p_description_en: data.description_en,
    p_description_fil: data.description_fil,
    p_address: data.address
  });

  if (error) {
    return failure("property.update_failed", "Could not update property: " + error.message);
  }

  revalidatePath("/dashboard/property");
  return success(undefined);
}
