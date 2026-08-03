"use client";

import { useSearchParams } from "next/navigation";

export function PendingPartnerBanner() {
  const searchParams = useSearchParams();
  const pending = searchParams.get("pending") === "partner";

  if (!pending) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[#F4A93E]/40 bg-[#FFF8EE] px-4 py-3 text-sm text-[#1F2A2E]">
      <p className="font-semibold text-[#F57F17]">Partner application under review</p>
      <p className="text-[#64716F] mt-1">
        Your partner dashboard will unlock once an admin approves your application. You can
        continue using your customer account in the meantime.
      </p>
    </div>
  );
}
