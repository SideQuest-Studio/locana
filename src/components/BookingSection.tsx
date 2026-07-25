"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Info, AlertCircle, Sparkles, PartyPopper } from "lucide-react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import BookingCard from "@/src/components/ui/BookingCard";
import AnimatedButton from "@/src/components/ui/AnimatedButton";
import { useBooking, BOOKING_SECTION_ID } from "@/src/context/BookingContext";
import { useReveal } from "@/src/hooks/useReveal";

type Step = 1 | 2 | 3;
type Phase = "form" | "submitting" | "success";

export default function BookingSection() {
  const { selectedTrip } = useBooking();
  const revealRef = useReveal<HTMLDivElement>();

  const [step, setStep] = useState<Step>(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [agree, setAgree] = useState(false);

  // Reset the flow whenever a new trip is selected from elsewhere on the page
  useEffect(() => {
    setStep(1);
    setPhase("form");
    setName("");
    setEmail("");
    setDate("");
    setGuests(2);
    setAgree(false);
  }, [selectedTrip.id]);

  const total = selectedTrip.price * guests * 1.15;
  const levy = selectedTrip.price * guests * 0.15;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !date || !agree) return;
    setPhase("submitting");
    setTimeout(() => setPhase("success"), 1300);
  };

  return (
    <section
      id={BOOKING_SECTION_ID}
      className="py-20 sm:py-28 scroll-mt-20 relative overflow-hidden"
    >
      <div className="absolute left-1/2 -translate-x-1/2 -top-10 w-[600px] h-[300px] rounded-full bg-[#1E88E5]/8 blur-3xl pointer-events-none" />

      <div ref={revealRef} className="max-w-6xl mx-auto px-5 sm:px-8 relative">
        <div className="reveal mb-12">
          <SectionTitle
            eyebrow="Plan Your Trip"
            title="Your adventure, three steps away"
            subtitle="Pick a moment above, and we'll carry it here — confirm the details and you're booked."
            align="center"
            eyebrowColor="blue"
          />
        </div>

        <div className="reveal reveal-delay-1 grid grid-cols-1 lg:grid-cols-12 gap-0 bg-white rounded-[32px] shadow-[0_30px_70px_-30px_rgba(31,42,46,0.3)]">
          {/* Destination image side */}
          <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-[560px]">
            <div className="absolute inset-0 overflow-hidden rounded-t-[32px] lg:rounded-tr-none lg:rounded-l-[32px]">
              <Image
                src={selectedTrip.image}
                alt={selectedTrip.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
                <span className="bg-white/90 text-[#1F2A2E] text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                  {selectedTrip.categoryLabel}
                </span>
                <span className="bg-[#1E88E5] text-white text-[11px] font-bold px-3 py-1.5 rounded-full">
                  {selectedTrip.duration}
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <h3
                  className="text-white text-2xl font-semibold leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {selectedTrip.name}
                </h3>
                <p className="text-white/70 text-sm mt-1">{selectedTrip.location}</p>
              </div>
            </div>
            {/* Floating price tag — sits outside the clipped image wrapper so it never gets cut off */}
            <div className="absolute -bottom-6 right-6 z-10 bg-white rounded-2xl shadow-xl px-5 py-3.5 hidden lg:block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64716F] block">
                From
              </span>
              <span
                className="text-lg font-semibold text-[#1F2A2E]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                ₱{selectedTrip.price.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Flow side */}
          <div className="lg:col-span-7 p-7 sm:p-10">
            {phase !== "success" && (
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map((n, i) => (
                  <React.Fragment key={n}>
                    <button
                      onClick={() => n < step && setStep(n as Step)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        step === n
                          ? "bg-[#1E88E5] text-white"
                          : step > n
                            ? "bg-[#0E7C7B] text-white cursor-pointer"
                            : "bg-[#F0DFC2] text-[#64716F]"
                      }`}
                    >
                      {step > n ? <Check className="h-4 w-4" /> : n}
                    </button>
                    {i < 2 && (
                      <div
                        className={`flex-1 h-0.5 rounded-full ${step > n ? "bg-[#0E7C7B]" : "bg-[#F0DFC2]"}`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {phase === "form" && step === 1 && (
              <BookingCard stepNumber={1} activeStep={1} title="Confirm your destination">
                <p className="text-sm text-[#64716F] leading-relaxed mb-5">
                  {selectedTrip.description}
                </p>
                <ul className="space-y-2.5 mb-6">
                  {selectedTrip.highlights.map(h => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-[#1F2A2E]">
                      <Check className="h-4 w-4 text-[#0E7C7B] shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>
                <div className="p-4 bg-[#FDECD2]/60 rounded-2xl flex gap-3 mb-6">
                  <p className="text-[12.5px] text-[#64716F] leading-relaxed">
                    {selectedTrip.ecoContribution}
                  </p>
                </div>
                <AnimatedButton onClick={() => setStep(2)}>Continue to details</AnimatedButton>
              </BookingCard>
            )}

            {phase === "form" && step === 2 && (
              <BookingCard stepNumber={2} activeStep={2} title="Your travel details">
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#64716F]">
                        Full name
                      </label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Juan Dela Cruz"
                        className="border border-[#F0DFC2] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1E88E5] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#64716F]">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="juan@email.com"
                        className="border border-[#F0DFC2] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1E88E5] transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#64716F]">
                        Trek date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="border border-[#F0DFC2] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1E88E5] transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#64716F]">
                        Travelers
                      </label>
                      <div className="flex items-center gap-3 border border-[#F0DFC2] rounded-xl px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setGuests(g => Math.max(1, g - 1))}
                          className="w-6 h-6 rounded-full bg-[#FDECD2] flex items-center justify-center text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold flex-1 text-center">
                          {guests}
                        </span>
                        <button
                          type="button"
                          onClick={() => setGuests(g => Math.min(8, g + 1))}
                          className="w-6 h-6 rounded-full bg-[#FDECD2] flex items-center justify-center text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-full border-2 border-[#F0DFC2] text-sm font-bold text-[#64716F] hover:border-[#1F2A2E] transition-colors"
                  >
                    Back
                  </button>
                  <AnimatedButton onClick={() => date && setStep(3)}>
                    Review booking
                  </AnimatedButton>
                </div>
              </BookingCard>
            )}

            {phase === "form" && step === 3 && (
              <BookingCard stepNumber={3} activeStep={3} title="Review & confirm">
                <form onSubmit={handleConfirm}>
                  <div className="p-4 bg-[#FDECD2]/60 border border-[#F0DFC2] text-[#64716F] text-[12px] rounded-2xl flex gap-2.5 mb-5">
                    <AlertCircle className="h-4 w-4 text-[#F4A93E] shrink-0 mt-0.5" />
                    Daily entries are capped by municipal quota — this slot is held
                    temporarily.
                  </div>

                  <div className="bg-[#FFF8EE] rounded-2xl p-5 text-sm space-y-3 mb-6">
                    <div className="flex justify-between text-[#64716F]">
                      <span>
                        {name || "Traveler"} · {guests} traveler{guests > 1 ? "s" : ""} ·{" "}
                        {date || "date pending"}
                      </span>
                    </div>
                    <hr className="border-[#F0DFC2]" />
                    <div className="flex justify-between text-[#64716F]">
                      <span>
                        Base fare (₱{selectedTrip.price.toLocaleString()} × {guests})
                      </span>
                      <span>₱{(selectedTrip.price * guests).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#64716F] items-center">
                      <span className="flex items-center gap-1">
                        Conservation levy (15%)
                        <span title={selectedTrip.ecoContribution} className="text-[#0E7C7B]">
                          <Info className="h-3 w-3" />
                        </span>
                      </span>
                      <span className="text-[#0E7C7B] font-semibold">
                        +₱{levy.toLocaleString()}
                      </span>
                    </div>
                    <hr className="border-[#F0DFC2]" />
                    <div className="flex justify-between font-bold text-[#1F2A2E] text-base">
                      <span>Total</span>
                      <span>₱{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 mb-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={e => setAgree(e.target.checked)}
                      className="mt-0.5 rounded border-[#F0DFC2] text-[#1E88E5] focus:ring-[#1E88E5]"
                    />
                    <span className="text-[12px] text-[#64716F] leading-relaxed">
                      I pledge to pack out plastic, use reef-safe sunscreen, and stay on
                      designated paths.
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-3 rounded-full border-2 border-[#F0DFC2] text-sm font-bold text-[#64716F] hover:border-[#1F2A2E] transition-colors"
                    >
                      Back
                    </button>
                    <AnimatedButton type="submit" icon={false}>
                      Confirm booking · ₱{total.toLocaleString()}
                    </AnimatedButton>
                  </div>
                </form>
              </BookingCard>
            )}

            {phase === "submitting" && (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] border-[#F0DFC2] border-t-[#1E88E5] animate-spin mb-5" />
                <p className="font-bold text-[#1F2A2E]">Securing your slot…</p>
                <p className="text-sm text-[#64716F] mt-1">
                  Locking in your local guide and permit number.
                </p>
              </div>
            )}

            {phase === "success" && (
              <div className="text-center py-6 pop-in">
                <div className="w-16 h-16 rounded-full bg-[#0E7C7B]/10 text-[#0E7C7B] flex items-center justify-center mx-auto mb-5">
                  <PartyPopper className="h-7 w-7" />
                </div>
                <h3
                  className="text-2xl font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  You're all set, {name.split(" ")[0] || "explorer"}!
                </h3>
                <p className="text-sm text-[#64716F] max-w-sm mx-auto mt-3 leading-relaxed">
                  Your permit for <strong>{selectedTrip.name}</strong> on{" "}
                  <strong>{date}</strong> is confirmed. We&apos;ve sent details to{" "}
                  <strong>{email}</strong>.
                </p>
                <div className="bg-[#FFF8EE] rounded-2xl p-4 text-left text-sm max-w-xs mx-auto mt-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64716F]">Booking ID</span>
                    <span className="font-mono font-bold">
                      LOC-{Math.floor(Math.random() * 900000 + 100000)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64716F]">Travelers</span>
                    <span className="font-semibold">{guests}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPhase("form");
                    setStep(1);
                  }}
                  className="mt-7 text-sm font-bold text-[#1E88E5] hover:text-[#1565C0] transition-colors"
                >
                  Plan another adventure →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
