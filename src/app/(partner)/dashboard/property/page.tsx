import { createClient } from "@/src/lib/supabase/server";
import { PropertyForm } from "@/src/components/partner/property-form";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { redirect } from "next/navigation";

export default async function PropertyPage() {
  const profile = await getUserProfile();
  console.log("PropertyPage: profile", profile);
  if (!profile || !profile.partner_id) redirect("/login");

  const supabase = await createClient();
  // DEBUG: Try fetching everything to see what's visible
  const { data: allProperties } = await supabase.from("properties").select("*");
  console.log("PropertyPage: ALL properties", allProperties);

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("partner_id", profile.partner_id)
    .maybeSingle();

  console.log("PropertyPage: fetched property", property, "error", error);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1F2A2E]">Property Details</h1>
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6">
        <PropertyForm initialData={property} partnerId={profile.partner_id} />
      </div>
    </div>
  );
}
