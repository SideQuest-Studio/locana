"use client";

import React from "react";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
          Platform Workflow
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
          Booking & Stewardship Protocol
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Step 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
            Step 01
          </span>
          <h3 className="font-bold text-sm text-slate-800">Identify Sanctuary</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Explore catalog zones or match with a landscape category using our recommendation quiz.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
            Step 02
          </span>
          <h3 className="font-bold text-sm text-slate-800">Check Dynamic Quota</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Specify travelers and dates. Our database limits entries to protect local microclimates.
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
            Step 03
          </span>
          <h3 className="font-bold text-sm text-slate-800">Verify Carbon Pass</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Complete reservation. Get your paperless QR confirmation and coordinator details.
          </p>
        </div>

        {/* Step 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
            Step 04
          </span>
          <h3 className="font-bold text-sm text-slate-800">Stewardship Trek</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Meet your native certified guide. Enjoy nature, carry out plastics, leave no physical trace.
          </p>
        </div>
      </div>
    </section>
  );
}
