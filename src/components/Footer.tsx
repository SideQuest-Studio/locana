import React from "react";
import { Compass } from "lucide-react";

const COLUMNS = [
  {
    title: "Explore",
    links: ["El Nido, Palawan", "Batanes Hills", "Siargao Canopy", "Kawasan Falls"],
  },
  {
    title: "Company",
    links: ["About Locana", "Our Guides", "Sustainability Pact", "Careers"],
  },
  {
    title: "Support",
    links: ["Contact Us", "FAQs", "Cancellation Policy", "Travel Insurance"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#1F2A2E] text-white/70 pt-16 pb-8 mt-auto">
      <div className="max-w-400 mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1E88E5] to-[#0E7C7B] flex items-center justify-center">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <span
                className="text-xl font-semibold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Locana
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Explore, discover, recover — sustainable nature bookings across the Philippine
              islands, hosted by the communities who protect them.
            </p>
            <div className="flex gap-2.5 mt-5">
              {["IG", "FB", "X"].map(label => (
                <a
                  key={label}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-bold hover:bg-[#1E88E5] transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map(col => (
            <div key={col.title}>
              <h4 className="font-bold text-xs text-white uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" className="hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-white/40">
          <span>
            &copy; {new Date().getFullYear()} Locana Philippines. All nature reserves reserved.
          </span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-white/70 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white/70 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white/70 transition-colors">
              Eco Agreement
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
