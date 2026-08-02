"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabaseConfig } from "@/src/lib/supabase-auth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authMode: "login" | "signup";
  openAuthModal: (mode?: "login" | "signup") => void;
  closeAuthModal: () => void;
  setAuthMode: (mode: "login" | "signup") => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    const syncUserProfile = async (authUser: User) => {
      if (!authUser || !authUser.id || !authUser.email) return;

      try {
        const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
        const firstName = fullName ? fullName.split(" ")[0] : authUser.email.split("@")[0];
        const lastName =
          fullName && fullName.split(" ").length > 1
            ? fullName.split(" ").slice(1).join(" ")
            : "User";
        const avatarUrl =
          authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;

        // Upsert user data into public.profiles (also accessible via public.users)
        await supabaseConfig.from("profiles").upsert(
          {
            id: authUser.id,
            email: authUser.email,
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
            role: "customer",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (err) {
        console.error("Error syncing user profile:", err);
      }
    };

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data } = await supabaseConfig.auth.getSession();
        setSession(data.session);
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          syncUserProfile(currentUser);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: authListener } = supabaseConfig.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          setIsAuthModalOpen(false);
          syncUserProfile(currentUser);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = (mode: "login" | "signup" = "login") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const signOut = async () => {
    try {
      await supabaseConfig.auth.signOut();
      setUser(null);
      setSession(null);
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        setAuthMode,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
