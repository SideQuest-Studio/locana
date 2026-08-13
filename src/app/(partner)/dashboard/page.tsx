import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";

import { DashboardWelcome } from "@/src/components/partner/dashboard/DashboardWelcome";
import { StatCard } from "@/src/components/partner/dashboard/StatCard";
import { RecentBookings } from "@/src/components/partner/dashboard/RecentBookings";
import { QuickActions } from "@/src/components/partner/dashboard/QuickActions";
import { ListingsSection } from "@/src/components/partner/dashboard/ListingsSection";

import {
  mockRecentBookings,
  mockQuickActions,
  mockListings,
} from "@/src/lib/dashboard/mock-data";

export default async function PartnerDashboardPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!profile.partner_id) redirect("/account?pending=partner");

  const partnerName = `${profile.first_name} ${profile.last_name}`.trim();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  
  const { data: rawStats, error } = await supabase
    .rpc("get_partner_dashboard_stats", { p_partner_id: profile.partner_id })
    .single<{
      total_listings: number;
      today_bookings: number;
      pending_checkins: number;
      avg_rating: number;
    }>();

  if (error) {
    console.error("Error fetching stats:", error);
    // Handle error appropriately, maybe fallback to empty stats
  }

  const stats = rawStats ? [
    {
      id: "listings",
      title: "Total Listings",
      value: rawStats.total_listings,
      description: "Active listings",
      icon: "Store",
      trend: null,
      trendType: null,
      actionLabel: "View all listings",
      actionHref: "/dashboard/property",
    },
    {
      id: "bookings",
      title: "Today's Bookings",
      value: rawStats.today_bookings,
      description: "Bookings for today",
      icon: "CalendarIcon",
      trend: null,
      trendType: null,
      actionLabel: "View all bookings",
      actionHref: "/dashboard/bookings",
    },
    {
      id: "checkins",
      title: "Pending Check-ins",
      value: rawStats.pending_checkins,
      description: "Upcoming today",
      icon: "Luggage",
      trend: null,
      trendType: null,
      actionLabel: "View calendar",
      actionHref: "/dashboard/availability",
    },
    {
      id: "rating",
      title: "Average Rating",
      value: rawStats.avg_rating,
      description: "Overall score",
      icon: "Star",
      trend: null,
      trendType: null,
      actionLabel: "View reviews",
      actionHref: "#",
    },
  ] : [];

  const bookings     = mockRecentBookings;
  const quickActions = mockQuickActions;
  const listings     = mockListings;

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome + date range */}
      <DashboardWelcome partnerName={partnerName} />

      {/* KPI stat cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>
      </section>

      {/* Recent bookings (left) + Quick actions (right) */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <RecentBookings bookings={bookings} />
        <QuickActions actions={quickActions} />
      </section>

      {/* My listings grid */}
      <section>
        <ListingsSection listings={listings} />
      </section>
    </div>
  );
}