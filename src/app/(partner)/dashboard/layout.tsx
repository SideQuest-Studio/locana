import { redirect } from "next/navigation";
import {
  getUserProfile,
  canAccessPartnerNavItem,
  canAccessPartnerDashboard,
} from "@/src/lib/auth/get-profile";
import { PartnerHeader } from "@/src/components/partner/dashboard/PartnerHeader";
import { PartnerSidebar } from "@/src/components/partner/dashboard/PartnerSidebar";

export default async function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  if (!canAccessPartnerDashboard(profile)) {
    redirect("/account?pending=partner");
  }

  const partnerName = `${profile.first_name} ${profile.last_name}`.trim();
  const avatarInitial = profile.first_name?.[0]?.toUpperCase() ?? "P";

  return (
    <div className="h-screen flex flex-col bg-[#FFF8EE]">
      {/* ── Top header ── */}
      <PartnerHeader
        partnerName={partnerName}
        avatarInitial={avatarInitial}
      />

      {/* ── Body: sidebar + main content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile, visible md+ */}
        <div className="hidden md:block shrink-0 h-full w-64 bg-white border-r border-[#F0DFC2]">
          <PartnerSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}