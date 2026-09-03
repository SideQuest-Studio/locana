export interface Attraction {
  id: string;
  name: string;
  location: string;
  category: "beaches" | "mountains" | "waterfalls" | "forests";
  rating: number;
  reviewsCount: number;
  price: number;
  description: string;
  image: string;
  tags: string[];
  highlights: string[];
  ecoContribution: string;
}

export type {
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  Booking,
  Payment,
  BookingStatusHistory,
  PartnerBookingRow,
  PartnerBookingsStats,
} from "./database.types";
