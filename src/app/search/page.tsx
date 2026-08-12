import { Suspense } from "react";
import { SearchPageContent } from "@/src/components/search/search-page-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Stays & Resorts in Quezon Province — DIP",
  description:
    "Explore and book verified nature resorts, heritage hotels, and beach cabins across Quezon Province, Philippines.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF8EE] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#1E88E5] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
