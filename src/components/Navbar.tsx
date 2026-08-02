"use client";

import React, { useEffect, useState } from "react";
import { Menu, X, Compass, Heart, User, LogOut } from "lucide-react";
import AnimatedButton from "@/src/components/ui/AnimatedButton";
import { useWishlist } from "@/src/context/WishlistContext";
import { useAuth } from "@/src/context/AuthContext";

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#deals", label: "Deals" },
  { href: "#guides", label: "Travel Guides" },
  { href: "#partner", label: "Become a Partner" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const { wishlist } = useWishlist();
  const { user, openAuthModal, openProfileModal, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#FFF8EE]/95 backdrop-blur-md shadow-[0_2px_20px_-8px_rgba(31,42,46,0.15)] py-3"
          : "py-5"
      }`}
    >
      <div className="max-w-400 mx-auto px-5 sm:px-8 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1E88E5] to-[#0E7C7B] flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(30,136,229,0.6)]">
            <Compass className="h-5 w-5 text-white" />
          </div>
          <span
            className={`text-2xl font-semibold transition-colors ${scrolled ? "text-[#1F2A2E]" : "text-white"}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            DIP
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-semibold transition-colors ${
                scrolled
                  ? "text-[#1F2A2E] hover:text-[#1E88E5]"
                  : "text-white/90 hover:text-white"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-5">
          <button
            aria-label="Wishlist"
            className={`relative p-1 transition-colors ${scrolled ? "text-[#1F2A2E] hover:text-[#1E88E5]" : "text-white/90 hover:text-white"}`}
          >
            <Heart className="h-5 w-5" />
            {wishlist.size > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#1E88E5] text-white text-[10px] font-bold flex items-center justify-center">
                {wishlist.size}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative flex items-center gap-2">
              <button
                onClick={openProfileModal}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all duration-200 hover:scale-105 ${
                  scrolled
                    ? "bg-[#1E88E5]/10 border-[#1E88E5]/30 text-[#1F2A2E] hover:bg-[#1E88E5]/20"
                    : "bg-white/20 border-white/30 text-white hover:bg-white/30 shadow-sm"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-[#1E88E5] text-white text-xs font-bold flex items-center justify-center">
                  {(user.email || user.user_metadata?.full_name || "U")[0].toUpperCase()}
                </div>
                <User className="h-4 w-4" />
                <span className="text-xs font-semibold">View Profile</span>
              </button>

              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className={`p-1 rounded-full transition-colors ${
                  scrolled ? "text-[#1F2A2E] hover:bg-black/5" : "text-white/80 hover:bg-white/10"
                }`}
                title="User Options"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
              </button>

              {userDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#F0DFC2] py-2 z-50 animate-fadeIn text-[#1F2A2E]">
                  <div className="px-4 py-2 border-b border-[#F0DFC2]/60">
                    <p className="text-xs font-bold truncate">
                      {user.user_metadata?.full_name || "Guest Account"}
                    </p>
                    <p className="text-[11px] text-[#1F2A2E]/60 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      openProfileModal();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold hover:bg-[#FFF8EE] flex items-center gap-2 transition-colors text-[#1F2A2E]"
                  >
                    <User className="h-3.5 w-3.5 text-[#1E88E5]" /> View Profile
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdown(false);
                      signOut();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal("login")}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                scrolled
                  ? "text-[#1F2A2E] hover:text-[#1E88E5]"
                  : "text-white/90 hover:text-white"
              }`}
            >
              <User className="h-4 w-4" />
              Login / Register
            </button>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={`lg:hidden p-2 rounded-full ${scrolled ? "text-[#1F2A2E] bg-[#FDECD2]" : "text-white bg-white/15"}`}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden mt-4 mx-5 bg-white rounded-3xl shadow-xl p-6 flex flex-col gap-1">
          {LINKS.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-3 text-[15px] font-semibold text-[#1F2A2E] border-b border-[#F0DFC2] last:border-0"
            >
              {l.label}
            </a>
          ))}
          <div className="flex items-center justify-between mt-4">
            {user ? (
              <div className="flex items-center justify-between w-full pr-4">
                <button
                  onClick={() => {
                    setOpen(false);
                    openProfileModal();
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-[#1E88E5]"
                >
                  <div className="w-6 h-6 rounded-full bg-[#1E88E5] text-white text-xs font-bold flex items-center justify-center">
                    {(user.email || "U")[0].toUpperCase()}
                  </div>
                  <User className="h-4 w-4" /> View Profile
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="text-xs text-red-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setOpen(false);
                  openAuthModal("login");
                }}
                className="flex items-center gap-2 text-sm font-semibold text-[#1F2A2E]"
              >
                <User className="h-4 w-4" /> Login / Register
              </button>
            )}

            <button className="flex items-center gap-1.5 text-sm font-semibold text-[#1F2A2E]">
              <Heart className="h-4 w-4" /> {wishlist.size > 0 ? wishlist.size : ""}
            </button>
          </div>
          <div className="mt-4">
            <AnimatedButton href="#partner" size="md" icon={false} className="w-full">
              Become a Partner
            </AnimatedButton>
          </div>
        </div>
      )}
    </header>
  );
}
