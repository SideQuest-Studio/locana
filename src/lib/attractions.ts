export interface Attraction {
  id: string;
  name: string;
  location: string;
  category: "beaches" | "mountains" | "waterfalls" | "forests";
  categoryLabel: string;
  rating: number;
  reviewsCount: number;
  price: number;
  duration: string;
  description: string;
  image: string;
  tags: string[];
  highlights: string[];
  ecoContribution: string;
  badge?: string;
}

export const ATTRACTIONS: Attraction[] = [
  {
    id: "el-nido",
    name: "Kayangan & Twin Lagoons Nature Trek",
    location: "El Nido, Palawan",
    category: "beaches",
    categoryLabel: "Beaches & Lagoons",
    rating: 4.9,
    reviewsCount: 4820,
    price: 1500,
    duration: "Full day",
    description:
      "Swim in crystal-clear emerald waters, enclosed by majestic karst limestone formations that date back 250 million years.",
    image: "/hero.jpg",
    tags: ["Marine Protected", "Zero-Plastic", "Guided Swim"],
    highlights: [
      "Symmetrical limestone walls",
      "Hidden saltwater lagoons",
      "Coral reef restoration zones",
    ],
    ecoContribution: "15% of fee supports the Palawan Marine Biodiversity Fund.",
    badge: "Bestseller",
  },
  {
    id: "batanes-hills",
    name: "Marlboro Hills Scenic Wind Trek",
    location: "Basco, Batanes",
    category: "mountains",
    categoryLabel: "Mountains & Hills",
    rating: 4.95,
    reviewsCount: 1240,
    price: 2200,
    duration: "6 hours",
    description:
      "Rolling green hills meeting Pacific ocean winds, grazing cattle, and traditional stone houses built to withstand typhoons.",
    image: "/batanes.jpg",
    tags: ["Indigenous Heritage", "Eco-Trekking", "Restricted Access"],
    highlights: [
      "360° Pacific ocean views",
      "Traditional Ivatan guide",
      "Local organic lunch included",
    ],
    ecoContribution: "15% of fee funds the Batanes Ivatan Cultural Heritage Foundation.",
    badge: "Rare Find",
  },
  {
    id: "siargao-canopy",
    name: "Coconut Canopy & Maasin River Paddle",
    location: "General Luna, Siargao",
    category: "forests",
    categoryLabel: "Rivers & Canopy",
    rating: 4.88,
    reviewsCount: 2850,
    price: 1100,
    duration: "Half day",
    description:
      "Paddle the tranquil Maasin River, shaded by a breathtaking canopy of thousands of coconut palms.",
    image: "/siargao.jpg",
    tags: ["Low Carbon", "Local Outriggers", "Tree Planting"],
    highlights: [
      "Hand-carved canoe ride",
      "Bent palm tree swing climb",
      "Mangrove reforestation visit",
    ],
    ecoContribution: "15% of fee goes to the Siargao Mangrove Planting Association.",
    badge: "Family Friendly",
  },
  {
    id: "kawasan-falls",
    name: "Kawasan Emerald Falls & Canyon Expedition",
    location: "Badian, Cebu",
    category: "waterfalls",
    categoryLabel: "Waterfalls & Canyons",
    rating: 4.92,
    reviewsCount: 5120,
    price: 1800,
    duration: "Full day",
    description:
      "Leap into natural rock pools and float down Cebu's famous multi-tiered turquoise falls through lush jungle canyons.",
    image: "/kawasan.jpg",
    tags: ["Community Led", "Safety Certified", "Nature Recovery"],
    highlights: [
      "Multi-tier canyon jump spots",
      "Natural water slides",
      "Water purification program support",
    ],
    ecoContribution: "15% of fee goes to the Badian River Watershed Conservation Council.",
    badge: "Adventure Pick",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Booking our Batanes wind trek was seamless. Our Ivatan guide spoke passionately about the grass restoration projects, which made the walk incredibly meaningful.",
    name: "Mikaela Cruz",
    loc: "Manila, Traveler",
    initials: "MC",
  },
  {
    quote:
      "The trip matcher recommended Siargao's river canopy and it was exactly the peaceful flow my mind needed. Booking took less than two minutes.",
    name: "Julian H.",
    loc: "Singapore, Solo Traveler",
    initials: "JH",
  },
  {
    quote:
      "Strict visitor limits at Kawasan meant no crowds — just water, rock, and trees. Easily the best-organized tour we've booked in Southeast Asia.",
    name: "Rachel Tan",
    loc: "Cebu, Outdoor Enthusiast",
    initials: "RT",
  },
];

export const STATS = [
  { value: 50, suffix: "+", label: "Eco-Attractions" },
  { value: 128, suffix: "k+", label: "Happy Travelers" },
  { value: 4.9, suffix: "/5", label: "Average Rating", decimals: 1 },
  { value: 15, suffix: "%", label: "Direct Conservation Fee" },
];
