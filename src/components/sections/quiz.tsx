"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Compass, ChevronRight, MapPin } from "lucide-react";
import { Attraction } from "@/types";
import { ATTRACTIONS } from "@/data/attractions";

interface QuizProps {
  openBookingModal: (attraction: Attraction) => void;
}

const quizQuestions = [
  {
    question: "What sensory element connects best with your recovery goals?",
    options: [
      { text: "Rhythmic tides, warm sand, and crystal salt water", value: "beaches" },
      { text: "Highland mist, cool wind, and endless pastures", value: "mountains" },
      { text: "Cascading forest waterfalls and shaded jungle swim", value: "waterfalls" },
      { text: "A slow paddle under coconut palms along winding rivers", value: "forests" }
    ]
  },
  {
    question: "What level of movement are you seeking?",
    options: [
      { text: "Minimal effort – floating, deep quiet, and contemplation", value: "chill" },
      { text: "Moderate pacing – strolls, light heritage trails, photography", value: "moderate" },
      { text: "Active adventure – canyoneering, coastal trekking, climbing", value: "active" }
    ]
  },
  {
    question: "Who will share this nature-immersion slot?",
    options: [
      { text: "Solo – seeking quiet recovery and solitude", value: "solo" },
      { text: "A partner – looking to reconnect in peaceful silence", value: "couple" },
      { text: "Family / group – bonding through eco-conscious activities", value: "group" }
    ]
  }
];

export default function Quiz({ openBookingModal }: QuizProps) {
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizRecommendation, setQuizRecommendation] = useState<Attraction | null>(null);

  const handleQuizAnswer = (value: string) => {
    const nextAnswers = [...quizAnswers, value];
    setQuizAnswers(nextAnswers);

    if (quizQuestionIndex < quizQuestions.length - 1) {
      setQuizQuestionIndex(quizQuestionIndex + 1);
    } else {
      const targetCategory = nextAnswers[0];
      const matched = ATTRACTIONS.find(a => a.category === targetCategory) || ATTRACTIONS[0];
      setQuizRecommendation(matched);
      setQuizQuestionIndex(quizQuestions.length);
    }
  };

  const resetQuiz = () => {
    setQuizAnswers([]);
    setQuizQuestionIndex(0);
    setQuizRecommendation(null);
    setQuizStarted(true);
  };

  return (
    <section id="quiz" className="py-20 bg-slate-50 border-y border-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
          Recommendation Tool
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
          Determine Your Nature Escape
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-2 mb-8">
          Align your physical endurance and relaxation style with a verified local reservation area. Takes 30 seconds.
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-xl mx-auto min-h-[250px] flex flex-col justify-center text-left">
          {/* Quiz landing state */}
          {!quizStarted && (
            <div className="text-center flex flex-col items-center">
              <Compass className="h-10 w-10 text-teal-750 mb-4" />
              <h3 className="text-sm font-bold text-slate-800">Start the Assessment</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1.5 mb-6 leading-relaxed">
                We'll evaluate your energy, budget, and environmental footprint to match you with the appropriate sanctuary island.
              </p>
              <button
                onClick={() => setQuizStarted(true)}
                className="px-6 py-2 bg-teal-750 hover:bg-teal-800 text-white text-xs font-semibold rounded-md"
              >
                Start Quiz
              </button>
            </div>
          )}

          {/* Quiz questioning state */}
          {quizStarted && quizQuestionIndex < quizQuestions.length && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-4">
                <span>Step {quizQuestionIndex + 1} of {quizQuestions.length}</span>
              </div>

              <h3 className="text-sm font-bold text-slate-800 mb-4 leading-tight">
                {quizQuestions[quizQuestionIndex].question}
              </h3>

              <div className="flex flex-col gap-2">
                {quizQuestions[quizQuestionIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(opt.value)}
                    className="w-full text-left p-3 text-xs font-medium rounded border border-slate-200 hover:border-teal-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span>{opt.text}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quiz result/recommendation state */}
          {quizStarted && quizQuestionIndex === quizQuestions.length && quizRecommendation && (
            <div className="text-center flex flex-col items-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded">
                Calculated Target Preserve
              </span>

              <h3 className="text-base font-bold text-slate-900 mt-2 mb-4">
                {quizRecommendation.name}
              </h3>

              {/* Match Card */}
              <div className="w-full border border-slate-200 rounded-lg overflow-hidden flex flex-col sm:flex-row bg-slate-50 text-left mb-6">
                <div className="relative w-full sm:w-[130px] h-[95px] shrink-0 bg-slate-100">
                  <Image
                    src={quizRecommendation.image}
                    alt={quizRecommendation.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-3.5 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[10px] font-bold text-teal-750 flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {quizRecommendation.location}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {quizRecommendation.description}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 mt-2 block">
                    ₱{quizRecommendation.price.toLocaleString()} pass fee
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end w-full">
                <button
                  onClick={resetQuiz}
                  className="px-4 py-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold"
                >
                  Retake
                </button>
                <button
                  onClick={() => openBookingModal(quizRecommendation)}
                  className="px-4 py-1.5 bg-teal-750 hover:bg-teal-800 text-white text-xs font-semibold rounded"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
