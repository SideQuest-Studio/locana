"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Compass, MapPin, RotateCcw } from "lucide-react";
import SectionTitle from "@/src/components/ui/SectionTitle";
import AnimatedButton from "@/src/components/ui/AnimatedButton";
import { ATTRACTIONS, Attraction } from "@/src/lib/attractions";
import { useBooking } from "@/src/context/BookingContext";
import { useReveal } from "@/src/hooks/useReveal";

const QUESTIONS = [
  {
    question: "What kind of scenery calls to you?",
    options: [
      { text: "Warm tides & crystal lagoons", value: "beaches", emoji: "🌊" },
      { text: "Windy hills & open pastures", value: "mountains", emoji: "🌾" },
      { text: "Cascading falls & jungle canyons", value: "waterfalls", emoji: "💦" },
      { text: "Quiet rivers under palm canopy", value: "forests", emoji: "🌴" },
    ],
  },
  {
    question: "How active do you want to be?",
    options: [
      { text: "Easy — float and relax", value: "chill", emoji: "🧘" },
      { text: "Moderate — walk and explore", value: "moderate", emoji: "🚶" },
      { text: "Active — climb, swim, trek", value: "active", emoji: "🧗" },
    ],
  },
  {
    question: "Who's coming with you?",
    options: [
      { text: "Just me", value: "solo", emoji: "🎒" },
      { text: "My partner", value: "couple", emoji: "💛" },
      { text: "Family or friends", value: "group", emoji: "👨‍👩‍👧" },
    ],
  },
];

export default function ExperienceSection() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<Attraction | null>(null);
  const { planTrip } = useBooking();
  const revealRef = useReveal<HTMLDivElement>();

  const answer = (value: string) => {
    const next = [...answers, value];
    setAnswers(next);
    if (index < QUESTIONS.length - 1) {
      setIndex(index + 1);
    } else {
      setResult(ATTRACTIONS.find(a => a.category === next[0]) || ATTRACTIONS[0]);
      setIndex(QUESTIONS.length);
    }
  };

  const reset = () => {
    setAnswers([]);
    setIndex(0);
    setResult(null);
    setStarted(true);
  };

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-white to-[#FDECD2]/40">
      <div ref={revealRef} className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
        <div className="reveal">
          <SectionTitle
            eyebrow="Not Sure Where To Go?"
            title="Let's find your perfect escape"
            subtitle="Three quick questions, matched instantly to one of our four Philippine preserves."
            align="center"
            eyebrowColor="teal"
          />
        </div>

        <div className="reveal reveal-delay-1 bg-white rounded-[32px] shadow-[0_24px_60px_-24px_rgba(31,42,46,0.25)] p-7 sm:p-10 mt-10 min-h-[340px] flex flex-col justify-center text-left">
          {!started && (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1E88E5]/10 flex items-center justify-center mb-5">
                <Compass className="h-8 w-8 text-[#1E88E5]" />
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready in 30 seconds
              </h3>
              <p className="text-sm text-[#64716F] max-w-sm mb-7 leading-relaxed">
                We'll match your energy, pace, and travel crew to the right landscape.
              </p>
              <AnimatedButton onClick={() => setStarted(true)}>Start matching</AnimatedButton>
            </div>
          )}

          {started && index < QUESTIONS.length && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                {QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= index ? "bg-[#1E88E5]" : "bg-[#F0DFC2]"
                    }`}
                  />
                ))}
              </div>
              <h3
                className="text-xl font-semibold mb-6"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {QUESTIONS[index].question}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUESTIONS[index].options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => answer(opt.value)}
                    className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[#F0DFC2] hover:border-[#1E88E5] hover:bg-[#1E88E5]/5 transition-all text-left group"
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-sm font-semibold flex-1 group-hover:text-[#E85A3B]">
                      {opt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {started && index === QUESTIONS.length && result && (
            <div>
              <span className="inline-block bg-[#0E7C7B]/10 text-[#0E7C7B] text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                Your perfect match
              </span>
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                <div className="relative w-full sm:w-44 h-40 rounded-2xl overflow-hidden shrink-0">
                  <Image src={result.image} alt={result.name} fill className="object-cover" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3
                    className="text-2xl font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {result.name}
                  </h3>
                  <span className="flex items-center justify-center sm:justify-start gap-1 text-[#0E7C7B] text-xs font-bold mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {result.location}
                  </span>
                  <p className="text-sm text-[#64716F] mt-2 leading-relaxed">
                    {result.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end mt-7">
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border-2 border-[#F0DFC2] text-sm font-bold text-[#64716F] hover:border-[#1F2A2E] transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Retake
                </button>
                <AnimatedButton onClick={() => planTrip(result)}>
                  Plan this trip
                </AnimatedButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
