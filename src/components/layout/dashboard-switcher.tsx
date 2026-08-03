"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardSwitcher() {
  const pathname = usePathname();
  const isPartner = pathname.startsWith("/dashboard");

  return (
    <div className="flex items-center rounded-xl border border-[#F0DFC2] bg-[#FFF8EE] p-0.5 text-xs font-semibold">
      <Link
        href="/account"
        className={`px-3 py-1.5 rounded-lg transition-colors ${
          !isPartner ? "bg-white text-[#1E88E5] shadow-sm" : "text-[#64716F] hover:text-[#1F2A2E]"
        }`}
      >
        Customer
      </Link>
      <Link
        href="/dashboard"
        className={`px-3 py-1.5 rounded-lg transition-colors ${
          isPartner ? "bg-white text-[#0E7C7B] shadow-sm" : "text-[#64716F] hover:text-[#1F2A2E]"
        }`}
      >
        Partner
      </Link>
    </div>
  );
}
