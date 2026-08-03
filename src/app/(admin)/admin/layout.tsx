import { DashboardShell } from "@/src/components/layout/dashboard-shell";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/partners", label: "Partners" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell nav={NAV} title="Admin">
      {children}
    </DashboardShell>
  );
}
