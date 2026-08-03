import { Suspense } from "react";
import { PendingPartnerBanner } from "@/src/components/account/pending-partner-banner";
import { DashboardShell } from "@/src/components/layout/dashboard-shell";

const NAV = [
  { href: "/account", label: "Profile" },
  { href: "/account/bookings", label: "Bookings" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell nav={NAV} title="My account">
      <Suspense fallback={null}>
        <PendingPartnerBanner />
      </Suspense>
      {children}
    </DashboardShell>
  );
}
