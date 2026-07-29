export interface TravelGuide {
  id: string;
  title: string;
  date: string;
  readTime: string;
}

export const GUIDES: TravelGuide[] = [
  {
    id: "top-beaches",
    title: "Top 10 Beaches in the Philippines You Must Visit",
    date: "May 20, 2025",
    readTime: "5 min read",
  },
  {
    id: "palawan-guide",
    title: "A Complete Travel Guide to Palawan",
    date: "May 18, 2025",
    readTime: "6 min read",
  },
  {
    id: "food-trips",
    title: "Best Food Trips in the Philippines",
    date: "May 15, 2025",
    readTime: "4 min read",
  },
  {
    id: "hidden-gems",
    title: "Hidden Gems: Off the Beaten Path",
    date: "May 12, 2025",
    readTime: "4 min read",
  },
];
