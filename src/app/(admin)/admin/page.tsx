import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { RecentRegistrationsPreview } from "@/src/components/admin/recent-registrations-preview";
import type { Partner, Profile } from "@/src/types/database.types";
import { ArrowRight, Building2, CheckCircle2, XCircle, Clock } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Stats
  const [{ count: pendingCount }, { count: approvedCount }, { count: totalCount }] = await Promise.all([
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("partners").select("id", { count: "exact", head: true }),
  ]);

  // Recent registrations — at least 3, pending first then newest
  const { data: recentPartners } = await supabase
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // Take up to 10 then prioritize pending then newest, and slice 3 for preview
  const sorted = (recentPartners ?? []).sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const previewPartners = sorted.slice(0, 3);

  // Fetch owners for preview
  const ownerIds = previewPartners.map((p) => p.owner_id);
  let profiles: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "phone_number" | "created_at">[] = [];
  if (ownerIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone_number, created_at")
      .in("id", ownerIds);
    profiles = (data ?? []) as typeof profiles;
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const partnersWithOwners = previewPartners.map((p) => ({
    ...p,
    owner: profileMap.get(p.owner_id) || null,
  })) as (Partner & {
    owner: Pick<Profile, "first_name" | "last_name" | "email" | "phone_number" | "created_at"> | null;
  })[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2A2E]">Admin overview</h1>
        <p className="text-sm text-[#64716F] mt-1">Platform operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64716F] uppercase">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-2">{pendingCount ?? 0}</p>
          <p className="text-xs text-[#64716F] mt-1">Awaiting review</p>
        </div>
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64716F] uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{approvedCount ?? 0}</p>
          <p className="text-xs text-[#64716F] mt-1">Active partners</p>
        </div>
        <div className="rounded-2xl border border-[#F0DFC2] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64716F] uppercase">
            <Building2 className="w-3.5 h-3.5 text-[#1E88E5]" /> Total
          </div>
          <p className="text-3xl font-bold text-[#1E88E5] mt-2">{totalCount ?? 0}</p>
          <p className="text-xs text-[#64716F] mt-1">All registrations</p>
        </div>
      </div>

      {/* Recent registrations preview */}
      <div className="rounded-2xl border border-[#F0DFC2] bg-white p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#1F2A2E] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#0E7C7B]" /> Recent registrations
            </h2>
            <p className="text-xs text-[#64716F] mt-1">Latest partner applications — click to review</p>
          </div>
          <Link
            href="/admin/partners"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E7C7B] text-white text-xs font-bold hover:bg-[#0B5E5D] transition-colors shrink-0"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <RecentRegistrationsPreview partners={partnersWithOwners} />

        <div className="sm:hidden flex justify-end">
          <Link
            href="/admin/partners"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E7C7B] text-white text-xs font-bold hover:bg-[#0B5E5D] transition-colors"
          >
            View more <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
