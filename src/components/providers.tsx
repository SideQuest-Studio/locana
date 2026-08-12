"use client";

import React from "react";
import { AuthProvider } from "@/src/context/AuthContext";
import { WishlistProvider } from "@/src/context/WishlistContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WishlistProvider>
        {children}
      </WishlistProvider>
    </AuthProvider>
  );
}
