"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/lib/supabase/client";
import type { PartnerVerificationDocument } from "@/src/types/database.types";
import { DOCUMENT_TYPE_LABELS } from "@/src/actions/partner/verification";
import { FileText, ExternalLink, Check, X, Shield, Clock } from "lucide-react";

export function PartnerDocumentsModal({
  partnerId,
  onClose,
}: {
  partnerId: string;
  onClose: () => void;
}) {
  const [documents, setDocuments] = useState<PartnerVerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("partner_verification_documents")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [partnerId]);

  async function updateDocumentStatus(docId: string, status: "approved" | "rejected") {
    const supabase = createClient();
    await supabase
      .from("partner_verification_documents")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", docId);

    fetchDocuments();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2]">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1F2A2E]">
                Partner Verification Documents
              </h2>
              <p className="text-xs text-[#64716F]">
                Review compliance files submitted for this partner
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#64716F]">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1E88E5]" />
              Loading verification documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64716F] bg-[#FAF7F2] rounded-xl border border-dashed border-[#F0DFC2]">
              No documents submitted for this partner application yet.
            </div>
          ) : (
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {documents.map((doc) => {
                const label =
                  DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
                const uploadDate = new Date(doc.created_at).toLocaleDateString(
                  "en-PH",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                );

                return (
                  <li
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-[#F0DFC2] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#1E88E5]/40 transition-all shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1F2A2E]">{label}</p>
                        <p className="text-[10px] text-[#64716F] mt-0.5">
                          Uploaded: {uploadDate}
                        </p>
                        <div className="mt-1">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              doc.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : doc.status === "rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-xs font-semibold text-[#1F2A2E] hover:bg-[#FAF7F2] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-[#64716F]" />
                        Inspect
                      </a>
                      {doc.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateDocumentStatus(doc.id, "approved")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => updateDocumentStatus(doc.id, "rejected")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-[#F0DFC2] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-[#1F2A2E] hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
