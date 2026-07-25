import { Building2, Mountain, Camera, CalendarDays, Tag, type LucideIcon } from "lucide-react";

export type CategoryKey = "stays" | "destinations" | "experiences" | "events" | "deals";

export interface CategoryTile {
  key: CategoryKey;
  label: string;
  desc: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryTile[] = [
  { key: "stays", label: "Stays", desc: "Hotels, Resorts, Homestays & more", icon: Building2 },
  {
    key: "destinations",
    label: "Destinations",
    desc: "Popular places to visit",
    icon: Mountain,
  },
  {
    key: "experiences",
    label: "Experiences",
    desc: "Tours, Activities, Things to do",
    icon: Camera,
  },
  {
    key: "events",
    label: "Events",
    desc: "Festivals, Concerts, Local Events",
    icon: CalendarDays,
  },
  { key: "deals", label: "Deals", desc: "Best offers and discounts", icon: Tag },
];
