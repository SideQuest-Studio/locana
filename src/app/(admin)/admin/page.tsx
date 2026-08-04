import { createClient } from "@/src/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("partners")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Admin overview</h1>
        <p className="text-sm text-[#64716F] mt-1">Platform operations</p>
      </div>
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6">
        <p className="text-xs font-semibold text-[#64716F] uppercase">Pending partner applications</p>
        <p className="text-3xl font-bold text-[#1E88E5] mt-2">{pendingCount ?? 0}</p>
      </div>
    </div>
  );
}
