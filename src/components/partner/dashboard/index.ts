// Partner Dashboard component barrel — import from here for cleaner paths
export { StatusBadge } from "./StatusBadge";
export type { BookingStatus } from "./StatusBadge";

// Bookings page components
export {
  BookingsMetricCards,
  BookingsMetricCardsSkeleton,
  BookingsToolbar,
  BookingsDataTable,
  BookingsDataTableSkeleton,
  BookingsPagination,
} from "../bookings";
export type { BookingsFilters } from "../bookings";

export { StatCard, StatCardSkeleton } from "./StatCard";
export type { StatCardData } from "./StatCard";

export { RecentBookings, RecentBookingsSkeleton } from "./RecentBookings";
export type { BookingRowData } from "./RecentBookings";

export { QuickActions } from "./QuickActions";
export type { QuickActionData } from "./QuickActions";

export { ListingCard, ListingsSection, ListingsSectionSkeleton } from "./ListingsSection";
export type { ListingCardData, ListingStatus } from "./ListingsSection";

export { PartnerSidebar } from "./PartnerSidebar";
export { PartnerHeader } from "./PartnerHeader";
export { DashboardWelcome } from "./DashboardWelcome";
