"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  CalendarCheck,
  CalendarDays,
  Star,
  BarChart3,
  User,
  Settings,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",              label: "Dashboard",  icon: LayoutDashboard, exact: true  },
  { href: "/dashboard/property",     label: "Listings",   icon: Store,           exact: false },
  { href: "/dashboard/bookings",     label: "Bookings",   icon: CalendarCheck,   exact: false },
  { href: "/dashboard/availability", label: "Calendar",   icon: CalendarDays,    exact: false },
  { href: "#reviews",                label: "Reviews",    icon: Star,            exact: false },
  { href: "#analytics",              label: "Analytics",  icon: BarChart3,       exact: false },
  { href: "/account",                label: "Profile",    icon: User,            exact: false },
  { href: "#settings",               label: "Settings",   icon: Settings,        exact: false },
];

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[0];
  pathname: string;
}) {
  const isActive = item.exact
    ? pathname === item.href
    : item.href !== "#" &&
      !item.href.startsWith("#") &&
      pathname.startsWith(item.href);

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
        isActive
          ? "bg-[#1E88E5]/10 text-[#1E88E5] border border-[#1E88E5]/20"
          : "text-[#64716F] hover:bg-[#F0DFC2]/60 hover:text-[#1F2A2E]"
      }`}
    >
      <Icon
        className={isActive ? "text-[#1E88E5]" : "text-[#64716F]"}
        style={{ width: 18, height: 18, flexShrink: 0 }}
      />
      {item.label}
    </Link>
  );
}

// ─── Help-center card ─────────────────────────────────────────────────────────

function HelpCenterCard() {
  return (
    <div className="mt-auto pt-4">
      <div className="rounded-2xl border border-[#F0DFC2] bg-[#FDECD2]/50 p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full border-2 border-[#64716F]/25 flex items-center justify-center bg-white shrink-0">
            <HelpCircle className="text-[#64716F]" style={{ width: 16, height: 16 }} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1F2A2E] leading-tight">Need Help?</p>
            <p className="text-[10px] text-[#64716F] leading-tight">
              Visit our Partner Help Center
            </p>
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#64716F]/25 text-[11px] font-semibold text-[#64716F] bg-white hover:bg-[#1E88E5] hover:text-white hover:border-[#1E88E5] transition-all duration-150">
          Go to Help Center
          <ExternalLink style={{ width: 11, height: 11 }} />
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function PartnerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 h-full flex-col hidden md:flex shrink-0 overflow-y-auto">
      {/* Section label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#64716F] mt-5 mb-3 px-5">
        Partner Dashboard
      </p>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Help card pinned to bottom */}
      <div className="px-3">
        <HelpCenterCard />
      </div>
    </aside>
  );
}
