"use client";

import Link from "next/link";
import { Plus, CalendarDays, BarChart3, ChevronRight, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickActionData {
  id: string;
  /** Key of ICON_MAP */
  icon: string;
  title: string;
  description: string;
  href: string;
}

// ─── Icon registry ────────────────────────────────────────────────────────────

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  Plus,
  CalendarDays,
  BarChart3,
  Zap,
};

// ─── Single action card ───────────────────────────────────────────────────────

function QuickActionCard({ action }: { action: QuickActionData }) {
  const Icon = ICON_MAP[action.icon] ?? Zap;

  return (
    <Link
      href={action.href}
      className="flex items-center gap-4 p-4 rounded-xl border border-[#F0DFC2] hover:border-[#1E88E5] hover:bg-[#1E88E5]/5 transition-all duration-150 group"
    >
      {/* Icon bubble */}
      <div className="w-11 h-11 rounded-xl bg-[#1E88E5]/10 flex items-center justify-center shrink-0 group-hover:bg-[#1E88E5] transition-colors duration-150">
        <Icon
          className="text-[#1E88E5] group-hover:text-white transition-colors duration-150"
          style={{ width: 20, height: 20 }}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1F2A2E]">{action.title}</p>
        <p className="text-[11px] text-[#64716F] mt-0.5 leading-snug">{action.description}</p>
      </div>

      <ChevronRight className="h-4 w-4 text-[#64716F] shrink-0 group-hover:text-[#1E88E5] group-hover:translate-x-0.5 transition-all duration-150" />
    </Link>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function QuickActions({ actions }: { actions: QuickActionData[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0DFC2] p-5">
      <h2 className="text-base font-bold text-[#1F2A2E] mb-4">Quick Actions</h2>
      <div className="flex flex-col gap-3">
        {actions.map(a => (
          <QuickActionCard key={a.id} action={a} />
        ))}
      </div>
    </div>
  );
}
