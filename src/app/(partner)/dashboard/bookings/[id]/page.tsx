import { redirect } from "next/navigation";
import { getUserProfile, canAccessPartnerDashboard } from "@/src/lib/auth/get-profile";
import { createClient } from "@/src/lib/supabase/server";
import type { PartnerBookingDetail } from "@/src/types/database.types";
import { BookingDetailContent } from "@/src/components/partner/bookings/BookingDetailContent";

export const metadata = {
  title: "Booking Detail — Partner Dashboard | DIP",
  description: "Guest, payment, room assignment and check-in for a booking.",
};

export default async function PartnerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  if (!canAccessPartnerDashboard(profile)) redirect("/account?pending=partner");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_partner_booking_detail", {
    p_booking_id: id,
  });

  if (error || !data) {
    redirect("/dashboard/bookings");
  }

  const allowCancel =
    profile.role === "partner_owner" || profile.staff_role === "manager";

  return (
    <BookingDetailContent
      detail={data as PartnerBookingDetail}
      allowCancel={allowCancel}
    />
  );
}