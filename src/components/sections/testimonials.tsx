"use client";

import React from "react";

export default function Testimonials() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
          User Feedback
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
          Stewardship Experiences
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <p className="text-xs text-slate-500 leading-relaxed italic mb-6">
            "Booking our Batanes winds trek was seamless. Our Ivatan guide spoke passionately about the grass restoration projects, which made the walk incredibly meaningful."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
              MC
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800">Mikaela Cruz</h4>
              <span className="text-[10px] text-slate-400">Manila, Traveler</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <p className="text-xs text-slate-500 leading-relaxed italic mb-6">
            "The Nature Escape quiz matching recommended Siargao river canopy. It was exactly the level of peaceful flow my mind needed. Minimal layout, simple verification pass."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
              JH
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800">Julian H.</h4>
              <span className="text-[10px] text-slate-400">Singapore, Solo Traveler</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <p className="text-xs text-slate-500 leading-relaxed italic mb-6">
            "Breathtaking scenery. Having strict limits on visitor entries at Kawasan Cebu was a game-changer. No crowding, just water, rocks, and trees. Top-tier booking interface."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
              RT
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-800">Rachel Tan</h4>
              <span className="text-[10px] text-slate-400">Cebu, Outdoor Enthusiast</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
