import { createClient } from "@/src/lib/supabase/server";
import { PropertyForm } from "@/src/components/partner/property-form";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { redirect } from "next/navigation";

export default async function PropertyPage() {
  const profile = await getUserProfile();
  if (!profile || !profile.partner_id) redirect("/login");

  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("partner_id", profile.partner_id)
    .maybeSingle();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Details</h1>
        <p className="text-gray-600 text-sm mt-1">Manage your property information and listing details.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <PropertyForm initialData={property} partnerId={profile.partner_id} />
      </div>
    </div>
  );
}
