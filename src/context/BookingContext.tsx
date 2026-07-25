"use client";

import React, { createContext, useContext, useState } from "react";
import { Attraction, ATTRACTIONS } from "../lib/attractions";

export const BOOKING_SECTION_ID = "plan-your-trip";

interface BookingContextValue {
  selectedTrip: Attraction;
  setSelectedTrip: (trip: Attraction) => void;
  planTrip: (trip: Attraction) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [selectedTrip, setSelectedTrip] = useState<Attraction>(ATTRACTIONS[0]);

  const planTrip = (trip: Attraction) => {
    setSelectedTrip(trip);
    // Give React a tick to render before scrolling
    requestAnimationFrame(() => {
      document
        .getElementById(BOOKING_SECTION_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <BookingContext.Provider value={{ selectedTrip, setSelectedTrip, planTrip }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
