"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approvePartner, rejectPartner } from "@/src/actions/admin/approve-partner";
import { PartnerDocumentsModal } from "@/src/components/admin/partner-documents-modal";
import type { Partner, Profile } from "@/src/types/database.types";
import { createClient } from "@/src/lib/supabase/client";

type PartnerRow = Partner & {
  owner: Pick<Profile, "first_name" | "last_name" | "email"> | null;
};

export function PartnerApprovalTable({ partners }: { partners: PartnerRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  async function handleApprove(partner: PartnerRow) {
    // Check document status before approving
    const supabase = createClient();
    const { data: docs } = await supabase
      .from("partner_verification_documents")
      .select("status")
      .eq("partner_id", partner.id);

    const allApproved = docs && docs.length > 0 && docs.every(d => d.status === "approved");
    
    if (!allApproved) {
      setError(`Cannot approve ${partner.business_name}: All verification documents must be approved first.`);
      return;
    }

    setLoadingId(partner.id);
    setError(null);
    const result = await approvePartner({ partnerId: partner.id });
    if (!result.success) setError(result.error.message);
    else router.refresh();
    setLoadingId(null);
  }

  async function handleReject(partnerId: string) {
    const reason = window.prompt("Rejection reason:");
    if (!reason) return;
    setLoadingId(partnerId);
    setError(null);
    const result = await rejectPartner({ partnerId, reason });
    if (!result.success) setError(result.error.message);
    else router.refresh();
    setLoadingId(null);
  }

  if (partners.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#F0DFC2] bg-white/60 p-12 text-center text-sm text-[#64716F]">
        No pending partner applications.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-[#F0DFC2] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F0DFC2] text-left text-xs uppercase tracking-wide text-[#64716F]">
              <th className="px-4 py-3 font-semibold">Business</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Applied</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className="border-b border-[#F0DFC2]/60 last:border-0">
                <td className="px-4 py-3 font-medium text-[#1F2A2E]">{p.business_name}</td>
                <td className="px-4 py-3 text-[#64716F]">
                  {p.owner
                    ? `${p.owner.first_name} ${p.owner.last_name} (${p.owner.email})`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[#64716F]">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPartnerId(p.id)}
                      className="px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-[#64716F] text-xs font-semibold hover:bg-gray-50"
                    >
                      View Docs
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === p.id}
                      onClick={() => handleApprove(p)}
                      className="px-3 py-1.5 rounded-lg bg-[#0E7C7B] text-white text-xs font-semibold disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === p.id}
                      onClick={() => handleReject(p.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedPartnerId && (
        <PartnerDocumentsModal
          partnerId={selectedPartnerId}
          onClose={() => setSelectedPartnerId(null)}
        />
      )}
    </div>
  );
}
