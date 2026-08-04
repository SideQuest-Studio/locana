import { redirect } from "next/navigation";
import {
  getUserProfile,
  canAccessPartnerNavItem,
  canAccessPartnerDashboard,
} from "@/src/lib/auth/get-profile";
import { DashboardShell } from "@/src/components/layout/dashboard-shell";

const ALL_NAV: { href: string; label: string; id: Parameters<typeof canAccessPartnerNavItem>[1] }[] = [
  { href: "/dashboard", label: "Overview", id: "bookings" },
  { href: "/dashboard/property", label: "Property", id: "property" },
  { href: "/dashboard/rooms", label: "Rooms", id: "rooms" },
  { href: "/dashboard/availability", label: "Availability", id: "availability" },
  { href: "/dashboard/rates", label: "Rates", id: "rates" },
  { href: "/dashboard/bookings", label: "Bookings", id: "bookings" },
  { href: "/dashboard/staff", label: "Staff", id: "staff" },
  { href: "/dashboard/verification", label: "Verification", id: "verification" },
];

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

  const nav = ALL_NAV.filter((item) => {
    if (item.href === "/dashboard") return true;
    return canAccessPartnerNavItem(profile, item.id);
  }).map(({ href, label }) => ({ href, label }));

  return (
    <DashboardShell nav={nav} title="Partner portal">
      {children}
    </DashboardShell>
  );
}
