import Link from "next/link";
import { Compass, LogOut } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardSwitcher } from "@/src/components/layout/dashboard-switcher";
import { getUserProfile, canAccessPartnerDashboard } from "@/src/lib/auth/get-profile";

type ShellProps = {
  children: React.ReactNode;
  nav: { href: string; label: string; id?: string }[];
  title: string;
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
    <div className="min-h-screen bg-[#FFF8EE] flex flex-col">
      <header className="border-b border-[#F0DFC2] bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E88E5] to-[#0E7C7B] flex items-center justify-center">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-[#1F2A2E] hidden sm:inline">DIP</span>
          </Link>

          <div className="flex items-center gap-3">
            {showSwitcher && <DashboardSwitcher />}
            <span className="text-xs text-[#64716F] hidden md:inline">
              {profile.first_name} {profile.last_name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64716F] hover:text-[#1F2A2E] px-3 py-2 rounded-xl hover:bg-[#FFF8EE] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-5 py-8 flex flex-col md:flex-row gap-8">
        <aside className="md:w-56 shrink-0">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64716F] mb-3">{title}</p>
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap px-3 py-2 rounded-xl text-sm font-semibold text-[#1F2A2E]/80 hover:bg-white hover:text-[#1E88E5] border border-transparent hover:border-[#F0DFC2] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
