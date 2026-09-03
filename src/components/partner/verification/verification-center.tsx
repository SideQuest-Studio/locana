"use client";

import React, { useState, useTransition, useRef } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  UploadCloud,
  Trash2,
  ExternalLink,
  Plus,
  Info,
  AlertCircle,
} from "lucide-react";
import type { Partner, PartnerVerificationDocument } from "@/src/types/database.types";
import {
  uploadVerificationDocument,
  deleteVerificationDocument,
} from "@/src/actions/partner/verification";
import { DOCUMENT_TYPE_LABELS } from "@/src/lib/constants/verification";

interface VerificationCenterProps {
  partner: Partner;
  documents: PartnerVerificationDocument[];
}

const REQUIRED_DOCS = [
  {
    key: "business_permit",
    title: "Mayor's / Business Permit",
    description: "Valid business permit from the relevant Quezon municipality (LGU).",
    required: true,
  },
  {
    key: "dti_sec",
    title: "DTI / SEC Registration",
    description: "Certificate of Business Name Registration (DTI) or SEC Certificate.",
    required: true,
  },
  {
    key: "bir_2303",
    title: "BIR Certificate of Registration (Form 2303)",
    description: "Tax identification certificate issued by the Bureau of Internal Revenue.",
    required: true,
  },
  {
    key: "dot_accreditation",
    title: "DOT Accreditation Certificate",
    description: "Official accreditation by the Department of Tourism (DOT Philippines).",
    required: false,
  },
  {
    key: "gov_id",
    title: "Authorized Signatory Government ID",
    description: "Valid Passport, UMID, Driver's License, or National ID of the business owner.",
    required: true,
  },
];

export function VerificationCenter({ partner, documents }: VerificationCenterProps) {
  const [docList, setDocList] = useState<PartnerVerificationDocument[]>(documents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("business_permit");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute compliance checklist state
  const uploadedTypes = new Set(docList.map((d) => d.document_type));
  const approvedTypes = new Set(
    docList.filter((d) => d.status === "approved").map((d) => d.document_type)
  );

  const totalRequired = REQUIRED_DOCS.filter((d) => d.required).length;
  const uploadedRequired = REQUIRED_DOCS.filter(
    (d) => d.required && uploadedTypes.has(d.key)
  ).length;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds the maximum limit of 10MB.");
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setErrorMessage("Please upload a PDF, PNG, JPG, or WEBP file.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select a file to upload.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("documentType", selectedType);
    formData.append("file", selectedFile);

    startTransition(async () => {
      const res = await uploadVerificationDocument(formData);
      if (!res.success) {
        setErrorMessage(res.error.message);
      } else {
        setSuccessMessage("Document uploaded successfully! Our team will review it shortly.");
        // Optimistically add to list
        const newDoc: PartnerVerificationDocument = {
          id: res.data.id,
          partner_id: partner.id,
          document_url: res.data.documentUrl,
          document_type: selectedType,
          status: "pending",
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
        };
        setDocList((prev) => [newDoc, ...prev]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => setIsModalOpen(false), 1200);
      }
    });
  };

  const handleDelete = (docId: string) => {
    if (!confirm("Are you sure you want to remove this document?")) return;

    startTransition(async () => {
      const res = await deleteVerificationDocument(docId);
      if (!res.success) {
        alert(res.error.message);
      } else {
        setDocList((prev) => prev.filter((d) => d.id !== docId));
      }
    });
  };

  const openUploadModal = (typeKey?: string) => {
    if (typeKey) setSelectedType(typeKey);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2A2E]">
            Partner Verification & Compliance
          </h1>
          <p className="text-sm text-[#64716F] mt-1">
            Manage your legal documents and regulatory accreditation to operate on DIP.
          </p>
        </div>
        <button
          onClick={() => openUploadModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E88E5] text-white text-sm font-semibold hover:bg-[#1976D2] shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* ── Partner Verification Status Banner ────────────────────────── */}
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F0DFC2]">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                partner.status === "approved"
                  ? "bg-emerald-50 text-emerald-600"
                  : partner.status === "rejected"
                  ? "bg-rose-50 text-rose-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {partner.status === "approved" ? (
                <ShieldCheck className="w-6 h-6" />
              ) : partner.status === "rejected" ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1F2A2E]">
                  {partner.business_name}
                </h2>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    partner.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : partner.status === "rejected"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {partner.status}
                </span>
              </div>
              <p className="text-xs text-[#64716F] mt-0.5">
                {partner.status === "approved"
                  ? "Your property is fully verified and active for instant bookings on DIP."
                  : partner.status === "rejected"
                  ? "Your partner application needs revisions before activation."
                  : "Your verification documents are currently under review by DIP admin."}
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-[#F0DFC2] sm:pl-6">
            <p className="text-xs font-semibold text-[#64716F]">Required Documents</p>
            <p className="text-xl font-bold text-[#1F2A2E] mt-0.5">
              {uploadedRequired} / {totalRequired}
            </p>
          </div>
        </div>

        {/* Rejection Note Alert */}
        {partner.status === "rejected" && partner.rejection_reason && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900">Admin Rejection Notice</p>
              <p className="text-xs text-rose-700 mt-1">{partner.rejection_reason}</p>
              <p className="text-xs text-rose-600 mt-2 font-medium">
                Please re-upload updated documents below to request re-evaluation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Required Compliance Documents Checklist ─────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#1F2A2E]">
            Philippine Tourism & Hospitality Requirements
          </h2>
          <span className="text-xs text-[#64716F]">
            Quezon Province accommodation standards
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REQUIRED_DOCS.map((doc) => {
            const hasUploaded = uploadedTypes.has(doc.key);
            const isApproved = approvedTypes.has(doc.key);

            return (
              <div
                key={doc.key}
                className="rounded-2xl border border-[#F0DFC2] bg-white p-5 flex flex-col justify-between hover:border-[#1E88E5]/40 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        doc.required
                          ? "bg-slate-100 text-slate-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {doc.required ? "Mandatory" : "Recommended"}
                    </span>
                    {isApproved ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : hasUploaded ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <Clock className="w-3.5 h-3.5" /> In Review
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Not Uploaded
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#1F2A2E] leading-snug">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-[#64716F] mt-1.5 leading-relaxed">
                    {doc.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F0DFC2]/60 flex items-center justify-between">
                  <button
                    onClick={() => openUploadModal(doc.key)}
                    className="text-xs font-semibold text-[#1E88E5] hover:text-[#1565C0] flex items-center gap-1"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {hasUploaded ? "Upload New Version" : "Upload Document"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Uploaded Documents History ──────────────────────────────── */}
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#1F2A2E]">
            Uploaded Documents ({docList.length})
          </h2>
          <span className="text-xs text-[#64716F]">
            Secure storage on DIP private encrypted bucket
          </span>
        </div>

        {docList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#F0DFC2] p-10 text-center">
            <FileText className="w-8 h-8 text-[#64716F]/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1F2A2E]">No documents uploaded yet</p>
            <p className="text-xs text-[#64716F] mt-1">
              Upload your business registration documents to activate your property listing.
            </p>
            <button
              onClick={() => openUploadModal()}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2]"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1F2A2E]">
              <thead className="bg-[#FAF7F2] text-[#64716F] uppercase text-[10px] tracking-wider border-b border-[#F0DFC2]">
                <tr>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uploaded At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0DFC2]/60">
                {docList.map((doc) => {
                  const label =
                    DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;
                  const dateStr = new Date(doc.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={doc.id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-[#1F2A2E]">{label}</p>
                            <p className="text-[10px] text-[#64716F] font-mono truncate max-w-xs">
                              {doc.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                            doc.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : doc.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {doc.status === "approved" && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          )}
                          {doc.status === "rejected" && (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {doc.status === "pending" && (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#64716F]">{dateStr}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={doc.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#F0DFC2] text-xs font-semibold text-[#1F2A2E] hover:bg-[#FAF7F2] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3 text-[#64716F]" />
                            View
                          </a>
                          {doc.status !== "approved" && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={isPending}
                              title="Delete document"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Document Upload Modal ───────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#F0DFC2]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0DFC2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#1F2A2E]">
                  Upload Verification Document
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Document Category
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-xl border border-[#F0DFC2] bg-white px-3.5 py-2.5 text-xs text-[#1F2A2E] focus:border-[#1E88E5] focus:outline-none"
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag and drop box */}
              <div>
                <label className="block text-xs font-bold text-[#1F2A2E] mb-1.5">
                  Document File (PDF, PNG, JPEG up to 10MB)
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    dragActive
                      ? "border-[#1E88E5] bg-blue-50/50"
                      : selectedFile
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-[#F0DFC2] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700">
                      <FileText className="w-5 h-5" />
                      <div className="text-left">
                        <p className="text-xs font-bold truncate max-w-xs">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-emerald-600">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud className="w-7 h-7 text-[#64716F]/60 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-[#1F2A2E]">
                        Click to browse or drag and drop
                      </p>
                      <p className="text-[11px] text-[#64716F] mt-0.5">
                        PDF, PNG, JPG or WEBP (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#F0DFC2] text-xs font-semibold text-[#64716F] hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedFile}
                  className="px-4 py-2 rounded-xl bg-[#1E88E5] text-white text-xs font-semibold hover:bg-[#1976D2] disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    "Confirm & Upload"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
