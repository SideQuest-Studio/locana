import type { BookingRowData } from "@/src/components/partner/dashboard/RecentBookings";
import type { ListingCardData } from "@/src/components/partner/dashboard/ListingsSection";
import type { QuickActionData } from "@/src/components/partner/dashboard/QuickActions";
import type { BookingStatus } from "@/src/components/partner/dashboard/StatusBadge";
import type { PartnerBookingRow } from "@/src/types/database.types";

export const PARTNER_QUICK_ACTIONS: QuickActionData[] = [
  {
    id: "edit-property",
    icon: "Plus",
    title: "Edit Property",
    description: "Update your property details, photos and amenities.",
    href: "/dashboard/property",
  },
  {
    id: "manage-calendar",
    icon: "CalendarDays",
    title: "Manage Calendar",
    description: "Update availability, rates and booking settings.",
    href: "/dashboard/availability",
  },
  {
    id: "view-bookings",
    icon: "BarChart3",
    title: "View Bookings",
    description: "Check upcoming arrivals and assign rooms.",
    href: "/dashboard/bookings",
  },
];

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(isoDate: string) {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "G";
}

export function toRecentBookingRow(row: PartnerBookingRow): BookingRowData {
  return {
    id: row.booking_ref,
    guest: {
      name: row.guest_name || "Guest",
      email: row.guest_email,
      phone: row.guest_phone,
      initials: initials(row.guest_name),
    },
    listing: {
      name: row.room_type_name ? `${row.listing_name} · ${row.room_type_name}` : row.listing_name,
      location: row.listing_location,
      image: row.listing_image || "/hero.jpg",
    },
    checkIn: formatDate(row.check_in),
    checkOut: formatDate(row.check_out),
    guests: row.adults_count + row.children_count,
    status: row.status as BookingStatus,
  };
}

export type PartnerPropertySummary = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  coverImage: string | null;
  minPrice: number | null;
  avgRating: number;
  reviewCount: number;
};

export function toListingCard(property: PartnerPropertySummary): ListingCardData {
  return {
    id: property.id,
    name: property.name,
    location: property.address ?? "",
    image: property.coverImage ?? "/hero.jpg",
    rating: property.avgRating,
    reviewCount: property.reviewCount,
    pricePerNight: property.minPrice ?? 0,
    status: property.status === "published" ? "active" : "inactive",
    href: "/dashboard/property",
  };
}
