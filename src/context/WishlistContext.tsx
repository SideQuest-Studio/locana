"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface WishlistContextValue {
  wishlist: Set<string>;
  toggleWishlist: (id: string, name?: string) => Promise<boolean>;
  isWishlisted: (id: string) => boolean;
  isLoading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, openAuthModal } = useAuth();
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Sync wishlist from REST API (/api/wishlist) when user is authenticated
  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlist(new Set());
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.propertyIds)) {
          setWishlist(new Set(data.propertyIds));
        }
      }
    } catch (err) {
      console.error("Failed to fetch wishlist from API:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  // Toggle wishlist via POST /api/wishlist with optimistic UI & toasts
  const toggleWishlist = async (id: string, name?: string): Promise<boolean> => {
    const isCurrentlySaved = wishlist.has(id);
    const nextSavedState = !isCurrentlySaved;

    // 1. Optimistic UI update
    setWishlist((prev) => {
      const next = new Set(prev);
      if (isCurrentlySaved) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    // 2. If unauthenticated, notify & prompt login while keeping local toggle
    if (!user) {
      toast.info(name ? `Saved "${name}" locally` : "Saved locally", {
        description: "Sign in to save this permanently to your account wishlist",
        action: {
          label: "Sign In",
          onClick: () => openAuthModal("login"),
        },
      });
      return nextSavedState;
    }

    // 3. Persist via API method: POST /api/wishlist
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Rollback optimistic state
        setWishlist((prev) => {
          const rollback = new Set(prev);
          if (isCurrentlySaved) rollback.add(id);
          else rollback.delete(id);
          return rollback;
        });
        toast.error(data.message || "Failed to update wishlist");
        return isCurrentlySaved;
      }

      // 4. Toast notifications for updates
      if (data.isWishlisted) {
        toast.success(name ? `Saved "${name}" to Wishlist!` : "Saved to Wishlist!", {
          description: "View anytime under My Account > Wishlist",
        });
      } else {
        toast.info(name ? `Removed "${name}" from Wishlist` : "Removed from Wishlist");
      }

      return data.isWishlisted;
    } catch (err) {
      console.error("Error calling /api/wishlist:", err);
      // Rollback optimistic state
      setWishlist((prev) => {
        const rollback = new Set(prev);
        if (isCurrentlySaved) rollback.add(id);
        else rollback.delete(id);
        return rollback;
      });
      toast.error("Network error while updating wishlist");
      return isCurrentlySaved;
    }
  };

  const isWishlisted = (id: string) => wishlist.has(id);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        isWishlisted,
        isLoading,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}