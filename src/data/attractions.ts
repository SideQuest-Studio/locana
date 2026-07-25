import { Attraction } from "@/types";

export const ATTRACTIONS: Attraction[] = [
  {
    id: "el-nido",
    name: "Kayangan & Twin Lagoons Nature Trek",
    location: "El Nido, Palawan",
    category: "beaches",
    rating: 4.9,
    reviewsCount: 4820,
    price: 1500,
    description: "Swim in crystal-clear emerald waters, enclosed by majestic karst limestone formations that date back 250 million years.",
    image: "/hero.jpg",
    tags: ["Marine Protected", "Zero-Plastic", "Guided Swim"],
    highlights: ["Symmetrical limestone walls", "Hidden saltwater lagoons", "Coral reef restoration zones"],
    ecoContribution: "15% of fee supports the Palawan Marine Biodiversity Fund."
  },
  {
    id: "batanes-hills",
    name: "Marlboro Hills Scenic Wind Trek",
    location: "Basco, Batanes",
    category: "mountains",
    rating: 4.95,
    reviewsCount: 1240,
    price: 2200,
    description: "Witness rolling green hills meeting the Pacific ocean winds, grazing cattle, and traditional stone houses designed to withstand typhoons.",
    image: "/batanes.jpg",
    tags: ["Indigenous Heritage", "Eco-Trekking", "Restricted Access"],
    highlights: ["360° Pacific ocean views", "Traditional Ivatan guide", "Local organic lunch inclusion"],
    ecoContribution: "15% of fee funds Batanes Ivatan Cultural Heritage Foundation."
  },
  {
    id: "siargao-canopy",
    name: "Coconut Canopy & Maasin River Paddle",
    location: "General Luna, Siargao",
    category: "forests",
    rating: 4.88,
    reviewsCount: 2850,
    price: 1100,
    description: "Paddle along the tranquil waters of Maasin River, shaded by a breathtaking canopy of thousands of coconut palms.",
    image: "/siargao.jpg",
    tags: ["Low Carbon", "Local Outriggers", "Tree Planting"],
    highlights: ["Traditional hand-carved canoe", "Bent palm tree swing climb", "Mangrove reforestation site visit"],
    ecoContribution: "15% of fee goes to Siargao Mangrove Planting Association."
  },
  {
    id: "kawasan-falls",
    name: "Kawasan Emerald Falls & Canyon Expedition",
    location: "Badian, Cebu",
    category: "waterfalls",
    rating: 4.92,
    reviewsCount: 5120,
    price: 1800,
    description: "Explore lush jungle canyons, leap into natural rock pools, and float down Cebu's famous multi-tiered turquoise Kawasan falls.",
    image: "/kawasan.jpg",
    tags: ["Community Led", "Safety Certified", "Nature Recovery"],
    highlights: ["Multi-tier canyon jump spots", "Natural water slide formations", "Water purification filter program Support"],
    ecoContribution: "15% of fee goes to Badian River Watershed Conservation Council."
  }
];
