import { redirect } from "next/navigation";
import { getUserProfile } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";
import type { PartnerBookingRow, PartnerBookingsStats } from "@/src/types/database.types";
import { BookingsPageContent } from "@/src/components/partner/bookings/BookingsPageContent";

export const metadata = {
  title: "Bookings — Partner Dashboard | DIP",
  description: "View and manage all bookings for your property.",
};

export default async function PartnerBookingsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!profile.partner_id) redirect("/account?pending=partner");

  const supabase = await createClient();

  // Fetch stats
  const { data: stats } = await supabase
    .rpc("get_partner_bookings_stats", { p_partner_id: profile.partner_id })
    .single();

  // Fetch initial bookings (page 1, 10 per page)
  const { data: bookingsRaw } = await supabase
    .rpc("get_partner_bookings", {
      p_partner_id: profile.partner_id,
      p_limit: 10,
      p_offset: 0,
    });

  const initialStats: PartnerBookingsStats = (stats as PartnerBookingsStats) ?? {
    total_bookings: 0,
    upcoming_checkins: 0,
    ongoing_stays: 0,
    completed: 0,
    cancelled: 0,
  };

  const initialBookings: PartnerBookingRow[] = Array.isArray(bookingsRaw)
    ? (bookingsRaw as PartnerBookingRow[])
    : [];
  const initialTotal = initialBookings.length > 0
    ? (initialBookings[0]?.total_count ?? 0)
    : 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Bookings
        </h1>
        <p className="text-sm text-[#64716F] mt-1">
          View and manage all reservations for your property.
        </p>
      </div>

      {/* Interactive content (client) */}
      <BookingsPageContent
        partnerId={profile.partner_id}
        initialStats={initialStats}
        initialBookings={initialBookings}
        initialTotal={initialTotal}
      />
    </div>
  );
}
