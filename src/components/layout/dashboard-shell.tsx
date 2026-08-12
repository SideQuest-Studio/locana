import Link from "next/link";
import { LogOut, LayoutDashboard, Building2, BedDouble, CalendarDays, Percent, ClipboardList, Users, ShieldCheck, Settings } from "lucide-react";
import Image from "next/image";
import dipLogo from "@/src/assets/dip.png";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardSwitcher } from "@/src/components/layout/dashboard-switcher";
import { getUserProfile, canAccessPartnerDashboard } from "@/src/lib/auth/get-profile";

type ShellProps = {
  children: React.ReactNode;
  nav: { href: string; label: string; id?: string }[];
  title: string;
};

// Categorized navigation structure
const navGroups = [
  {
    title: "Core",
    items: ["Overview", "Bookings"],
  },
  {
    title: "Property",
    items: ["Property", "Rooms", "Availability", "Rates"],
  },
  {
    title: "Account",
    items: ["Staff", "Verification"],
  },
];

const getIcon = (label: string) => {
  switch (label.toLowerCase()) {
    case "overview": return <LayoutDashboard className="h-4 w-4" />;
    case "bookings": return <ClipboardList className="h-4 w-4" />;
    case "property": return <Building2 className="h-4 w-4" />;
    case "rooms": return <BedDouble className="h-4 w-4" />;
    case "availability": return <CalendarDays className="h-4 w-4" />;
    case "rates": return <Percent className="h-4 w-4" />;
    case "staff": return <Users className="h-4 w-4" />;
    case "verification": return <ShieldCheck className="h-4 w-4" />;
    default: return <Settings className="h-4 w-4" />;
  }
};

export async function DashboardShell({ children, nav, title }: ShellProps) {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  const showSwitcher = canAccessPartnerDashboard(profile);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-gray-300 overflow-hidden">
              <Image src={dipLogo} alt="DIP Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg text-gray-900">DIP</span>
          </Link>

          <div className="flex items-center gap-3">
            {showSwitcher && <DashboardSwitcher />}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {profile.first_name} {profile.last_name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        <aside className="w-60 border-r border-gray-200 py-6 px-3 hidden md:flex flex-col">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">
                {group.title}
              </p>
              <nav className="flex flex-col gap-0.5">
                {group.items.map((label) => {
                  const item = nav.find((n) => n.label === label);
                  if (!item) return null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-teal-50 hover:text-teal-900 transition-colors group"
                    >
                      <span className="text-gray-400 group-hover:text-teal-600">
                        {getIcon(item.label)}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>
        
        <main className="flex-1 p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
}
