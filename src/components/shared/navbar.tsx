"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import dipLogo from "@/src/assets/dip.png";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-105/85 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 rounded-full border-2 border-black overflow-hidden flex items-center justify-center">
              <Image src={dipLogo} alt="DIP Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-slate-800">
                DIP
              </span>
              <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                PH
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#destinations" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
              Destinations
            </a>
            <a href="#quiz" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
              Nature Escape Quiz
            </a>
            <a href="#how-it-works" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
              How It Works
            </a>
            <a href="#eco-impact" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
              Eco-Impact
            </a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#destinations"
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 hover:border-teal-700 rounded-lg text-xs font-semibold text-slate-700 hover:text-teal-755 bg-white hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              Book An Escape
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 px-4 py-4 flex flex-col gap-3">
          <a
            href="#destinations"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Destinations
          </a>
          <a
            href="#quiz"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Nature Escape Quiz
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            How It Works
          </a>
          <a
            href="#eco-impact"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Eco-Impact
          </a>
          <a
            href="#destinations"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-2 text-center w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            Book An Escape
          </a>
        </div>
      )}
    </nav>
  );
}
