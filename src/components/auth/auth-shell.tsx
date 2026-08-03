"use client";

import Link from "next/link";
import { Compass } from "lucide-react";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen bg-[#FFF8EE] flex flex-col items-center justify-center p-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1E88E5] to-[#0E7C7B] flex items-center justify-center">
          <Compass className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-[#1F2A2E]">DIP</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl border border-[#F0DFC2] shadow-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#1E88E5] via-[#0E7C7B] to-[#F4A93E]" />
        <div className="p-8">
          <h1 className="text-2xl font-bold text-[#1F2A2E] text-center">{title}</h1>
          <p className="text-sm text-[#64716F] text-center mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
