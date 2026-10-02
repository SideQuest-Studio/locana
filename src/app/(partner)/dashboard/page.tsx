import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";

import { DashboardWelcome } from "@/src/components/partner/dashboard/DashboardWelcome";
import { StatCard } from "@/src/components/partner/dashboard/StatCard";
import { RecentBookings } from "@/src/components/partner/dashboard/RecentBookings";
import { QuickActions } from "@/src/components/partner/dashboard/QuickActions";
import { ListingsSection } from "@/src/components/partner/dashboard/ListingsSection";

import {
  PARTNER_QUICK_ACTIONS,
  toListingCard,
  toRecentBookingRow,
} from "@/src/lib/partner/dashboard-view";
import type { PartnerBookingRow } from "@/src/types/database.types";

export default async function PartnerDashboardPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!profile.partner_id) redirect("/account?pending=partner");

  const partnerName = `${profile.first_name} ${profile.last_name}`.trim();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  
  const [statsResult, bookingsResult, propertyResult] = await Promise.all([
    supabase.rpc("get_partner_dashboard_stats").single<{
      total_listings: number;
      today_bookings: number;
      pending_checkins: number;
      avg_rating: number;
    }>(),
    supabase.rpc("get_partner_bookings", { p_limit: 5, p_sort_by: "created_at_desc" }),
    supabase
      .from("properties")
      .select("id, name, address, status, images:property_images(image_url, is_cover), room_types(base_price), reviews(count)")
      .eq("partner_id", profile.partner_id)
      .maybeSingle(),
  ]);

  const rawStats = statsResult.data;
  for (const { error } of [statsResult, bookingsResult, propertyResult]) {
    if (error) console.error("Partner dashboard query failed:", error);
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

  const bookings = ((bookingsResult.data ?? []) as PartnerBookingRow[]).map(toRecentBookingRow);

  const property = propertyResult.data;
  const listings = property
    ? [
        toListingCard({
          id: property.id,
          name: property.name,
          address: property.address,
          status: property.status,
          coverImage:
            property.images?.find((img: { is_cover: boolean }) => img.is_cover)?.image_url ??
            property.images?.[0]?.image_url ??
            null,
          minPrice: property.room_types?.length
            ? Math.min(...property.room_types.map((rt: { base_price: number }) => Number(rt.base_price)))
            : null,
          avgRating: Number(rawStats?.avg_rating ?? 0),
          reviewCount: property.reviews?.[0]?.count ?? 0,
        }),
      ]
    : [];

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
        <QuickActions actions={PARTNER_QUICK_ACTIONS} />
      </section>

      {/* My listings grid */}
      <section>
        <ListingsSection listings={listings} />
      </section>
    </div>
  );
}