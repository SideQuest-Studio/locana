import { getUserProfile } from "@/src/lib/auth/get-profile";
import { redirect } from "next/navigation";

export default async function PartnerDashboardPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Partner overview</h1>
        <p className="text-sm text-[#64716F] mt-1">
          {profile.partner?.business_name ?? "Your property"}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-5">
          <p className="text-xs font-semibold text-[#64716F] uppercase">Status</p>
          <p className="text-lg font-bold text-[#0E7C7B] mt-1 capitalize">
            {profile.partner?.status ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-5">
          <p className="text-xs font-semibold text-[#64716F] uppercase">Bookings</p>
          <p className="text-lg font-bold text-[#1F2A2E] mt-1">0</p>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-[#F0DFC2] bg-white/60 p-8 text-center text-sm text-[#64716F]">
        Property management tools will appear here as you set up your listing.
      </div>
    </div>
  );
}
