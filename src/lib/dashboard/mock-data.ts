// ─────────────────────────────────────────────────────────────────────────────
// Partner Dashboard — mock data
// Replace individual sections with real Supabase queries as you build them out.
// Components receive typed props, so swapping mock → real is a one-line change.
// ─────────────────────────────────────────────────────────────────────────────

import type { StatCardData } from "@/src/components/partner/dashboard/StatCard";
import type { BookingRowData } from "@/src/components/partner/dashboard/RecentBookings";
import type { QuickActionData } from "@/src/components/partner/dashboard/QuickActions";
import type { ListingCardData } from "@/src/components/partner/dashboard/ListingsSection";

export const mockDashboardStats: StatCardData[] = [
  {
    id: "listings",
    title: "Total Listings",
    value: 8,
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
    value: 5,
    description: "+2 from yesterday",
    icon: "CalendarIcon",
    trend: "+2",
    trendType: "up",
    actionLabel: "View all bookings",
    actionHref: "/dashboard/bookings",
  },
  {
    id: "checkins",
    title: "Pending Check-ins",
    value: 3,
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
    value: 4.7,
    description: "128 reviews",
    icon: "Star",
    trend: null,
    trendType: null,
    actionLabel: "View reviews",
    actionHref: "#",
  },
];

export const mockRecentBookings: BookingRowData[] = [
  {
    id: "BK-12891",
    guest: {
      name: "Maria Santos",
      email: "maria.santos@email.com",
      phone: "+63 912 345 6789",
      initials: "MS",
    },
    listing: {
      name: "Pico de Loro Beach Club",
      location: "Nasugbu, Batangas",
      image: "/hero.jpg",
    },
    checkIn: "May 24, 2026",
    checkOut: "May 26, 2026",
    guests: 2,
    status: "confirmed",
  },
  {
    id: "BK-12890",
    guest: {
      name: "John Reyes",
      email: "john.reyes@email.com",
      phone: "+63 917 876 5432",
      initials: "JR",
    },
    listing: {
      name: "Anilao Dive Resort",
      location: "Mabini, Batangas",
      image: "/batanes.jpg",
    },
    checkIn: "May 24, 2026",
    checkOut: "May 27, 2026",
    guests: 4,
    status: "upcoming",
  },
  {
    id: "BK-12889",
    guest: {
      name: "Lyka Dela Cruz",
      email: "lyka.dc@email.com",
      phone: "+63 915 112 2334",
      initials: "LC",
    },
    listing: {
      name: "Terraza De Laiya",
      location: "Laiya, San Juan, Batangas",
      image: "/kawasan.jpg",
    },
    checkIn: "May 24, 2026",
    checkOut: "May 26, 2026",
    guests: 2,
    status: "pending",
  },
];

export const mockQuickActions: QuickActionData[] = [
  {
    id: "add-listing",
    icon: "Plus",
    title: "Add New Listing",
    description: "Create a new accommodation, experience or activity.",
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
    id: "view-analytics",
    icon: "BarChart3",
    title: "View Analytics",
    description: "Check your performance and key insights.",
    href: "#",
  },
];

export const mockListings: ListingCardData[] = [
  {
    id: "pico-de-loro",
    name: "Pico de Loro Beach Club",
    location: "Nasugbu, Batangas",
    image: "/hero.jpg",
    rating: 4.8,
    reviewCount: 32,
    pricePerNight: 6500,
    status: "active",
    href: "/dashboard/property",
  },
  {
    id: "anilao-dive",
    name: "Anilao Dive Resort",
    location: "Mabini, Batangas",
    image: "/batanes.jpg",
    rating: 4.7,
    reviewCount: 28,
    pricePerNight: 4700,
    status: "active",
    href: "/dashboard/property",
  },
  {
    id: "terraza-laiya",
    name: "Terraza De Laiya",
    location: "Laiya, San Juan, Batangas",
    image: "/kawasan.jpg",
    rating: 4.5,
    reviewCount: 18,
    pricePerNight: 3200,
    status: "inactive",
    href: "/dashboard/property",
  },
  {
    id: "casobe-batangas",
    name: "CaSoBe Batangas",
    location: "Calatagan, Batangas",
    image: "/siargao.jpg",
    rating: 4.6,
    reviewCount: 21,
    pricePerNight: 5100,
    status: "active",
    href: "/dashboard/property",
  },
];
