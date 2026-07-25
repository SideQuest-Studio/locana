"use client";

import React, { useState } from "react";
import { Plane, Mail, CheckCircle2 } from "lucide-react";
import { useReveal } from "@/src/hooks/useReveal";

export default function CTASection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const revealRef = useReveal<HTMLDivElement>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <section className="relative">
      <svg
        viewBox="0 0 1440 100"
        className="w-full h-[60px] sm:h-[90px] -mb-1"
        preserveAspectRatio="none"
      >
        <path d="M0,100 C360,20 1080,20 1440,100 L1440,0 L0,0 Z" fill="#1E88E5" />
      </svg>

      <div className="bg-gradient-to-br from-[#1E88E5] to-[#0E7C7B] py-16 sm:py-20 relative overflow-hidden">
        <Plane className="absolute top-10 left-[8%] h-10 w-10 text-white/20 rotate-[20deg] float-slow" />
        <Plane className="absolute bottom-16 right-[10%] h-8 w-8 text-white/20 -rotate-[30deg] float" />

        <div
          ref={revealRef}
          className="reveal max-w-2xl mx-auto px-5 sm:px-8 text-center relative"
        >
          <h2
            className="text-white text-[30px] sm:text-[42px] leading-tight font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready for your next adventure?
          </h2>
          <p className="text-white/85 text-[15px] mt-4 max-w-md mx-auto leading-relaxed">
            Get fresh preserves, seasonal quota openings, and traveler stories — straight to
            your inbox, once a month.
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mt-8"
          >
            <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-5 py-3.5">
              <Mail className="h-4 w-4 text-[#64716F] shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-transparent text-sm text-[#1F2A2E] placeholder-[#A8AD9C] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#1F2A2E] hover:bg-[#0E241D] text-white rounded-full px-7 py-3.5 text-sm font-bold transition-all hover:-translate-y-0.5 shrink-0"
            >
              Subscribe
            </button>
          </form>

          {subscribed && (
            <div className="flex items-center justify-center gap-2 mt-4 text-white text-sm font-semibold pop-in">
              <CheckCircle2 className="h-4 w-4" /> You're on the list — see you on the trail!
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
