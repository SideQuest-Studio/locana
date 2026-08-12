import { getUserProfile } from "@/src/lib/auth/get-profile";
import { redirect } from "next/navigation";
import { Building2, ClipboardList, TrendingUp, AlertCircle } from "lucide-react";

export default async function PartnerDashboardPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  // Mock data for visualization
  const stats = [
    { label: "Total Bookings", value: "0", icon: ClipboardList, color: "text-blue-600" },
    { label: "Active Revenue", value: "₱0", icon: TrendingUp, color: "text-emerald-600" },
    { label: "Property Status", value: profile.partner?.status ?? "Pending", icon: Building2, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2A2E]">Dashboard</h1>
          <p className="text-[#64716F] mt-1">
            Welcome back, {profile.partner?.business_name ?? "Partner"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-[#E6E2DA] shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64716F]">{stat.label}</p>
              <p className="text-2xl font-bold text-[#1F2A2E]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#E6E2DA] shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-[#1F2A2E]">
            <AlertCircle className="h-5 w-5" />
            <h2 className="font-semibold text-lg">Quick Actions</h2>
        </div>
        <div className="text-sm text-[#64716F] border-t border-gray-100 pt-4">
            {profile.partner?.status === 'pending' 
                ? "Your property is currently under review. Ensure all verification documents are submitted." 
                : "Your property is live. Monitor your bookings and availability."}
        </div>
      </div>
    </div>
  );
}
