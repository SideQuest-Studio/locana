"use client";

import { useState, useMemo } from "react";
import type { Partner, Profile } from "@/src/types/database.types";
import { PartnerRegistrationDetailModal } from "@/src/components/admin/partner-registration-detail-modal";
import { Eye, Building2, Users } from "lucide-react";

type PartnerRow = Partner & {
  owner: Pick<Profile, "first_name" | "last_name" | "email" | "phone_number" | "created_at"> | null;
};

type TabKey = "all" | "pending" | "approved" | "rejected" | "suspended";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    suspended: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${map[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {status}
    </span>
  );
}

export function PartnerApprovalTable({ partners }: { partners: PartnerRow[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: partners.length, pending: 0, approved: 0, rejected: 0, suspended: 0 };
    for (const p of partners) {
      if (p.status in c) c[p.status as TabKey] += 1;
    }
    return c;
  }, [partners]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return partners;
    return partners.filter((p) => p.status === activeTab);
  }, [partners, activeTab]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                isActive
                  ? "bg-[#0E7C7B] text-white border-[#0E7C7B] shadow-sm"
                  : "bg-white text-[#64716F] border-[#F0DFC2] hover:bg-[#FAF7F2] hover:text-[#1F2A2E]"
              }`}
            >
              {t.label}
              <span
                className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-[#64716F]"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#F0DFC2] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F0DFC2] text-left text-xs uppercase tracking-wide text-[#64716F] bg-[#FAF7F2]/50">
              <th className="px-4 py-3 font-semibold">Business</th>
              <th className="px-4 py-3 font-semibold">Registrant</th>
              <th className="px-4 py-3 font-semibold">Applied</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-[#64716F]">
                    {activeTab === "pending" ? (
                      <Building2 className="w-8 h-8 text-[#F0DFC2]" />
                    ) : (
                      <Users className="w-8 h-8 text-[#F0DFC2]" />
                    )}
                    <p className="text-sm font-medium">No {activeTab !== "all" ? activeTab : ""} registrations</p>
                    <p className="text-xs">Registrations will appear here when partners apply.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPartner(p)}
                  className="border-b border-[#F0DFC2]/60 last:border-0 hover:bg-[#FAF7F2]/60 cursor-pointer transition-colors group"
                  title="Click to view details"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1F2A2E] group-hover:text-[#0E7C7B] transition-colors">{p.business_name}</p>
                    <p className="text-xs text-[#64716F]">{p.business_email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-[#1F2A2E]">
                    {p.owner ? (
                      <>
                        <p className="font-medium">
                          {p.owner.first_name} {p.owner.last_name}
                        </p>
                        <p className="text-xs text-[#64716F]">{p.owner.email}</p>
                      </>
                    ) : (
                      <span className="text-[#64716F]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#64716F] text-xs">{new Date(p.created_at).toLocaleDateString("en-PH")}</td>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F0DFC2] bg-white text-[#0E7C7B] text-xs font-bold hover:bg-[#0E7C7B] hover:text-white hover:border-[#0E7C7B] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#64716F]">Tip: Click any row to open the registration detail modal with Approve and Submit Feedback actions.</p>

      {selectedPartner && (
        <PartnerRegistrationDetailModal partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
      )}
    </div>
  );
}
