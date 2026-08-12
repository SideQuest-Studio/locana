export interface Attraction {
  id: string;
  name: string;
  location: string;
  category: "beaches" | "mountains" | "waterfalls" | "forests";
  categoryLabel: string;
  /** Which "Explore by Category" tile this destination belongs under. */
  exploreCategory: "stays" | "destinations" | "experiences";
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
  /** Optional discount used to feature a destination in Top Deals. */
  dealDiscountPercent?: number;
  dealUnit?: "night" | "person";
}

export const ATTRACTIONS: Attraction[] = [
  {
    id: "test-samkara-nature-resort",
    name: "[test] Samkara Restaurant & Nature Resort",
    location: "Lucban, Quezon",
    category: "mountains",
    categoryLabel: "Eco-Resorts & Springs",
    exploreCategory: "stays",
    rating: 4.92,
    reviewsCount: 1420,
    price: 3800,
    duration: "Per night",
    description:
      "Eco-luxury native cottages & spring pools nestled at the foot of Mt. Banahaw, surrounded by organic gardens and flowing rivers.",
    image: "/hero.jpg",
    tags: ["Mt. Banahaw Spring", "Zero-Plastic", "Heirloom Dining"],
    highlights: [
      "Natural cold spring swimming pools",
      "Authentic Filipino heirloom dining",
      "Quiet Mt. Banahaw foothills atmosphere",
    ],
    ecoContribution: "15% supports Mt. Banahaw watershed reforestation.",
    badge: "Bestseller",
    dealDiscountPercent: 20,
    dealUnit: "night",
  },
  {
    id: "test-kamayan-sa-palaisdaan",
    name: "[test] Kamayan sa Palaisdaan Lagoon Resort",
    location: "Tayabas City, Quezon",
    category: "forests",
    categoryLabel: "Lagoon & Water Cabanas",
    exploreCategory: "stays",
    rating: 4.86,
    reviewsCount: 2310,
    price: 2900,
    duration: "Per night",
    description:
      "Famous floating restaurant, overwater lagoon villas, and serene garden cabanas surrounded by lush bamboo groves.",
    image: "/siargao.jpg",
    tags: ["Floating Dining", "Lagoon Boating", "Lush Gardens"],
    highlights: [
      "Floating balsa hut dining experience",
      "Lagoon fishing & paddle boat tours",
      "Family-friendly cultural atmosphere",
    ],
    ecoContribution: "15% funds local river cleaning and sustainable aquaculture.",
    badge: "Heritage Pick",
    dealDiscountPercent: 15,
    dealUnit: "night",
  },
  {
    id: "test-graceland-estates",
    name: "[test] Graceland Estates and Country Club",
    location: "Tayabas City, Quezon",
    category: "forests",
    categoryLabel: "Country Estates & Lakes",
    exploreCategory: "stays",
    rating: 4.94,
    reviewsCount: 3100,
    price: 4500,
    duration: "Per night",
    description:
      "Expansive 22-hectare country estate with natural lagoon, sports club, horseback riding, and lakeside villas.",
    image: "/batanes.jpg",
    tags: ["22-Hectare Estate", "Kayak Lagoon", "Tennis Courts"],
    highlights: [
      "Lakeside sunset biking and jogging trails",
      "Championship sports facilities",
      "Pet-friendly open fields",
    ],
    ecoContribution: "15% supports native Quezon tree sanctuary planting.",
    badge: "Luxury Estate",
    dealDiscountPercent: 10,
    dealUnit: "night",
  },
  {
    id: "test-puting-buhangin-cabins",
    name: "[test] Puting Buhangin Beachfront Cabins",
    location: "Pagbilao, Quezon",
    category: "beaches",
    categoryLabel: "White Sand Beaches",
    exploreCategory: "destinations",
    rating: 4.88,
    reviewsCount: 1840,
    price: 3400,
    duration: "Per night",
    description:
      "Pristine white sand beachfront cottages and sea-cave adventure resort facing the tranquil Tayabas Bay.",
    image: "/kawasan.jpg",
    tags: ["White Sand Beach", "Sea Cave", "Sunset View"],
    highlights: [
      "Direct beach access steps from your cabin",
      "Kwebang Lampas exploration tours",
      "Fresh seafood grill dinners",
    ],
    ecoContribution: "15% goes to Pagbilao Coastal Coral Reef Conservation.",
    badge: "Beachfront",
    dealDiscountPercent: 25,
    dealUnit: "night",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Booking Samkara in Lucban was seamless. The natural spring pools and mountain view made our weekend retreat unforgettable.",
    name: "Mikaela Cruz",
    loc: "Manila, Traveler",
    initials: "MC",
  },
  {
    quote:
      "We loved staying at Graceland Estates in Tayabas. The 30% instant downpayment model made budgeting our group stay simple.",
    name: "Julian H.",
    loc: "Tayabas, Family Trip",
    initials: "JH",
  },
  {
    quote:
      "Puting Buhangin in Pagbilao has some of the clearest water in Quezon Province. DIP confirmed our booking instantly.",
    name: "Rachel Tan",
    loc: "Lucena City, Weekend Explorer",
    initials: "RT",
  },
];

export const STATS = [
  { value: 50, suffix: "+", label: "Quezon Resorts & Stays" },
  { value: 12, suffix: "k+", label: "Happy Guests" },
  { value: 4.9, suffix: "/5", label: "Average Rating", decimals: 1 },
  { value: 30, suffix: "%", label: "Instant Downpayment" },
];
