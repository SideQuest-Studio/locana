"use client";

import React from "react";
import { Store } from "lucide-react";
import AnimatedButton from "@/src/components/ui/AnimatedButton";
import { useReveal } from "@/src/hooks/useReveal";

export default function PartnerCTA() {
  const revealRef = useReveal<HTMLDivElement>();

  return (
    <section id="partner" className="pb-20 sm:pb-28 scroll-mt-20">
      <div ref={revealRef} className="max-w-400 mx-auto px-5 sm:px-8">
        <div className="reveal bg-[#1F2A2E] rounded-[32px] p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3
              className="text-lg sm:text-xl font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              List your property or experience with DIP
            </h3>
            <p className="text-sm text-white/60 mt-1.5">
              Reach more travelers and grow your business with us.
            </p>
          </div>
          <AnimatedButton href="/register/partner" variant="light" icon={false} className="shrink-0 w-full sm:w-auto">
            Become a Partner
          </AnimatedButton>
        </div>
      </div>
    </section>
  );
}
