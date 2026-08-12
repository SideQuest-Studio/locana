export type SearchItemType = "property" | "area" | "room_type" | "amenity" | "destination";

export interface RoomTypePreview {
  id: string;
  name: string;
  price: number;
  capacity: number;
  description?: string;
}

export interface SearchResultItem {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  location: string;
  address?: string;
  areaName?: string;
  badge?: string;
  image?: string;
  images?: string[];
  price?: number;
  rating?: number;
  reviewsCount?: number;
  slug?: string;
  propertyType?: "resort" | "hotel" | "homestay";
  partnerName?: string;
  amenities?: string[];
  highlights?: string[];
  roomTypes?: RoomTypePreview[];
  featured?: boolean;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResultItem[];
  categories: {
    areas: SearchResultItem[];
    properties: SearchResultItem[];
    rooms: SearchResultItem[];
    amenities: SearchResultItem[];
  };
  popular: SearchResultItem[];
}

export interface SearchFilterState {
  q: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  propertyType: string; // "all" | "resort" | "hotel" | "homestay"
  area: string; // "all" or specific town
  minPrice: number;
  maxPrice: number;
  amenities: string[];
  minRating: number;
  sortBy: "recommended" | "price_asc" | "price_desc" | "rating" | "popular";
}
