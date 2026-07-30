"use client";

import React from "react";
import { ShieldCheck, Check } from "lucide-react";

export default function EcoImpact() {
  return (
    <section id="eco-impact" className="py-20 bg-[#f4f7f5] border-t border-slate-250/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
              Stewardship Pact
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1 mb-4">
              Structured Local Conservation Levy
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              DIP channels tourism revenue straight into community restoration. Every ticket price incorporates a transparent 15% regional eco-development levy that goes directly to regional guides, watershed protection, and beach restoration councils.
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-teal-650 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Indigenous Guide Council Led</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tours are managed by Ivatan, Cebuano, and Palawan native community associations, assuring wages go directly to local families.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Check className="h-5 w-5 text-teal-650 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Zero Commission Model</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    We charge no service fee to local operators. Server overheads are paid directly by carbon-offset corporate partners.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Allocation Chart card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
              Stewardship Pass Fee Breakdown
            </h3>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                  <span>Indigenous Guide & Local Council Pay</span>
                  <span className="text-teal-700 font-bold">75%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-700 h-full rounded-full" style={{ width: "75%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                  <span>Regional Environmental Watershed Levy</span>
                  <span className="text-teal-700 font-bold">15%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-700 h-full rounded-full" style={{ width: "15%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                  <span>Biodiversity Restoration Program</span>
                  <span className="text-teal-700 font-bold">10%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-700 h-full rounded-full" style={{ width: "10%" }} />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 italic">
              "Through DIP's scheduling system, we capped daily visits to Twin Lagoons, resulting in a 40% recovery in coral density in just one season."
              <span className="block font-bold text-[10px] text-slate-700 uppercase tracking-wider mt-2 not-italic">
                Palawan Marine Biodiversity Committee
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
