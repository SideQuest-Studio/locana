"use client";

import { useState } from "react";
import Link from "next/link";
import type { Partner, Profile } from "@/src/types/database.types";
import { PartnerRegistrationDetailModal } from "@/src/components/admin/partner-registration-detail-modal";
import { Eye, Building2, ArrowRight } from "lucide-react";

type PartnerRow = Partner & {
  owner: Pick<Profile, "first_name" | "last_name" | "email" | "phone_number" | "created_at"> | null;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    suspended: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {status}
    </span>
  );
}

export function RecentRegistrationsPreview({ partners }: { partners: PartnerRow[] }) {
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null);

  if (partners.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#F0DFC2] bg-white p-8 text-center">
        <Building2 className="w-8 h-8 text-[#F0DFC2] mx-auto mb-2" />
        <p className="text-sm font-medium text-[#1F2A2E]">No registrations yet</p>
        <p className="text-xs text-[#64716F] mt-1">New partner applications will appear here.</p>
        <Link
          href="/admin/partners"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-[#0E7C7B] text-white text-xs font-bold hover:bg-[#0B5E5D] transition-colors"
        >
          Go to registrations <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[#F0DFC2] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0DFC2] text-left text-xs uppercase tracking-wide text-[#64716F] bg-[#FAF7F2]/50">
                <th className="px-4 py-3 font-semibold">Business</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Registrant</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPartner(p)}
                  className="border-b border-[#F0DFC2]/60 last:border-0 hover:bg-[#FAF7F2]/60 cursor-pointer transition-colors group"
                  title="Click to view details"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1F2A2E] group-hover:text-[#0E7C7B] transition-colors line-clamp-1">
                      {p.business_name}
                    </p>
                    <p className="text-xs text-[#64716F] line-clamp-1">{p.business_email || p.business_phone || "—"}</p>
                    <p className="text-[11px] text-[#64716F] sm:hidden mt-0.5">
                      {p.owner ? `${p.owner.first_name} ${p.owner.last_name}` : "—"} ·{" "}
                      {new Date(p.created_at).toLocaleDateString("en-PH")}
                    </p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {p.owner ? (
                      <>
                        <p className="font-medium text-[#1F2A2E] line-clamp-1">
                          {p.owner.first_name} {p.owner.last_name}
                        </p>
                        <p className="text-xs text-[#64716F] line-clamp-1">{p.owner.email}</p>
                      </>
                    ) : (
                      <span className="text-[#64716F]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPartner(p);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#F0DFC2] bg-white text-[#0E7C7B] text-xs font-bold hover:bg-[#0E7C7B] hover:text-white hover:border-[#0E7C7B] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href="/admin/partners"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0E7C7B] text-[#0E7C7B] text-xs font-bold hover:bg-[#0E7C7B] hover:text-white transition-colors"
        >
          View more <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <p className="text-xs text-[#64716F]">Click any row to view full details and approve or submit feedback.</p>

      {selectedPartner && (
        <PartnerRegistrationDetailModal partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
      )}
    </div>
  );
}
