"use client";

import React, { useState } from "react";
import { WishlistProvider } from "@/src/context/WishlistContext";
import { AuthProvider } from "@/src/context/AuthContext";
import AuthModal from "@/src/components/AuthModal";
import ProfileModal from "@/src/components/ProfileModal";
import Navbar from "@/src/components/Navbar";
import HeroSection from "@/src/components/HeroSection";
import CategorySection from "@/src/components/CategorySection";
import FeaturedDestinations from "@/src/components/FeaturedDestinations";
import DealsSection from "@/src/components/DealsSection";
import TravelGuides from "@/src/components/TravelGuides";
import PartnerCTA from "@/src/components/PartnerCTA";
import Footer from "@/src/components/Footer";
import type { CategoryKey } from "@/src/lib/categories";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);

  const handleSelectCategory = (key: CategoryKey) => {
    setActiveCategory(prev => (prev === key ? null : key));
    if (key !== "deals") {
      document
        .getElementById("destinations")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      document.getElementById("deals")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <AuthProvider>
      <WishlistProvider>
        <Navbar />
        <HeroSection />
        <CategorySection onSelectCategory={handleSelectCategory} />
        <FeaturedDestinations filterCategory={activeCategory} />
        <DealsSection />
        <TravelGuides />
        <PartnerCTA />
        <Footer />
        <AuthModal />
        <ProfileModal />
      </WishlistProvider>
    </AuthProvider>
  );
}
