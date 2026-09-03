"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { approvePartner, rejectPartner } from "@/src/actions/admin/approve-partner";
import type { Partner, PartnerVerificationDocument, Profile } from "@/src/types/database.types";
import { DOCUMENT_TYPE_LABELS } from "@/src/lib/constants/verification";
import {
  Shield,
  Clock,
  FileText,
  ExternalLink,
  Check,
  X,
  Building2,
  Mail,
  Phone,
  User,
  Calendar,
  AlertCircle,
  Send,
} from "lucide-react";

type PartnerRow = Partner & {
  owner: Pick<Profile, "first_name" | "last_name" | "email" | "phone_number" | "created_at"> | null;
};

export function PartnerRegistrationDetailModal({
  partner,
  onClose,
}: {
  partner: PartnerRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState<PartnerVerificationDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(partner.rejection_reason || "");
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const isPending = partner.status === "pending";
  const isRejected = partner.status === "rejected";
  const isApproved = partner.status === "approved";

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("partner_verification_documents")
      .select("*")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false });
    if (data) setDocuments(data);
    setLoadingDocs(false);
  };

  useEffect(() => {
    fetchDocuments();
    // prevent background scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [partner.id]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleApprove() {
    // require all docs approved
    if (documents.length > 0) {
      const allApproved = documents.every((d) => d.status === "approved");
      if (!allApproved) {
        setError("All verification documents must be approved before approving the registration. Please review each document first.");
        return;
      }
    }
    setActionLoading("approve");
    setError(null);
    const result = await approvePartner({ partnerId: partner.id });
    if (!result.success) {
      setError(result.error.message);
      setActionLoading(null);
      return;
    }
    setSuccess("Registration approved successfully.");
    setActionLoading(null);
    router.refresh();
    setTimeout(() => onClose(), 800);
  }

  async function handleRejectWithFeedback() {
    const reason = feedback.trim();
    if (reason.length < 10) {
      setError("Please provide at least 10 characters of feedback so the partner knows what to fix.");
      return;
    }
    setActionLoading("reject");
    setError(null);
    const result = await rejectPartner({ partnerId: partner.id, reason });
    if (!result.success) {
      setError(result.error.message);
      setActionLoading(null);
      return;
    }
    setSuccess("Feedback sent and registration marked as rejected.");
    setActionLoading(null);
    router.refresh();
    setTimeout(() => onClose(), 800);
  }

  async function updateDocumentStatus(docId: string, status: "approved" | "rejected") {
    const supabase = createClient();
    await supabase
      .from("partner_verification_documents")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", docId);
    fetchDocuments();
  }

  const ownerName = partner.owner ? `${partner.owner.first_name} ${partner.owner.last_name}` : "—";
  const ownerEmail = partner.owner?.email ?? "—";
  const ownerPhone = partner.owner?.phone_number ?? "—";
  const appliedDate = new Date(partner.created_at).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Registration details"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[#F0DFC2] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#F0DFC2] bg-[#FAF7F2]/50 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E7C7B] text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1F2A2E] leading-tight">{partner.business_name}</h2>
              <p className="text-xs text-[#64716F] mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Applied {appliedDate}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    isApproved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isRejected
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : partner.status === "suspended"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-amber-500"
                    }`}
                  />
                  {partner.status}
                </span>
                <span className="text-[11px] text-[#64716F]">ID: {partner.id.slice(0, 8)}…</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white border border-[#F0DFC2] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Registrant & Business Info - 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner / Registrant */}
            <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0E7C7B]" /> Registrant
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-[#64716F] uppercase tracking-wide">Full name</p>
                  <p className="font-semibold text-[#1F2A2E] mt-0.5">{ownerName}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#64716F] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-[#64716F] uppercase tracking-wide">Email</p>
                    <p className="font-medium text-[#1F2A2E] break-all">{ownerEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#64716F] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-[#64716F] uppercase tracking-wide">Phone</p>
                    <p className="font-medium text-[#1F2A2E]">{ownerPhone}</p>
                  </div>
                </div>
                {partner.owner?.created_at && (
                  <p className="text-[11px] text-[#64716F]">Account created {new Date(partner.owner.created_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0E7C7B]" /> Business
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-[#64716F] uppercase tracking-wide">Business name</p>
                  <p className="font-semibold text-[#1F2A2E] mt-0.5">{partner.business_name}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#64716F] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-[#64716F] uppercase tracking-wide">Business email</p>
                    <p className="font-medium text-[#1F2A2E] break-all">{partner.business_email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#64716F] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-[#64716F] uppercase tracking-wide">Business phone</p>
                    <p className="font-medium text-[#1F2A2E]">{partner.business_phone || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-4 pt-1 text-[11px]">
                  <span className="text-[#64716F]">
                    Commission: <span className="font-semibold text-[#1F2A2E]">{(partner.commission_rate * 100).toFixed(1)}%</span>
                  </span>
                </div>
                {partner.approved_at && (
                  <p className="text-[11px] text-emerald-700">Approved {new Date(partner.approved_at).toLocaleDateString()}</p>
                )}
                {isRejected && partner.rejection_reason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <p className="text-[11px] font-bold text-rose-800">Previous feedback</p>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">{partner.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-[#F0DFC2] bg-[#FAF7F2]/30 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E] flex items-center gap-1.5 mb-3">
              <Shield className="w-3.5 h-3.5 text-[#0E7C7B]" /> Verification documents
            </h3>
            {loadingDocs ? (
              <div className="py-8 text-center text-xs text-[#64716F]">
                <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1E88E5]" />
                Loading documents…
              </div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64716F] bg-white rounded-xl border border-dashed border-[#F0DFC2]">
                No documents submitted yet for this registration.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {documents.map((doc) => {
                  const label = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
                  return (
                    <li
                      key={doc.id}
                      className="p-3 rounded-xl border border-[#F0DFC2] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1F2A2E]">{label}</p>
                          <p className="text-[11px] text-[#64716F]">{new Date(doc.created_at).toLocaleDateString("en-PH")}</p>
                          <span
                            className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
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
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#F0DFC2] text-xs font-semibold text-[#1F2A2E] hover:bg-[#FAF7F2]"
                        >
                          <ExternalLink className="w-3 h-3" /> Inspect
                        </a>
                        {isPending && doc.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateDocumentStatus(doc.id, "approved")}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                            >
                              <Check className="w-3 h-3 inline mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => updateDocumentStatus(doc.id, "rejected")}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                            >
                              <X className="w-3 h-3 inline mr-1" />
                              Reject
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

          {/* Feedback / Rejection form - only for pending */}
          {isPending && (
            <div className="rounded-2xl border border-[#F0DFC2] bg-white p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2A2E] flex items-center gap-1.5 mb-2">
                <Send className="w-3.5 h-3.5 text-[#0E7C7B]" /> Decision
              </h3>
              <p className="text-xs text-[#64716F] mb-3">
                Approve if the registrant and business details plus all documents are valid. Otherwise submit feedback explaining what needs correction.
              </p>

              {!showFeedbackForm ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={!!actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E7C7B] text-white text-xs font-bold hover:bg-[#0B5E5D] disabled:opacity-60 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    {actionLoading === "approve" ? "Approving…" : "Approve registration"}
                  </button>
                  <button
                    onClick={() => setShowFeedbackForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Submit feedback for non-approval
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[#1F2A2E]">
                    Feedback / Reason for non-approval <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder="Example: Your BIR certificate is expired. Please re-upload a valid BIR 2303 dated within the last year, and ensure business address matches your permit..."
                    className="w-full rounded-xl border border-[#F0DFC2] px-3.5 py-2.5 text-xs text-[#1F2A2E] placeholder:text-[#A0A8A6] focus:border-[#0E7C7B] focus:outline-none focus:ring-2 focus:ring-[#0E7C7B]/20"
                    autoFocus
                  />
                  <p className="text-[11px] text-[#64716F]">{feedback.length}/500 characters — minimum 10</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRejectWithFeedback}
                      disabled={!!actionLoading || feedback.trim().length < 10}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {actionLoading === "reject" ? "Submitting…" : "Submit feedback & reject"}
                    </button>
                    <button
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setError(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-[#F0DFC2] bg-white text-xs font-semibold text-[#1F2A2E] hover:bg-[#FAF7F2]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isApproved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex gap-2">
              <Check className="w-4 h-4 shrink-0" />
              This registration is already approved. No further action needed.
            </div>
          )}
          {isRejected && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex gap-2">
              <X className="w-4 h-4 shrink-0" />
              This registration was rejected. You can re-open by editing the partner record or ask the partner to re-apply.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0DFC2] bg-[#FAF7F2]/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#F0DFC2] text-xs font-semibold text-[#1F2A2E] hover:bg-[#FAF7F2] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
