"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/src/lib/supabase/client";
import type { PartnerVerificationDocument } from "@/src/types/database.types";

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
      .eq("partner_id", partnerId);

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
    
    // Refresh documents
    fetchDocuments();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Verification Documents</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">Close</button>
        </div>
        {loading ? (
          <p className="text-sm">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm">No documents found.</p>
        ) : (
          <ul className="space-y-4">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="text-sm font-medium">{doc.document_type}</p>
                  <p className="text-xs text-gray-500">Status: {doc.status}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={doc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#0E7C7B]"
                  >
                    View
                  </a>
                  {doc.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateDocumentStatus(doc.id, "approved")}
                        className="text-xs text-green-600 font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateDocumentStatus(doc.id, "rejected")}
                        className="text-xs text-red-600 font-semibold"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
