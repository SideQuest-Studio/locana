import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";

export default async function AccountPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Profile</h1>
        <p className="text-sm text-[#64716F] mt-1">Manage your account details</p>
      </div>

      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-[#64716F] uppercase tracking-wide">Name</p>
          <p className="text-[#1F2A2E] font-medium mt-1">
            {profile.first_name} {profile.last_name}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#64716F] uppercase tracking-wide">Email</p>
          <p className="text-[#1F2A2E] font-medium mt-1">{profile.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-[#64716F] uppercase tracking-wide">Account type</p>
          <p className="text-[#1F2A2E] font-medium mt-1 capitalize">
            {profile.role.replace("_", " ")}
            {profile.partner?.status === "pending" && (
              <span className="ml-2 text-xs font-semibold text-[#F57F17]">(partner pending)</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
