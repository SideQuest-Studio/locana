import { BookingProvider } from "@/src/context/BookingContext";
import Navbar from "@/src/components/Navbar";
import HeroSection from "@/src/components/HeroSection";
import FeaturedDestinations from "@/src/components/FeaturedDestinations";
import PopularTours from "@/src/components/PopularTours";
import BookingSection from "@/src/components/BookingSection";
import ExperienceSection from "@/src/components/ExperienceSection";
import Testimonials from "@/src/components/Testimonials";
import CTASection from "@/src/components/CTASection";
import Footer from "@/src/components/Footer";

export default function Home() {
  return (
    <BookingProvider>
      <Navbar />
      <HeroSection />
      <FeaturedDestinations />
      <PopularTours />
      <BookingSection />
      <ExperienceSection />
      <Testimonials />
      <CTASection />
      <Footer />
    </BookingProvider>
  );
}
